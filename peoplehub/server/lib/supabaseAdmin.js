// Cliente Supabase com privilégio total (service role) — uso exclusivo
// dentro das funções de API (nunca no frontend). A service role key
// nunca deve ser exposta ao navegador.
const { createClient } = require("@supabase/supabase-js");

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY não configurados nas variáveis de ambiente do Vercel."
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

module.exports = { getSupabaseAdmin };
