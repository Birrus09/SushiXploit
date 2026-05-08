const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 3000;
const logPath = path.join(__dirname, 'log.txt');

// Overwrite log file at each execution
fs.writeFileSync(logPath, `SushiXploit order log started ${new Date().toISOString()}\n`, 'utf8');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));
app.use('/pics', express.static(path.join(__dirname, 'pics')));

const authStore = new Map();
const ORDERS = new Map(); // Map of tableId -> array of orders

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  let rawIp;
  if (forwarded) {
    rawIp = forwarded.split(',')[0].trim();
  } else {
    rawIp = req.socket.remoteAddress;
  }
  if (!rawIp) return 'unknown';
  return rawIp.replace(/^::ffff:/, '');
}

function createUniqueCode() {
  return crypto.randomBytes(16).toString('hex');
}

app.get('/', (req, res) => {
  const requestCode = req.cookies['auth-code'];
  const auth = requestCode && authStore.get(requestCode);

  if (!auth) {
    res.sendFile(path.join(__dirname, 'public', 'select-table.html'));
    return;
  }

  res.sendFile(path.join(__dirname, 'public', 'order.html'));
});

app.get('/auth_create', (req, res) => {
  const existingCode = req.cookies['auth-code'];
  if (existingCode) {
    return res.redirect('/');
  }

  const tableId = String(req.query.tableId || '').trim();
  if (!tableId || isNaN(Number(tableId))) {
    res.sendFile(path.join(__dirname, 'public', 'auth_create.html'));
    return;
  }

  const code = createUniqueCode();
  authStore.set(code, { tableId, createdAt: new Date().toISOString() });

  res.cookie('auth-code', code, { httpOnly: true });
  res.redirect('/');
});

app.post('/order/:tableId', (req, res) => {
  const tableId = String(req.params.tableId || '').trim();
  const requestCode = req.cookies['auth-code'];
  const auth = requestCode && authStore.get(requestCode);

  if (!auth || !requestCode) {
    return res.status(403).json({ error: 'Select Table first' });
  }

  if (auth.tableId !== tableId) {
    return res.status(403).json({ error: 'Orders for other tables are not allowed and are not possible to make thanks to our incredible security' });
  }

  const { type, count, notes } = req.body;
  
  // Validate request
  if (typeof count !== 'number' || count <= 0 || typeof type !== 'string' || !type.trim()) {
    return res.status(400).json({ error: 'Request JSON must include numeric count > 0 and string type.' });
  }

  if (notes !== undefined && typeof notes !== 'string') {
    return res.status(400).json({ error: 'Notes must be a string.' });
  }

  const ip = getClientIp(req);
  
  // Create order object
  const order = {
    tableId,
    type: type.trim(),
    count: count,
    status: 'sent',
    notes: notes || null,
    placedAt: new Date().toISOString(),
  };

  // Store order by table
  if (!ORDERS.has(tableId)) {
    ORDERS.set(tableId, []);
  }
  ORDERS.get(tableId).push(order);

  // Append received order to the log file
  const now = new Date();
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const noteText = order.notes || '';
  fs.appendFileSync(logPath, `${hour}:${minute}  -  ${order.type}, ${order.count}, \t\t ${noteText}\n`, 'utf8');

  console.log('Received order:', JSON.stringify(order, null, 2));

  res.json({ message: 'Order accepted', order });
});



//utility
app.get('/table_status/:tableId', (req, res) => {
  const tableId = String(req.params.tableId || '').trim();
  const requestCode = req.cookies['auth-code'];
  const auth = requestCode && authStore.get(requestCode);

  if (!auth || auth.tableId !== tableId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const orders = ORDERS.get(tableId) || [];
  
  res.json({
    tableId,
    status: orders.length === 0 ? 'no_orders' : 'has_orders',
    orders: orders
  });
});

app.get('/auth_status', (req, res) => {
  const requestCode = req.cookies['auth-code'];
  const auth = requestCode && authStore.get(requestCode);
  if (!auth) {
    return res.json({ authorized: false, message: 'No auth record for your code.' });
  }
  const ip = getClientIp(req);
  res.json({ authorized: true, ip, tableId: auth.tableId, code: requestCode, createdAt: auth.createdAt });
});



app.listen(port, '127.0.0.1', () => {
  console.log(`SushiXploit server running on http://127.0.0.1:${port}`);
});
