const crypto = require("crypto");
const { getSupabaseAdmin } = require("../_lib/supabaseAdmin");
const { withCors } = require("../_lib/withCors");

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

module.exports = withCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido" });
    return;
  }

  const { email, senha } = req.body || {};
  if (!email || !senha) {
    res.status(400).json({ error: "E-mail e senha são obrigatórios" });
    return;
  }

  const supabase = getSupabaseAdmin();
  const senhaHash = sha256(senha);

  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nome, email, perfil, empresa_id, colaborador_id")
    .eq("email", email.trim().toLowerCase())
    .eq("senha_hash", senhaHash)
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(401).json({ error: "E-mail ou senha incorretos" });
    return;
  }

  res.status(200).json({ usuario: data });
});
