const BASE = "/api";

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Erro na requisição (${res.status})`);
  }
  return data;
}

export const api = {
  login: (email: string, senha: string) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, senha }) }),

  esqueciSenha: (email: string) =>
    request("/auth/esqueci-senha", { method: "POST", body: JSON.stringify({ email }) }),

  listarColaboradores: (empresaId: string) =>
    request(`/colaboradores?empresa_id=${empresaId}`),

  criarColaborador: (payload: Record<string, unknown>) =>
    request("/colaboradores", { method: "POST", body: JSON.stringify(payload) }),

  buscarColaborador: (id: string) => request(`/colaboradores/${id}`),

  atualizarColaborador: (id: string, payload: Record<string, unknown>) =>
    request(`/colaboradores/${id}`, { method: "PUT", body: JSON.stringify(payload) }),

  listarDepartamentos: (empresaId: string) =>
    request(`/departamentos?empresa_id=${empresaId}`),

  criarDepartamento: (empresaId: string, nome: string) =>
    request("/departamentos", { method: "POST", body: JSON.stringify({ empresa_id: empresaId, nome }) }),

  listarCargos: (empresaId: string) => request(`/cargos?empresa_id=${empresaId}`),

  criarCargo: (empresaId: string, nome: string, nivel?: string) =>
    request("/cargos", { method: "POST", body: JSON.stringify({ empresa_id: empresaId, nome, nivel }) }),

  avancarAdmissao: (colaboradorId: string, payload: Record<string, unknown>) =>
    request(`/admissoes/${colaboradorId}`, { method: "PATCH", body: JSON.stringify(payload) }),

  listarPonto: (colaboradorId: string, mes: string) =>
    request(`/ponto?colaborador_id=${colaboradorId}&mes=${mes}`),

  lancarPonto: (payload: Record<string, unknown>) =>
    request("/ponto", { method: "POST", body: JSON.stringify(payload) }),

  importarPontoCsv: (empresaId: string, csvTexto: string) =>
    request("/ponto/importar", { method: "POST", body: JSON.stringify({ empresa_id: empresaId, csv_texto: csvTexto }) }),

  listarAjustes: (params: Record<string, string>) =>
    request(`/ajustes-ponto?${new URLSearchParams(params).toString()}`),

  solicitarAjuste: (payload: Record<string, unknown>) =>
    request("/ajustes-ponto", { method: "POST", body: JSON.stringify(payload) }),

  decidirAjuste: (id: string, acao: string, observacao?: string) =>
    request(`/ajustes-ponto/${id}`, { method: "PATCH", body: JSON.stringify({ acao, observacao }) }),

  listarHolerites: (params: Record<string, string>) =>
    request(`/holerites?${new URLSearchParams(params).toString()}`),

  enviarHolerite: (payload: Record<string, unknown>) =>
    request("/holerites", { method: "POST", body: JSON.stringify(payload) }),

  assinarHolerite: (id: string) =>
    request(`/holerites/${id}`, { method: "PATCH", body: JSON.stringify({ acao: "assinar" }) }),

  listarAtestados: (params: Record<string, string>) =>
    request(`/atestados?${new URLSearchParams(params).toString()}`),

  enviarAtestado: (payload: Record<string, unknown>) =>
    request("/atestados", { method: "POST", body: JSON.stringify(payload) }),

  decidirAtestado: (id: string, acao: string, motivo_recusa?: string) =>
    request(`/atestados/${id}`, { method: "PATCH", body: JSON.stringify({ acao, motivo_recusa }) }),

  listarFerias: (params: Record<string, string>) =>
    request(`/ferias?${new URLSearchParams(params).toString()}`),

  solicitarFerias: (payload: Record<string, unknown>) =>
    request("/ferias", { method: "POST", body: JSON.stringify(payload) }),

  decidirFerias: (id: string, acao: string, observacao?: string) =>
    request(`/ferias/${id}`, { method: "PATCH", body: JSON.stringify({ acao, observacao }) }),

  listarEmpresas: () => request("/empresas"),

  criarEmpresa: (nome: string, cnpj?: string) =>
    request("/empresas", { method: "POST", body: JSON.stringify({ nome, cnpj }) }),
};
