import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { pool, query, queryOne, execute } from './db/connection';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json({ limit: '10mb' }));

const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// ==================== ORDER SERIAL ====================
let orderSerial = 1;
async function initOrderSerial() {
  try {
    const d = new Date();
    const todayPrefix = 'NS-' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-';
    const rows = await query<any>('SELECT id FROM orders WHERE id LIKE ?', [todayPrefix + '%']);
    if (rows.length > 0) {
      const maxSerial = Math.max(...rows.map(r => {
        const parts = r.id.split('-');
        return parseInt(parts[parts.length - 1], 10) || 0;
      }));
      orderSerial = maxSerial + 1;
      console.log('[ORDER] Detected max serial: ' + maxSerial + ', next: ' + orderSerial);
    }
  } catch (e) {
    console.error('[ORDER] Serial init failed:', e);
  }
}

function newOrderId() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const serial = String(orderSerial++).padStart(4, '0');
  return 'NS-' + yyyy + mm + dd + '-' + serial;
}

// ==================== AUTH MIDDLEWARE ====================
async function auth(req: any, res: any, next: any) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const user = await queryOne<any>('SELECT * FROM users WHERE id = ?', [token]);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (!user.active) return res.status(403).json({ error: 'Account disabled' });
  req.user = user;
  next();
}
function adminOnly(req: any, res: any, next: any) {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  next();
}

// ==================== NOTIFY HELPER ====================
async function notify(userId: string, title: string, message: string, orderId?: string) {
  await execute(
    'INSERT INTO notifications (id, user_id, title, message, order_id) VALUES (?, ?, ?, ?, ?)',
    [uid('ntf'), userId, title, message, orderId || null]
  );
}

// ==================== AUTH ROUTES ====================
app.post('/api/auth/login', async (req, res) => {
  const { email, password, role } = req.body;
  let user;
  if (role) {
    user = await queryOne<any>('SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND role = ?', [email, role]);
  } else {
    user = await queryOne<any>('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);
  }
  if (!user || user.password !== password) return res.status(401).json({ error: 'Invalid credentials' });
  if (!user.active) return res.status(403).json({ error: 'Account disabled' });
  const { password: _, ...safe } = user;
  res.json({ user: safe, token: user.id });
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, mobile, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
  const existing = await queryOne('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email]);
  if (existing) return res.status(400).json({ error: 'Email already registered' });
  const userId = uid('cust');
  await execute(
    'INSERT INTO users (id, role, name, email, mobile, password, active) VALUES (?, ?, ?, ?, ?, ?, 1)',
    [userId, 'CUSTOMER', name, email, mobile || '', password]
  );
  await execute('INSERT INTO wallets (user_id, balance, total_added, total_spent) VALUES (?, 0, 0, 0)', [userId]);
  await notify(userId, 'Welcome to NovaServe', 'Your account has been created.');
  const admins = await query<any>('SELECT id FROM users WHERE role = ?', ['ADMIN']);
  for (const a of admins) await notify(a.id, 'New customer registered', name + ' (' + email + ') joined.');
  const user = await queryOne<any>('SELECT * FROM users WHERE id = ?', [userId]);
  const { password: _, ...safe } = user;
  res.json({ user: safe, token: user.id });
});

app.get('/api/auth/me', auth, (req: any, res) => {
  const { password: _, ...safe } = req.user;
  res.json(safe);
});

// ==================== CATEGORIES ====================
app.get('/api/categories', auth, async (_req, res) => {
  const rows = await query<any>('SELECT * FROM categories ORDER BY created_at');
  const mapped = rows.map((c: any) => ({
    id: c.id,
    name: c.name,
    active: c.active === 1,
    createdAt: c.created_at,
  }));
  res.json(mapped);
});
app.post('/api/categories', auth, adminOnly, async (req: any, res) => {
  const id = uid('cat');
  await execute('INSERT INTO categories (id, name) VALUES (?, ?)', [id, req.body.name]);
  const row = await queryOne('SELECT * FROM categories WHERE id = ?', [id]);
  res.json(row);
});
app.put('/api/categories/:id', auth, adminOnly, async (req: any, res) => {
  await execute('UPDATE categories SET name = ?, active = ? WHERE id = ?', [req.body.name, req.body.active ? 1 : 0, req.params.id]);
  const row = await queryOne('SELECT * FROM categories WHERE id = ?', [req.params.id]);
  res.json(row);
});
app.delete('/api/categories/:id', auth, adminOnly, async (req, res) => {
  await execute('DELETE FROM categories WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ==================== SERVICES ====================
app.get('/api/services', auth, async (_req, res) => {
  const rows = await query<any>('SELECT * FROM services ORDER BY created_at');
  const mapped = rows.map((s: any) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    categoryId: s.category_id,
    price: Number(s.price),
    icon: s.icon,
    color: s.color,
    active: s.active === 1,
    requiresDocuments: s.requires_documents === 1,
    documentHint: s.document_hint,
    isSystem: s.is_system === 1,
    systemKey: s.system_key,
    createdAt: s.created_at,
  }));
  res.json(mapped);
});
app.post('/api/services', auth, adminOnly, async (req: any, res) => {
  const b = req.body;
  const id = uid('svc');
  await execute(
    'INSERT INTO services (id, name, description, category_id, price, icon, color, active, requires_documents, document_hint) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, b.name, b.description || '', b.categoryId, Number(b.price) || 0, b.icon || 'FileText', b.color || 'emerald', b.active !== false ? 1 : 0, b.requiresDocuments ? 1 : 0, b.documentHint || null]
  );
  const row = await queryOne('SELECT * FROM services WHERE id = ?', [id]);
  res.json(row);
});
app.put('/api/services/:id', auth, adminOnly, async (req: any, res) => {
  const s = await queryOne<any>('SELECT * FROM services WHERE id = ?', [req.params.id]);
  if (!s) return res.status(404).json({ error: 'Not found' });
  const b = req.body;
  await execute(
    'UPDATE services SET name = ?, description = ?, category_id = ?, price = ?, icon = ?, color = ?, active = ?, requires_documents = ?, document_hint = ? WHERE id = ?',
    [b.name ?? s.name, b.description ?? s.description, b.categoryId ?? s.category_id, b.price !== undefined ? Number(b.price) : s.price, b.icon ?? s.icon, b.color ?? s.color, b.active !== undefined ? (b.active ? 1 : 0) : s.active, b.requiresDocuments !== undefined ? (b.requiresDocuments ? 1 : 0) : s.requires_documents, b.documentHint ?? s.document_hint, req.params.id]
  );
  if (s.system_key === 'panFindCharge' && b.price !== undefined) {
    await execute('INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)', ['panFindCharge', String(b.price)]);
  }
  if (s.system_key === 'aadhaarPvcCharge' && b.price !== undefined) {
    await execute('INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)', ['aadhaarPvcCharge', String(b.price)]);
  }
  const row = await queryOne('SELECT * FROM services WHERE id = ?', [req.params.id]);
  res.json(row);
});
app.delete('/api/services/:id', auth, adminOnly, async (req, res) => {
  await execute('DELETE FROM services WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

console.log('[Server] Part 1 loaded');

// ==================== WALLET ====================
app.get('/api/wallet', auth, async (req: any, res) => {
  let wallet: any = await queryOne<any>('SELECT * FROM wallets WHERE user_id = ?', [req.user.id]);
  if (!wallet) {
    await execute('INSERT INTO wallets (user_id, balance, total_added, total_spent) VALUES (?, 0, 0, 0)', [req.user.id]);
    wallet = { user_id: req.user.id, balance: 0, total_added: 0, total_spent: 0 };
  }
  const txRows = await query('SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
  const transactions = txRows.map((t: any) => ({
    id: t.id,
    userId: t.user_id,
    type: t.type,
    amount: Number(t.amount),
    note: t.note,
    balanceAfter: Number(t.balance_after),
    createdAt: t.created_at,
  }));
  res.json({
    wallet: {
      userId: wallet.user_id,
      balance: Number(wallet.balance),
      totalAdded: Number(wallet.total_added),
      totalSpent: Number(wallet.total_spent),
    },
    transactions,
  });
});

app.get('/api/wallet/topup-requests', auth, async (req: any, res) => {
  let rows;
  if (req.user.role === 'ADMIN') {
    rows = await query<any>('SELECT * FROM topups ORDER BY created_at DESC');
  } else {
    rows = await query<any>('SELECT * FROM topups WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
  }
  const mapped = rows.map((t: any) => ({
    id: t.id,
    userId: t.user_id,
    userName: t.user_name,
    amount: Number(t.amount),
    utr: t.utr,
    status: t.status,
    note: t.note,
    reviewedAt: t.reviewed_at,
    reviewedBy: t.reviewed_by,
    createdAt: t.created_at,
  }));
  res.json(mapped);
});

app.post('/api/wallet/deduct', auth, adminOnly, async (req: any, res) => {
  const { userId, amount, note } = req.body;
  const amt = Number(amount);
  if (!amt || amt <= 0) return res.status(400).json({ error: 'Invalid amount' });
  const w = await queryOne<any>('SELECT * FROM wallets WHERE user_id = ?', [userId]);
  if (!w) return res.status(404).json({ error: 'Wallet not found' });
  if (w.balance < amt) return res.status(400).json({ error: 'Insufficient balance to deduct' });
  const newBal = w.balance - amt;
  await execute('UPDATE wallets SET balance = ?, total_spent = total_spent + ? WHERE user_id = ?', [newBal, amt, userId]);
  await execute(
    'INSERT INTO wallet_transactions (id, user_id, type, amount, note, balance_after) VALUES (?, ?, ?, ?, ?, ?)',
    [uid('tx'), userId, 'DEBIT', amt, note || 'Admin deduction', newBal]
  );
  await notify(userId, 'Wallet updated', 'Rs ' + amt + ' deducted from your wallet.');
  const updated = await queryOne('SELECT * FROM wallets WHERE user_id = ?', [userId]);
  res.json(updated);
});

app.get('/api/wallet/:userId', auth, adminOnly, async (req, res) => {
  let w: any = await queryOne<any>('SELECT * FROM wallets WHERE user_id = ?', [req.params.userId]);
  if (!w) w = { user_id: req.params.userId, balance: 0, total_added: 0, total_spent: 0 };
  const txRows = await query('SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC', [req.params.userId]);
  const txns = txRows.map((t: any) => ({
    id: t.id,
    userId: t.user_id,
    type: t.type,
    amount: Number(t.amount),
    note: t.note,
    balanceAfter: Number(t.balance_after),
    createdAt: t.created_at,
  }));
  res.json({
    wallet: {
      userId: w.user_id,
      balance: Number(w.balance),
      totalAdded: Number(w.total_added),
      totalSpent: Number(w.total_spent),
    },
    transactions: txns,
  });
});

app.post('/api/wallet/add', auth, adminOnly, async (req: any, res) => {
  const { userId, amount, note } = req.body;
  const amt = Number(amount);
  if (!amt || amt <= 0) return res.status(400).json({ error: 'Invalid amount' });
  let w = await queryOne<any>('SELECT * FROM wallets WHERE user_id = ?', [userId]);
  if (!w) {
    await execute('INSERT INTO wallets (user_id, balance, total_added, total_spent) VALUES (?, 0, 0, 0)', [userId]);
    w = { balance: 0 };
  }
  const newBal = w.balance + amt;
  await execute('UPDATE wallets SET balance = ?, total_added = total_added + ? WHERE user_id = ?', [newBal, amt, userId]);
  await execute(
    'INSERT INTO wallet_transactions (id, user_id, type, amount, note, balance_after) VALUES (?, ?, ?, ?, ?, ?)',
    [uid('tx'), userId, 'CREDIT', amt, note || 'Admin credit', newBal]
  );
  await notify(userId, 'Wallet updated', 'Rs ' + amt + ' added to your wallet.');
  const updated = await queryOne('SELECT * FROM wallets WHERE user_id = ?', [userId]);
  res.json(updated);
});

// ==================== TOPUP REQUESTS ====================
app.post('/api/wallet/topup-request', auth, async (req: any, res) => {
  if (req.user.role !== 'CUSTOMER') return res.status(403).json({ error: 'Customer only' });
  const amount = Number(req.body.amount);
  const utr = String(req.body.utr || '').trim();
  const minSetting = await queryOne<any>('SELECT value FROM settings WHERE `key` = ?', ['minTopup']);
  const maxSetting = await queryOne<any>('SELECT value FROM settings WHERE `key` = ?', ['maxTopup']);
  const min = Number(minSetting?.value) || 100;
  const max = Number(maxSetting?.value) || 50000;
  if (!amount || amount < min) return res.status(400).json({ error: 'Minimum top-up is Rs ' + min });
  if (amount > max) return res.status(400).json({ error: 'Maximum top-up is Rs ' + max });
  if (!utr || utr.length < 6) return res.status(400).json({ error: 'Enter a valid UTR' });
  const id = uid('top');
  await execute(
    'INSERT INTO topups (id, user_id, user_name, amount, utr, status) VALUES (?, ?, ?, ?, ?, ?)',
    [id, req.user.id, req.user.name, amount, utr, 'PENDING']
  );
  await notify(req.user.id, 'Top-up request submitted', 'Your top-up of Rs ' + amount + ' is pending admin approval.');
  const admins = await query<any>('SELECT id FROM users WHERE role = ?', ['ADMIN']);
  for (const a of admins) await notify(a.id, 'New top-up request', req.user.name + ' requested Rs ' + amount + ' (UTR: ' + utr + ').');
  const topup = await queryOne('SELECT * FROM topups WHERE id = ?', [id]);
  res.json(topup);
});

app.post('/api/wallet/topup-requests/:id/approve', auth, adminOnly, async (req: any, res) => {
  const t = await queryOne<any>('SELECT * FROM topups WHERE id = ?', [req.params.id]);
  if (!t) return res.status(404).json({ error: 'Not found' });
  if (t.status !== 'PENDING') return res.status(400).json({ error: 'Already processed' });
  let w = await queryOne<any>('SELECT * FROM wallets WHERE user_id = ?', [t.user_id]);
  if (!w) {
    await execute('INSERT INTO wallets (user_id, balance, total_added, total_spent) VALUES (?, 0, 0, 0)', [t.user_id]);
    w = { balance: 0 };
  }
  const newBal = Number(w.balance) + Number(t.amount);
  await execute('UPDATE wallets SET balance = ?, total_added = total_added + ? WHERE user_id = ?', [newBal, t.amount, t.user_id]);
  await execute(
    'INSERT INTO wallet_transactions (id, user_id, type, amount, note, balance_after) VALUES (?, ?, ?, ?, ?, ?)',
    [uid('tx'), t.user_id, 'CREDIT', t.amount, 'Top-up approved (UTR: ' + t.utr + ')', newBal]
  );
  await execute('UPDATE topups SET status = ?, reviewed_at = NOW(), reviewed_by = ? WHERE id = ?', ['APPROVED', req.user.id, t.id]);
  await notify(t.user_id, 'Wallet topped up', 'Rs ' + t.amount + ' added to your wallet.');
  const updated = await queryOne('SELECT * FROM topups WHERE id = ?', [t.id]);
  res.json(updated);
});

app.post('/api/wallet/topup-requests/:id/reject', auth, adminOnly, async (req: any, res) => {
  const t = await queryOne<any>('SELECT * FROM topups WHERE id = ?', [req.params.id]);
  if (!t) return res.status(404).json({ error: 'Not found' });
  if (t.status !== 'PENDING') return res.status(400).json({ error: 'Already processed' });
  const note = req.body.note || 'Rejected by admin';
  await execute('UPDATE topups SET status = ?, note = ?, reviewed_at = NOW(), reviewed_by = ? WHERE id = ?', ['REJECTED', note, req.user.id, t.id]);
  await notify(t.user_id, 'Top-up rejected', 'Your top-up of Rs ' + t.amount + ' was rejected. ' + note);
  const updated = await queryOne('SELECT * FROM topups WHERE id = ?', [t.id]);
  res.json(updated);
});

app.delete('/api/wallet/topup-requests/:id', auth, adminOnly, async (req, res) => {
  await execute('DELETE FROM topups WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ==================== ORDERS ====================
app.get('/api/orders', auth, async (req: any, res) => {
  let rows;
  if (req.user.role === 'ADMIN') {
    rows = await query(`
      SELECT o.*, 
        (SELECT JSON_ARRAYAGG(JSON_OBJECT('status', status, 'at', created_at, 'note', note)) 
         FROM order_timeline WHERE order_id = o.id) as timeline
      FROM orders o
      ORDER BY o.created_at DESC
    `);
  } else {
    rows = await query(`
      SELECT o.*, 
        (SELECT JSON_ARRAYAGG(JSON_OBJECT('status', status, 'at', created_at, 'note', note)) 
         FROM order_timeline WHERE order_id = o.id) as timeline
      FROM orders o
      WHERE o.customer_id = ?
      ORDER BY o.created_at DESC
    `, [req.user.id]);
  }
  const parsed = rows.map((r: any) => ({
    id: r.id,
    customerId: r.customer_id,
    customerName: r.customer_name,
    serviceId: r.service_id,
    serviceName: r.service_name,
    amount: Number(r.amount),
    status: r.status,
    formData: typeof r.form_data === 'string' ? JSON.parse(r.form_data) : (r.form_data || {}),
    adminNote: r.admin_note || '',
    refunded: r.refunded === 1,
    timeline: typeof r.timeline === 'string' ? JSON.parse(r.timeline) : (r.timeline || []),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
  res.json(parsed);
});

app.get('/api/orders/:id', auth, async (req: any, res) => {
  const o = await queryOne<any>('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!o) return res.status(404).json({ error: 'Not found' });
  if (req.user.role !== 'ADMIN' && o.customer_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const timeline = await query('SELECT status, created_at as at, note FROM order_timeline WHERE order_id = ? ORDER BY created_at', [o.id]);
  const documents = await query('SELECT * FROM order_documents WHERE order_id = ?', [o.id]);
  const order = {
    id: o.id,
    customerId: o.customer_id,
    customerName: o.customer_name,
    serviceId: o.service_id,
    serviceName: o.service_name,
    amount: Number(o.amount),
    status: o.status,
    formData: typeof o.form_data === 'string' ? JSON.parse(o.form_data) : (o.form_data || {}),
    adminNote: o.admin_note || '',
    refunded: o.refunded === 1,
    timeline: timeline.map((t: any) => ({ status: t.status, at: t.at, note: t.note })),
    createdAt: o.created_at,
    updatedAt: o.updated_at,
  };
  res.json({ order, documents });
});

app.post('/api/orders', auth, async (req: any, res) => {
  if (req.user.role !== 'CUSTOMER') return res.status(403).json({ error: 'Customer only' });
  const { serviceId, formData, documents } = req.body;
  const svc = await queryOne<any>('SELECT * FROM services WHERE id = ? AND active = 1', [serviceId]);
  if (!svc) return res.status(400).json({ error: 'Service unavailable' });
  const price = svc.price;
  const w = await queryOne<any>('SELECT * FROM wallets WHERE user_id = ?', [req.user.id]);
  if (!w || Number(w.balance) < Number(price)) return res.status(400).json({ error: 'Insufficient wallet balance' });
  const orderId = newOrderId();
  await execute(
    'INSERT INTO orders (id, customer_id, customer_name, service_id, service_name, amount, status, form_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [orderId, req.user.id, req.user.name, svc.id, svc.name, price, 'PENDING', JSON.stringify(formData || {})]
  );
  await execute(
    'INSERT INTO order_timeline (order_id, status, note) VALUES (?, ?, ?)',
    [orderId, 'PENDING', 'Order created']
  );
  const newBal = Number(w.balance) - Number(price);
  await execute('UPDATE wallets SET balance = ?, total_spent = total_spent + ? WHERE user_id = ?', [newBal, price, req.user.id]);
  await execute(
    'INSERT INTO wallet_transactions (id, user_id, type, amount, note, balance_after) VALUES (?, ?, ?, ?, ?, ?)',
    [uid('tx'), req.user.id, 'DEBIT', price, 'Order ' + orderId + ' - ' + svc.name, newBal]
  );
  for (const d of (documents || [])) {
    await execute(
      'INSERT INTO order_documents (id, order_id, name, size, type, data) VALUES (?, ?, ?, ?, ?, ?)',
      [uid('doc'), orderId, d.name, d.size || 0, d.type || '', d.data || '']
    );
  }
  await notify(req.user.id, 'Order created', 'Your order ' + orderId + ' for ' + svc.name + ' has been placed.', orderId);
  const admins = await query<any>('SELECT id FROM users WHERE role = ?', ['ADMIN']);
  for (const a of admins) await notify(a.id, 'New order', req.user.name + ' placed ' + svc.name + ' (' + orderId + ').', orderId);
  const order = await queryOne('SELECT * FROM orders WHERE id = ?', [orderId]);
  res.json(order);
});

app.put('/api/orders/:id/status', auth, adminOnly, async (req: any, res) => {
  const o = await queryOne<any>('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!o) return res.status(404).json({ error: 'Not found' });
  const { status, note, refund } = req.body;
  const previousStatus = o.status;

  if (status) {
    await execute('UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?', [status, req.params.id]);
    await execute('INSERT INTO order_timeline (order_id, status, note) VALUES (?, ?, ?)', [req.params.id, status, note || '']);
  }
  if (note !== undefined) await execute('UPDATE orders SET admin_note = ? WHERE id = ?', [note, req.params.id]);

  if (status === 'REJECTED' && previousStatus !== 'REJECTED') {
    if (refund === true) {
      const w = await queryOne<any>('SELECT * FROM wallets WHERE user_id = ?', [o.customer_id]);
      if (w) {
        const newBal = Number(w.balance) + Number(o.amount);
        const newSpent = Math.max(0, Number(w.total_spent) - Number(o.amount));
        await execute('UPDATE wallets SET balance = ?, total_spent = ? WHERE user_id = ?', [newBal, newSpent, o.customer_id]);
        await execute(
          'INSERT INTO wallet_transactions (id, user_id, type, amount, note, balance_after) VALUES (?, ?, ?, ?, ?, ?)',
          [uid('tx'), o.customer_id, 'CREDIT', o.amount, 'Refund for ' + o.id + ' (' + o.service_name + ')', newBal]
        );
      }
      await execute('UPDATE orders SET refunded = 1 WHERE id = ?', [o.id]);
      await notify(o.customer_id, 'Order ' + status, 'Order ' + o.id + ' rejected. Rs ' + o.amount + ' REFUNDED to your wallet.', o.id);
    } else {
      await execute('UPDATE orders SET refunded = 0 WHERE id = ?', [o.id]);
      await notify(o.customer_id, 'Order ' + status, 'Order ' + o.id + ' rejected. NOT REFUNDED.', o.id);
    }
  } else {
    await notify(o.customer_id, 'Order ' + status, 'Your order ' + o.id + ' is now ' + status + '.', o.id);
  }

  const updated = await queryOne('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  res.json(updated);
});

app.delete('/api/orders/:id', auth, adminOnly, async (req, res) => {
  await execute('DELETE FROM order_documents WHERE order_id = ?', [req.params.id]);
  await execute('DELETE FROM order_timeline WHERE order_id = ?', [req.params.id]);
  await execute('DELETE FROM orders WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

console.log('[Server] Part 2 loaded');

// ==================== PAN FIND ====================
app.get('/api/pan/charge', auth, async (_req, res) => {
  const s = await queryOne<any>('SELECT value FROM settings WHERE `key` = ?', ['panFindCharge']);
  res.json({ charge: Number(s?.value) || 15 });
});

app.get('/api/pan/history', auth, async (req: any, res) => {
  let rows;
  if (req.user.role === 'ADMIN') {
    rows = await query('SELECT * FROM pan_finds ORDER BY created_at DESC');
  } else {
    rows = await query('SELECT * FROM pan_finds WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
  }
  const parsed = rows.map((r: any) => ({
    id: r.id,
    orderId: r.order_id,
    userId: r.user_id,
    userName: r.user_name,
    aadhaar: r.aadhaar,
    pan: r.pan,
    nameOnPan: r.name_on_pan,
    panStatus: r.pan_status,
    charge: Number(r.charge),
    status: r.status,
    note: r.note,
    refunded: r.refunded === 1,
    apiTried: r.api_tried === 1,
    apiResponse: typeof r.api_response === 'string' ? JSON.parse(r.api_response) : r.api_response,
    createdAt: r.created_at,
  }));
  res.json(parsed);
});

app.post('/api/pan/request', auth, async (req: any, res) => {
  if (req.user.role !== 'CUSTOMER') return res.status(403).json({ error: 'Customer only' });
  const digits = String(req.body.aadhaar || '').replace(/\D/g, '');
  if (digits.length !== 12) return res.status(400).json({ error: 'Aadhaar must be 12 digits' });
  const panSvc = await queryOne<any>('SELECT * FROM services WHERE id = ?', ['svc-pan-find']);
  const settingCharge = await queryOne<any>('SELECT value FROM settings WHERE `key` = ?', ['panFindCharge']);
  const charge = Number(panSvc?.price) || Number(settingCharge?.value) || 15;
  const w = await queryOne<any>('SELECT * FROM wallets WHERE user_id = ?', [req.user.id]);
  if (!w || Number(w.balance) < charge) return res.status(400).json({ error: 'Insufficient wallet balance. Need Rs ' + charge });

  const orderId = newOrderId();
  await execute(
    'INSERT INTO orders (id, customer_id, customer_name, service_id, service_name, amount, status, form_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [orderId, req.user.id, req.user.name, 'pan-find', 'PAN Find', charge, 'PENDING', JSON.stringify({ aadhaar: digits })]
  );
  await execute('INSERT INTO order_timeline (order_id, status, note) VALUES (?, ?, ?)', [orderId, 'PENDING', 'PAN Find request created']);

  const newBal = Number(w.balance) - charge;
  await execute('UPDATE wallets SET balance = ?, total_spent = total_spent + ? WHERE user_id = ?', [newBal, charge, req.user.id]);
  await execute(
    'INSERT INTO wallet_transactions (id, user_id, type, amount, note, balance_after) VALUES (?, ?, ?, ?, ?, ?)',
    [uid('tx'), req.user.id, 'DEBIT', charge, 'PAN Find - Order ' + orderId, newBal]
  );

  const recId = uid('pan');
  await execute(
    'INSERT INTO pan_finds (id, order_id, user_id, user_name, aadhaar, charge, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [recId, orderId, req.user.id, req.user.name, digits, charge, 'PENDING']
  );

  await notify(req.user.id, 'PAN Find submitted', 'Fetching PAN from server...', orderId);

  // API Call
  console.log('[PAN] Auto-fetching for order', orderId);
  const apiResult = await fetchPanFromApi(digits, orderId);
  const apiResponseJson = JSON.stringify(apiResult.raw || { message: apiResult.message });
  await execute('UPDATE pan_finds SET api_tried = 1, api_response = ? WHERE id = ?', [apiResponseJson, recId]);

  if (apiResult.success && apiResult.pan) {
    await execute('UPDATE pan_finds SET pan = ?, pan_status = ?, status = ?, note = ? WHERE id = ?', [apiResult.pan, 'ACTIVE', 'APPROVED', 'Auto-fetched via API', recId]);
    await execute('UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?', ['COMPLETED', orderId]);
    await execute('INSERT INTO order_timeline (order_id, status, note) VALUES (?, ?, ?)', [orderId, 'COMPLETED', 'PAN: ' + apiResult.pan + ' (auto)']);
    await notify(req.user.id, 'PAN Found!', 'Your PAN: ' + apiResult.pan + ' - check PAN Find page.', orderId);
    const admins = await query<any>('SELECT id FROM users WHERE role = ?', ['ADMIN']);
    for (const a of admins) await notify(a.id, 'PAN auto-fetched', req.user.name + ' -> PAN ' + apiResult.pan, orderId);
    console.log('[PAN] Success:', apiResult.pan);
  } else {
    await execute('UPDATE pan_finds SET status = ?, note = ?, refunded = 1 WHERE id = ?', ['REJECTED', 'Failed: ' + (apiResult.message || 'Unknown'), recId]);
    const wallet2 = await queryOne<any>('SELECT * FROM wallets WHERE user_id = ?', [req.user.id]);
    const refundBal = Number(wallet2.balance) + charge;
    const refundSpent = Math.max(0, Number(wallet2.total_spent) - charge);
    await execute('UPDATE wallets SET balance = ?, total_spent = ? WHERE user_id = ?', [refundBal, refundSpent, req.user.id]);
    await execute(
      'INSERT INTO wallet_transactions (id, user_id, type, amount, note, balance_after) VALUES (?, ?, ?, ?, ?, ?)',
      [uid('tx'), req.user.id, 'CREDIT', charge, 'Refund for PAN Find ' + orderId + ' (API failed)', refundBal]
    );
    await execute('UPDATE orders SET status = ?, refunded = 1, updated_at = NOW() WHERE id = ?', ['REJECTED', orderId]);
    await execute('INSERT INTO order_timeline (order_id, status, note) VALUES (?, ?, ?)', [orderId, 'REJECTED', 'API failed - auto refund']);
    await notify(req.user.id, 'PAN Find failed', 'Something went wrong. Rs ' + charge + ' has been refunded. Please contact admin.', orderId);
    const admins = await query<any>('SELECT id FROM users WHERE role = ?', ['ADMIN']);
    for (const a of admins) await notify(a.id, 'PAN Find failed (auto-refunded)', req.user.name + ' - API failed: ' + (apiResult.message || ''), orderId);
    console.log('[PAN] Failed & refunded:', apiResult.message);
  }

  const rec = await queryOne('SELECT * FROM pan_finds WHERE id = ?', [recId]);
  res.json(rec);
});

app.put('/api/pan/requests/:id', auth, adminOnly, async (req: any, res) => {
  const p = await queryOne<any>('SELECT * FROM pan_finds WHERE id = ?', [req.params.id]);
  if (!p) return res.status(404).json({ error: 'Not found' });

  if (req.body.status === 'REJECTED') {
    const note = req.body.note || 'Rejected by admin';
    const refund = req.body.refund === true;
    await execute('UPDATE pan_finds SET status = ?, note = ?, refunded = ? WHERE id = ?', ['REJECTED', note, refund ? 1 : 0, p.id]);

    if (refund) {
      const w = await queryOne<any>('SELECT * FROM wallets WHERE user_id = ?', [p.user_id]);
      if (w) {
        const newBal = Number(w.balance) + Number(p.charge);
        const newSpent = Math.max(0, Number(w.total_spent) - Number(p.charge));
        await execute('UPDATE wallets SET balance = ?, total_spent = ? WHERE user_id = ?', [newBal, newSpent, p.user_id]);
        await execute(
          'INSERT INTO wallet_transactions (id, user_id, type, amount, note, balance_after) VALUES (?, ?, ?, ?, ?, ?)',
          [uid('tx'), p.user_id, 'CREDIT', p.charge, 'Refund for PAN Find (' + p.id + ')', newBal]
        );
      }
      await notify(p.user_id, 'PAN Find rejected', 'PAN Find request rejected. Rs ' + p.charge + ' REFUNDED to your wallet.');
    } else {
      await notify(p.user_id, 'PAN Find rejected', 'PAN Find rejected. NOT REFUNDED.');
    }

    if (p.order_id) {
      await execute('UPDATE orders SET status = ?, refunded = ?, updated_at = NOW() WHERE id = ?', ['REJECTED', refund ? 1 : 0, p.order_id]);
      await execute('INSERT INTO order_timeline (order_id, status, note) VALUES (?, ?, ?)', [p.order_id, 'REJECTED', note]);
    }
  } else {
    const pan = req.body.pan ? String(req.body.pan).toUpperCase() : p.pan;
    const nameOnPan = req.body.nameOnPan || p.name_on_pan;
    const panStatus = req.body.panStatus || p.pan_status;
    const note = req.body.note || p.note;
    await execute('UPDATE pan_finds SET pan = ?, name_on_pan = ?, pan_status = ?, status = ?, note = ? WHERE id = ?', [pan, nameOnPan, panStatus, 'APPROVED', note, p.id]);
    await notify(p.user_id, 'PAN Find approved', 'Your PAN: ' + pan + ' - check PAN Find page.');
    if (p.order_id) {
      await execute('UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?', ['COMPLETED', p.order_id]);
      await execute('INSERT INTO order_timeline (order_id, status, note) VALUES (?, ?, ?)', [p.order_id, 'COMPLETED', 'PAN: ' + pan]);
    }
  }

  const updated = await queryOne('SELECT * FROM pan_finds WHERE id = ?', [req.params.id]);
  res.json(updated);
});

app.delete('/api/pan/requests/:id', auth, adminOnly, async (req, res) => {
  const p = await queryOne<any>('SELECT * FROM pan_finds WHERE id = ?', [req.params.id]);
  if (p?.order_id) {
    await execute('DELETE FROM order_timeline WHERE order_id = ?', [p.order_id]);
    await execute('DELETE FROM orders WHERE id = ?', [p.order_id]);
  }
  await execute('DELETE FROM pan_finds WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ==================== AADHAAR PVC ====================
app.post('/api/aadhaar-pvc/request', auth, async (req: any, res) => {
  if (req.user.role !== 'CUSTOMER') return res.status(403).json({ error: 'Customer only' });
  const pvcSvc = await queryOne<any>('SELECT * FROM services WHERE id = ?', ['svc-aadhaar-pvc']);
  const settingCharge = await queryOne<any>('SELECT value FROM settings WHERE `key` = ?', ['aadhaarPvcCharge']);
  const charge = Number(pvcSvc?.price) || Number(settingCharge?.value) || 141;
  const w = await queryOne<any>('SELECT * FROM wallets WHERE user_id = ?', [req.user.id]);
  if (!w || Number(w.balance) < charge) return res.status(400).json({ error: 'Insufficient wallet balance. Need Rs ' + charge });

  const orderId = newOrderId();
  const fileName = req.body.fileName || 'aadhaar.pdf';
  await execute(
    'INSERT INTO orders (id, customer_id, customer_name, service_id, service_name, amount, status, form_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [orderId, req.user.id, req.user.name, 'aadhaar-pvc', 'Aadhaar PVC Print', charge, 'COMPLETED', JSON.stringify({ fileName })]
  );
  await execute('INSERT INTO order_timeline (order_id, status, note) VALUES (?, ?, ?)', [orderId, 'COMPLETED', 'Auto-completed - PVC card generated']);

  const newBal = Number(w.balance) - charge;
  await execute('UPDATE wallets SET balance = ?, total_spent = total_spent + ? WHERE user_id = ?', [newBal, charge, req.user.id]);
  await execute(
    'INSERT INTO wallet_transactions (id, user_id, type, amount, note, balance_after) VALUES (?, ?, ?, ?, ?, ?)',
    [uid('tx'), req.user.id, 'DEBIT', charge, 'Aadhaar PVC Print - ' + orderId, newBal]
  );

  const recId = uid('apvc');
  await execute(
    'INSERT INTO aadhaar_pvc (id, order_id, user_id, user_name, user_email, file_name, charge, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [recId, orderId, req.user.id, req.user.name, req.user.email, fileName, charge, 'COMPLETED']
  );

  await notify(req.user.id, 'Aadhaar PVC created', 'Your PVC card PDF is ready to download.');
  const admins = await query<any>('SELECT id FROM users WHERE role = ?', ['ADMIN']);
  for (const a of admins) await notify(a.id, 'Aadhaar PVC order', req.user.name + ' generated a PVC card.');

  const order = await queryOne('SELECT * FROM orders WHERE id = ?', [orderId]);
  const rec = await queryOne('SELECT * FROM aadhaar_pvc WHERE id = ?', [recId]);
  res.json({ order, record: rec });
});

app.get('/api/aadhaar-pvc/requests', auth, async (req: any, res) => {
  let rows;
  if (req.user.role === 'ADMIN') {
    rows = await query('SELECT * FROM aadhaar_pvc ORDER BY created_at DESC');
  } else {
    rows = await query('SELECT * FROM aadhaar_pvc WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
  }
  const parsed = rows.map((r: any) => ({
    id: r.id,
    orderId: r.order_id,
    userId: r.user_id,
    userName: r.user_name,
    userEmail: r.user_email,
    fileName: r.file_name,
    charge: Number(r.charge),
    status: r.status,
    createdAt: r.created_at,
  }));
  res.json(parsed);
});

// ==================== CUSTOMERS ====================
app.get('/api/customers', auth, adminOnly, async (_req, res) => {
  const users = await query<any>('SELECT id, role, name, email, mobile, active, address, photo, created_at FROM users WHERE role = ?', ['CUSTOMER']);
  const result = [];
  for (const u of users) {
    const w = await queryOne<any>('SELECT * FROM wallets WHERE user_id = ?', [u.id]);
    const orderCount = await queryOne<any>('SELECT COUNT(*) as cnt FROM orders WHERE customer_id = ?', [u.id]);
    result.push({
      ...u,
      createdAt: u.created_at,
      wallet: w || { balance: 0, total_added: 0, total_spent: 0 },
      orderCount: orderCount?.cnt || 0,
    });
  }
  res.json(result);
});

app.put('/api/customers/:id', auth, adminOnly, async (req: any, res) => {
  const u = await queryOne<any>('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!u) return res.status(404).json({ error: 'Not found' });
  if (req.body.active !== undefined) {
    await execute('UPDATE users SET active = ? WHERE id = ?', [req.body.active ? 1 : 0, req.params.id]);
  }
  const updated = await queryOne<any>('SELECT * FROM users WHERE id = ?', [req.params.id]);
  const { password, ...safe } = updated;
  res.json(safe);
});

app.delete('/api/customers/:id', auth, adminOnly, async (req, res) => {
  const u = await queryOne<any>('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!u) return res.status(404).json({ error: 'Not found' });
  if (u.role === 'ADMIN') return res.status(400).json({ error: 'Cannot delete admin' });
  await execute('DELETE FROM wallet_transactions WHERE user_id = ?', [req.params.id]);
  await execute('DELETE FROM wallets WHERE user_id = ?', [req.params.id]);
  await execute('DELETE FROM order_documents WHERE order_id IN (SELECT id FROM orders WHERE customer_id = ?)', [req.params.id]);
  await execute('DELETE FROM order_timeline WHERE order_id IN (SELECT id FROM orders WHERE customer_id = ?)', [req.params.id]);
  await execute('DELETE FROM orders WHERE customer_id = ?', [req.params.id]);
  await execute('DELETE FROM notifications WHERE user_id = ?', [req.params.id]);
  await execute('DELETE FROM support_tickets WHERE user_id = ?', [req.params.id]);
  await execute('DELETE FROM topups WHERE user_id = ?', [req.params.id]);
  await execute('DELETE FROM pan_finds WHERE user_id = ?', [req.params.id]);
  await execute('DELETE FROM aadhaar_pvc WHERE user_id = ?', [req.params.id]);
  await execute('DELETE FROM users WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ==================== NOTIFICATIONS ====================
app.get('/api/notifications', auth, async (req: any, res) => {
  const rows = await query('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100', [req.user.id]);
  const parsed = rows.map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    title: r.title,
    message: r.message,
    orderId: r.order_id,
    read: r.read === 1,
    createdAt: r.created_at,
  }));
  res.json(parsed);
});

app.post('/api/notifications/read', auth, async (req: any, res) => {
  await execute('UPDATE notifications SET `read` = 1 WHERE user_id = ?', [req.user.id]);
  res.json({ ok: true });
});

// ==================== SUPPORT ====================
app.get('/api/support', auth, async (req: any, res) => {
  let rows;
  if (req.user.role === 'ADMIN') {
    rows = await query('SELECT * FROM support_tickets ORDER BY created_at DESC');
  } else {
    rows = await query('SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
  }
  const parsed = rows.map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    userName: r.user_name,
    subject: r.subject,
    message: r.message,
    orderId: r.order_id,
    status: r.status,
    createdAt: r.created_at,
  }));
  res.json(parsed);
});

app.post('/api/support', auth, async (req: any, res) => {
  const id = uid('sup');
  await execute(
    'INSERT INTO support_tickets (id, user_id, user_name, subject, message, order_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, req.user.id, req.user.name, req.body.subject, req.body.message, req.body.orderId || null, 'OPEN']
  );
  const admins = await query<any>('SELECT id FROM users WHERE role = ?', ['ADMIN']);
  for (const a of admins) await notify(a.id, 'New support request', req.user.name + ': ' + req.body.subject);
  const t = await queryOne('SELECT * FROM support_tickets WHERE id = ?', [id]);
  res.json(t);
});

app.put('/api/support/:id', auth, adminOnly, async (req, res) => {
  if (req.body.status) {
    await execute('UPDATE support_tickets SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
  }
  const t = await queryOne('SELECT * FROM support_tickets WHERE id = ?', [req.params.id]);
  res.json(t);
});

app.delete('/api/support/:id', auth, adminOnly, async (req, res) => {
  await execute('DELETE FROM support_tickets WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ==================== PROFILE ====================
app.put('/api/profile', auth, async (req: any, res) => {
  const { name, mobile, email, address, photo, password } = req.body;
  const updates: string[] = [];
  const values: any[] = [];
  if (name !== undefined) { updates.push('name = ?'); values.push(name); }
  if (mobile !== undefined) { updates.push('mobile = ?'); values.push(mobile); }
  if (email !== undefined) { updates.push('email = ?'); values.push(email); }
  if (address !== undefined) { updates.push('address = ?'); values.push(address); }
  if (photo !== undefined) { updates.push('photo = ?'); values.push(photo); }
  if (password) { updates.push('password = ?'); values.push(password); }
  if (updates.length > 0) {
    values.push(req.user.id);
    await execute('UPDATE users SET ' + updates.join(', ') + ' WHERE id = ?', values);
  }
  const u = await queryOne<any>('SELECT * FROM users WHERE id = ?', [req.user.id]);
  const { password: _, ...safe } = u;
  res.json(safe);
});

// ==================== SETTINGS ====================
app.get('/api/settings/public', auth, async (_req, res) => {
  const rows = await query<any>('SELECT `key`, value FROM settings');
  const settings: any = {};
  for (const r of rows) settings[r.key] = r.value;
  res.json({
    upiId: settings.upiId || '',
    payeeName: settings.payeeName || 'NovaServe',
    minTopup: Number(settings.minTopup) || 100,
    maxTopup: Number(settings.maxTopup) || 50000,
    aadhaarPvcCharge: Number(settings.aadhaarPvcCharge) || 141,
    panFindCharge: Number(settings.panFindCharge) || 15,
  });
});

app.put('/api/settings/upi', auth, adminOnly, async (req: any, res) => {
  const allowed = ['upiId', 'payeeName', 'minTopup', 'maxTopup', 'aadhaarPvcCharge', 'panFindCharge'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      await execute('INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)', [key, String(req.body[key])]);
    }
  }
  const rows = await query<any>('SELECT `key`, value FROM settings');
  const settings: any = {};
  for (const r of rows) settings[r.key] = r.value;
  res.json(settings);
});

// ==================== RESTORE SYSTEM SERVICES ====================
app.post('/api/services/restore-system', auth, adminOnly, async (req, res) => {
  const systemServices = [
    { id: 'svc-pan-find', name: 'PAN Find Service', description: 'Find PAN by Aadhaar number. Admin will process the request.', categoryId: 'cat-1', price: 15, icon: 'Search', color: 'amber', systemKey: 'panFindCharge' },
    { id: 'svc-aadhaar-pvc', name: 'Aadhaar PVC Print', description: 'Upload UIDAI e-Aadhaar PDF, get print-ready PVC card.', categoryId: 'cat-2', price: 141, icon: 'CreditCard', color: 'cyan', systemKey: 'aadhaarPvcCharge' },
  ];
  const restored: string[] = [];
  for (const sys of systemServices) {
    const exists = await queryOne('SELECT id FROM services WHERE id = ?', [sys.id]);
    if (!exists) {
      await execute(
        'INSERT INTO services (id, name, description, category_id, price, icon, color, active, is_system, system_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [sys.id, sys.name, sys.description, sys.categoryId, sys.price, sys.icon, sys.color, 1, 1, sys.systemKey]
      );
      restored.push(sys.name);
    }
  }
  if (restored.length > 0) {
    res.json({ restored, message: restored.length + ' service(s) restored: ' + restored.join(', ') });
  } else {
    res.json({ restored: [], message: 'All system services already exist' });
  }
});

// ==================== ADMIN STATS ====================
app.get('/api/admin/stats', auth, adminOnly, async (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const customers = await queryOne<any>('SELECT COUNT(*) as cnt FROM users WHERE role = ?', ['CUSTOMER']);
  const activeServices = await queryOne<any>('SELECT COUNT(*) as cnt FROM services WHERE active = 1');
  const totalOrders = await queryOne<any>('SELECT COUNT(*) as cnt FROM orders');
  const pendingOrders = await queryOne<any>('SELECT COUNT(*) as cnt FROM orders WHERE status = ?', ['PENDING']);
  const completedOrders = await queryOne<any>('SELECT COUNT(*) as cnt FROM orders WHERE status = ?', ['COMPLETED']);
  const todayOrders = await queryOne<any>('SELECT COUNT(*) as cnt FROM orders WHERE DATE(created_at) = ?', [today]);
  const revenue = await queryOne<any>('SELECT COALESCE(SUM(amount),0) as total FROM orders WHERE status IN (?, ?)', ['PROCESSING', 'COMPLETED']);
  const rejectedOrders = await queryOne<any>('SELECT COUNT(*) as cnt FROM orders WHERE status = ?', ['REJECTED']);
  const totalRefunded = await queryOne<any>('SELECT COALESCE(SUM(amount),0) as total FROM orders WHERE status = ? AND refunded = 1', ['REJECTED']);
  const pendingRefunds = await queryOne<any>('SELECT COUNT(*) as cnt FROM orders WHERE status = ? AND refunded != 1', ['REJECTED']);
  const pendingSupport = await queryOne<any>('SELECT COUNT(*) as cnt FROM support_tickets WHERE status = ?', ['OPEN']);
  const pendingPanFinds = await queryOne<any>('SELECT COUNT(*) as cnt FROM pan_finds WHERE status = ?', ['PENDING']);

  res.json({
    totalCustomers: customers?.cnt || 0,
    activeServices: activeServices?.cnt || 0,
    totalOrders: totalOrders?.cnt || 0,
    pendingOrders: pendingOrders?.cnt || 0,
    completedOrders: completedOrders?.cnt || 0,
    todayOrders: todayOrders?.cnt || 0,
    totalRevenue: Number(revenue?.total) || 0,
    rejectedOrders: rejectedOrders?.cnt || 0,
    totalRefunded: Number(totalRefunded?.total) || 0,
    pendingRefunds: pendingRefunds?.cnt || 0,
    pendingSupport: pendingSupport?.cnt || 0,
    pendingPanFinds: pendingPanFinds?.cnt || 0,
  });
});

// ==================== AI ASSISTANT ====================
app.post('/api/assistant', auth, async (req: any, res) => {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return res.status(500).json({ error: 'Gemini API key not configured' });
    const ai = new GoogleGenAI({ apiKey: key });
    const services = await query<any>('SELECT name, price FROM services WHERE active = 1');
    const context = 'You are a helpful assistant for NovaServe. Services: ' + services.map((s: any) => s.name + ' (Rs ' + s.price + ')').join(', ') + '.';
    const response = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: context + '\n\nUser: ' + req.body.message });
    res.json({ reply: response.text });
  } catch (e: any) { res.status(500).json({ error: e.message || 'Assistant failed' }); }
});

// ==================== PAN API HELPER ====================
async function fetchPanFromApi(aadhaar: string, orderId: string): Promise<any> {
  try {
    const apiKey = process.env.FINPAY_API_KEY;
    if (!apiKey) return { success: false, message: 'API key not configured' };
    const url = 'https://api.finpayultra.com/api/aadhartopanfind?api_key=' + encodeURIComponent(apiKey) + '&orderid=' + encodeURIComponent(orderId) + '&Aadhaarid=' + encodeURIComponent(aadhaar);
    console.log('[PAN API] Calling for Aadhaar XXXX' + aadhaar.slice(-4));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const resp = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' }, signal: controller.signal });
    clearTimeout(timeout);
    const data: any = await resp.json().catch(() => ({}));
    console.log('[PAN API] Response:', JSON.stringify(data));
    if (data?.status === 'SUCCESS' && data?.data?.Status === 'SUCCESS') {
      const pan = data?.data?.PanNumber || data?.data?.PAN || '';
      if (pan && /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(String(pan).toUpperCase())) {
        return { success: true, pan: String(pan).toUpperCase(), message: data?.data?.Message || 'PAN found', raw: data };
      }
    }
    if (data?.status === 'SUCCESS' && data?.data?.Status !== 'SUCCESS') {
      return { success: false, message: data?.data?.Message || 'PAN not found', raw: data };
    }
    return { success: false, message: data?.message || 'API error', raw: data };
  } catch (e: any) {
    console.error('[PAN API] Error:', e?.message || e);
    if (e?.name === 'AbortError') return { success: false, message: 'API timeout' };
    return { success: false, message: e?.message || 'Network error' };
  }
}

console.log('[Server] Part 3 loaded');

// ==================== STATIC FILES ====================
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

app.listen(PORT, async () => {
  console.log('NovaServe running on http://localhost:' + PORT);
  await initOrderSerial();
});