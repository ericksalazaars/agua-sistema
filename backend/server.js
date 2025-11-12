import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const app = express();
app.use(cors());
app.use(express.json());

// ---- DATABASE ----
let db;

async function initDB() {
  db = await open({
    filename: "./database.db",
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      telefono TEXT,
      direccion TEXT,
      precioFardo REAL DEFAULT 0,
      precioBotellon REAL DEFAULT 0
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS visitas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clienteId INTEGER,
      fardos INTEGER DEFAULT 0,
      botellones INTEGER DEFAULT 0,
      subtotal REAL DEFAULT 0,
      nota TEXT,
      fecha TEXT
    );
  `);
}

// ---- CLIENTES ----
app.get("/clientes", async (_, res) => {
  const rows = await db.all("SELECT * FROM clientes");
  res.json(rows);
});

app.post("/clientes", async (req, res) => {
  const { nombre, telefono, direccion, precioFardo, precioBotellon } = req.body;

  await db.run(
    `INSERT INTO clientes (nombre, telefono, direccion, precioFardo, precioBotellon)
     VALUES (?, ?, ?, ?, ?)`,
    [nombre, telefono, direccion, precioFardo, precioBotellon]
  );

  res.json({ ok: true });
});

app.delete("/clientes/:id", async (req, res) => {
  await db.run("DELETE FROM clientes WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

// ---- VISITAS ----
app.get("/visitas", async (_, res) => {
  const hoy = new Date().toISOString().slice(0, 10);

  const visitas = await db.all(
    "SELECT * FROM visitas WHERE fecha = ?",
    hoy
  );

  const totalDia = visitas.reduce((acc, v) => acc + v.subtotal, 0);

  res.json({ visitas, totalDia });
});

app.post("/visitas", async (req, res) => {
  const { clienteId, fardos, botellones, nota } = req.body;

  const cliente = await db.get(
    "SELECT precioFardo, precioBotellon FROM clientes WHERE id = ?",
    clienteId
  );

  const subtotal =
    Number(fardos) * Number(cliente.precioFardo) +
    Number(botellones) * Number(cliente.precioBotellon);

  const fecha = new Date().toISOString().slice(0, 10);

  await db.run(
    `INSERT INTO visitas (clienteId, fardos, botellones, subtotal, nota, fecha)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [clienteId, fardos, botellones, subtotal, nota, fecha]
  );

  res.json({ ok: true });
});

app.delete("/visitas/:id", async (req, res) => {
  await db.run("DELETE FROM visitas WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

// ---- TEST ----
app.get("/health", (_, res) => {
  res.json({ ok: true, sqlite: !!db });
});

// ---- START ----
const PORT = process.env.PORT || 3000;

initDB().then(() => {
  app.listen(PORT, () => console.log("API running on port", PORT));
});
