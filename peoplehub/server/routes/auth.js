const crypto = require("crypto");

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function gerarSenhaTemporaria() {
  const alfabeto = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let senha = "";
  for (let i = 0; i < 8; i++) senha += alfabeto[crypto.randomInt(alfabeto.length)];
  return senha;
}

module.exports = async function handle(req, res, { supabase, segments }) {
  const acao = segments[0]; // 'login' | 'esqueci-senha'

  if (acao === "login") {
    if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });
    const { email, senha } = req.body || {};
    if (!email || !senha) return res.status(400).json({ error: "E-mail e senha são obrigatórios" });

    const { data, error } = await supabase
      .from("usuarios")
      .select("id, nome, email, perfil, empresa_id, colaborador_id")
      .eq("email", email.trim().toLowerCase())
      .eq("senha_hash", sha256(senha))
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(401).json({ error: "E-mail ou senha incorretos" });
    return res.status(200).json({ usuario: data });
  }

  if (acao === "esqueci-senha") {
    if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: "E-mail é obrigatório" });

    const emailNormalizado = email.trim().toLowerCase();
    const { data: usuario, error: fetchErr } = await supabase
      .from("usuarios").select("id").eq("email", emailNormalizado).maybeSingle();
    if (fetchErr) throw fetchErr;

    if (!usuario) {
      return res.status(200).json({ mensagem: "Se esse e-mail estiver cadastrado, uma nova senha foi gerada." });
    }

    const novaSenha = gerarSenhaTemporaria();
    const { error: updErr } = await supabase
      .from("usuarios").update({ senha_hash: sha256(novaSenha) }).eq("id", usuario.id);
    if (updErr) throw updErr;

    return res.status(200).json({
      mensagem: "Se esse e-mail estiver cadastrado, uma nova senha foi gerada.",
      senha_temporaria: novaSenha,
    });
  }

  return res.status(404).json({ error: "Rota de autenticação não encontrada" });
};
