function diffDias(inicio, fim) {
  const a = new Date(inicio);
  const b = new Date(fim);
  return Math.round((b - a) / 86400000) + 1;
}

module.exports = async function handle(req, res, { supabase, segments }) {
  const id = segments[0];

  if (!id) {
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
      return res.status(200).json({ solicitacoes: filtrados });
    }

    if (req.method === "POST") {
      const { colaborador_id, data_inicio, data_fim } = req.body || {};
      if (!colaborador_id || !data_inicio || !data_fim) {
        return res.status(400).json({ error: "colaborador_id, data_inicio e data_fim são obrigatórios" });
      }
      const dias = diffDias(data_inicio, data_fim);

      const { data: colaborador, error: colErr } = await supabase
        .from("colaboradores").select("saldo_ferias_dias").eq("id", colaborador_id).single();
      if (colErr) throw colErr;

      if (dias > colaborador.saldo_ferias_dias) {
        return res.status(400).json({ error: `Saldo insuficiente: pediu ${dias} dia(s), saldo disponível é ${colaborador.saldo_ferias_dias}.` });
      }

      const { data: solicitacao, error } = await supabase
        .from("ferias_solicitacoes").insert({ colaborador_id, data_inicio, data_fim, dias, status: "solicitado" }).select().single();
      if (error) throw error;
      return res.status(201).json({ solicitacao });
    }

    return res.status(405).json({ error: "Método não permitido" });
  }

  if (req.method !== "PATCH") return res.status(405).json({ error: "Método não permitido" });

  const { acao, observacao } = req.body || {};

  const { data: solicitacao, error: fetchErr } = await supabase
    .from("ferias_solicitacoes").select("*").eq("id", id).maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!solicitacao) return res.status(404).json({ error: "Solicitação não encontrada" });
  if (solicitacao.status !== "solicitado") return res.status(400).json({ error: "Essa solicitação já foi decidida." });

  if (acao === "aprovar") {
    const { data: colaborador, error: colErr } = await supabase
      .from("colaboradores").select("saldo_ferias_dias").eq("id", solicitacao.colaborador_id).single();
    if (colErr) throw colErr;

    if (solicitacao.dias > colaborador.saldo_ferias_dias) {
      return res.status(400).json({ error: "Saldo insuficiente para aprovar (mudou desde a solicitação)." });
    }

    const { error: updSaldoErr } = await supabase
      .from("colaboradores").update({ saldo_ferias_dias: colaborador.saldo_ferias_dias - solicitacao.dias }).eq("id", solicitacao.colaborador_id);
    if (updSaldoErr) throw updSaldoErr;

    const { data: atualizado, error } = await supabase
      .from("ferias_solicitacoes")
      .update({ status: "aprovado", decidido_em: new Date().toISOString(), observacao: observacao || null })
      .eq("id", id).select().single();
    if (error) throw error;
    return res.status(200).json({ solicitacao: atualizado });
  }

  if (acao === "recusar") {
    const { data: atualizado, error } = await supabase
      .from("ferias_solicitacoes")
      .update({ status: "recusado", decidido_em: new Date().toISOString(), observacao: observacao || null })
      .eq("id", id).select().single();
    if (error) throw error;
    return res.status(200).json({ solicitacao: atualizado });
  }

  return res.status(400).json({ error: "acao inválida. Use: aprovar ou recusar" });
};
