const { getSupabaseAdmin } = require("../_lib/supabaseAdmin");
const { withCors } = require("../_lib/withCors");

function diffDias(inicio, fim) {
  const a = new Date(inicio);
  const b = new Date(fim);
  return Math.round((b - a) / 86400000) + 1;
}

module.exports = withCors(async (req, res) => {
  const supabase = getSupabaseAdmin();

  if (req.method === "GET") {
    const { colaborador_id, empresa_id, status } = req.query;
    let query = supabase
      .from("ferias_solicitacoes")
      .select("*, colaborador:colaboradores(nome, matricula, empresa_id, saldo_ferias_dias)")
      .order("solicitado_em", { ascending: false });
    if (colaborador_id) query = query.eq("colaborador_id", colaborador_id);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw error;
    let filtrados = data;
    if (empresa_id) filtrados = data.filter((f) => f.colaborador?.empresa_id === empresa_id);
    res.status(200).json({ solicitacoes: filtrados });
    return;
  }

  if (req.method === "POST") {
    const { colaborador_id, data_inicio, data_fim } = req.body || {};
    if (!colaborador_id || !data_inicio || !data_fim) {
      res.status(400).json({ error: "colaborador_id, data_inicio e data_fim são obrigatórios" });
      return;
    }

    const dias = diffDias(data_inicio, data_fim);

    const { data: colaborador, error: colErr } = await supabase
      .from("colaboradores")
      .select("saldo_ferias_dias")
      .eq("id", colaborador_id)
      .single();
    if (colErr) throw colErr;

    if (dias > colaborador.saldo_ferias_dias) {
      res.status(400).json({
        error: `Saldo insuficiente: pediu ${dias} dia(s), saldo disponível é ${colaborador.saldo_ferias_dias}.`,
      });
      return;
    }

    const { data: solicitacao, error } = await supabase
      .from("ferias_solicitacoes")
      .insert({ colaborador_id, data_inicio, data_fim, dias, status: "solicitado" })
      .select()
      .single();
    if (error) throw error;

    res.status(201).json({ solicitacao });
    return;
  }

  res.status(405).json({ error: "Método não permitido" });
});
