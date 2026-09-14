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
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const [modoRecuperar, setModoRecuperar] = useState(false);
  const [emailRecuperar, setEmailRecuperar] = useState("");
  const [mensagemRecuperar, setMensagemRecuperar] = useState("");
  const [senhaTemporaria, setSenhaTemporaria] = useState("");
  const [enviandoRecuperar, setEnviandoRecuperar] = useState(false);

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

  async function handleRecuperar(e: FormEvent) {
    e.preventDefault();
    setMensagemRecuperar("");
    setSenhaTemporaria("");
    setEnviandoRecuperar(true);
    try {
      const resp = await api.esqueciSenha(emailRecuperar);
      setMensagemRecuperar(resp.mensagem);
      if (resp.senha_temporaria) setSenhaTemporaria(resp.senha_temporaria);
    } catch (err: any) {
      setMensagemRecuperar(err.message || "Erro ao solicitar nova senha");
    } finally {
      setEnviandoRecuperar(false);
    }
  }

  if (modoRecuperar) {
    return (
      <div className="login-wrap">
        <div className="card login-card">
          <h1>Esqueci minha senha</h1>
          <p className="subtitle">
            Ainda não temos envio de e-mail configurado — a nova senha aparece aqui na tela.
          </p>
          {!senhaTemporaria ? (
            <form onSubmit={handleRecuperar}>
              <div className="field">
                <label>E-mail cadastrado</label>
                <input type="email" value={emailRecuperar} onChange={(e) => setEmailRecuperar(e.target.value)} required autoFocus />
              </div>
              <button className="btn btn-primary" style={{ width: "100%" }} disabled={enviandoRecuperar}>
                {enviandoRecuperar ? "Gerando..." : "Gerar nova senha"}
              </button>
              {mensagemRecuperar && <div className="subtitle" style={{ marginTop: 10 }}>{mensagemRecuperar}</div>}
            </form>
          ) : (
            <div>
              <p style={{ fontSize: 14 }}>{mensagemRecuperar}</p>
              <div className="card" style={{ background: "#F5F5F7", textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "var(--texto-dim)" }}>Sua nova senha temporária</div>
                <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1, marginTop: 4 }}>{senhaTemporaria}</div>
              </div>
              <p style={{ fontSize: 12, color: "var(--texto-dim)" }}>
                Anote agora — ela não vai ser mostrada de novo. Você pode trocar por uma de sua escolha depois de entrar.
              </p>
            </div>
          )}
          <div style={{ marginTop: 14, fontSize: 13, textAlign: "center" }}>
            <span style={{ color: "var(--primaria-rh)", cursor: "pointer", textDecoration: "underline" }}
              onClick={() => { setModoRecuperar(false); setSenhaTemporaria(""); setMensagemRecuperar(""); }}>
              Voltar para o login
            </span>
          </div>
        </div>
      </div>
    );
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
            <div style={{ position: "relative" }}>
              <input
                type={mostrarSenha ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                style={{ paddingRight: 70 }}
              />
              <span
                onClick={() => setMostrarSenha(!mostrarSenha)}
                style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  fontSize: 12, color: "var(--primaria-rh)", cursor: "pointer", fontWeight: 600,
                  userSelect: "none",
                }}
              >
                {mostrarSenha ? "Ocultar" : "Mostrar"}
              </span>
            </div>
          </div>
          <button className="btn btn-primary" style={{ width: "100%" }} disabled={carregando}>
            {carregando ? "Entrando..." : "Entrar"}
          </button>
          {erro && <div className="error-msg">{erro}</div>}
        </form>
        <div style={{ marginTop: 14, fontSize: 13, textAlign: "center" }}>
          <span style={{ color: "var(--primaria-rh)", cursor: "pointer", textDecoration: "underline" }}
            onClick={() => setModoRecuperar(true)}>
            Esqueci minha senha
          </span>
        </div>
      </div>
    </div>
  );
}
