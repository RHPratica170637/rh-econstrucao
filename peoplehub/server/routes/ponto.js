function proximoMes(mesStr) {
  const [ano, mes] = mesStr.split("-").map(Number);
  const proximo = mes === 12 ? `${ano + 1}-01` : `${ano}-${String(mes + 1).padStart(2, "0")}`;
  return `${proximo}-01`;
}

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

module.exports = async function handle(req, res, { supabase, segments }) {
  const sub = segments[0]; // 'importar' ou vazio

  if (sub === "importar") {
    if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });
    const { empresa_id, csv_texto } = req.body || {};
    if (!empresa_id || !csv_texto) return res.status(400).json({ error: "empresa_id e csv_texto são obrigatórios" });

    let linhas;
    try {
      linhas = parseCsv(csv_texto);
    } catch (err) {
      return res.status(400).json({ error: "Não foi possível ler o CSV: " + err.message });
    }

    const faltando = COLUNAS_ESPERADAS.filter((c) => !(c in (linhas[0] || {})));
    if (faltando.length) {
      return res.status(400).json({
        error: `CSV sem as colunas: ${faltando.join(", ")}. Cabeçalho esperado: ${COLUNAS_ESPERADAS.join(",")}`,
      });
    }

    const { data: colaboradores, error: colErr } = await supabase
      .from("colaboradores").select("id, matricula").eq("empresa_id", empresa_id);
    if (colErr) throw colErr;
    const porMatricula = Object.fromEntries(colaboradores.map((c) => [c.matricula, c.id]));

    const registros = [];
    const erros = [];

    linhas.forEach((linha, idx) => {
      const colaboradorId = porMatricula[linha.matricula];
      if (!colaboradorId) { erros.push(`Linha ${idx + 2}: matrícula "${linha.matricula}" não encontrada`); return; }
      if (!linha.data) { erros.push(`Linha ${idx + 2}: data em branco`); return; }
      const nulo = (v) => (v === "" ? null : v);
      registros.push({
        colaborador_id: colaboradorId, data: linha.data,
        entrada: nulo(linha.entrada), saida_almoco: nulo(linha.saida_almoco),
        retorno_almoco: nulo(linha.retorno_almoco), saida: nulo(linha.saida),
        entrada_extra: nulo(linha.entrada_extra), saida_extra: nulo(linha.saida_extra),
        origem: "importado_csv", updated_at: new Date().toISOString(),
      });
    });

    if (registros.length === 0) return res.status(400).json({ error: "Nenhuma linha válida encontrada no CSV.", erros });

    const { data: inseridos, error: upsertErr } = await supabase
      .from("folha_ponto").upsert(registros, { onConflict: "colaborador_id,data" }).select();
    if (upsertErr) throw upsertErr;

    return res.status(200).json({ importados: inseridos.length, erros });
  }

  // registros normais (listar / lançar)
  if (req.method === "GET") {
    const { colaborador_id, mes } = req.query;
    if (!colaborador_id) return res.status(400).json({ error: "colaborador_id é obrigatório" });
    let query = supabase.from("folha_ponto").select("*").eq("colaborador_id", colaborador_id).order("data");
    if (mes) query = query.gte("data", `${mes}-01`).lt("data", proximoMes(mes));
    const { data, error } = await query;
    if (error) throw error;
    return res.status(200).json({ registros: data });
  }

  if (req.method === "POST") {
    const { colaborador_id, data, entrada, saida_almoco, retorno_almoco, saida, entrada_extra, saida_extra } = req.body || {};
    if (!colaborador_id || !data) return res.status(400).json({ error: "colaborador_id e data são obrigatórios" });
    const nulo = (v) => (v === "" || v === undefined ? null : v);
    const { data: registro, error } = await supabase
      .from("folha_ponto")
      .upsert(
        {
          colaborador_id, data,
          entrada: nulo(entrada), saida_almoco: nulo(saida_almoco), retorno_almoco: nulo(retorno_almoco),
          saida: nulo(saida), entrada_extra: nulo(entrada_extra), saida_extra: nulo(saida_extra),
          origem: "manual", updated_at: new Date().toISOString(),
        },
        { onConflict: "colaborador_id,data" }
      )
      .select().single();
    if (error) throw error;
    return res.status(201).json({ registro });
  }

  return res.status(405).json({ error: "Método não permitido" });
};
