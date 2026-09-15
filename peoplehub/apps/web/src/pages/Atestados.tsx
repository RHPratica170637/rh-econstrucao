import { useEffect, useState, useRef, FormEvent } from "react";
import { api } from "../lib/api";
import { arquivoParaBase64 } from "../lib/arquivo";

interface Colaborador { id: string; matricula: string; nome: string; }
interface Atestado {
  id: string; data_inicio: string; data_fim: string; status: string; url: string | null;
  prazo_validacao: string; falta_injustificada: boolean;
  colaborador: { nome: string; matricula: string };
}

const STATUS_BADGE: Record<string, string> = {
  pendente: "badge-pendente", validado: "badge-ativo", recusado: "badge-desligado",
};

export default function Atestados({ empresaId }: { empresaId: string }) {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [atestados, setAtestados] = useState<Atestado[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ colaborador_id: "", data_inicio: "", data_fim: "", cid: "" });

  async function carregar() {
    const r = await api.listarAtestados({ empresa_id: empresaId });
    setAtestados(r.atestados);
  }

  useEffect(() => {
    api.listarColaboradores(empresaId).then((r) => setColaboradores(r.colaboradores));
    carregar();
  }, [empresaId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      const payload: Record<string, unknown> = { ...form };
      if (arquivo) {
        payload.arquivo_base64 = await arquivoParaBase64(arquivo);
        payload.arquivo_nome = arquivo.name;
      }
      await api.enviarAtestado(payload);
      setModalAberto(false);
      setForm({ colaborador_id: "", data_inicio: "", data_fim: "", cid: "" });
      setArquivo(null);
      carregar();
    } catch (err: any) {
      setErro(err.message || "Erro ao enviar");
    } finally {
      setEnviando(false);
    }
  }

  async function decidir(id: string, acao: string) {
    if (acao === "recusar") {
      const motivo = window.prompt("Motivo da recusa (vira falta injustificada):");
      if (!motivo) return;
      await api.decidirAtestado(id, acao, motivo);
    } else {
      await api.decidirAtestado(id, acao);
    }
    carregar();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <h1>Atestados</h1>
          <p className="subtitle">RH tem 2 dias úteis para validar — recusa vira falta injustificada.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalAberto(true)}>+ Enviar atestado</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr><th>Colaborador</th><th>Período</th><th>Status</th><th>Prazo validação</th><th></th></tr>
          </thead>
          <tbody>
            {atestados.map((a) => (
              <tr key={a.id}>
                <td>{a.colaborador?.matricula} — {a.colaborador?.nome}</td>
                <td>
                  {new Date(a.data_inicio + "T00:00:00").toLocaleDateString("pt-BR")} a{" "}
                  {new Date(a.data_fim + "T00:00:00").toLocaleDateString("pt-BR")}
                </td>
                <td>
                  <span className={`badge ${STATUS_BADGE[a.status] || ""}`}>{a.status}</span>
                  {a.falta_injustificada && <span className="badge badge-desligado" style={{ marginLeft: 6 }}>falta injustificada</span>}
                </td>
                <td>{new Date(a.prazo_validacao + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                <td style={{ display: "flex", gap: 6 }}>
                  {a.url && <a href={a.url} target="_blank" rel="noreferrer" className="btn" style={{ fontSize: 11, padding: "6px 8px" }}>Ver</a>}
                  {a.status === "pendente" && (
                    <>
                      <button className="btn btn-sucesso" style={{ fontSize: 11, padding: "6px 8px" }} onClick={() => decidir(a.id, "validar")}>Validar</button>
                      <button className="btn" style={{ fontSize: 11, padding: "6px 8px" }} onClick={() => decidir(a.id, "recusar")}>Recusar</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {atestados.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 30, color: "var(--texto-dim)" }}>
                Nenhum atestado enviado ainda.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 48 }}>
          <div className="card" style={{ width: 460 }}>
            <h1 style={{ fontSize: 18 }}>Enviar atestado</h1>
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Colaborador</label>
                <select value={form.colaborador_id} onChange={(e) => setForm({ ...form, colaborador_id: e.target.value })} required>
                  <option value="">—</option>
                  {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.matricula} — {c.nome}</option>)}
                </select>
              </div>
              <div className="field">
                <label>De</label>
                <input type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} required />
              </div>
              <div className="field">
                <label>Até</label>
                <input type="date" value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} required />
              </div>
              <div className="field">
                <label>CID (opcional)</label>
                <input value={form.cid} onChange={(e) => setForm({ ...form, cid: e.target.value })} />
              </div>
              <div className="field">
                <label>Arquivo do atestado (opcional)</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{ border: "1.5px dashed var(--border)", borderRadius: 8, padding: 16, textAlign: "center", cursor: "pointer", fontSize: 13, color: arquivo ? "var(--texto)" : "var(--texto-dim)" }}
                >
                  {arquivo ? `✓ ${arquivo.name}` : "Clique para anexar PDF/imagem"}
                </div>
                <input ref={fileInputRef} type="file" accept=".pdf,image/*" style={{ display: "none" }} onChange={(e) => setArquivo(e.target.files?.[0] || null)} />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="btn" onClick={() => setModalAberto(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={enviando}>{enviando ? "Enviando..." : "Enviar"}</button>
              </div>
              {erro && <div className="error-msg">{erro}</div>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
