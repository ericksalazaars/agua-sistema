import React from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import Clients from "./pages/Clients";
import Visits from "./pages/Visits";

export default function App() {
  return (
    <div className="container">
      <div className="nav">
        <NavLink to="/">Visitas</NavLink>
        <NavLink to="/clients">Clientes</NavLink>
      </div>
      <Routes>
        <Route path="/" element={<Visits />} />
        <Route path="/clients" element={<Clients />} />
      </Routes>
    </div>
  );
}
