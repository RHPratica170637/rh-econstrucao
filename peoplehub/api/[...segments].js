const { getSupabaseAdmin } = require("../server/lib/supabaseAdmin");

const auth = require("../server/routes/auth");
const cadastros = require("../server/routes/cadastros");
const colaboradores = require("../server/routes/colaboradores");
const admissoes = require("../server/routes/admissoes");
const ponto = require("../server/routes/ponto");
const ajustesPonto = require("../server/routes/ajustesPonto");
const holerites = require("../server/routes/holerites");
const atestados = require("../server/routes/atestados");
const ferias = require("../server/routes/ferias");

const ROTAS = {
  auth,
  empresas: cadastros,
  departamentos: cadastros,
  cargos: cadastros,
  colaboradores,
  admissoes,
  ponto,
  "ajustes-ponto": ajustesPonto,
  holerites,
  atestados,
  ferias,
};

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Lê o caminho direto de req.url em vez de depender de req.query.segments --
  // mais confiável entre diferentes formas de invocar a function no Vercel.
  const caminho = (req.url || "").split("?")[0]; // remove querystring
  const partes = caminho.replace(/^\/api\//, "").split("/").filter(Boolean);
  const [resource, ...resto] = partes;

  const handler = ROTAS[resource];
  if (!handler) {
    res.status(404).json({ error: `Rota não encontrada: /api/${partes.join("/")}` });
    return;
  }

  try {
    const supabase = getSupabaseAdmin();
    await handler(req, res, { supabase, resource, segments: resto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Erro interno" });
  }
};
