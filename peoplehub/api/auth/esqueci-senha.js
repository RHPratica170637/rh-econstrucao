const crypto = require("crypto");
const { getSupabaseAdmin } = require("../_lib/supabaseAdmin");
const { withCors } = require("../_lib/withCors");

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function gerarSenhaTemporaria() {
  // 8 caracteres alfanuméricos, fáceis de digitar, sem ambiguidade (sem 0/O/1/l)
  const alfabeto = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let senha = "";
  for (let i = 0; i < 8; i++) {
    senha += alfabeto[crypto.randomInt(alfabeto.length)];
  }
  return senha;
}

module.exports = withCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido" });
    return;
  }

  const { email } = req.body || {};
  if (!email) {
    res.status(400).json({ error: "E-mail é obrigatório" });
    return;
  }

  const supabase = getSupabaseAdmin();
  const emailNormalizado = email.trim().toLowerCase();

  const { data: usuario, error: fetchErr } = await supabase
    .from("usuarios")
    .select("id")
    .eq("email", emailNormalizado)
    .maybeSingle();
  if (fetchErr) throw fetchErr;

  if (!usuario) {
    // Não revela se o e-mail existe ou não, por segurança
    res.status(200).json({ mensagem: "Se esse e-mail estiver cadastrado, uma nova senha foi gerada." });
    return;
  }

  const novaSenha = gerarSenhaTemporaria();
  const { error: updErr } = await supabase
    .from("usuarios")
    .update({ senha_hash: sha256(novaSenha) })
    .eq("id", usuario.id);
  if (updErr) throw updErr;

  // Sem serviço de e-mail configurado ainda: devolve a senha temporária direto na resposta.
  // Quando Resend/SendGrid estiver configurado, isso deve ser enviado por e-mail em vez de retornado aqui.
  res.status(200).json({
    mensagem: "Se esse e-mail estiver cadastrado, uma nova senha foi gerada.",
    senha_temporaria: novaSenha,
  });
});
