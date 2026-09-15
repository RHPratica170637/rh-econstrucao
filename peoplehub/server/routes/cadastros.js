// Atende /api/empresas, /api/departamentos, /api/cargos -- CRUD simples e parecido
// pros três, então ficam juntos num roteador só.
module.exports = async function handle(req, res, { supabase, resource }) {
  if (resource === "empresas") {
    if (req.method === "GET") {
      const { data, error } = await supabase.from("empresas").select("*").order("nome");
      if (error) throw error;
      return res.status(200).json({ empresas: data });
    }
    if (req.method === "POST") {
      const { nome, cnpj } = req.body || {};
      if (!nome) return res.status(400).json({ error: "Nome é obrigatório" });
      const { data, error } = await supabase.from("empresas").insert({ nome, cnpj }).select().single();
      if (error) throw error;
      return res.status(201).json({ empresa: data });
    }
  }

  if (resource === "departamentos") {
    if (req.method === "GET") {
      const { empresa_id } = req.query;
      let query = supabase.from("departamentos").select("*").order("nome");
      if (empresa_id) query = query.eq("empresa_id", empresa_id);
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json({ departamentos: data });
    }
    if (req.method === "POST") {
      const { empresa_id, nome } = req.body || {};
      if (!empresa_id || !nome) return res.status(400).json({ error: "empresa_id e nome são obrigatórios" });
      const { data, error } = await supabase.from("departamentos").insert({ empresa_id, nome }).select().single();
      if (error) throw error;
      return res.status(201).json({ departamento: data });
    }
  }

  if (resource === "cargos") {
    if (req.method === "GET") {
      const { empresa_id } = req.query;
      let query = supabase.from("cargos").select("*").order("nome");
      if (empresa_id) query = query.eq("empresa_id", empresa_id);
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json({ cargos: data });
    }
    if (req.method === "POST") {
      const { empresa_id, nome, nivel } = req.body || {};
      if (!empresa_id || !nome) return res.status(400).json({ error: "empresa_id e nome são obrigatórios" });
      const { data, error } = await supabase.from("cargos").insert({ empresa_id, nome, nivel }).select().single();
      if (error) throw error;
      return res.status(201).json({ cargo: data });
    }
  }

  return res.status(405).json({ error: "Método não permitido" });
};
