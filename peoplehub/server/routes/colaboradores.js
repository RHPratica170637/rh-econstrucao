module.exports = async function handle(req, res, { supabase, segments }) {
  const id = segments[0]; // presente quando é GET/PUT de um colaborador específico

  if (!id) {
    if (req.method === "GET") {
      const { empresa_id, status } = req.query;
      let query = supabase
        .from("colaboradores")
        .select(
          "*, departamento:departamentos(id, nome), cargo:cargos(id, nome), admissao:admissoes(etapa_atual, aso_aprovado)"
        )
        .order("matricula");
      if (empresa_id) query = query.eq("empresa_id", empresa_id);
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      const semCpf = (data || []).map(({ cpf, ...resto }) => resto);
      return res.status(200).json({ colaboradores: semCpf });
    }

    if (req.method === "POST") {
      const {
        empresa_id, departamento_id, cargo_id, gestor_id,
        nome, pis_pasep, data_nascimento, data_admissao,
        endereco, dados_bancarios, contato_emergencia,
      } = req.body || {};

      if (!empresa_id || !nome) {
        return res.status(400).json({ error: "empresa_id e nome são obrigatórios" });
      }

      const normalizarUuid = (v) => (v === "" || v === undefined ? null : v);
      const departamentoIdNorm = normalizarUuid(departamento_id);
      const cargoIdNorm = normalizarUuid(cargo_id);
      const gestorIdNorm = normalizarUuid(gestor_id);
      const dataAdmissaoNorm = data_admissao === "" ? null : data_admissao;
      const dataNascimentoNorm = data_nascimento === "" ? null : data_nascimento;

      const { data: ultimo, error: seqErr } = await supabase
        .from("colaboradores")
        .select("matricula")
        .eq("empresa_id", empresa_id)
        .order("matricula", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (seqErr) throw seqErr;
      const proximoNumero = ultimo ? parseInt(ultimo.matricula, 10) + 1 : 1;
      const matricula = String(proximoNumero).padStart(3, "0");

      const { data: colaborador, error: colErr } = await supabase
        .from("colaboradores")
        .insert({
          empresa_id, departamento_id: departamentoIdNorm, cargo_id: cargoIdNorm, gestor_id: gestorIdNorm,
          nome, matricula, pis_pasep, data_nascimento: dataNascimentoNorm, data_admissao: dataAdmissaoNorm,
          endereco, dados_bancarios, contato_emergencia,
          status: "admissao_pendente",
        })
        .select()
        .single();
      if (colErr) throw colErr;

      const { data: admissao, error: admErr } = await supabase
        .from("admissoes")
        .insert({ colaborador_id: colaborador.id, etapa_atual: "dados_pessoais" })
        .select()
        .single();
      if (admErr) throw admErr;

      return res.status(201).json({ colaborador, admissao });
    }

    return res.status(405).json({ error: "Método não permitido" });
  }

  // Com id na URL
  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("colaboradores")
      .select(
        "*, departamento:departamentos(id, nome), cargo:cargos(id, nome), admissao:admissoes(*)"
      )
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Colaborador não encontrado" });
    return res.status(200).json({ colaborador: data });
  }

  if (req.method === "PUT") {
    const normalizarUuid = (v) => (v === "" ? null : v);
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    if ("departamento_id" in updates) updates.departamento_id = normalizarUuid(updates.departamento_id);
    if ("cargo_id" in updates) updates.cargo_id = normalizarUuid(updates.cargo_id);
    if ("gestor_id" in updates) updates.gestor_id = normalizarUuid(updates.gestor_id);
    if ("data_admissao" in updates && updates.data_admissao === "") updates.data_admissao = null;
    if ("data_nascimento" in updates && updates.data_nascimento === "") updates.data_nascimento = null;
    delete updates.id;
    const { data, error } = await supabase.from("colaboradores").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return res.status(200).json({ colaborador: data });
  }

  return res.status(405).json({ error: "Método não permitido" });
};
