const { getSupabaseAdmin } = require("../_lib/supabaseAdmin");
const { withCors } = require("../_lib/withCors");

module.exports = withCors(async (req, res) => {
  const supabase = getSupabaseAdmin();

  if (req.method === "GET") {
    const { empresa_id } = req.query;
    let query = supabase.from("departamentos").select("*").order("nome");
    if (empresa_id) query = query.eq("empresa_id", empresa_id);
    const { data, error } = await query;
    if (error) throw error;
    res.status(200).json({ departamentos: data });
    return;
  }

  if (req.method === "POST") {
    const { empresa_id, nome } = req.body || {};
    if (!empresa_id || !nome) {
      res.status(400).json({ error: "empresa_id e nome são obrigatórios" });
      return;
    }
    const { data, error } = await supabase
      .from("departamentos")
      .insert({ empresa_id, nome })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ departamento: data });
    return;
  }

  res.status(405).json({ error: "Método não permitido" });
});
