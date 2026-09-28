// Migration: db.json → MySQL
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, '..', 'data', 'db.json');

async function migrate() {
  console.log('=== NovaServe Migration: db.json → MySQL ===\n');

  // Check db.json exists
  if (!fs.existsSync(DB_FILE)) {
    console.error('ERROR: data/db.json not found!');
    process.exit(1);
  }

  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));

  // Connect to MySQL
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'novaserve',
    password: process.env.DB_PASSWORD || 'NovaServe@2026',
    database: process.env.DB_NAME || 'novaserve',
    multipleStatements: true,
  });

  console.log('Connected to MySQL\n');

  // Disable foreign key checks
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');

  // Clear all tables (fresh migration)
  const tables = ['users', 'categories', 'services', 'wallets', 'wallet_transactions',
                  'orders', 'order_timeline', 'order_documents', 'notifications',
                  'support_tickets', 'topups', 'pan_finds', 'aadhaar_pvc', 'settings'];
  for (const t of tables) {
    await conn.query(`TRUNCATE TABLE \`${t}\``);
  }
  console.log('Cleared existing tables\n');

  // ========== USERS ==========
  for (const u of (db.users || [])) {
    await conn.query(
      'INSERT INTO users (id, role, name, email, mobile, password, active, address, photo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [u.id, u.role, u.name, u.email, u.mobile || '', u.password, u.active ? 1 : 0, u.address || null, u.photo || null, u.createdAt ? new Date(u.createdAt) : new Date()]
    );
  }
  console.log(`Users: ${(db.users || []).length}`);

  // ========== CATEGORIES ==========
  for (const c of (db.categories || [])) {
    await conn.query(
      'INSERT INTO categories (id, name, active, created_at) VALUES (?, ?, ?, ?)',
      [c.id, c.name, c.active ? 1 : 0, c.createdAt ? new Date(c.createdAt) : new Date()]
    );
  }
  console.log(`Categories: ${(db.categories || []).length}`);

  // ========== SERVICES ==========
  for (const s of (db.services || [])) {
    await conn.query(
      'INSERT INTO services (id, name, description, category_id, price, icon, color, active, requires_documents, document_hint, is_system, system_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [s.id, s.name, s.description || '', s.categoryId || null, s.price || 0, s.icon || 'FileText', s.color || 'emerald', s.active !== false ? 1 : 0, s.requiresDocuments ? 1 : 0, s.documentHint || null, s.isSystem ? 1 : 0, s.systemKey || null, s.createdAt ? new Date(s.createdAt) : new Date()]
    );
  }
  console.log(`Services: ${(db.services || []).length}`);

  // ========== WALLETS ==========
  for (const w of (db.wallets || [])) {
    await conn.query(
      'INSERT INTO wallets (user_id, balance, total_added, total_spent) VALUES (?, ?, ?, ?)',
      [w.userId, w.balance || 0, w.totalAdded || 0, w.totalSpent || 0]
    );
  }
  console.log(`Wallets: ${(db.wallets || []).length}`);

  // ========== WALLET TRANSACTIONS ==========
  for (const t of (db.walletTransactions || [])) {
    await conn.query(
      'INSERT IGNORE INTO wallet_transactions (id, user_id, type, amount, note, balance_after, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [t.id, t.userId, t.type, t.amount, t.note || '', t.balanceAfter || 0, t.createdAt ? new Date(t.createdAt) : new Date()]
    );
  }
  console.log(`Wallet transactions: ${(db.walletTransactions || []).length}`);

  // ========== ORDERS ==========
  for (const o of (db.orders || [])) {
    await conn.query(
      'INSERT IGNORE INTO orders (id, customer_id, customer_name, service_id, service_name, amount, status, form_data, admin_note, refunded, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [o.id, o.customerId, o.customerName, o.serviceId, o.serviceName, o.amount, o.status, JSON.stringify(o.formData || {}), o.adminNote || '', o.refunded ? 1 : 0, o.createdAt ? new Date(o.createdAt) : new Date(), o.updatedAt ? new Date(o.updatedAt) : new Date()]
    );

    // Timeline
    for (const t of (o.timeline || [])) {
      await conn.query(
        'INSERT IGNORE INTO order_timeline (order_id, status, note, created_at) VALUES (?, ?, ?, ?)',
        [o.id, t.status, t.note || '', t.at ? new Date(t.at) : new Date()]
      );
    }
  }
  console.log(`Orders: ${(db.orders || []).length}`);

  // ========== ORDER DOCUMENTS ==========
  for (const d of (db.orderDocuments || [])) {
    await conn.query(
      'INSERT INTO order_documents (id, order_id, name, size, type, data, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [d.id, d.orderId, d.name || '', d.size || 0, d.type || '', d.data || '', d.uploadedAt ? new Date(d.uploadedAt) : new Date()]
    );
  }
  console.log(`Order documents: ${(db.orderDocuments || []).length}`);

  // ========== NOTIFICATIONS ==========
  for (const n of (db.notifications || [])) {
    await conn.query(
      'INSERT IGNORE INTO notifications (id, user_id, title, message, order_id, `read`, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [n.id, n.userId, n.title, n.message || '', n.orderId || null, n.read ? 1 : 0, n.createdAt ? new Date(n.createdAt) : new Date()]
    );
  }
  console.log(`Notifications: ${(db.notifications || []).length}`);

  // ========== SUPPORT TICKETS ==========
  for (const s of (db.supportTickets || [])) {
    await conn.query(
      'INSERT INTO support_tickets (id, user_id, user_name, subject, message, order_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [s.id, s.userId, s.userName || '', s.subject || '', s.message || '', s.orderId || null, s.status || 'OPEN', s.createdAt ? new Date(s.createdAt) : new Date()]
    );
  }
  console.log(`Support tickets: ${(db.supportTickets || []).length}`);

  // ========== TOPUPS ==========
  for (const t of (db.topups || [])) {
    await conn.query(
      'INSERT INTO topups (id, user_id, user_name, amount, utr, status, note, reviewed_at, reviewed_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [t.id, t.userId, t.userName || '', t.amount, t.utr, t.status || 'PENDING', t.note || null, t.reviewedAt ? new Date(t.reviewedAt) : null, t.reviewedBy || null, t.createdAt ? new Date(t.createdAt) : new Date()]
    );
  }
  console.log(`Topups: ${(db.topups || []).length}`);

  // ========== PAN FINDS ==========
  for (const p of (db.panFinds || [])) {
    await conn.query(
      'INSERT IGNORE INTO pan_finds (id, order_id, user_id, user_name, aadhaar, pan, name_on_pan, pan_status, charge, status, note, refunded, api_tried, api_response, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [p.id, p.orderId || null, p.userId, p.userName || '', p.aadhaar || '', p.pan || '', p.nameOnPan || '', p.panStatus || '', p.charge || 0, p.status || 'PENDING', p.note || null, p.refunded ? 1 : 0, p.apiTried ? 1 : 0, p.apiResponse ? JSON.stringify(p.apiResponse) : null, p.createdAt ? new Date(p.createdAt) : new Date()]
    );
  }
  console.log(`PAN finds: ${(db.panFinds || []).length}`);

  // ========== AADHAAR PVC ==========
  for (const a of (db.aadhaarPvc || [])) {
    await conn.query(
      'INSERT IGNORE INTO aadhaar_pvc (id, order_id, user_id, user_name, user_email, file_name, charge, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [a.id, a.orderId || null, a.userId, a.userName || '', a.userEmail || '', a.fileName || '', a.charge || 0, a.status || 'COMPLETED', a.createdAt ? new Date(a.createdAt) : new Date()]
    );
  }
  console.log(`Aadhaar PVC: ${(db.aadhaarPvc || []).length}`);

  // ========== SETTINGS ==========
  if (db.settings) {
    for (const [key, value] of Object.entries(db.settings)) {
      await conn.query(
        'INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
        [key, String(value)]
      );
    }
    console.log(`Settings: ${Object.keys(db.settings).length}`);
  }

  await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  await conn.end();

  console.log('\n=== Migration Complete ===');
}

migrate().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});