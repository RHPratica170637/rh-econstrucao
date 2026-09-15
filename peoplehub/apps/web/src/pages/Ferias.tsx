import { useEffect, useState, FormEvent } from "react";
import { api } from "../lib/api";

interface Colaborador { id: string; matricula: string; nome: string; saldo_ferias_dias?: number; }
interface Solicitacao {
  id: string; data_inicio: string; data_fim: string; dias: number; status: string;
  colaborador: { nome: string; matricula: string; saldo_ferias_dias: number };
}

const STATUS_BADGE: Record<string, string> = {
  solicitado: "badge-pendente", aprovado: "badge-ativo", recusado: "badge-desligado",
};

export default function Ferias({ empresaId }: { empresaId: string }) {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ colaborador_id: "", data_inicio: "", data_fim: "" });

  async function carregar() {
    const [c, s] = await Promise.all([
      api.listarColaboradores(empresaId),
      api.listarFerias({ empresa_id: empresaId }),
    ]);
    setColaboradores(c.colaboradores);
    setSolicitacoes(s.solicitacoes);
  }

  useEffect(() => { carregar(); }, [empresaId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      await api.solicitarFerias(form);
      setModalAberto(false);
      setForm({ colaborador_id: "", data_inicio: "", data_fim: "" });
      carregar();
    } catch (err: any) {
      setErro(err.message || "Erro ao solicitar");
    } finally {
      setSalvando(false);
    }
  }

  async function decidir(id: string, acao: string) {
    try {
      await api.decidirFerias(id, acao);
      carregar();
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <h1>Férias</h1>
          <p className="subtitle">Saldo, solicitação e aprovação.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalAberto(true)}>+ Solicitar férias</button>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Saldo por colaborador</h3>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {colaboradores.map((c) => (
            <div key={c.id} style={{ fontSize: 13 }}>
              <strong>{c.matricula} — {c.nome}</strong>: {c.saldo_ferias_dias ?? 30} dias
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr><th>Colaborador</th><th>Período</th><th>Dias</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {solicitacoes.map((s) => (
              <tr key={s.id}>
                <td>{s.colaborador?.matricula} — {s.colaborador?.nome}</td>
                <td>
                  {new Date(s.data_inicio + "T00:00:00").toLocaleDateString("pt-BR")} a{" "}
                  {new Date(s.data_fim + "T00:00:00").toLocaleDateString("pt-BR")}
                </td>
                <td>{s.dias}</td>
                <td><span className={`badge ${STATUS_BADGE[s.status] || ""}`}>{s.status}</span></td>
                <td>
                  {s.status === "solicitado" && (
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="btn btn-sucesso" style={{ fontSize: 11, padding: "6px 8px" }} onClick={() => decidir(s.id, "aprovar")}>Aprovar</button>
                      <button className="btn" style={{ fontSize: 11, padding: "6px 8px" }} onClick={() => decidir(s.id, "recusar")}>Recusar</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {solicitacoes.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 30, color: "var(--texto-dim)" }}>
                Nenhuma solicitação de férias ainda.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 48 }}>
          <div className="card" style={{ width: 420 }}>
            <h1 style={{ fontSize: 18 }}>Solicitar férias</h1>
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Colaborador</label>
                <select value={form.colaborador_id} onChange={(e) => setForm({ ...form, colaborador_id: e.target.value })} required>
                  <option value="">—</option>
                  {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.matricula} — {c.nome} ({c.saldo_ferias_dias ?? 30} dias)</option>)}
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
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="btn" onClick={() => setModalAberto(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? "Enviando..." : "Solicitar"}</button>
              </div>
              {erro && <div className="error-msg">{erro}</div>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
