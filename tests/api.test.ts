/**
 * NovaServe Automated Test Suite
 * Run: npx tsx tests/api.test.ts
 */

const BASE_URL = 'http://localhost:3000';

// Test credentials
const ADMIN = { email: 'kasimsalmnai@gmail.com', password: 'Kasim@20049801' };
const CUSTOMER = { email: 'testdemoemail00@gmail.com', password: 'Kasim@20049801' };

let passed = 0;
let failed = 0;
const failures: string[] = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e: any) {
    console.log(`  ❌ ${name}`);
    console.log(`     → ${e.message}`);
    failed++;
    failures.push(name + ': ' + e.message);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function request(path: string, method = 'GET', token?: string, body?: any) {
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(BASE_URL + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data: any = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function main() {
  console.log('\n🧪 NovaServe Test Suite\n');
  console.log('='.repeat(60));

  let adminToken = '';
  let customerToken = '';

  // ============ 1. AUTH TESTS ============
  console.log('\n📌 [1] AUTHENTICATION');

  await test('Customer login works', async () => {
    const { status, data } = await request('/api/auth/login', 'POST', undefined, CUSTOMER);
    assert(status === 200, 'Expected 200, got ' + status);
    assert(data.token, 'No token returned');
    assert(data.user.role === 'CUSTOMER', 'Wrong role');
    customerToken = data.token;
  });

  await test('Admin login works', async () => {
    const { status, data } = await request('/api/auth/login', 'POST', undefined, ADMIN);
    assert(status === 200, 'Expected 200, got ' + status);
    assert(data.token, 'No token returned');
    assert(data.user.role === 'ADMIN', 'Wrong role');
    adminToken = data.token;
  });

  await test('Wrong password rejected', async () => {
    const { status } = await request('/api/auth/login', 'POST', undefined, {
      email: CUSTOMER.email,
      password: 'wrongpass',
    });
    assert(status === 401, 'Expected 401, got ' + status);
  });

  await test('Non-existent email rejected', async () => {
    const { status } = await request('/api/auth/login', 'POST', undefined, {
      email: 'nobody@test.com',
      password: 'test',
    });
    assert(status === 401, 'Expected 401, got ' + status);
  });

  await test('Invalid token rejected', async () => {
    const { status } = await request('/api/auth/me', 'GET', 'invalid-token');
    assert(status === 401, 'Expected 401, got ' + status);
  });

  await test('Customer /me returns user', async () => {
    const { status, data } = await request('/api/auth/me', 'GET', customerToken);
    assert(status === 200, 'Expected 200, got ' + status);
    assert(data.email === CUSTOMER.email, 'Wrong email');
  });

  // ============ 2. CATEGORIES & SERVICES ============
  console.log('\n📌 [2] CATEGORIES & SERVICES');

  await test('Get categories returns array', async () => {
    const { status, data } = await request('/api/categories', 'GET', customerToken);
    assert(status === 200, 'Expected 200');
    assert(Array.isArray(data), 'Not an array');
    assert(data.length > 0, 'Empty array');
    assert(data[0].name, 'Missing name');
  });

  await test('Get services returns array', async () => {
    const { status, data } = await request('/api/services', 'GET', customerToken);
    assert(status === 200, 'Expected 200');
    assert(Array.isArray(data), 'Not an array');
    assert(data.length > 0, 'Empty array');
    assert(data[0].name, 'Missing name');
    assert(data[0].categoryId, 'Missing categoryId (camelCase)');
  });

  // ============ 3. WALLET ============
  console.log('\n📌 [3] WALLET');

  await test('Customer wallet fetch', async () => {
    const { status, data } = await request('/api/wallet', 'GET', customerToken);
    assert(status === 200, 'Expected 200');
    assert(data.wallet, 'No wallet object');
    assert(typeof data.wallet.balance === 'number', 'Balance not a number');
    assert(Array.isArray(data.transactions), 'Transactions not array');
  });

  await test('Wallet transactions have camelCase', async () => {
    const { data } = await request('/api/wallet', 'GET', customerToken);
    if (data.transactions.length > 0) {
      const tx = data.transactions[0];
      assert(tx.balanceAfter !== undefined, 'Missing balanceAfter (camelCase)');
      assert(tx.userId !== undefined, 'Missing userId (camelCase)');
      assert(tx.createdAt !== undefined, 'Missing createdAt (camelCase)');
    }
  });

  // ============ 4. ORDERS ============
  console.log('\n📌 [4] ORDERS');

  await test('Customer orders fetch', async () => {
    const { status, data } = await request('/api/orders', 'GET', customerToken);
    assert(status === 200, 'Expected 200');
    assert(Array.isArray(data), 'Not an array');
  });

  await test('Admin orders fetch', async () => {
    const { status, data } = await request('/api/orders', 'GET', adminToken);
    assert(status === 200, 'Expected 200');
    assert(Array.isArray(data), 'Not an array');
  });

  await test('Orders have camelCase fields', async () => {
    const { data } = await request('/api/orders', 'GET', customerToken);
    if (data.length > 0) {
      const o = data[0];
      assert(o.customerId !== undefined, 'Missing customerId');
      assert(o.customerName !== undefined, 'Missing customerName');
      assert(o.serviceId !== undefined, 'Missing serviceId');
      assert(o.serviceName !== undefined, 'Missing serviceName');
      assert(o.adminNote !== undefined, 'Missing adminNote');
      assert(o.createdAt !== undefined, 'Missing createdAt');
    }
  });

  // ============ 5. NOTIFICATIONS ============
  console.log('\n📌 [5] NOTIFICATIONS');

  await test('Notifications fetch', async () => {
    const { status, data } = await request('/api/notifications', 'GET', customerToken);
    assert(status === 200, 'Expected 200');
    assert(Array.isArray(data), 'Not an array');
  });

  await test('Notifications have camelCase', async () => {
    const { data } = await request('/api/notifications', 'GET', customerToken);
    if (data.length > 0) {
      const n = data[0];
      assert(n.userId !== undefined, 'Missing userId');
      assert(n.orderId !== undefined || n.orderId === null, 'Missing orderId');
      assert(n.read !== undefined, 'Missing read');
      assert(n.createdAt !== undefined, 'Missing createdAt');
    }
  });

  await test('Mark notifications read', async () => {
    const { status } = await request('/api/notifications/read', 'POST', customerToken, {});
    assert(status === 200, 'Expected 200');
  });

  // ============ 6. PAN FIND ============
  console.log('\n📌 [6] PAN FIND');

  await test('PAN charge fetch', async () => {
    const { status, data } = await request('/api/pan/charge', 'GET', customerToken);
    assert(status === 200, 'Expected 200');
    assert(typeof data.charge === 'number', 'Charge not a number');
  });

  await test('PAN history fetch', async () => {
    const { status, data } = await request('/api/pan/history', 'GET', customerToken);
    assert(status === 200, 'Expected 200');
    assert(Array.isArray(data), 'Not an array');
  });

  await test('PAN history has camelCase', async () => {
    const { data } = await request('/api/pan/history', 'GET', customerToken);
    if (data.length > 0) {
      const p = data[0];
      assert(p.userId !== undefined, 'Missing userId');
      assert(p.userName !== undefined, 'Missing userName');
      assert(p.nameOnPan !== undefined, 'Missing nameOnPan');
      assert(p.panStatus !== undefined, 'Missing panStatus');
      assert(p.createdAt !== undefined, 'Missing createdAt');
    }
  });

  // ============ 7. AADHAAR PVC ============
  console.log('\n📌 [7] AADHAAR PVC');

  await test('PVC requests fetch', async () => {
    const { status, data } = await request('/api/aadhaar-pvc/requests', 'GET', customerToken);
    assert(status === 200, 'Expected 200');
    assert(Array.isArray(data), 'Not an array');
  });

  await test('PVC has camelCase', async () => {
    const { data } = await request('/api/aadhaar-pvc/requests', 'GET', customerToken);
    if (data.length > 0) {
      const a = data[0];
      assert(a.orderId !== undefined, 'Missing orderId');
      assert(a.userName !== undefined, 'Missing userName');
      assert(a.userEmail !== undefined, 'Missing userEmail');
      assert(a.fileName !== undefined, 'Missing fileName');
      assert(a.createdAt !== undefined, 'Missing createdAt');
    }
  });

  // ============ 8. SUPPORT ============
  console.log('\n📌 [8] SUPPORT');

  await test('Support tickets fetch', async () => {
    const { status, data } = await request('/api/support', 'GET', customerToken);
    assert(status === 200, 'Expected 200');
    assert(Array.isArray(data), 'Not an array');
  });

  // ============ 9. SETTINGS ============
  console.log('\n📌 [9] SETTINGS');

  await test('Public settings fetch', async () => {
    const { status, data } = await request('/api/settings/public', 'GET', customerToken);
    assert(status === 200, 'Expected 200');
    assert(typeof data.panFindCharge === 'number', 'Missing panFindCharge');
    assert(typeof data.aadhaarPvcCharge === 'number', 'Missing aadhaarPvcCharge');
    assert(typeof data.minTopup === 'number', 'Missing minTopup');
    assert(typeof data.maxTopup === 'number', 'Missing maxTopup');
  });

  // ============ 10. ADMIN ONLY ============
  console.log('\n📌 [10] ADMIN ENDPOINTS');

  await test('Admin stats fetch', async () => {
    const { status, data } = await request('/api/admin/stats', 'GET', adminToken);
    assert(status === 200, 'Expected 200');
    assert(typeof data.totalCustomers === 'number', 'Missing totalCustomers');
    assert(typeof data.totalOrders === 'number', 'Missing totalOrders');
    assert(typeof data.totalRevenue === 'number', 'Missing totalRevenue');
  });

  await test('Admin customers fetch', async () => {
    const { status, data } = await request('/api/customers', 'GET', adminToken);
    assert(status === 200, 'Expected 200');
    assert(Array.isArray(data), 'Not an array');
    if (data.length > 0) {
      assert(data[0].wallet !== undefined, 'Missing wallet');
      assert(typeof data[0].orderCount === 'number', 'Missing orderCount');
    }
  });

  await test('Admin topup requests fetch', async () => {
    const { status, data } = await request('/api/wallet/topup-requests', 'GET', adminToken);
    assert(status === 200, 'Expected 200');
    assert(Array.isArray(data), 'Not an array');
  });

  await test('Customer CANNOT access admin stats', async () => {
    const { status } = await request('/api/admin/stats', 'GET', customerToken);
    assert(status === 403, 'Expected 403, got ' + status);
  });

  await test('Customer CANNOT access customers list', async () => {
    const { status } = await request('/api/customers', 'GET', customerToken);
    assert(status === 403, 'Expected 403, got ' + status);
  });

  // ============ 11. FULL ORDER FLOW ============
  console.log('\n📌 [11] FULL ORDER FLOW');

  let createdOrderId = '';

  await test('Customer creates order', async () => {
    // Get a service first
    const { data: services } = await request('/api/services', 'GET', customerToken);
    const svc = services.find((s: any) => s.id === 'svc-2') || services[0];
    
    const { status, data } = await request('/api/orders', 'POST', customerToken, {
      serviceId: svc.id,
      formData: { name: 'Test User', contact: '9999999999' },
      documents: [],
    });
    assert(status === 200, 'Expected 200, got ' + status);
    assert(data.id, 'No order ID');
    createdOrderId = data.id;
  });

  await test('Order appears in customer list', async () => {
    const { data } = await request('/api/orders', 'GET', customerToken);
    const found = data.find((o: any) => o.id === createdOrderId);
    assert(found, 'Order not found in list');
  });

  await test('Admin updates order status', async () => {
    if (!createdOrderId) return;
    const { status } = await request('/api/orders/' + createdOrderId + '/status', 'PUT', adminToken, {
      status: 'COMPLETED',
      note: 'Test complete',
    });
    assert(status === 200, 'Expected 200, got ' + status);
  });

  // ============ 12. PAN FIND FLOW ============
  console.log('\n📌 [12] PAN FIND FLOW');

  await test('Customer submits PAN request (auto-refund if API fails)', async () => {
    const { status, data } = await request('/api/pan/request', 'POST', customerToken, {
      aadhaar: '999988887777',
    });
    assert(status === 200, 'Expected 200');
    assert(data.id, 'No record ID');
    assert(['PENDING', 'APPROVED', 'REJECTED'].includes(data.status), 'Invalid status');
  });

  // ============ SUMMARY ============
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 TEST RESULTS\n');
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📈 Total:  ${passed + failed}`);
  console.log(`  🎯 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%\n`);

  if (failures.length > 0) {
    console.log('❌ FAILURES:\n');
    failures.forEach(f => console.log('  - ' + f));
    console.log('');
    process.exit(1);
  } else {
    console.log('🎉 All tests passed!\n');
    process.exit(0);
  }
}

main().catch((e) => {
  console.error('Test suite crashed:', e);
  process.exit(1);
});