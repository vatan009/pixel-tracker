const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SQLite
const db = new sqlite3.Database(path.join(__dirname, 'mail-tracker.db'), (err) => {
  if (err) throw err;
  db.run(`
    CREATE TABLE IF NOT EXISTS pixels (
      id TEXT PRIMARY KEY,
      name TEXT
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pixelId TEXT,
      openedAt TEXT,
      ip TEXT,
      userAgent TEXT
    )
  `);
});

// Middleware to get baseUrl for EJS
app.use((req, res, next) => {
  const protocol = req.protocol;
  const host = req.get('host');
  res.locals.baseUrl = `${protocol}://${host}`;
  next();
});

// Dashboard: list all pixels
app.get('/', (req, res) => {
  db.all(`SELECT * FROM pixels`, [], (err, pixels) => {
    if (err) throw err;
    res.render('index', { pixels });
  });
});

// Create pixel
app.post('/create', (req, res) => {
  const pixelId = uuidv4();
  const name = req.body.name || 'Untitled';
  db.run(`INSERT INTO pixels (id, name) VALUES (?, ?)`, [pixelId, name], (err) => {
    if (err) throw err;
    res.redirect('/');
  });
});

// The tracker route
app.get('/tracker/:id.png', (req, res) => {
  const pixelId = req.params.id;
  db.run(
    `INSERT INTO logs (pixelId, openedAt, ip, userAgent) VALUES (?, datetime('now'), ?, ?)`,
    [pixelId, req.ip, req.headers['user-agent']]
  );
  res.sendFile(path.join(__dirname, 'public', 'images', 'pixel.png'));
});

// View logs
app.get('/logs/:id', (req, res) => {
  const pixelId = req.params.id;
  db.get(`SELECT * FROM pixels WHERE id = ?`, [pixelId], (err, pixel) => {
    if (err) throw err;
    db.all(`SELECT * FROM logs WHERE pixelId = ? ORDER BY openedAt DESC`, [pixelId], (err, logs) => {
      if (err) throw err;
      res.render('logs', { pixel, logs });
    });
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
