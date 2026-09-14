const { getSupabaseAdmin } = require("../_lib/supabaseAdmin");
const { withCors } = require("../_lib/withCors");

module.exports = withCors(async (req, res) => {
  const supabase = getSupabaseAdmin();
  const { id } = req.query;

  if (!id) {
    res.status(400).json({ error: "id é obrigatório" });
    return;
  }

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("colaboradores")
      .select(
        "*, departamento:departamentos(id, nome), cargo:cargos(id, nome), admissao:admissoes(*)"
      )
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      res.status(404).json({ error: "Colaborador não encontrado" });
      return;
    }
    res.status(200).json({ colaborador: data });
    return;
  }

  if (req.method === "PUT") {
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.id;
    const { data, error } = await supabase
      .from("colaboradores")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    res.status(200).json({ colaborador: data });
    return;
  }

  res.status(405).json({ error: "Método não permitido" });
});
