// Importação de ponto via CSV. XLSX e AFD (Portaria 1510) ficam para uma
// próxima etapa — são formatos mais específicos e merecem atenção própria.
//
// Formato esperado do CSV (cabeçalho obrigatório, separador vírgula):
// matricula,data,entrada,saida_almoco,retorno_almoco,saida,entrada_extra,saida_extra
// 001,2026-09-01,08:00,12:00,13:00,17:00,,
const { getSupabaseAdmin } = require("../_lib/supabaseAdmin");
const { withCors } = require("../_lib/withCors");

const COLUNAS_ESPERADAS = [
  "matricula", "data", "entrada", "saida_almoco", "retorno_almoco",
  "saida", "entrada_extra", "saida_extra",
];

function parseCsv(texto) {
  const linhas = texto.trim().split(/\r?\n/);
  const cabecalho = linhas[0].split(",").map((c) => c.trim().toLowerCase());
  return linhas.slice(1).filter(Boolean).map((linha) => {
    const valores = linha.split(",").map((v) => v.trim());
    const obj = {};
    cabecalho.forEach((col, i) => { obj[col] = valores[i] || ""; });
    return obj;
  });
}

module.exports = withCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido" });
    return;
  }

  const { empresa_id, csv_texto } = req.body || {};
  if (!empresa_id || !csv_texto) {
    res.status(400).json({ error: "empresa_id e csv_texto são obrigatórios" });
    return;
  }

  let linhas;
  try {
    linhas = parseCsv(csv_texto);
  } catch (err) {
    res.status(400).json({ error: "Não foi possível ler o CSV: " + err.message });
    return;
  }

  const faltando = COLUNAS_ESPERADAS.filter((c) => !(c in (linhas[0] || {})));
  if (faltando.length) {
    res.status(400).json({
      error: `CSV sem as colunas: ${faltando.join(", ")}. Cabeçalho esperado: ${COLUNAS_ESPERADAS.join(",")}`,
    });
    return;
  }

  const supabase = getSupabaseAdmin();

  const { data: colaboradores, error: colErr } = await supabase
    .from("colaboradores")
    .select("id, matricula")
    .eq("empresa_id", empresa_id);
  if (colErr) throw colErr;
  const porMatricula = Object.fromEntries(colaboradores.map((c) => [c.matricula, c.id]));

  const registros = [];
  const erros = [];

  linhas.forEach((linha, idx) => {
    const colaboradorId = porMatricula[linha.matricula];
    if (!colaboradorId) {
      erros.push(`Linha ${idx + 2}: matrícula "${linha.matricula}" não encontrada`);
      return;
    }
    if (!linha.data) {
      erros.push(`Linha ${idx + 2}: data em branco`);
      return;
    }
    const nulo = (v) => (v === "" ? null : v);
    registros.push({
      colaborador_id: colaboradorId,
      data: linha.data,
      entrada: nulo(linha.entrada),
      saida_almoco: nulo(linha.saida_almoco),
      retorno_almoco: nulo(linha.retorno_almoco),
      saida: nulo(linha.saida),
      entrada_extra: nulo(linha.entrada_extra),
      saida_extra: nulo(linha.saida_extra),
      origem: "importado_csv",
      updated_at: new Date().toISOString(),
    });
  });

  if (registros.length === 0) {
    res.status(400).json({ error: "Nenhuma linha válida encontrada no CSV.", erros });
    return;
  }

  const { data: inseridos, error: upsertErr } = await supabase
    .from("folha_ponto")
    .upsert(registros, { onConflict: "colaborador_id,data" })
    .select();
  if (upsertErr) throw upsertErr;

  res.status(200).json({
    importados: inseridos.length,
    erros,
  });
});
