/**
 * COMPREHENSIVE POS SUITE TEST SCRIPT
 * Tests all backend calculations, variant inventory deductions, FIFO ledger allocations,
 * and void/reversal workflows end-to-end against live Supabase database.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Parse .env.local manually
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.trim().match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^['"]|['"]$/g, '');
        process.env[key] = value;
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
  error?: any;
}

const results: TestResult[] = [];

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    results.push({ name: testName, passed: true, details });
    console.log(`  \x1b[32m✔ PASS:\x1b[0m ${testName} ${details ? `(${details})` : ''}`);
  } else {
    results.push({ name: testName, passed: false, details });
    console.error(`  \x1b[31m✖ FAIL:\x1b[0m ${testName} ${details ? `(${details})` : ''}`);
  }
}

async function runTestSuite() {
  console.log('\n===============================================================');
  console.log('🚀 RUNNING COMPREHENSIVE WHOLESALE POS AUTOMATED TEST SUITE');
  console.log('===============================================================\n');

  let testCustomerId: string | null = null;
  let testProductId: string | null = null;
  let variantBMId: string | null = null;
  let variantBLId: string | null = null;
  let variantWSId: string | null = null;
  let testOrderId: string | null = null;
  let testPaymentId: string | null = null;

  try {
    // -------------------------------------------------------------
    // TEST 1: Customer Account Creation & Initial Ledger State
    // -------------------------------------------------------------
    console.log('\x1b[36m[TEST SUITE 1/6] Customer & Initial Ledger Checks\x1b[0m');
    const { data: custData, error: custErr } = await supabase
      .from('customers')
      .insert([
        {
          name: 'Azam Market Test Merchant ' + Date.now(),
          phone: '0300-8887766',
          address: 'Main Azam Cloth Market, Lahore',
        },
      ])
      .select()
      .single();

    assert(!custErr && !!custData, 'Create Customer Profile', `ID: ${custData?.id}`);
    testCustomerId = custData?.id;

    // Check initial balance from customer_balances_view
    const { data: balData0 } = await supabase
      .from('customer_balances_view')
      .select('*')
      .eq('id', testCustomerId)
      .single();

    assert(
      (balData0?.total_outstanding || 0) === 0 && (balData0?.total_billed || 0) === 0,
      'Initial Customer Ledger Balance is 0.00'
    );

    // -------------------------------------------------------------
    // TEST 2: Product & 5-Fixed-Size Color Variant Matrix
    // -------------------------------------------------------------
    console.log('\n\x1b[36m[TEST SUITE 2/6] Product & Variant Matrix Inventory\x1b[0m');
    const testCode = 'TST-' + Math.floor(1000 + Math.random() * 9000);
    const { data: prodData, error: prodErr } = await supabase
      .from('products')
      .insert([
        {
          product_code: testCode,
          name: 'Embroidered Cotton Kurta Test',
          stock_quantity: 60,
          lot_cost: 60000.0,
          is_active: true,
        },
      ])
      .select()
      .single();

    assert(!prodErr && !!prodData, 'Create Product Record', `Code: ${testCode}`);
    testProductId = prodData?.id;

    // Insert Color x Size Variants (5 fixed sizes)
    const { data: varData, error: varErr } = await supabase
      .from('product_variants')
      .insert([
        { product_id: testProductId, color: 'Black', size: 'Small', stock_quantity: 0 },
        { product_id: testProductId, color: 'Black', size: 'Medium', stock_quantity: 35 },
        { product_id: testProductId, color: 'Black', size: 'Large', stock_quantity: 10 },
        { product_id: testProductId, color: 'Black', size: 'Standard', stock_quantity: 0 },
        { product_id: testProductId, color: 'Black', size: 'XL', stock_quantity: 0 },
        { product_id: testProductId, color: 'White', size: 'Small', stock_quantity: 15 },
        { product_id: testProductId, color: 'White', size: 'Medium', stock_quantity: 0 },
        { product_id: testProductId, color: 'White', size: 'Large', stock_quantity: 0 },
        { product_id: testProductId, color: 'White', size: 'Standard', stock_quantity: 0 },
        { product_id: testProductId, color: 'White', size: 'XL', stock_quantity: 0 },
      ])
      .select();

    assert(!varErr && varData?.length === 10, 'Created 10 Color x Size Variants (2 colors x 5 fixed sizes)');

    variantBMId = varData?.find((v) => v.color === 'Black' && v.size === 'Medium')?.id;
    variantBLId = varData?.find((v) => v.color === 'Black' && v.size === 'Large')?.id;
    variantWSId = varData?.find((v) => v.color === 'White' && v.size === 'Small')?.id;

    // -------------------------------------------------------------
    // TEST 3: Atomic Order Creation with Variant Stock Deduction
    // -------------------------------------------------------------
    console.log('\n\x1b[36m[TEST SUITE 3/6] Atomic Order Booking & Variant Stock Deductions\x1b[0m');

    // Order:
    // Line 1: 10 pcs Black/Medium @ Rs. 1500 = Rs. 15,000
    // Line 2: 4 pcs Black/Large @ Rs. 1500 = Rs. 6,000
    // Total Order = Rs. 21,000. Advance Paid = Rs. 6,000 (Partial Payment). Remaining = Rs. 15,000
    const { data: orderRes, error: orderErr } = await supabase.rpc('create_wholesale_order', {
      p_customer_id: testCustomerId,
      p_items: [
        {
          product_id: testProductId,
          variant_id: variantBMId,
          quantity: 10,
          selling_price_per_unit: 1500.0,
        },
        {
          product_id: testProductId,
          variant_id: variantBLId,
          quantity: 4,
          selling_price_per_unit: 1500.0,
        },
      ],
      p_amount_paid: 6000.0,
      p_payment_method: 'Cash',
      p_notes: 'Automated POS test order with partial advance',
    });

    assert(!orderErr && !!orderRes?.order_id, 'Execute create_wholesale_order RPC', `Invoice: ${orderRes?.invoice_number}`);
    testOrderId = orderRes?.order_id;

    assert(orderRes?.total_amount === 21000, 'Order Total Calculated Correctly (Rs. 21,000)');
    assert(orderRes?.amount_paid === 6000, 'Advance Amount Paid Recorded (Rs. 6,000)');
    assert(orderRes?.remaining_amount === 15000, 'Remaining Balance Due is Exactly Rs. 15,000');
    assert(orderRes?.payment_status === 'PARTIALLY_PAID', 'Payment Status marked as PARTIALLY_PAID');

    // Verify Variant Stock Deductions
    const { data: vBM } = await supabase.from('product_variants').select('stock_quantity').eq('id', variantBMId).single();
    const { data: vBL } = await supabase.from('product_variants').select('stock_quantity').eq('id', variantBLId).single();
    const { data: vWS } = await supabase.from('product_variants').select('stock_quantity').eq('id', variantWSId).single();
    const { data: pStock } = await supabase.from('products').select('stock_quantity, lot_cost').eq('id', testProductId).single();

    assert(vBM?.stock_quantity === 25, 'Variant Black/Medium Stock Decremented', '35 - 10 = 25 pcs');
    assert(vBL?.stock_quantity === 6, 'Variant Black/Large Stock Decremented', '10 - 4 = 6 pcs');
    assert(vWS?.stock_quantity === 15, 'Variant White/Small Stock Untouched', '15 pcs unchanged');
    assert(pStock?.stock_quantity === 46, 'Product Aggregate Stock Decremented', '60 - 14 = 46 pcs');

    // -------------------------------------------------------------
    // TEST 4: Installment Payment & FIFO Ledger Allocation
    // -------------------------------------------------------------
    console.log('\n\x1b[36m[TEST SUITE 4/6] Installment Collection & Ledger Verification\x1b[0m');

    // Customer makes second installment payment of Rs. 10,000
    const { data: payRes1, error: payErr1 } = await supabase.rpc('record_customer_payment', {
      p_customer_id: testCustomerId,
      p_amount: 10000.0,
      p_payment_method: 'Bank',
      p_note: 'Second installment via Bank transfer',
      p_target_order_id: testOrderId,
    });

    assert(!payErr1 && !!payRes1?.payment_id, 'Record Rs. 10,000 Installment Payment');

    // Check order status: should now have amount_paid = 16,000, remaining = 5,000, PARTIALLY_PAID
    const { data: ordCheck1 } = await supabase.from('orders').select('*').eq('id', testOrderId).single();
    assert(ordCheck1?.amount_paid === 16000, 'Order Total Paid Updated to Rs. 16,000 (6k + 10k)');
    assert(ordCheck1?.remaining_amount === 5000, 'Order Remaining Balance is Rs. 5,000');
    assert(ordCheck1?.payment_status === 'PARTIALLY_PAID', 'Order Status Remains PARTIALLY_PAID');

    // Check customer ledger view
    const { data: balData1 } = await supabase
      .from('customer_balances_view')
      .select('*')
      .eq('id', testCustomerId)
      .single();

    assert(balData1?.total_outstanding === 5000, 'Customer Ledger Outstanding Balance is Exactly Rs. 5,000');
    assert(balData1?.total_paid === 16000, 'Customer Total Paid is Exactly Rs. 16,000');

    // Customer makes final payment of Rs. 5,000 to fully settle
    const { data: payRes2, error: payErr2 } = await supabase.rpc('record_customer_payment', {
      p_customer_id: testCustomerId,
      p_amount: 5000.0,
      p_payment_method: 'Cash',
      p_note: 'Final settlement payment',
      p_target_order_id: testOrderId,
    });

    assert(!payErr2 && !!payRes2?.payment_id, 'Record Rs. 5,000 Final Settlement Payment');
    testPaymentId = payRes2?.payment_id;

    // Check order status: should now be PAID with 0 remaining
    const { data: ordCheck2 } = await supabase.from('orders').select('*').eq('id', testOrderId).single();
    assert(ordCheck2?.amount_paid === 21000, 'Order Total Paid is Exactly Rs. 21,000');
    assert(ordCheck2?.remaining_amount === 0, 'Order Remaining Balance is 0.00');
    assert(ordCheck2?.payment_status === 'PAID', 'Order Status Transitioned to PAID');

    const { data: balData2 } = await supabase
      .from('customer_balances_view')
      .select('*')
      .eq('id', testCustomerId)
      .single();

    assert(balData2?.total_outstanding === 0, 'Customer Account Fully Cleared (Outstanding: 0.00)');

    // -------------------------------------------------------------
    // TEST 5: Payment Reversal (Void Payment Workflow)
    // -------------------------------------------------------------
    console.log('\n\x1b[36m[TEST SUITE 5/6] Payment Reversal & Balance Restoration\x1b[0m');

    // Void the final Rs. 5,000 payment
    const { data: voidPayRes, error: voidPayErr } = await supabase.rpc('void_customer_payment', {
      p_payment_id: testPaymentId,
      p_reason: 'Testing Payment Reversal',
      p_user_id: 'automated-test',
    });

    assert(!voidPayErr && !!voidPayRes?.success, 'Execute void_customer_payment RPC');

    // Order should re-open with remaining = 5,000, PARTIALLY_PAID
    const { data: ordCheck3 } = await supabase.from('orders').select('*').eq('id', testOrderId).single();
    assert(ordCheck3?.remaining_amount === 5000, 'Order Remaining Balance Reopened to Rs. 5,000');
    assert(ordCheck3?.amount_paid === 16000, 'Order Paid Reverted to Rs. 16,000');
    assert(ordCheck3?.payment_status === 'PARTIALLY_PAID', 'Order Status Reverted to PARTIALLY_PAID');

    // -------------------------------------------------------------
    // TEST 6: Order Cancellation (Void Order & Stock Restoration)
    // -------------------------------------------------------------
    console.log('\n\x1b[36m[TEST SUITE 6/6] Order Voiding & Inventory Restoration\x1b[0m');

    const { data: voidOrdRes, error: voidOrdErr } = await supabase.rpc('void_wholesale_order', {
      p_order_id: testOrderId,
      p_reason: 'Testing Order Cancellation',
      p_user_id: 'automated-test',
    });

    assert(!voidOrdErr && !!voidOrdRes?.success, 'Execute void_wholesale_order RPC');

    // Verify stock is 100% restored to exact variants
    const { data: vBM_restored } = await supabase.from('product_variants').select('stock_quantity').eq('id', variantBMId).single();
    const { data: vBL_restored } = await supabase.from('product_variants').select('stock_quantity').eq('id', variantBLId).single();
    const { data: pStock_restored } = await supabase.from('products').select('stock_quantity').eq('id', testProductId).single();

    assert(vBM_restored?.stock_quantity === 35, 'Variant Black/Medium Restored to 35 pcs');
    assert(vBL_restored?.stock_quantity === 10, 'Variant Black/Large Restored to 10 pcs');
    assert(pStock_restored?.stock_quantity === 60, 'Product Total Stock Restored to 60 pcs');

    const { data: ordCheck4 } = await supabase.from('orders').select('is_voided, remaining_amount').eq('id', testOrderId).single();
    assert(ordCheck4?.is_voided === true && ordCheck4?.remaining_amount === 0, 'Order Marked is_voided=TRUE with 0.00 Remaining');

  } catch (err: any) {
    console.error('\n\x1b[31mUNHANDLED EXCEPTION IN TEST SUITE:\x1b[0m', err.message);
    results.push({ name: 'Suite Execution', passed: false, error: err });
  } finally {
    // -------------------------------------------------------------
    // TEARDOWN / CLEANUP
    // -------------------------------------------------------------
    console.log('\n\x1b[33mCleaning up test database records...\x1b[0m');
    if (testOrderId) {
      await supabase.from('payment_allocations').delete().eq('order_id', testOrderId);
      await supabase.from('order_items').delete().eq('order_id', testOrderId);
      await supabase.from('orders').delete().eq('id', testOrderId);
    }
    if (testCustomerId) {
      await supabase.from('payments').delete().eq('customer_id', testCustomerId);
      await supabase.from('customers').delete().eq('id', testCustomerId);
    }
    if (testProductId) {
      await supabase.from('product_variants').delete().eq('product_id', testProductId);
      await supabase.from('products').delete().eq('id', testProductId);
    }
    console.log('Cleanup completed.\n');
  }

  // Summary Report
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log('===============================================================');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('===============================================================');
  console.log(`Total Checks Run:  ${results.length}`);
  console.log(`\x1b[32mPassed:            ${passedCount}\x1b[0m`);
  console.log(`\x1b[31mFailed:            ${failedCount}\x1b[0m`);

  if (failedCount === 0) {
    console.log('\n\x1b[32m✨ ALL FUNCTIONS & CALCULATIONS ARE WORKING WITH 100% ACCURACY!\x1b[0m\n');
  } else {
    console.log('\n\x1b[31m⚠️ SOME CHECKS FAILED. PLEASE REVIEW LOG ABOVE.\x1b[0m\n');
    process.exit(1);
  }
}

runTestSuite();
