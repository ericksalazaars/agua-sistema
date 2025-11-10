import React, { useEffect, useState } from "react";
import { api } from "../lib/api";

const empty = { name:"", phone:"", address:"", price_fardo:0, price_botellon:0 };

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    const rows = await api.listClients(search);
    setClients(rows);
  };
  useEffect(() => { load(); }, [search]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { alert("Nombre es obligatorio"); return; }
    if (editingId) {
      await api.updateClient(editingId, form);
      setEditingId(null);
    } else {
      await api.createClient(form);
    }
    setForm(empty);
    load();
  };

  const onEdit = (c) => {
    setEditingId(c.id);
    setForm({
      name: c.name, phone: c.phone || "", address: c.address || "",
      price_fardo: c.price_fardo || 0, price_botellon: c.price_botellon || 0
    });
  };

  const onDelete = async (id) => {
    if (!confirm("¿Eliminar cliente?")) return;
    await api.deleteClient(id);
    if (editingId === id) { setEditingId(null); setForm(empty); }
    load();
  };

  return (
    <div>
      <div className="header">
        <h1>Clientes</h1>
        <input placeholder="Buscar por nombre o teléfono..." value={search} onChange={e=>setSearch(e.target.value)} />
      </div>

      <div className="card">
        <h3>{editingId ? "Editar cliente" : "Nuevo cliente"}</h3>
        <form onSubmit={onSubmit}>
          <div className="row">
            <div>
              <label>Nombre</label>
              <input value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
            </div>
            <div>
              <label>Teléfono</label>
              <input value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} />
            </div>
            <div>
              <label>Dirección</label>
              <input value={form.address} onChange={e=>setForm({...form, address:e.target.value})} />
            </div>
            <div>
              <label>Precio Fardo</label>
              <input type="number" step="0.01" value={form.price_fardo} onChange={e=>setForm({...form, price_fardo:e.target.value})} />
            </div>
            <div>
              <label>Precio Botellón</label>
              <input type="number" step="0.01" value={form.price_botellon} onChange={e=>setForm({...form, price_botellon:e.target.value})} />
            </div>
          </div>
          <div style={{display:"flex", gap:8}}>
            <button type="submit">{editingId ? "Guardar cambios" : "Agregar"}</button>
            {editingId && <button type="button" className="ghost" onClick={()=>{ setEditingId(null); setForm(empty); }}>Cancelar</button>}
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Lista de clientes</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Dirección</th>
              <th>Fardo</th>
              <th>Botellón</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clients.map(c => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.phone}</td>
                <td>{c.address}</td>
                <td>L {Number(c.price_fardo).toFixed(2)}</td>
                <td>L {Number(c.price_botellon).toFixed(2)}</td>
                <td>
                  <div style={{display:"flex", gap:8}}>
                    <button onClick={()=>onEdit(c)}>Editar</button>
                    <button className="danger" onClick={()=>onDelete(c.id)}>Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
