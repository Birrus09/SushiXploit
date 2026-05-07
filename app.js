const express = require('express');
const path = require('path');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

const authStore = new Map();
const ORDERS = [];

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
  const ip = getClientIp(req);
  const auth = authStore.get(ip);

  if (!auth) {
    res.sendFile(path.join(__dirname, 'public', 'select-table.html'));
    return;
  }

  res.sendFile(path.join(__dirname, 'public', 'order.html'));
});

app.get('/auth_create', (req, res) => {
  const tableId = String(req.query.tableId || '').trim();
  if (!tableId || isNaN(Number(tableId))) {
    res.sendFile(path.join(__dirname, 'public', 'auth_create.html'));
    return;
  }

  const ip = getClientIp(req);
  const code = createUniqueCode();
  authStore.set(ip, { tableId, code, createdAt: new Date().toISOString() });

  res.cookie('auth-code', code, { httpOnly: true });
  res.redirect('/');
});

app.post('/order/:tableId', (req, res) => {
  const tableId = String(req.params.tableId || '').trim();
  const ip = getClientIp(req);
  const auth = authStore.get(ip);
  const requestCode = req.cookies['auth-code'];

  if (!auth || !requestCode) {
    return res.status(403).json({ error: 'Select Table first' });
  }

  if (auth.code !== requestCode) {
    return res.status(403).json({ error: 'Wrong Table. there\'s no way you can bypass this security check.' });
  }

  if (auth.tableId !== tableId) {
    return res.status(403).json({ error: 'Orders for other tables are not allowed and are not possible to make thanks to our incredible security' });
  }

  const { count, type } = req.body;
  if (typeof count !== 'number' || count <= 0 || typeof type !== 'string' || !type.trim()) {
    return res.status(400).json({ error: 'Request JSON must include numeric count and string type.' });
  }

  const order = {
    tableId,
    ip,
    code: requestCode,
    count,
    type: type.trim(),
    placedAt: new Date().toISOString(),
  };
  ORDERS.push([type.trim(), count]);

  res.json({ message: 'Order accepted', order });
});



//utility
app.get('/auth_status', (req, res) => {
  const ip = getClientIp(req);
  const auth = authStore.get(ip);
  if (!auth) {
    return res.json({ authorized: false, message: 'No auth record for your IP address.' });
  }
  res.json({ authorized: true, ip, tableId: auth.tableId, code: auth.code, createdAt: auth.createdAt });
});



app.listen(port, '127.0.0.1', () => {
  console.log(`SushiXploit server running on http://127.0.0.1:${port}`);
});
