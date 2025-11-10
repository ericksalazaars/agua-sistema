import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

function yyyymmdd(d = new Date()) {
  const z = (n)=> String(n).padStart(2,"0");
  return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`;
}

export default function Visits() {
  const [clients, setClients] = useState([]);
  const [date, setDate] = useState(yyyymmdd());
  const [clientId, setClientId] = useState("");
  const [qtyF, setQtyF] = useState(0);
  const [qtyB, setQtyB] = useState(0);
  const [vacios, setVacios] = useState(0);
  const [note, setNote] = useState("");
  const [list, setList] = useState({ date: yyyymmdd(), total: 0, visits: [] });
  const [loading, setLoading] = useState(true);

  const selectedClient = useMemo(()=> clients.find(c => c.id===clientId), [clients, clientId]);
  const previewSubtotal = useMemo(()=>{
    const pf = selectedClient ? Number(selectedClient.price_fardo) : 0;
    const pb = selectedClient ? Number(selectedClient.price_botellon) : 0;
    return Number(qtyF||0)*pf + Number(qtyB||0)*pb;
  }, [selectedClient, qtyF, qtyB]);

  const loadClients = async () => { setClients(await api.listClients()); };
  const loadVisits = async () => {
    setLoading(true);
    const res = await api.listVisits(date, clientId || undefined);
    setList(res);
    setLoading(false);
  };

  useEffect(()=>{ loadClients(); }, []);
  useEffect(()=>{ loadVisits(); }, [date, clientId]);

  const addVisit = async (e) => {
    e.preventDefault();
    if (!clientId) { alert("Selecciona un cliente"); return; }
    await api.createVisit({
      client_id: clientId,
      date,
      qty_fardo: Number(qtyF) || 0,
      qty_botellon: Number(qtyB) || 0,
      vacios_recogidos: Number(vacios) || 0,
      note
    });
    setQtyF(0); setQtyB(0); setVacios(0); setNote("");
    await loadVisits();
  };

  const removeVisit = async (id) => {
    if (!confirm("¿Eliminar esta visita?")) return;
    await api.deleteVisit(id);
    await loadVisits();
  };

  return (
    <div>
      <div className="header">
        <h1>Visitas</h1>
        <div style={{display:"flex", gap:8, alignItems:"center"}}>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
          <span className="badge">Total día: <b>L {Number(list.total).toFixed(2)}</b></span>
        </div>
      </div>

      <div className="card">
        <h3>Nueva visita</h3>
        <form onSubmit={addVisit}>
          <div className="row">
            <div>
              <label>Cliente</label>
              <select value={clientId} onChange={e=>setClientId(e.target.value)}>
                <option value="">-- Selecciona --</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label>Fardos</label>
              <input type="number" value={qtyF} onChange={e=>setQtyF(e.target.value)} />
            </div>
            <div>
              <label>Botellones</label>
              <input type="number" value={qtyB} onChange={e=>setQtyB(e.target.value)} />
            </div>
            <div>
              <label>Vacios recogidos</label>
              <input type="number" value={vacios} onChange={e=>setVacios(e.target.value)} />
            </div>
            <div style={{gridColumn:"span 2"}}>
              <label>Nota</label>
              <textarea rows={2} value={note} onChange={e=>setNote(e.target.value)} placeholder="Detalles, referencias, etc." />
              <div className="small">Subtotal previsto: <b>L {Number(previewSubtotal).toFixed(2)}</b></div>
            </div>
          </div>
          <div style={{display:"flex", gap:8}}>
            <button type="submit">Agregar visita</button>
            <button type="button" className="ghost" onClick={()=>{ setClientId(""); setQtyF(0); setQtyB(0); setVacios(0); setNote(""); }}>Limpiar</button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="header">
          <h3>Visitas del {list.date}</h3>
          <div style={{display:"flex", gap:8, alignItems:"center"}}>
            <select value={clientId} onChange={e=>setClientId(e.target.value)}>
              <option value="">Todos los clientes</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        {loading ? (
          <div className="small">Cargando...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Cliente</th>
                <th>Fardos</th>
                <th>Botellones</th>
                <th>Vacios</th>
                <th>Subtotal</th>
                <th>Nota</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.visits.map(v => (
                <tr key={v.id}>
                  <td>{new Date(v.created_at).toLocaleTimeString()}</td>
                  <td>{v.client_name}</td>
                  <td>{v.qty_fardo}</td>
                  <td>{v.qty_botellon}</td>
                  <td>{v.vacios_recogidos}</td>
                  <td>L {Number(v.subtotal).toFixed(2)}</td>
                  <td>{v.note}</td>
                  <td><button className="danger" onClick={()=>removeVisit(v.id)}>Eliminar</button></td>
                </tr>
              ))}
              {list.visits.length === 0 && (
                <tr><td colSpan="8" className="small">Sin registros</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
