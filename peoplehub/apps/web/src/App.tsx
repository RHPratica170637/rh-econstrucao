import { useState } from "react";
import Login from "./pages/Login";
import Colaboradores from "./pages/Colaboradores";
import Configuracoes from "./pages/Configuracoes";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  empresa_id: string;
  colaborador_id: string | null;
}

export default function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const saved = localStorage.getItem("peoplehub_usuario");
    return saved ? JSON.parse(saved) : null;
  });
  const [aba, setAba] = useState("colaboradores");

  if (!usuario) {
    return <Login onLogin={setUsuario} />;
  }

  function logout() {
    localStorage.removeItem("peoplehub_usuario");
    setUsuario(null);
  }

  return (
    <div className="app-shell">
      <div className="sidebar">
        <div className="brand">
          PeopleHub
          <div className="sub">Etapa 1 — Fundação</div>
        </div>
        <nav>
          <div className={`item ${aba === "colaboradores" ? "active" : ""}`} onClick={() => setAba("colaboradores")}>
            Colaboradores
          </div>
          <div className={`item ${aba === "configuracoes" ? "active" : ""}`} onClick={() => setAba("configuracoes")}>
            Configurações
          </div>
        </nav>
        <div style={{ position: "absolute", bottom: 20, left: 20, fontSize: 12, color: "#9CA3AF" }}>
          {usuario.nome} ({usuario.perfil})
          <br />
          <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={logout}>Sair</span>
        </div>
      </div>
      <div className="main">
        {aba === "colaboradores" && <Colaboradores empresaId={usuario.empresa_id} />}
        {aba === "configuracoes" && <Configuracoes empresaId={usuario.empresa_id} />}
      </div>
    </div>
  );
}
