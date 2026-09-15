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

  const { acao } = req.body || {};
  if (acao !== "assinar") {
    res.status(400).json({ error: "acao inválida. Use: assinar" });
    return;
  }

  // Assinatura eletrônica simples: registra o aceite com data/hora e IP de origem.
  // Não é assinatura digital com certificado (ICP-Brasil) -- se precisar de valor
  // jurídico mais forte, isso é um passo futuro.
  const ip = (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").toString().split(",")[0].trim();

  const { data: holerite, error } = await supabase
    .from("holerites")
    .update({ status: "assinado", assinado_em: new Date().toISOString(), assinatura_ip: ip || null })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;

  res.status(200).json({ holerite });
});
