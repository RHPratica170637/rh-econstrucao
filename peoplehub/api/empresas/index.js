const { getSupabaseAdmin } = require("../_lib/supabaseAdmin");
const { withCors } = require("../_lib/withCors");

module.exports = withCors(async (req, res) => {
  const supabase = getSupabaseAdmin();

  if (req.method === "GET") {
    const { data, error } = await supabase.from("empresas").select("*").order("nome");
    if (error) throw error;
    res.status(200).json({ empresas: data });
    return;
  }

  if (req.method === "POST") {
    const { nome, cnpj } = req.body || {};
    if (!nome) {
      res.status(400).json({ error: "Nome é obrigatório" });
      return;
    }
    const { data, error } = await supabase.from("empresas").insert({ nome, cnpj }).select().single();
    if (error) throw error;
    res.status(201).json({ empresa: data });
    return;
  }

  res.status(405).json({ error: "Método não permitido" });
});
