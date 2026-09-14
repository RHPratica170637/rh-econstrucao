import { useEffect, useState, FormEvent } from "react";
import { api } from "../lib/api";

interface Colaborador { id: string; matricula: string; nome: string; }
interface Ajuste {
  id: string; data: string; marcador: string; horario_solicitado: string;
  motivo: string; status: string; solicitado_em: string;
  colaborador: { nome: string; matricula: string };
}

const MARCADORES = [
  { value: "entrada", label: "Entrada" },
  { value: "saida_almoco", label: "Saída almoço" },
  { value: "retorno_almoco", label: "Retorno almoço" },
  { value: "saida", label: "Saída" },
  { value: "entrada_extra", label: "Entrada extra" },
  { value: "saida_extra", label: "Saída extra" },
];

const STATUS_LABEL: Record<string, string> = {
  pendente: "badge-pendente", aprovado: "badge-ativo", recusado: "badge-desligado", questionado: "badge-pendente",
};

export default function AjustesPonto({ empresaId }: { empresaId: string }) {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [ajustes, setAjustes] = useState<Ajuste[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [form, setForm] = useState({
    colaborador_id: "", data: "", marcador: "entrada", horario_solicitado: "", motivo: "",
  });

  async function carregar() {
    const r = await api.listarAjustes({});
    setAjustes(r.ajustes);
  }

  useEffect(() => {
    api.listarColaboradores(empresaId).then((r) => setColaboradores(r.colaboradores));
    carregar();
  }, [empresaId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      await api.solicitarAjuste(form);
      setModalAberto(false);
      setForm({ colaborador_id: "", data: "", marcador: "entrada", horario_solicitado: "", motivo: "" });
      carregar();
    } catch (err: any) {
      setErro(err.message || "Erro ao solicitar");
    } finally {
      setSalvando(false);
    }
  }

  async function decidir(id: string, acao: string) {
    await api.decidirAjuste(id, acao);
    carregar();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <h1>Ajustes de ponto</h1>
          <p className="subtitle">Fluxo: colaborador solicita → gestor decide → RH processa.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalAberto(true)}>+ Solicitar ajuste</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr><th>Colaborador</th><th>Data</th><th>Marcador</th><th>Horário pedido</th><th>Motivo</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {ajustes.map((a) => (
              <tr key={a.id}>
                <td>{a.colaborador?.matricula} — {a.colaborador?.nome}</td>
                <td>{new Date(a.data + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                <td>{MARCADORES.find((m) => m.value === a.marcador)?.label}</td>
                <td>{a.horario_solicitado?.slice(0, 5)}</td>
                <td style={{ maxWidth: 220 }}>{a.motivo}</td>
                <td><span className={`badge ${STATUS_LABEL[a.status] || ""}`}>{a.status}</span></td>
                <td>
                  {a.status === "pendente" && (
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="btn btn-sucesso" style={{ fontSize: 11, padding: "6px 8px" }} onClick={() => decidir(a.id, "gestor_aprova")}>Aprovar</button>
                      <button className="btn" style={{ fontSize: 11, padding: "6px 8px" }} onClick={() => decidir(a.id, "gestor_recusa")}>Recusar</button>
                    </div>
                  )}
                  {a.status === "aprovado" && (
                    <button className="btn btn-primary" style={{ fontSize: 11, padding: "6px 8px" }} onClick={() => decidir(a.id, "rh_processa")}>
                      RH: aplicar na folha
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {ajustes.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 30, color: "var(--texto-dim)" }}>
                Nenhum ajuste solicitado ainda.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 48,
        }}>
          <div className="card" style={{ width: 460 }}>
            <h1 style={{ fontSize: 18 }}>Solicitar ajuste de ponto</h1>
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Colaborador</label>
                <select value={form.colaborador_id} onChange={(e) => setForm({ ...form, colaborador_id: e.target.value })} required>
                  <option value="">—</option>
                  {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.matricula} — {c.nome}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Data (mês vigente)</label>
                <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required />
              </div>
              <div className="field">
                <label>Marcador</label>
                <select value={form.marcador} onChange={(e) => setForm({ ...form, marcador: e.target.value })}>
                  {MARCADORES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Horário correto</label>
                <input type="time" value={form.horario_solicitado} onChange={(e) => setForm({ ...form, horario_solicitado: e.target.value })} required />
              </div>
              <div className="field">
                <label>Motivo</label>
                <textarea rows={3} value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} required />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="btn" onClick={() => setModalAberto(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={salvando}>
                  {salvando ? "Enviando..." : "Solicitar"}
                </button>
              </div>
              {erro && <div className="error-msg">{erro}</div>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
