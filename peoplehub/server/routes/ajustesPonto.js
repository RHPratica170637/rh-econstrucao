const MARCADORES_VALIDOS = ["entrada", "saida_almoco", "retorno_almoco", "saida", "entrada_extra", "saida_extra"];

function mesVigente(dataStr) {
  const hoje = new Date();
  const [ano, mes] = dataStr.split("-").map(Number);
  return ano === hoje.getUTCFullYear() && mes === hoje.getUTCMonth() + 1;
}

module.exports = async function handle(req, res, { supabase, segments }) {
  const id = segments[0];

  if (!id) {
    if (req.method === "GET") {
      const { colaborador_id, gestor_id, status } = req.query;
      let query = supabase
        .from("ajustes_ponto").select("*, colaborador:colaboradores(nome, matricula)")
        .order("solicitado_em", { ascending: false });
      if (colaborador_id) query = query.eq("colaborador_id", colaborador_id);
      if (gestor_id) query = query.eq("gestor_id", gestor_id);
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json({ ajustes: data });
    }

    if (req.method === "POST") {
      const { colaborador_id, data, marcador, horario_solicitado, motivo } = req.body || {};
      if (!colaborador_id || !data || !marcador || !horario_solicitado || !motivo) {
        return res.status(400).json({ error: "colaborador_id, data, marcador, horario_solicitado e motivo são obrigatórios" });
      }
      if (!MARCADORES_VALIDOS.includes(marcador)) {
        return res.status(400).json({ error: `marcador inválido. Use um de: ${MARCADORES_VALIDOS.join(", ")}` });
      }
      if (!mesVigente(data)) {
        return res.status(400).json({ error: "Só é possível solicitar ajuste para datas do mês vigente." });
      }

      const { data: colaborador, error: colErr } = await supabase
        .from("colaboradores").select("gestor_id").eq("id", colaborador_id).single();
      if (colErr) throw colErr;

      const { data: ajuste, error } = await supabase
        .from("ajustes_ponto")
        .insert({ colaborador_id, data, marcador, horario_solicitado, motivo, status: "pendente", gestor_id: colaborador.gestor_id })
        .select().single();
      if (error) throw error;
      return res.status(201).json({ ajuste });
    }

    return res.status(405).json({ error: "Método não permitido" });
  }

  if (req.method !== "PATCH") return res.status(405).json({ error: "Método não permitido" });

  const { data: ajusteAtual, error: fetchErr } = await supabase
    .from("ajustes_ponto").select("*").eq("id", id).maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!ajusteAtual) return res.status(404).json({ error: "Ajuste não encontrado" });

  const { acao, observacao } = req.body || {};

  if (["gestor_aprova", "gestor_recusa", "gestor_questiona"].includes(acao)) {
    const novoStatus = { gestor_aprova: "aprovado", gestor_recusa: "recusado", gestor_questiona: "questionado" }[acao];
    const { data: atualizado, error } = await supabase
      .from("ajustes_ponto")
      .update({ status: novoStatus, gestor_decisao_em: new Date().toISOString(), gestor_observacao: observacao || null, updated_at: new Date().toISOString() })
      .eq("id", id).select().single();
    if (error) throw error;
    return res.status(200).json({ ajuste: atualizado });
  }

  if (acao === "rh_processa") {
    if (ajusteAtual.status !== "aprovado") {
      return res.status(400).json({ error: "Só é possível processar ajustes já aprovados pelo gestor." });
    }
    const camposMarcador = { [ajusteAtual.marcador]: ajusteAtual.horario_solicitado };
    const { error: upsertErr } = await supabase
      .from("folha_ponto")
      .upsert({ colaborador_id: ajusteAtual.colaborador_id, data: ajusteAtual.data, ...camposMarcador, updated_at: new Date().toISOString() }, { onConflict: "colaborador_id,data" });
    if (upsertErr) throw upsertErr;

    const { data: atualizado, error } = await supabase
      .from("ajustes_ponto")
      .update({ rh_processado_em: new Date().toISOString(), rh_observacao: observacao || null, updated_at: new Date().toISOString() })
      .eq("id", id).select().single();
    if (error) throw error;
    return res.status(200).json({ ajuste: atualizado });
  }

  return res.status(400).json({ error: "acao inválida. Use: gestor_aprova, gestor_recusa, gestor_questiona ou rh_processa" });
};
