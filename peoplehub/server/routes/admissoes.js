const crypto = require("crypto");

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

const ETAPAS_VALIDAS = ["dados_pessoais", "documentos", "contrato_assinado", "aso", "conta_criada"];

module.exports = async function handle(req, res, { supabase, segments }) {
  const colaboradorId = segments[0];
  if (!colaboradorId) return res.status(400).json({ error: "colaboradorId é obrigatório" });

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("admissoes").select("*").eq("colaborador_id", colaboradorId).maybeSingle();
    if (error) throw error;
    return res.status(200).json({ admissao: data });
  }

  if (req.method !== "PATCH") return res.status(405).json({ error: "Método não permitido" });

  const { etapa_atual, documentos, contrato_assinado_em, aso_aprovado, email, senha } = req.body || {};

  if (etapa_atual && !ETAPAS_VALIDAS.includes(etapa_atual)) {
    return res.status(400).json({ error: `etapa_atual inválida. Use uma de: ${ETAPAS_VALIDAS.join(", ")}` });
  }

  const { data: admissaoAtual, error: fetchErr } = await supabase
    .from("admissoes").select("*").eq("colaborador_id", colaboradorId).maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!admissaoAtual) return res.status(404).json({ error: "Admissão não encontrada para esse colaborador" });

  const asoJaAprovado = aso_aprovado === true || admissaoAtual.aso_aprovado === true;
  if (etapa_atual === "conta_criada" && !asoJaAprovado) {
    return res.status(400).json({ error: "Não é possível criar a conta antes do ASO ser aprovado." });
  }

  const updates = {};
  if (etapa_atual) updates.etapa_atual = etapa_atual;
  if (documentos !== undefined) updates.documentos = documentos;
  if (contrato_assinado_em !== undefined) updates.contrato_assinado_em = contrato_assinado_em;
  if (aso_aprovado === true) {
    updates.aso_aprovado = true;
    updates.aso_aprovado_em = new Date().toISOString();
  }
  updates.updated_at = new Date().toISOString();

  const { data: admissaoAtualizada, error: updErr } = await supabase
    .from("admissoes").update(updates).eq("colaborador_id", colaboradorId).select().single();
  if (updErr) throw updErr;

  let usuarioCriado = null;

  if (etapa_atual === "conta_criada") {
    if (!email || !senha) {
      return res.status(400).json({ error: "email e senha são obrigatórios para criar a conta do colaborador" });
    }

    const { data: colaborador, error: colErr } = await supabase
      .from("colaboradores").select("id, empresa_id, nome").eq("id", colaboradorId).single();
    if (colErr) throw colErr;

    const { data: novoUsuario, error: usrErr } = await supabase
      .from("usuarios")
      .insert({
        empresa_id: colaborador.empresa_id, colaborador_id: colaborador.id, nome: colaborador.nome,
        email: email.trim().toLowerCase(), senha_hash: sha256(senha), perfil: "colaborador",
      })
      .select("id, nome, email, perfil")
      .single();
    if (usrErr) throw usrErr;
    usuarioCriado = novoUsuario;

    const { error: statusErr } = await supabase
      .from("colaboradores").update({ status: "ativo", updated_at: new Date().toISOString() }).eq("id", colaboradorId);
    if (statusErr) throw statusErr;
  }

  return res.status(200).json({ admissao: admissaoAtualizada, usuario: usuarioCriado });
};
