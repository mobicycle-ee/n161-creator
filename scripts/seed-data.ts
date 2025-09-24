#!/usr/bin/env bun

// Script to seed sample order data to Cloudflare KV

const sampleOrder = {
  id: "n96741-order",
  caseNumber: "n96741",
  courtName: "Royal Courts of Justice",
  judge: "HHJ Smith",
  orderDate: "2024-11-15",
  decision: "Application dismissed with costs awarded to the respondent",
  parties: {
    claimant: "John Doe",
    defendant: "Jane Smith"
  },
  orderDetails: {
    type: "Interim Application",
    hearing_date: "2024-11-10",
    reasons: "Insufficient evidence provided to support the application. The applicant failed to demonstrate exceptional circumstances required for relief sought.",
    costs_order: "Applicant to pay respondent's costs assessed at £5,000"
  }
};

async function seedData() {
  try {
    // Upload using wrangler kv put
    const orderJson = JSON.stringify(sampleOrder);
    
    console.log("Uploading order n96741 to KV store...");
    
    // Use wrangler to put the data
    const { execSync } = require('child_process');
    execSync(`bunx wrangler kv key put --binding=ORDERS "${sampleOrder.caseNumber}" '${orderJson}'`, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log("✅ Successfully uploaded order n96741");
    console.log("\nYou can now test the chat interface with case number: n96741");
    console.log("Visit: https://n161-creator.mobicycle.workers.dev");
    
  } catch (error) {
    console.error("Error uploading data:", error);
  }
}

seedData();