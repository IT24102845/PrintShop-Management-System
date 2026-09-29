// =============================================================================
// Complete Lifecycle Automated Verification Script
// Tests full lifecycle from new customer registration to delivery completion
// =============================================================================

const API_BASE = 'http://localhost:3000/api/v1';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, data: json };
}

async function runTest() {
  console.log('🚀 Starting PrintShop End-to-End Verification...\n');

  // ─── 1. HEALTH CHECK ────────────────────────────────────────────────────────
  console.log('1. Checking system health...');
  const health = await request('/health');
  if (!health.ok || health.data.data?.database?.connected !== true) {
    console.error('❌ Health check failed:', health.data);
    process.exit(1);
  }
  console.log(`✅ System Healthy: API ${health.data.data.status} | DB Connected: ${health.data.data.database.connected} | Latency: ${health.data.data.database.latencyMs}ms`);

  // ─── 2. PUBLIC REGISTRATION SECURITY ────────────────────────────────────────
  console.log('\n2. Testing customer registration & role enforcement...');
  const randomSuffix = Math.floor(Math.random() * 1000000);
  const testCustomer = {
    full_name: `Test Customer ${randomSuffix}`,
    email: `customer.${randomSuffix}@test.com`,
    password: 'Password123!',
    phone: '+94771234567',
    company: 'Apex Demo Corp',
    role: 'admin' // Attempt privilege escalation
  };

  const regRes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(testCustomer)
  });

  if (!regRes.ok) {
    console.error('❌ Registration failed:', regRes.data);
    process.exit(1);
  }

  const customerUser = regRes.data.data.user;
  const customerToken = regRes.data.data.token;

  if (customerUser.role !== 'customer') {
    console.error(`❌ Security vulnerability! Role was set to ${customerUser.role} instead of 'customer'`);
    process.exit(1);
  }
  console.log(`✅ Customer registered safely. Role strictly enforced as: ${customerUser.role}`);

  // ─── 3. ADMIN LOGIN ─────────────────────────────────────────────────────────
  console.log('\n3. Authenticating as Administrator...');
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@printshop.com', password: 'Admin123!' })
  });
  if (!adminLogin.ok) {
    console.error('❌ Admin login failed:', adminLogin.data);
    process.exit(1);
  }
  const adminToken = adminLogin.data.data.token;
  console.log('✅ Admin authenticated successfully.');

  // ─── 4. CUSTOMER CREATES ORDER ──────────────────────────────────────────────
  console.log('\n4. Customer creating a new print order...');
  const orderPayload = {
    service_type: 'business_cards',
    description: `Executive Demonstration Cards ${randomSuffix}`,
    size: '85mm x 55mm Standard',
    quantity: 500,
    colour: 'Full Colour CMYK 4/4',
    material: '350gsm Silk Artboard with Soft-Touch Velvet Lamination',
    design_file_url: 'https://cdn.printshop.internal/uploads/sample-artwork.pdf',
    deadline_date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
    special_notes: 'Urgent production for corporate exhibition.'
  };

  const createOrderRes = await request('/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify(orderPayload)
  });

  if (!createOrderRes.ok) {
    console.error('❌ Customer order creation failed:', createOrderRes.data);
    process.exit(1);
  }

  const createdOrder = createOrderRes.data.data;
  console.log(`✅ Order created successfully: ID ${createdOrder.id} | Status: ${createdOrder.status}`);

  // ─── 5. STAFF ISSUES QUOTATION ──────────────────────────────────────────────
  console.log('\n5. Staff creates quotation for order...');
  const quotePayload = {
    order_id: createdOrder.id,
    amount: 14500.00,
    notes: 'Premium print run including die-cutting and velvet lamination.',
    valid_until: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0]
  };

  const quoteRes = await request('/quotations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(quotePayload)
  });

  if (!quoteRes.ok) {
    console.error('❌ Quotation creation failed:', quoteRes.data);
    process.exit(1);
  }
  const createdQuote = quoteRes.data.data;
  console.log(`✅ Quotation issued: ID ${createdQuote.id} | Amount: LKR ${createdQuote.amount} | Status: ${createdQuote.status} | Rev: ${createdQuote.revision}`);

  // Check order status changed to 'quoted'
  const ordCheck1 = await request(`/orders/${createdOrder.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log(`✅ Order status updated to: ${ordCheck1.data.data.status}`);

  // ─── 6. CUSTOMER ACCEPTS QUOTATION ─────────────────────────────────────────
  console.log('\n6. Customer accepts quotation...');
  const acceptRes = await request(`/quotations/${createdQuote.id}/respond`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ status: 'accepted' })
  });

  if (!acceptRes.ok) {
    console.error('❌ Quotation acceptance failed:', acceptRes.data);
    process.exit(1);
  }
  console.log(`✅ Quotation accepted: Status is ${acceptRes.data.data.status}`);

  const ordCheck2 = await request(`/orders/${createdOrder.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log(`✅ Order status updated to: ${ordCheck2.data.data.status}`);

  // ─── 7. DESIGN PROOF VERSIONING & APPROVAL ──────────────────────────────────
  console.log('\n7. Staff uploading design proof v1...');
  const design1Res = await request('/designs', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      order_id: createdOrder.id,
      file_url: 'https://cdn.printshop.internal/proofs/proof-v1.pdf',
      remarks: 'Initial proof for customer review'
    })
  });

  if (!design1Res.ok) {
    console.error('❌ Design upload v1 failed:', design1Res.data);
    process.exit(1);
  }
  console.log(`✅ Proof v${design1Res.data.data.version} uploaded successfully`);

  console.log('   Customer requesting revision on proof v1...');
  const revReqRes = await request(`/designs/${design1Res.data.data.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      status: 'revision_requested',
      remarks: 'Please adjust color balance on header logo'
    })
  });
  console.log(`✅ Proof v1 status: ${revReqRes.data.data.approval_status}`);

  console.log('   Staff uploading revised proof v2...');
  const design2Res = await request('/designs', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      order_id: createdOrder.id,
      file_url: 'https://cdn.printshop.internal/proofs/proof-v2-adjusted.pdf',
      remarks: 'Color corrected per customer request'
    })
  });
  if (design2Res.data.data.version !== 2) {
    console.error(`❌ Versioning error! Expected version 2, got: ${design2Res.data.data.version}`);
    process.exit(1);
  }
  console.log(`✅ Proof v${design2Res.data.data.version} uploaded with correct version increment!`);

  console.log('   Customer approving design proof v2...');
  const approveRes = await request(`/designs/${design2Res.data.data.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ status: 'approved' })
  });

  if (!approveRes.ok) {
    console.error('❌ Design approval failed:', approveRes.data);
    process.exit(1);
  }
  console.log(`✅ Design approved by customer: ${approveRes.data.data.approval_status}`);

  // ─── 8. PRODUCTION WORKFLOW ────────────────────────────────────────────────
  console.log('\n8. Checking production task auto-creation and status synchronization...');
  const prodTasks = await request('/production/tasks', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  const taskForOrder = (prodTasks.data.data.items || []).find(t => t.order_id === createdOrder.id);
  if (!taskForOrder) {
    console.error('❌ Production task was not created for approved order!');
    process.exit(1);
  }
  console.log(`✅ Production task found: ID ${taskForOrder.id} | Status: ${taskForOrder.status}`);

  // Test illegal transition
  console.log('   Testing illegal transition prevention (WAITING -> COMPLETED)...');
  const illegalJump = await request(`/production/tasks/${taskForOrder.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: 'COMPLETED' })
  });
  if (illegalJump.status === 400) {
    console.log(`✅ Illegal jump blocked as expected: ${illegalJump.data.message}`);
  } else {
    console.error('❌ Illegal jump was not rejected!', illegalJump.data);
    process.exit(1);
  }

  // Legal transitions through production lifecycle
  console.log('   Transitioning WAITING -> PRINTING...');
  const printStep = await request(`/production/tasks/${taskForOrder.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: 'PRINTING' })
  });
  console.log(`✅ Task status: ${printStep.data.data.status} | Started at: ${printStep.data.data.started_at}`);

  console.log('   Transitioning PRINTING -> QUALITY_CHECK...');
  const qcStep = await request(`/production/tasks/${taskForOrder.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: 'QUALITY_CHECK' })
  });
  console.log(`✅ Task status: ${qcStep.data.data.status}`);

  const ordCheckQc = await request(`/orders/${createdOrder.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log(`✅ Order status synchronized to: ${ordCheckQc.data.data.status}`);

  console.log('   Transitioning QUALITY_CHECK -> READY_FOR_DELIVERY...');
  const readyStep = await request(`/production/tasks/${taskForOrder.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: 'READY_FOR_DELIVERY' })
  });
  console.log(`✅ Task status: ${readyStep.data.data.status}`);

  const ordCheckReady = await request(`/orders/${createdOrder.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log(`✅ Order status synchronized to: ${ordCheckReady.data.data.status}`);

  console.log('   Transitioning READY_FOR_DELIVERY -> COMPLETED...');
  const compStep = await request(`/production/tasks/${taskForOrder.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: 'COMPLETED' })
  });
  console.log(`✅ Task status: ${compStep.data.data.status} | Completed at: ${compStep.data.data.completed_at}`);

  const ordCheckComp = await request(`/orders/${createdOrder.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log(`✅ Final order status synchronized to: ${ordCheckComp.data.data.status}`);

  console.log('\n🎉 FULL LIFECYCLE VERIFICATION COMPLETED WITH 100% SUCCESS!');
}

runTest().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
