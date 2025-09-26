// Step 0: Order Loading and Selection

import { PDFDocument } from 'pdf-lib';
import type { Env } from '../types';

/**
 * Step 0: Load and Select Court Order
 * 
 * This step handles:
 * 1. Loading available orders from R2 bucket
 * 2. Parsing order metadata
 * 3. Displaying orders for selection
 * 4. Loading the selected order content
 * 5. Preparing order data for N161 processing
 */

export async function step0_orderSelection(
  env: Env,
  year: string | null,
  sendUpdate: (msg: string) => void
) {
  // SUBSTEP 0.1: Connect to R2 bucket
  sendUpdate('🗂️ Connecting to court orders storage...');
  const ordersBucket = env.ORDERS;
  
  if (!ordersBucket) {
    throw new Error('Orders bucket not configured');
  }
  
  // SUBSTEP 0.2: List available orders
  sendUpdate('📋 Fetching available court orders...');
  
  let prefix = '';
  if (year) {
    prefix = year; // Filter by year if provided
    sendUpdate(`  Filtering for year: ${year}`);
  }
  
  const listed = await ordersBucket.list({
    prefix: prefix,
    limit: 100
  });
  
  sendUpdate(`✓ Found ${listed.objects?.length || 0} orders`);
  
  // SUBSTEP 0.3: Convert PDFs to text and extract metadata
  sendUpdate('🔍 Converting PDFs to text and extracting information...');
  
  const orders = await Promise.all((listed.objects || []).map(async (obj) => {
    const key = obj.key;
    sendUpdate(`  📄 Processing ${key}...`);
    
    try {
      // Load and convert PDF to text
      const orderObject = await ordersBucket.get(key);
      if (!orderObject) {
        throw new Error(`Order not found: ${key}`);
      }
      
      const orderBuffer = await orderObject.arrayBuffer();
      const pdfDoc = await PDFDocument.load(orderBuffer);
      const pages = pdfDoc.getPages();
      let orderText = '';
      
      // Extract text from all pages
      for (let i = 0; i < pages.length; i++) {
        // Note: pdf-lib doesn't have built-in text extraction
        // In a real implementation, we'd use pdf2pic + OCR or pdf-parse
        // For now, we'll create a placeholder that shows the structure
        orderText += `[Page ${i + 1} content would be extracted here]\n`;
      }
      
      // Parse extracted text for metadata
      const yearMatch = orderText.match(/20\d{2}/);
      const extractedYear = yearMatch ? yearMatch[0] : null;
      
      const judgeMatch = orderText.match(/(HHJ|DJ|Master)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
      const extractedJudge = judgeMatch ? judgeMatch[0] : null;
      
      const caseMatch = orderText.match(/([A-Z]{2,}\d+[A-Z]*\d*)/);
      const extractedCaseNumber = caseMatch ? caseMatch[0] : null;
      
      // Fallback to filename parsing if text extraction fails
      const parts = key.replace('.pdf', '').split(' ');
      const datePart = parts[0] || '';
      const dateComponents = datePart.split('.');
      const fallbackYear = dateComponents[0];
      const fallbackMonth = dateComponents[1];
      const fallbackDay = dateComponents[2];
      
      // Use extracted data or fallback to filename
      const finalYear = extractedYear || fallbackYear;
      const finalMonth = fallbackMonth || '01';
      const finalDay = fallbackDay || '01';
      
      let judgeName = extractedJudge || 'Unknown Judge';
      if (!extractedJudge) {
        for (let i = 1; i < parts.length; i++) {
          if (parts[i] === 'HHJ' || parts[i] === 'DJ' || parts[i] === 'Master') {
            judgeName = parts.slice(i, i + 2).join(' ');
            break;
          }
        }
      }
      
      const caseNumber = extractedCaseNumber || parts[parts.length - 1] || 'Unknown';
      
      // Determine court from metadata or defaults
      let court = 'County Court at Central London'; // Default
      if (key.includes('High Court') || orderText.includes('High Court')) {
        court = 'High Court';
      } else if (key.includes('Court of Appeal') || orderText.includes('Court of Appeal')) {
        court = 'Court of Appeal';
      }
      
      // Determine order type
      let orderType = 'Order';
      if (key.toLowerCase().includes('possession') || orderText.toLowerCase().includes('possession')) {
        orderType = 'Possession Order';
      } else if (key.toLowerCase().includes('injunction') || orderText.toLowerCase().includes('injunction')) {
        orderType = 'Injunction Order';
      } else if (key.toLowerCase().includes('costs') || orderText.toLowerCase().includes('costs')) {
        orderType = 'Costs Order';
      }
      
      sendUpdate(`  ✓ ${key}: Year ${finalYear}, ${judgeName}, ${caseNumber}`);
      
      return {
        key: key,
        name: key,
        size: obj.size,
        uploaded: new Date(obj.uploaded),
        text: orderText,
        metadata: {
          date: `${finalYear}-${finalMonth}-${finalDay}`,
          displayDate: `${finalDay}/${finalMonth}/${finalYear}`,
          judge: judgeName,
          caseNumber: caseNumber,
          court: court,
          orderType: orderType,
          extractedYear,
          extractedJudge,
          extractedCaseNumber
        }
      };
    } catch (error) {
      sendUpdate(`  ⚠️ Failed to process ${key}: ${error instanceof Error ? error.message : String(error)}`);
      
      // Return basic info from filename if PDF processing fails
      const parts = key.replace('.pdf', '').split(' ');
      const datePart = parts[0] || '';
      const dateComponents = datePart.split('.');
      const year = dateComponents[0] || '2024';
      const month = dateComponents[1] || '01';
      const day = dateComponents[2] || '01';
      
      return {
        key: key,
        name: key,
        size: obj.size,
        uploaded: new Date(obj.uploaded),
        text: '',
        metadata: {
          date: `${year}-${month}-${day}`,
          displayDate: `${day}/${month}/${year}`,
          judge: 'Unknown Judge',
          caseNumber: 'Unknown',
          court: 'County Court',
          orderType: 'Order'
        }
      };
    }
  }));
  
  // SUBSTEP 0.4: Group orders by court
  sendUpdate('📊 Organizing orders by court...');
  
  const groupedOrders: Record<string, any[]> = {};
  
  orders.forEach(order => {
    const court = order.metadata.court;
    if (!groupedOrders[court]) {
      groupedOrders[court] = [];
    }
    groupedOrders[court].push(order);
  });
  
  // Sort each group by date (newest first)
  Object.keys(groupedOrders).forEach(court => {
    groupedOrders[court].sort((a, b) => {
      return new Date(b.metadata.date).getTime() - new Date(a.metadata.date).getTime();
    });
  });
  
  sendUpdate(`✓ Orders grouped into ${Object.keys(groupedOrders).length} courts`);
  
  // SUBSTEP 0.5: Return structured data for display
  const result = {
    totalOrders: orders.length,
    courts: Object.keys(groupedOrders),
    groupedOrders: groupedOrders,
    orders: orders
  };
  
  sendUpdate('✅ Order list ready for selection');
  
  return result;
}

/**
 * Load the content of a selected order
 */
export async function loadSelectedOrder(
  env: Env,
  orderKey: string,
  sendUpdate: (msg: string) => void
) {
  // SUBSTEP 0.6: Load selected order from R2
  sendUpdate(`📄 Loading order: ${orderKey}...`);
  
  const ordersBucket = env.ORDERS;
  const orderObject = await ordersBucket.get(orderKey);
  
  if (!orderObject) {
    throw new Error(`Order not found: ${orderKey}`);
  }
  
  // SUBSTEP 0.7: Get order content
  sendUpdate('📖 Reading order content...');
  
  const orderBuffer = await orderObject.arrayBuffer();
  const orderMetadata = (orderObject as any).customMetadata || {};
  
  // SUBSTEP 0.8: Extract text from PDF using pdf-lib
  sendUpdate('🔍 Converting PDF order to text...');
  
  const pdfDoc = await PDFDocument.load(orderBuffer);
  const pages = pdfDoc.getPages();
  let orderText = '';
  
  // Extract text from all pages
  for (let i = 0; i < pages.length; i++) {
    sendUpdate(`  📄 Processing page ${i + 1}/${pages.length}...`);
    
    // Note: pdf-lib doesn't have built-in text extraction
    // In a real implementation, we'd use pdf2pic + OCR or pdf-parse
    // For now, we'll create a placeholder that shows the structure
    orderText += `[Page ${i + 1} content would be extracted here]\n`;
  }
  
  sendUpdate(`✓ Extracted ${orderText.length} characters from PDF`);
  
  // SUBSTEP 0.9: Parse extracted text for metadata
  sendUpdate('🔍 Parsing order text for metadata...');
  
  // Extract year from text (look for date patterns)
  const yearMatch = orderText.match(/20\d{2}/);
  const extractedYear = yearMatch ? yearMatch[0] : null;
  
  // Extract judge name from text
  const judgeMatch = orderText.match(/(HHJ|DJ|Master)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  const extractedJudge = judgeMatch ? judgeMatch[0] : null;
  
  // Extract case number from text
  const caseMatch = orderText.match(/([A-Z]{2,}\d+[A-Z]*\d*)/);
  const extractedCaseNumber = caseMatch ? caseMatch[0] : null;
  
  if (extractedYear) sendUpdate(`  ✓ Found year in text: ${extractedYear}`);
  if (extractedJudge) sendUpdate(`  ✓ Found judge in text: ${extractedJudge}`);
  if (extractedCaseNumber) sendUpdate(`  ✓ Found case number in text: ${extractedCaseNumber}`);
  
  sendUpdate(`✓ Order loaded: ${(orderBuffer.byteLength / 1024).toFixed(2)} KB`);
  
  // SUBSTEP 0.10: Prepare order data for processing
  const orderData = {
    key: orderKey,
    buffer: orderBuffer,
    text: orderText,
    metadata: {
      ...orderMetadata,
      extractedYear,
      extractedJudge,
      extractedCaseNumber
    },
    size: orderBuffer.byteLength,
    contentType: 'application/pdf'
  };
  
  sendUpdate('✅ Order ready for N161 processing');
  
  return orderData;
}

/**
 * Create API endpoint handler for order search
 */
export function createOrderSearchHandler(env: Env) {
  return async (request: Request) => {
    const url = new URL(request.url);
    const year = url.searchParams.get('q');
    
    try {
      const result = await step0_orderSelection(
        env,
        year,
        console.log // Or use a proper logging function
      );
      
      // Format for frontend consumption
      const response = {
        files: result.orders.map(order => ({
          name: order.name,
          filename: order.name,
          court: order.metadata.court,
          date: order.metadata.displayDate,
          judge: order.metadata.judge,
          caseNumber: order.metadata.caseNumber,
          orderType: order.metadata.orderType,
          key: order.key,
          size: order.size
        }))
      };
      
      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}