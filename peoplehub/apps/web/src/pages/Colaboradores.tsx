import { useEffect, useState, FormEvent } from "react";
import { api } from "../lib/api";

interface Departamento { id: string; nome: string; }
interface Cargo { id: string; nome: string; }
interface Colaborador {
  id: string;
  matricula: string;
  nome: string;
  status: string;
  departamento: { nome: string } | null;
  cargo: { nome: string } | null;
  admissao: { etapa_atual: string; aso_aprovado: boolean } | null;
}

const BADGE: Record<string, string> = {
  ativo: "badge-ativo",
  admissao_pendente: "badge-pendente",
  desligado: "badge-desligado",
};

export default function Colaboradores({ empresaId }: { empresaId: string }) {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [form, setForm] = useState({
    nome: "", departamento_id: "", cargo_id: "", data_admissao: "",
  });

  async function carregar() {
    const [cRes, dRes, gRes] = await Promise.all([
      api.listarColaboradores(empresaId),
      api.listarDepartamentos(empresaId),
      api.listarCargos(empresaId),
    ]);
    setColaboradores(cRes.colaboradores);
    setDepartamentos(dRes.departamentos);
    setCargos(gRes.cargos);
  }

  useEffect(() => { carregar(); }, [empresaId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      await api.criarColaborador({ empresa_id: empresaId, ...form });
      setModalAberto(false);
      setForm({ nome: "", departamento_id: "", cargo_id: "", data_admissao: "" });
      await carregar();
    } catch (err: any) {
      setErro(err.message || "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <h1>Colaboradores</h1>
          <p className="subtitle">Cadastro e acompanhamento de admissão.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalAberto(true)}>+ Novo colaborador</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr><th>Matrícula</th><th>Nome</th><th>Departamento</th><th>Cargo</th><th>Status</th><th>Admissão</th></tr>
          </thead>
          <tbody>
            {colaboradores.map((c) => (
              <tr key={c.id}>
                <td style={{ fontFamily: "monospace", color: "var(--texto-dim)" }}>{c.matricula}</td>
                <td>{c.nome}</td>
                <td>{c.departamento?.nome || "—"}</td>
                <td>{c.cargo?.nome || "—"}</td>
                <td><span className={`badge ${BADGE[c.status] || ""}`}>{c.status}</span></td>
                <td>{c.admissao ? c.admissao.etapa_atual : "—"}</td>
              </tr>
            ))}
            {colaboradores.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 30, color: "var(--texto-dim)" }}>
                Nenhum colaborador cadastrado ainda.
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
          <div className="card" style={{ width: 480 }}>
            <h1 style={{ fontSize: 18 }}>Novo colaborador</h1>
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Nome completo</label>
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
              </div>
              <p className="subtitle" style={{ marginTop: -8 }}>
                CPF e dados sensíveis são preenchidos depois, na etapa de documentos da admissão.
              </p>
              <div className="field">
                <label>Departamento</label>
                <select value={form.departamento_id} onChange={(e) => setForm({ ...form, departamento_id: e.target.value })}>
                  <option value="">—</option>
                  {departamentos.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Cargo</label>
                <select value={form.cargo_id} onChange={(e) => setForm({ ...form, cargo_id: e.target.value })}>
                  <option value="">—</option>
                  {cargos.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Data de admissão prevista</label>
                <input type="date" value={form.data_admissao} onChange={(e) => setForm({ ...form, data_admissao: e.target.value })} />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="btn" onClick={() => setModalAberto(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={salvando}>
                  {salvando ? "Salvando..." : "Cadastrar e iniciar admissão"}
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
