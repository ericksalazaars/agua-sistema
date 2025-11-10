import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";

// ===============================
// DETECTA SI HAY SQLITE
// ===============================
let sqliteAvailable = true;
let Database = null;

try {
  Database = (await import("better-sqlite3")).default;
} catch (e) {
  console.log("⚠ better-sqlite3 NO disponible → usando memoria");
  sqliteAvailable = false;
}

const PORT = process.env.PORT || 4000;
const app = express();
app.use(cors());
app.use(express.json());

// ============================================
// 🔹 MEMORIA (fallback para Windows)
// ============================================
let memClients = [];
let memVisits = [];

// ============================================
// 🔹 SQLITE (usado en Railway)
// ============================================
let db = null;

if (sqliteAvailable) {
  db = new Database("./data.db");
  console.log("✅ SQLite activado");

  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      price_fardo REAL DEFAULT 0,
      price_botellon REAL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  db.exec(`
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
    );
  `);
}

// ============================================
// Utils
// ============================================
function today() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

// ============================================
// HEALTH
// ============================================
app.get("/health", (req, res) => {
  res.json({ ok: true, sqlite: sqliteAvailable });
});

// ============================================
// CLIENTS
// ============================================
app.get("/clients", (req, res) => {
  const { q } = req.query;

  if (!sqliteAvailable) {
    let result = memClients;
    if (q) {
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q.toLowerCase()) ||
          c.phone.includes(q)
      );
    }
    return res.json(result);
  }

  let rows;
  if (q) {
    rows = db
      .prepare(
        `SELECT * FROM clients WHERE name LIKE ? OR phone LIKE ? ORDER BY created_at DESC`
      )
      .all(`%${q}%`, `%${q}%`);
  } else {
    rows = db.prepare(`SELECT * FROM clients ORDER BY created_at DESC`).all();
  }
  res.json(rows);
});

app.post("/clients", (req, res) => {
  const { name, phone = "", address = "", price_fardo = 0, price_botellon = 0 } =
    req.body;

  if (!name) return res.status(400).json({ error: "Nombre obligatorio" });

  const id = uuidv4();
  const created_at = new Date().toISOString();

  if (!sqliteAvailable) {
    memClients.push({
      id,
      name,
      phone,
      address,
      price_fardo,
      price_botellon,
      created_at,
    });
    return res.json({
      id,
      name,
      phone,
      address,
      price_fardo,
      price_botellon,
      created_at,
    });
  }

  db.prepare(
    `INSERT INTO clients (id, name, phone, address, price_fardo, price_botellon, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, name, phone, address, price_fardo, price_botellon, created_at);

  res.json({ id, name, phone, address, price_fardo, price_botellon, created_at });
});

// ============================================
// VISITS
// ============================================
app.post("/visits", (req, res) => {
  const {
    client_id,
    date,
    qty_fardo = 0,
    qty_botellon = 0,
    vacios_recogidos = 0,
    note = "",
  } = req.body;

  if (!client_id)
    return res.status(400).json({ error: "client_id requerido" });

  const d = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today();
  const id = uuidv4();
  const created_at = new Date().toISOString();

  if (!sqliteAvailable) {
    const client = memClients.find((c) => c.id === client_id);
    if (!client) return res.status(404).json({ error: "Cliente no existe" });

    const subtotal =
      qty_fardo * client.price_fardo + qty_botellon * client.price_botellon;

    memVisits.push({
      id,
      client_id,
      date: d,
      qty_fardo,
      qty_botellon,
      unit_price_fardo: client.price_fardo,
      unit_price_botellon: client.price_botellon,
      subtotal,
      vacios_recogidos,
      note,
      created_at,
      client_name: client.name,
    });

    return res.status(201).json({ ok: true });
  }

  const client = db.prepare(`SELECT * FROM clients WHERE id=?`).get(client_id);
  if (!client) return res.status(404).json({ error: "Cliente no existe" });

  const unit_price_fardo = Number(client.price_fardo) || 0;
  const unit_price_botellon = Number(client.price_botellon) || 0;
  const subtotal =
    qty_fardo * unit_price_fardo + qty_botellon * unit_price_botellon;

  db.prepare(
    `INSERT INTO visits (
      id, client_id, date, qty_fardo, qty_botellon,
      unit_price_fardo, unit_price_botellon, subtotal,
      vacios_recogidos, note, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
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
    created_at
  );

  res.status(201).json({ ok: true });
});

// ============================================
app.get("/visits", (req, res) => {
  const d = req.query.date || today();
  const clientId = req.query.clientId;

  if (!sqliteAvailable) {
    let rows = memVisits.filter((v) => v.date === d);
    if (clientId) rows = rows.filter((v) => v.client_id === clientId);
    const total = rows.reduce((sum, v) => sum + v.subtotal, 0);
    return res.json({ date: d, total, visits: rows });
  }

  let sql = `
    SELECT v.*, c.name AS client_name
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

  const rows = db.prepare(sql).all(...params);
  const total = rows.reduce((acc, r) => acc + (r.subtotal || 0), 0);

  res.json({ date: d, total, visits: rows });
});

// ============================================
app.delete("/visits/:id", (req, res) => {
  const id = req.params.id;

  if (!sqliteAvailable) {
    memVisits = memVisits.filter((v) => v.id !== id);
    return res.json({ ok: true });
  }

  const info = db.prepare(`DELETE FROM visits WHERE id=?`).run(id);

  if (info.changes === 0)
    return res.status(404).json({ error: "No encontrada" });

  res.json({ ok: true });
});

// ============================================
app.listen(PORT, () => {
  console.log(`✅ API lista en puerto ${PORT}`);
});
