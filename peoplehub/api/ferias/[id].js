const { getSupabaseAdmin } = require("../_lib/supabaseAdmin");
const { withCors } = require("../_lib/withCors");

module.exports = withCors(async (req, res) => {
  const supabase = getSupabaseAdmin();
  const { id } = req.query;

  if (!id) {
    res.status(400).json({ error: "id é obrigatório" });
    return;
  }
  if (req.method !== "PATCH") {
    res.status(405).json({ error: "Método não permitido" });
    return;
  }

  const { acao, observacao } = req.body || {};

  const { data: solicitacao, error: fetchErr } = await supabase
    .from("ferias_solicitacoes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!solicitacao) {
    res.status(404).json({ error: "Solicitação não encontrada" });
    return;
  }
  if (solicitacao.status !== "solicitado") {
    res.status(400).json({ error: "Essa solicitação já foi decidida." });
    return;
  }

  if (acao === "aprovar") {
    const { data: colaborador, error: colErr } = await supabase
      .from("colaboradores")
      .select("saldo_ferias_dias")
      .eq("id", solicitacao.colaborador_id)
      .single();
    if (colErr) throw colErr;

    if (solicitacao.dias > colaborador.saldo_ferias_dias) {
      res.status(400).json({ error: "Saldo insuficiente para aprovar (mudou desde a solicitação)." });
      return;
    }

    const { error: updSaldoErr } = await supabase
      .from("colaboradores")
      .update({ saldo_ferias_dias: colaborador.saldo_ferias_dias - solicitacao.dias })
      .eq("id", solicitacao.colaborador_id);
    if (updSaldoErr) throw updSaldoErr;

    const { data: atualizado, error } = await supabase
      .from("ferias_solicitacoes")
      .update({ status: "aprovado", decidido_em: new Date().toISOString(), observacao: observacao || null })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    res.status(200).json({ solicitacao: atualizado });
    return;
  }

  if (acao === "recusar") {
    const { data: atualizado, error } = await supabase
      .from("ferias_solicitacoes")
      .update({ status: "recusado", decidido_em: new Date().toISOString(), observacao: observacao || null })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    res.status(200).json({ solicitacao: atualizado });
    return;
  }

  res.status(400).json({ error: "acao inválida. Use: aprovar ou recusar" });
});
