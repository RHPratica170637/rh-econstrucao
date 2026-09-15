import { useEffect, useState, useRef, FormEvent } from "react";
import { api } from "../lib/api";
import { arquivoParaBase64 } from "../lib/arquivo";

interface Colaborador { id: string; matricula: string; nome: string; }
interface Holerite {
  id: string; mes_referencia: string; status: string; url: string | null;
  prazo_assinatura: string; assinado_em: string | null;
  colaborador: { nome: string; matricula: string };
}

function mesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const STATUS_BADGE: Record<string, string> = {
  aguardando_assinatura: "badge-pendente", assinado: "badge-ativo", vencido: "badge-desligado",
};

export default function Holerites({ empresaId }: { empresaId: string }) {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [holerites, setHolerites] = useState<Holerite[]>([]);
  const [mesReferencia, setMesReferencia] = useState(mesAtual());
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: string[]; erro: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function carregar() {
    const r = await api.listarHolerites({ empresa_id: empresaId });
    setHolerites(r.holerites);
  }

  useEffect(() => {
    api.listarColaboradores(empresaId).then((r) => setColaboradores(r.colaboradores));
    carregar();
  }, [empresaId]);

  function extrairMatricula(nomeArquivo: string) {
    const m = nomeArquivo.match(/^(\d+)/);
    return m ? m[1].padStart(3, "0") : null;
  }

  async function handleEnviarLote(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    const ok: string[] = [];
    const erro: string[] = [];

    for (const arquivo of arquivos) {
      const matricula = extrairMatricula(arquivo.name);
      const colaborador = colaboradores.find((c) => c.matricula === matricula);
      if (!colaborador) {
        erro.push(`${arquivo.name}: matrícula "${matricula}" não encontrada`);
        continue;
      }
      try {
        const base64 = await arquivoParaBase64(arquivo);
        await api.enviarHolerite({
          colaborador_id: colaborador.id, mes_referencia: mesReferencia,
          arquivo_base64: base64, arquivo_nome: arquivo.name,
        });
        ok.push(`${arquivo.name} → ${colaborador.nome}`);
      } catch (err: any) {
        erro.push(`${arquivo.name}: ${err.message}`);
      }
    }

    setResultado({ ok, erro });
    setArquivos([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setEnviando(false);
    carregar();
  }

  return (
    <div>
      <h1>Holerites</h1>
      <p className="subtitle">Upload em lote e assinatura eletrônica.</p>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Enviar holerites do mês</h3>
        <p style={{ fontSize: 13, color: "var(--texto-dim)" }}>
          Nomeie os arquivos começando pela matrícula (ex: <code>001.pdf</code>, <code>002-holerite.pdf</code>) —
          o sistema associa automaticamente ao colaborador certo.
        </p>
        <form onSubmit={handleEnviarLote}>
          <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            <input type="month" value={mesReferencia} onChange={(e) => setMesReferencia(e.target.value)} style={{ maxWidth: 160 }} />
          </div>
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: "1.5px dashed var(--border)", borderRadius: 8, padding: 24, textAlign: "center",
              cursor: "pointer", fontSize: 13,
              color: arquivos.length ? "var(--texto)" : "var(--texto-dim)",
              borderColor: arquivos.length ? "var(--sucesso)" : "var(--border)",
            }}
          >
            {arquivos.length ? `${arquivos.length} arquivo(s) selecionado(s)` : "Clique para selecionar um ou mais PDFs"}
          </div>
          <input
            ref={fileInputRef} type="file" accept=".pdf" multiple style={{ display: "none" }}
            onChange={(e) => setArquivos(Array.from(e.target.files || []))}
          />
          <button className="btn btn-primary" style={{ marginTop: 10 }} disabled={enviando || arquivos.length === 0}>
            {enviando ? "Enviando..." : `Enviar ${arquivos.length || ""} holerite(s)`}
          </button>
        </form>
        {resultado && (
          <div style={{ marginTop: 12, fontSize: 13 }}>
            {resultado.ok.map((m, i) => <div key={i} style={{ color: "var(--sucesso)" }}>✓ {m}</div>)}
            {resultado.erro.map((m, i) => <div key={i} className="error-msg">✗ {m}</div>)}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr><th>Colaborador</th><th>Mês</th><th>Status</th><th>Prazo assinatura</th><th></th></tr>
          </thead>
          <tbody>
            {holerites.map((h) => (
              <tr key={h.id}>
                <td>{h.colaborador?.matricula} — {h.colaborador?.nome}</td>
                <td>{h.mes_referencia}</td>
                <td><span className={`badge ${STATUS_BADGE[h.status] || ""}`}>{h.status}</span></td>
                <td>{new Date(h.prazo_assinatura + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                <td style={{ display: "flex", gap: 6 }}>
                  {h.url && <a href={h.url} target="_blank" rel="noreferrer" className="btn" style={{ fontSize: 11, padding: "6px 8px" }}>Ver PDF</a>}
                  {h.status === "aguardando_assinatura" && (
                    <button
                      className="btn btn-sucesso" style={{ fontSize: 11, padding: "6px 8px" }}
                      onClick={async () => { await api.assinarHolerite(h.id); carregar(); }}
                    >
                      Assinar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {holerites.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 30, color: "var(--texto-dim)" }}>
                Nenhum holerite enviado ainda.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
