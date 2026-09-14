import { useState, FormEvent } from "react";
import { api } from "../lib/api";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  empresa_id: string;
  colaborador_id: string | null;
}

export default function Login({ onLogin }: { onLogin: (u: Usuario) => void }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      const { usuario } = await api.login(email, senha);
      localStorage.setItem("peoplehub_usuario", JSON.stringify(usuario));
      onLogin(usuario);
    } catch (err: any) {
      setErro(err.message || "Erro ao entrar");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="card login-card">
        <h1>PeopleHub</h1>
        <p className="subtitle">Gestão de pessoas — Econstrução Prática</p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>E-mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="field">
            <label>Senha</label>
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
          </div>
          <button className="btn btn-primary" style={{ width: "100%" }} disabled={carregando}>
            {carregando ? "Entrando..." : "Entrar"}
          </button>
          {erro && <div className="error-msg">{erro}</div>}
        </form>
      </div>
    </div>
  );
}
