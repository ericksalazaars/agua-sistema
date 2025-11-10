# Sistema de Clientes y Visitas (Agua Delivery)

Full-stack listo para correr:
- **Backend:** Node + Express + SQLite (better-sqlite3)
- **Frontend:** React (Vite) + React Router
- **Funciones:** CRUD de clientes, registro de visitas con subtotal, filtro por fecha/cliente, total del día, notas y vacíos recogidos.

## 1) Arranque rápido

### Backend
```bash
cd backend
npm i
npm run dev   # inicia en http://localhost:4000
```

### Frontend
```bash
cd frontend
npm i
# Configurar la URL del backend si es necesario:
# crear archivo .env con:
# VITE_API_URL=http://localhost:4000
npm run dev   # abre http://localhost:5173
```

> El backend crea `data.db` automáticamente.

## 2) Endpoints principales

- `GET /clients` (opcional `?q=`)
- `GET /clients/:id`
- `POST /clients` body: `{ name, phone, address, price_fardo, price_botellon }`
- `PUT /clients/:id` idem POST
- `DELETE /clients/:id`

- `POST /visits` body: `{ client_id, date(YYYY-MM-DD opcional), qty_fardo, qty_botellon, vacios_recogidos, note }`
  - Guarda *snapshot* de precios (unit_price_fardo/botellon) al momento de la visita y el `subtotal`.
- `GET /visits?date=YYYY-MM-DD&clientId=...` devuelve `{ date, total, visits:[] }` ordenado por más reciente primero.
- `DELETE /visits/:id`

## 3) Notas de diseño
- Los precios varían por cliente. Para que el historial sea consistente, cada visita guarda los **precios unitarios del cliente** en ese momento y el **subtotal** calculado.
- El **total del día** es la suma de subtotales de todas las visitas de esa fecha.
- Filtros: por **fecha** y **cliente**. Por defecto, se muestran las visitas del día actual.

## 4) Personalización rápida
- Campos extra para clientes/visitas: agrega columnas en `server.js` (DDL) y en los formularios de React.
- Seguridad (auth): puedes poner un middleware con un token simple si lo vas a exponer en internet.
- Despliegue: Railway, Render o VPS. SQLite funciona bien para 1 instancia.

¡Listo para usar! 😄
