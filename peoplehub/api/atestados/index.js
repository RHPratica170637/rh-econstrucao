const { getSupabaseAdmin } = require("../_lib/supabaseAdmin");
const { withCors } = require("../_lib/withCors");
const { somarDiasUteis } = require("../_lib/diasUteis");

module.exports = withCors(async (req, res) => {
  const supabase = getSupabaseAdmin();

  if (req.method === "GET") {
    const { colaborador_id, empresa_id, status } = req.query;
    let query = supabase
      .from("atestados")
      .select("*, colaborador:colaboradores(nome, matricula, empresa_id)")
      .order("enviado_em", { ascending: false });
    if (colaborador_id) query = query.eq("colaborador_id", colaborador_id);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw error;

    let filtrados = data;
    if (empresa_id) filtrados = data.filter((a) => a.colaborador?.empresa_id === empresa_id);

    const comLink = await Promise.all(
      filtrados.map(async (a) => {
        if (!a.arquivo_path) return { ...a, url: null };
        const { data: signed } = await supabase.storage.from("atestados").createSignedUrl(a.arquivo_path, 600);
        return { ...a, url: signed?.signedUrl || null };
      })
    );

    res.status(200).json({ atestados: comLink });
    return;
  }

  if (req.method === "POST") {
    const { colaborador_id, data_inicio, data_fim, cid, arquivo_base64, arquivo_nome } = req.body || {};
    if (!colaborador_id || !data_inicio || !data_fim) {
      res.status(400).json({ error: "colaborador_id, data_inicio e data_fim são obrigatórios" });
      return;
    }

    let caminho = null;
    if (arquivo_base64) {
      const extensao = (arquivo_nome || "").split(".").pop() || "pdf";
      caminho = `${colaborador_id}/${Date.now()}.${extensao}`;
      const buffer = Buffer.from(arquivo_base64, "base64");
      const { error: uploadErr } = await supabase.storage
        .from("atestados")
        .upload(caminho, buffer, { upsert: true });
      if (uploadErr) throw uploadErr;
    }

    const prazo = somarDiasUteis(new Date(), 2);

    const { data: atestado, error } = await supabase
      .from("atestados")
      .insert({
        colaborador_id, data_inicio, data_fim, cid: cid || null,
        arquivo_path: caminho, status: "pendente", prazo_validacao: prazo,
      })
      .select()
      .single();
    if (error) throw error;

    res.status(201).json({ atestado });
    return;
  }

  res.status(405).json({ error: "Método não permitido" });
});
