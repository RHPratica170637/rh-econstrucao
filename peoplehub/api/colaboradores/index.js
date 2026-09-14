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
      .order("matricula");
    if (empresa_id) query = query.eq("empresa_id", empresa_id);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw error;
    // CPF nunca sai na listagem, mesmo que alguém peça — só na ficha individual (etapa de documentos)
    const semCpf = (data || []).map(({ cpf, ...resto }) => resto);
    res.status(200).json({ colaboradores: semCpf });
    return;
  }

  if (req.method === "POST") {
    const {
      empresa_id, departamento_id, cargo_id, gestor_id,
      nome, pis_pasep, data_nascimento, data_admissao,
      endereco, dados_bancarios, contato_emergencia,
    } = req.body || {};

    if (!empresa_id || !nome) {
      res.status(400).json({ error: "empresa_id e nome são obrigatórios" });
      return;
    }

    // Campos de chave estrangeira opcionais chegam como "" quando não selecionados no front —
    // o Postgres rejeita "" como uuid, então normalizamos para null aqui.
    const normalizarUuid = (v) => (v === "" || v === undefined ? null : v);
    const departamentoIdNorm = normalizarUuid(departamento_id);
    const cargoIdNorm = normalizarUuid(cargo_id);
    const gestorIdNorm = normalizarUuid(gestor_id);
    const dataAdmissaoNorm = data_admissao === "" ? null : data_admissao;
    const dataNascimentoNorm = data_nascimento === "" ? null : data_nascimento;

    // Matrícula sequencial por empresa (001, 002, ...) -- identificador do dia a dia, sem dado sensível
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
