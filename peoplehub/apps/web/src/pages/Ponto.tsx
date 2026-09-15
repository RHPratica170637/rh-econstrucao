import { useEffect, useState, useRef, FormEvent } from "react";
import { api } from "../lib/api";

interface Colaborador { id: string; matricula: string; nome: string; }
interface RegistroPonto {
  id: string; data: string; entrada: string | null; saida_almoco: string | null;
  retorno_almoco: string | null; saida: string | null; entrada_extra: string | null; saida_extra: string | null;
  origem: string;
}

function mesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function Ponto({ empresaId }: { empresaId: string }) {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [colaboradorId, setColaboradorId] = useState("");
  const [mes, setMes] = useState(mesAtual());
  const [registros, setRegistros] = useState<RegistroPonto[]>([]);
  const [csvTexto, setCsvTexto] = useState("");
  const [arquivoNome, setArquivoNome] = useState("");
  const [resultadoImport, setResultadoImport] = useState<{ importados: number; erros: string[] } | null>(null);
  const [importando, setImportando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.listarColaboradores(empresaId).then((r) => {
      setColaboradores(r.colaboradores);
      if (r.colaboradores.length && !colaboradorId) setColaboradorId(r.colaboradores[0].id);
    });
  }, [empresaId]);

  useEffect(() => {
    if (colaboradorId) {
      api.listarPonto(colaboradorId, mes).then((r) => setRegistros(r.registros));
    }
  }, [colaboradorId, mes]);

  async function handleArquivo(file: File) {
    setArquivoNome(file.name);
    const texto = await file.text();
    setCsvTexto(texto);
    setResultadoImport(null);
  }

  async function handleImportar(e: FormEvent) {
    e.preventDefault();
    setImportando(true);
    setResultadoImport(null);
    try {
      const resp = await api.importarPontoCsv(empresaId, csvTexto);
      setResultadoImport(resp);
      setCsvTexto("");
      setArquivoNome("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (colaboradorId) api.listarPonto(colaboradorId, mes).then((r) => setRegistros(r.registros));
    } catch (err: any) {
      setResultadoImport({ importados: 0, erros: [err.message] });
    } finally {
      setImportando(false);
    }
  }

  function fmt(h: string | null) {
    return h ? h.slice(0, 5) : "—";
  }

  return (
    <div>
      <h1>Folha de ponto</h1>
      <p className="subtitle">Etapa 2 — registros e importação.</p>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Importar CSV</h3>
        <p style={{ fontSize: 13, color: "var(--texto-dim)" }}>
          Cabeçalho esperado: <code>matricula,data,entrada,saida_almoco,retorno_almoco,saida,entrada_extra,saida_extra</code>
          <br />XLSX e AFD ainda não são suportados — só CSV por enquanto.
        </p>
        <form onSubmit={handleImportar}>
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: "1.5px dashed var(--border)", borderRadius: 8, padding: 24, textAlign: "center",
              cursor: "pointer", fontSize: 13, color: arquivoNome ? "var(--texto)" : "var(--texto-dim)",
              borderColor: arquivoNome ? "var(--sucesso)" : "var(--border)",
            }}
          >
            {arquivoNome ? `✓ ${arquivoNome} (${csvTexto.split(/\r?\n/).filter(Boolean).length - 1} linha(s) de dados)` : "Clique para selecionar o arquivo .csv"}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: "none" }}
            onChange={(e) => e.target.files?.[0] && handleArquivo(e.target.files[0])}
          />
          <button className="btn btn-primary" style={{ marginTop: 10 }} disabled={importando || !csvTexto.trim()}>
            {importando ? "Importando..." : "Importar"}
          </button>
        </form>
        {resultadoImport && (
          <div style={{ marginTop: 10, fontSize: 13 }}>
            <div style={{ color: "var(--sucesso)" }}>{resultadoImport.importados} registro(s) importado(s).</div>
            {resultadoImport.erros?.map((e, i) => <div key={i} className="error-msg">{e}</div>)}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <select value={colaboradorId} onChange={(e) => setColaboradorId(e.target.value)} style={{ maxWidth: 260 }}>
          {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.matricula} — {c.nome}</option>)}
        </select>
        <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} style={{ maxWidth: 160 }} />
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Data</th><th>Entrada</th><th>Saída almoço</th><th>Retorno almoço</th>
              <th>Saída</th><th>Entrada extra</th><th>Saída extra</th><th>Origem</th>
            </tr>
          </thead>
          <tbody>
            {registros.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.data + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                <td>{fmt(r.entrada)}</td>
                <td>{fmt(r.saida_almoco)}</td>
                <td>{fmt(r.retorno_almoco)}</td>
                <td>{fmt(r.saida)}</td>
                <td>{fmt(r.entrada_extra)}</td>
                <td>{fmt(r.saida_extra)}</td>
                <td><span className="tag">{r.origem}</span></td>
              </tr>
            ))}
            {registros.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: 30, color: "var(--texto-dim)" }}>
                Nenhum registro nesse mês.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
