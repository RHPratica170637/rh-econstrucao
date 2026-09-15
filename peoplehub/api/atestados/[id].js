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

  const { acao, motivo_recusa } = req.body || {};

  if (acao === "validar") {
    const { data: atestado, error } = await supabase
      .from("atestados")
      .update({ status: "validado", validado_em: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    res.status(200).json({ atestado });
    return;
  }

  if (acao === "recusar") {
    if (!motivo_recusa) {
      res.status(400).json({ error: "motivo_recusa é obrigatório ao recusar" });
      return;
    }
    // Regra do CLAUDE.md: recusa do atestado vira falta injustificada
    const { data: atestado, error } = await supabase
      .from("atestados")
      .update({
        status: "recusado", validado_em: new Date().toISOString(),
        motivo_recusa, falta_injustificada: true,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    res.status(200).json({ atestado });
    return;
  }

  res.status(400).json({ error: "acao inválida. Use: validar ou recusar" });
});
