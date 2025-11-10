import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import { v4 as uuidv4 } from "uuid";

const PORT = process.env.PORT || 4000;
const db = new sqlite3.Database("./data.db");

const app = express();
app.use(cors());
app.use(express.json());

// --- DB INIT ---
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      price_fardo REAL DEFAULT 0,
      price_botellon REAL DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      date TEXT NOT NULL,
      qty_fardo INTEGER DEFAULT 0,
      qty_botellon INTEGER DEFAULT 0,
      unit_price_fardo REAL DEFAULT 0,
      unit_price_botellon REAL DEFAULT 0,
      subtotal REAL DEFAULT 0,
      vacios_recogidos INTEGER DEFAULT 0,
      note TEXT,
      created_at TEXT NOT NULL
    )
  `);
});

// ---------- HELP ----------
function today() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

// ---------- HEALTH ----------
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// ---------- CLIENTS ----------
app.get("/clients", (req, res) => {
  const { q } = req.query;
  let sql = `SELECT * FROM clients`;
  let params = [];

  if (q) {
    sql += ` WHERE name LIKE ? OR phone LIKE ?`;
    params = [`%${q}%`, `%${q}%`];
  }

  sql += ` ORDER BY created_at DESC`;

  db.all(sql, params, (err, rows) => {
    res.json(rows || []);
  });
});

app.post("/clients", (req, res) => {
  const { name, phone = "", address = "", price_fardo = 0, price_botellon = 0 } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Nombre obligatorio" });
  }

  const id = uuidv4();
  const created_at = new Date().toISOString();

  db.run(
    `
      INSERT INTO clients (id, name, phone, address, price_fardo, price_botellon, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [id, name, phone, address, price_fardo, price_botellon, created_at],
    (err) => {
      if (err) return res.status(500).json({ error: "Error DB" });
      res.json({ id, name, phone, address, price_fardo, price_botellon, created_at });
    }
  );
});

// ---------- VISITS ----------
app.post("/visits", (req, res) => {
  const { client_id, date, qty_fardo = 0, qty_botellon = 0, vacios_recogidos = 0, note = "" } = req.body;

  if (!client_id) return res.status(400).json({ error: "client_id requerido" });

  db.get(`SELECT * FROM clients WHERE id = ?`, [client_id], (err, client) => {
    if (!client) return res.status(404).json({ error: "Cliente no existe" });

    const d = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today();
    const unit_price_fardo = Number(client.price_fardo) || 0;
    const unit_price_botellon = Number(client.price_botellon) || 0;
    const subtotal = qty_fardo * unit_price_fardo + qty_botellon * unit_price_botellon;

    const id = uuidv4();
    const created_at = new Date().toISOString();

    db.run(
      `
      INSERT INTO visits (
        id, client_id, date, qty_fardo, qty_botellon, unit_price_fardo, unit_price_botellon,
        subtotal, vacios_recogidos, note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        client_id,
        d,
        qty_fardo,
        qty_botellon,
        unit_price_fardo,
        unit_price_botellon,
        subtotal,
        vacios_recogidos,
        note,
        created_at,
      ],
      (err) => {
        if (err) return res.status(500).json({ error: "Error DB" });
        res.status(201).json({ ok: true });
      }
    );
  });
});

app.get("/visits", (req, res) => {
  const d = req.query.date || today();
  const clientId = req.query.clientId;

  let sql = `
    SELECT v.*, c.name as client_name
    FROM visits v
    JOIN clients c ON c.id = v.client_id
    WHERE v.date = ?
  `;
  let params = [d];

  if (clientId) {
    sql += ` AND v.client_id = ?`;
    params.push(clientId);
  }

  sql += ` ORDER BY v.created_at DESC`;

  db.all(sql, params, (err, rows) => {
    const total = rows.reduce((acc, r) => acc + (r.subtotal || 0), 0);
    res.json({ date: d, total, visits: rows });
  });
});

app.delete("/visits/:id", (req, res) => {
  db.run(`DELETE FROM visits WHERE id = ?`, [req.params.id], function (err) {
    if (this.changes === 0) return res.status(404).json({ error: "No encontrada" });
    res.json({ ok: true });
  });
});

// ---------- START ----------
app.listen(PORT, () => {
  console.log(`API funcionando en http://localhost:${PORT}`);
});
