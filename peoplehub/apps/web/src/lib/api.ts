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

  listarColaboradores: (empresaId: string) =>
    request(`/colaboradores?empresa_id=${empresaId}`),

  criarColaborador: (payload: Record<string, unknown>) =>
    request("/colaboradores", { method: "POST", body: JSON.stringify(payload) }),

  buscarColaborador: (id: string) => request(`/colaboradores/${id}`),

  listarDepartamentos: (empresaId: string) =>
    request(`/departamentos?empresa_id=${empresaId}`),

  criarDepartamento: (empresaId: string, nome: string) =>
    request("/departamentos", { method: "POST", body: JSON.stringify({ empresa_id: empresaId, nome }) }),

  listarCargos: (empresaId: string) => request(`/cargos?empresa_id=${empresaId}`),

  criarCargo: (empresaId: string, nome: string, nivel?: string) =>
    request("/cargos", { method: "POST", body: JSON.stringify({ empresa_id: empresaId, nome, nivel }) }),

  avancarAdmissao: (colaboradorId: string, payload: Record<string, unknown>) =>
    request(`/admissoes/${colaboradorId}`, { method: "PATCH", body: JSON.stringify(payload) }),

  listarEmpresas: () => request("/empresas"),

  criarEmpresa: (nome: string, cnpj?: string) =>
    request("/empresas", { method: "POST", body: JSON.stringify({ nome, cnpj }) }),
};
