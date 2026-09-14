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

  const { data: ajusteAtual, error: fetchErr } = await supabase
    .from("ajustes_ponto")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!ajusteAtual) {
    res.status(404).json({ error: "Ajuste não encontrado" });
    return;
  }

  const { acao, observacao } = req.body || {};
  // acao: gestor_aprova | gestor_recusa | gestor_questiona | rh_processa

  if (acao === "gestor_aprova" || acao === "gestor_recusa" || acao === "gestor_questiona") {
    const novoStatus = { gestor_aprova: "aprovado", gestor_recusa: "recusado", gestor_questiona: "questionado" }[acao];
    const { data: atualizado, error } = await supabase
      .from("ajustes_ponto")
      .update({
        status: novoStatus,
        gestor_decisao_em: new Date().toISOString(),
        gestor_observacao: observacao || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    res.status(200).json({ ajuste: atualizado });
    return;
  }

  if (acao === "rh_processa") {
    if (ajusteAtual.status !== "aprovado") {
      res.status(400).json({ error: "Só é possível processar ajustes já aprovados pelo gestor." });
      return;
    }

    // Aplica o horário ajustado na folha de ponto de fato
    const camposMarcador = { [ajusteAtual.marcador]: ajusteAtual.horario_solicitado };
    const { error: upsertErr } = await supabase
      .from("folha_ponto")
      .upsert(
        {
          colaborador_id: ajusteAtual.colaborador_id,
          data: ajusteAtual.data,
          ...camposMarcador,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "colaborador_id,data" }
      );
    if (upsertErr) throw upsertErr;

    const { data: atualizado, error } = await supabase
      .from("ajustes_ponto")
      .update({
        rh_processado_em: new Date().toISOString(),
        rh_observacao: observacao || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    res.status(200).json({ ajuste: atualizado });
    return;
  }

  res.status(400).json({ error: "acao inválida. Use: gestor_aprova, gestor_recusa, gestor_questiona ou rh_processa" });
});
