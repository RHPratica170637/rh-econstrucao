const { getSupabaseAdmin } = require("../_lib/supabaseAdmin");
const { withCors } = require("../_lib/withCors");

module.exports = withCors(async (req, res) => {
  const supabase = getSupabaseAdmin();

  if (req.method === "GET") {
    const { colaborador_id, mes } = req.query; // mes no formato YYYY-MM
    if (!colaborador_id) {
      res.status(400).json({ error: "colaborador_id é obrigatório" });
      return;
    }
    let query = supabase
      .from("folha_ponto")
      .select("*")
      .eq("colaborador_id", colaborador_id)
      .order("data");
    if (mes) {
      query = query.gte("data", `${mes}-01`).lt("data", proximoMes(mes));
    }
    const { data, error } = await query;
    if (error) throw error;
    res.status(200).json({ registros: data });
    return;
  }

  if (req.method === "POST") {
    const {
      colaborador_id, data, entrada, saida_almoco, retorno_almoco,
      saida, entrada_extra, saida_extra,
    } = req.body || {};

    if (!colaborador_id || !data) {
      res.status(400).json({ error: "colaborador_id e data são obrigatórios" });
      return;
    }

    const nulo = (v) => (v === "" || v === undefined ? null : v);

    const { data: registro, error } = await supabase
      .from("folha_ponto")
      .upsert(
        {
          colaborador_id, data,
          entrada: nulo(entrada), saida_almoco: nulo(saida_almoco),
          retorno_almoco: nulo(retorno_almoco), saida: nulo(saida),
          entrada_extra: nulo(entrada_extra), saida_extra: nulo(saida_extra),
          origem: "manual",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "colaborador_id,data" }
      )
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ registro });
    return;
  }

  res.status(405).json({ error: "Método não permitido" });
});

function proximoMes(mesStr) {
  const [ano, mes] = mesStr.split("-").map(Number);
  const proximo = mes === 12 ? `${ano + 1}-01` : `${ano}-${String(mes + 1).padStart(2, "0")}`;
  return `${proximo}-01`;
}
