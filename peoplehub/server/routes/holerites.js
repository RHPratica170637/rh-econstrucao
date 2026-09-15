const { somarDiasUteis } = require("../lib/diasUteis");

module.exports = async function handle(req, res, { supabase, segments }) {
  const id = segments[0];

  if (!id) {
    if (req.method === "GET") {
      const { colaborador_id, empresa_id } = req.query;
      let query = supabase
        .from("holerites").select("*, colaborador:colaboradores(nome, matricula, empresa_id)")
        .order("mes_referencia", { ascending: false });
      if (colaborador_id) query = query.eq("colaborador_id", colaborador_id);
      const { data, error } = await query;
      if (error) throw error;

      let filtrados = data;
      if (empresa_id) filtrados = data.filter((h) => h.colaborador?.empresa_id === empresa_id);

      const comLink = await Promise.all(
        filtrados.map(async (h) => {
          const { data: signed } = await supabase.storage.from("holerites").createSignedUrl(h.arquivo_path, 600);
          return { ...h, url: signed?.signedUrl || null };
        })
      );
      return res.status(200).json({ holerites: comLink });
    }

    if (req.method === "POST") {
      const { colaborador_id, mes_referencia, arquivo_base64, arquivo_nome } = req.body || {};
      if (!colaborador_id || !mes_referencia || !arquivo_base64) {
        return res.status(400).json({ error: "colaborador_id, mes_referencia e arquivo_base64 são obrigatórios" });
      }

      const extensao = (arquivo_nome || "").split(".").pop() || "pdf";
      const caminho = `${colaborador_id}/${mes_referencia}.${extensao}`;
      const buffer = Buffer.from(arquivo_base64, "base64");

      const { error: uploadErr } = await supabase.storage
        .from("holerites").upload(caminho, buffer, { contentType: "application/pdf", upsert: true });
      if (uploadErr) throw uploadErr;

      const prazo = somarDiasUteis(new Date(), 5);

      const { data: holerite, error } = await supabase
        .from("holerites")
        .upsert(
          { colaborador_id, mes_referencia, arquivo_path: caminho, status: "aguardando_assinatura", enviado_em: new Date().toISOString(), prazo_assinatura: prazo },
          { onConflict: "colaborador_id,mes_referencia" }
        )
        .select().single();
      if (error) throw error;
      return res.status(201).json({ holerite });
    }

    return res.status(405).json({ error: "Método não permitido" });
  }

  if (req.method !== "PATCH") return res.status(405).json({ error: "Método não permitido" });

  const { acao } = req.body || {};
  if (acao !== "assinar") return res.status(400).json({ error: "acao inválida. Use: assinar" });

  const ip = (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").toString().split(",")[0].trim();

  const { data: holerite, error } = await supabase
    .from("holerites")
    .update({ status: "assinado", assinado_em: new Date().toISOString(), assinatura_ip: ip || null })
    .eq("id", id).select().single();
  if (error) throw error;
  return res.status(200).json({ holerite });
};
