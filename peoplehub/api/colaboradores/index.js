const { getSupabaseAdmin } = require("../_lib/supabaseAdmin");
const { withCors } = require("../_lib/withCors");

module.exports = withCors(async (req, res) => {
  const supabase = getSupabaseAdmin();

  if (req.method === "GET") {
    const { empresa_id, status } = req.query;
    let query = supabase
      .from("colaboradores")
      .select(
        "*, departamento:departamentos(id, nome), cargo:cargos(id, nome), admissao:admissoes(etapa_atual, aso_aprovado)"
      )
      .order("nome");
    if (empresa_id) query = query.eq("empresa_id", empresa_id);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw error;
    res.status(200).json({ colaboradores: data });
    return;
  }

  if (req.method === "POST") {
    const {
      empresa_id, departamento_id, cargo_id, gestor_id,
      nome, cpf, pis_pasep, data_nascimento, data_admissao,
      endereco, dados_bancarios, contato_emergencia,
    } = req.body || {};

    if (!empresa_id || !nome) {
      res.status(400).json({ error: "empresa_id e nome são obrigatórios" });
      return;
    }

    const { data: colaborador, error: colErr } = await supabase
      .from("colaboradores")
      .insert({
        empresa_id, departamento_id, cargo_id, gestor_id,
        nome, cpf, pis_pasep, data_nascimento, data_admissao,
        endereco, dados_bancarios, contato_emergencia,
        status: "admissao_pendente",
      })
      .select()
      .single();
    if (colErr) throw colErr;

    // Admissão digital nasce junto, na primeira etapa do fluxo de 5 passos
    const { data: admissao, error: admErr } = await supabase
      .from("admissoes")
      .insert({ colaborador_id: colaborador.id, etapa_atual: "dados_pessoais" })
      .select()
      .single();
    if (admErr) throw admErr;

    res.status(201).json({ colaborador, admissao });
    return;
  }

  res.status(405).json({ error: "Método não permitido" });
});
