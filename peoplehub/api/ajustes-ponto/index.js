const { getSupabaseAdmin } = require("../_lib/supabaseAdmin");
const { withCors } = require("../_lib/withCors");

const MARCADORES_VALIDOS = [
  "entrada", "saida_almoco", "retorno_almoco", "saida", "entrada_extra", "saida_extra",
];

function mesVigente(dataStr) {
  const hoje = new Date();
  const [ano, mes] = dataStr.split("-").map(Number);
  return ano === hoje.getUTCFullYear() && mes === hoje.getUTCMonth() + 1;
}

module.exports = withCors(async (req, res) => {
  const supabase = getSupabaseAdmin();

  if (req.method === "GET") {
    const { colaborador_id, gestor_id, status } = req.query;
    let query = supabase
      .from("ajustes_ponto")
      .select("*, colaborador:colaboradores(nome, matricula)")
      .order("solicitado_em", { ascending: false });
    if (colaborador_id) query = query.eq("colaborador_id", colaborador_id);
    if (gestor_id) query = query.eq("gestor_id", gestor_id);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw error;
    res.status(200).json({ ajustes: data });
    return;
  }

  if (req.method === "POST") {
    const { colaborador_id, data, marcador, horario_solicitado, motivo } = req.body || {};

    if (!colaborador_id || !data || !marcador || !horario_solicitado || !motivo) {
      res.status(400).json({ error: "colaborador_id, data, marcador, horario_solicitado e motivo são obrigatórios" });
      return;
    }
    if (!MARCADORES_VALIDOS.includes(marcador)) {
      res.status(400).json({ error: `marcador inválido. Use um de: ${MARCADORES_VALIDOS.join(", ")}` });
      return;
    }
    // Regra do CLAUDE.md: ajuste de ponto só é aceito no mês vigente
    if (!mesVigente(data)) {
      res.status(400).json({ error: "Só é possível solicitar ajuste para datas do mês vigente." });
      return;
    }

    const { data: colaborador, error: colErr } = await supabase
      .from("colaboradores")
      .select("gestor_id")
      .eq("id", colaborador_id)
      .single();
    if (colErr) throw colErr;

    const { data: ajuste, error } = await supabase
      .from("ajustes_ponto")
      .insert({
        colaborador_id, data, marcador, horario_solicitado, motivo,
        status: "pendente",
        gestor_id: colaborador.gestor_id,
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ ajuste });
    return;
  }

  res.status(405).json({ error: "Método não permitido" });
});
