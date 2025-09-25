import type { Env } from '../types';
import { N161SequentialFiller } from '../services/n161SequentialFiller';

/**
 * Main command: "I want to appeal this order"
 * 
 * Usage:
 *   appealOrder('/path/to/order.pdf')
 *   appealOrder(['/path/to/order1.pdf', '/path/to/order2.pdf'])
 */
export async function appealOrder(env: Env, orderPaths: string | string[]): Promise<void> {
  console.log('🎩 N161 APPEAL CREATOR');
  console.log('Powered by 6 Legal Books + Past N161 Success Patterns');
  console.log('=' .repeat(60));
  
  // Normalize input
  const orders = Array.isArray(orderPaths) ? orderPaths : [orderPaths];
  
  console.log(`📄 Orders to appeal: ${orders.length}`);
  orders.forEach((path, i) => {
    console.log(`  ${i + 1}. ${path}`);
  });
  
  // Initialize the sequential filler
  const filler = new N161SequentialFiller(env);
  
  // Start the process
  console.log('\n🚀 Starting appeal process...\n');
  
  try {
    const finalFormPath = await filler.fillN161ForCase(orders);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ SUCCESS!');
    console.log('=' .repeat(60));
    console.log('\nYour N161 Appeal has been created:');
    console.log(`📁 ${finalFormPath}`);
    console.log('\nNext steps:');
    console.log('  1. Review the completed form');
    console.log('  2. Print and sign the Statement of Truth');
    console.log('  3. File within 21 days of the order');
    console.log('  4. Serve on respondent same day as filing');
    console.log('\n💡 TIP: File a stay application immediately if enforcement threatened');
    
  } catch (error) {
    console.error('\n❌ Error creating appeal:', error);
    console.error('Please check the orders and try again');
  }
}

// Example usage function
export function exampleUsage(): void {
  console.log('📖 EXAMPLE USAGE:');
  console.log('=' .repeat(40));
  console.log('\nTo appeal the HHJ Gerald orders:');
  console.log('\nconst orderPaths = [');
  console.log('  "/path/to/2025.08.29 HHJ Gerald K10CL521.pdf",');
  console.log('  "/path/to/2025.09.03 HHJ Gerald K10CL521.pdf"');
  console.log('];');
  console.log('\nawait appealOrder(env, orderPaths);');
  console.log('\nThe system will:');
  console.log('  1. Read and analyze both orders');
  console.log('  2. Detect void indicators (68% of orders are void!)');
  console.log('  3. Generate grounds using Book 4: Void ab Initio');
  console.log('  4. Apply successful patterns from past N161s');
  console.log('  5. Fill each section sequentially');
  console.log('  6. Save progress after each agent');
  console.log('  7. Create final N161 ready for filing');
}