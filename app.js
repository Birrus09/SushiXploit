const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 3000;
const logPath = path.join(__dirname, 'log.txt');

fs.writeFileSync(logPath, `SushiXploit order log started ${new Date().toISOString()}\n`, 'utf8');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));
app.use('/pics', express.static(path.join(__dirname, 'pics')));

const authStore = new Map();

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
  if (req.cookies['auth-code']) return res.redirect('/');

  const tableId = String(req.query.tableId || '').trim();
  if (!tableId || isNaN(Number(tableId))) {
    res.sendFile(path.join(__dirname, 'public', 'auth_create.html'));
    return;
  }

  const code = crypto.randomBytes(16).toString('hex');
  authStore.set(code, tableId);
  res.cookie('auth-code', code, { httpOnly: true });
  res.redirect('/');
});

app.post('/order/:tableId', (req, res) => {
  const tableId = String(req.params.tableId || '').trim();
  const auth = authStore.get(req.cookies['auth-code']);

  if (!auth) return res.status(403).json({ error: 'Select Table first' });
  if (auth !== tableId) return res.status(403).json({ error: 'Invalid table' });

  const { type, count, notes } = req.body;
  if (typeof count !== 'number' || count <= 0 || !type?.trim()) {
    return res.status(400).json({ error: 'Invalid count or type' });
  }

  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const noteText = notes || '';
  fs.appendFileSync(logPath, `${time} [Table ${tableId}] -  ${type.trim()}, ${count}, \t\t ${noteText}\n`, 'utf8');

  res.json({ message: 'Order accepted' });
});



app.get('/auth_status', (req, res) => {
  const tableId = authStore.get(req.cookies['auth-code']);
  res.json({ authorized: !!tableId, tableId });
});

app.listen(port, '127.0.0.1', () => {
  console.log(`SushiXploit server running on http://127.0.0.1:${port}`);
});
