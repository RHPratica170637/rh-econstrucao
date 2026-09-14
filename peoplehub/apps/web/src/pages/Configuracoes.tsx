import { useEffect, useState, FormEvent } from "react";
import { api } from "../lib/api";

interface Item { id: string; nome: string; }

export default function Configuracoes({ empresaId }: { empresaId: string }) {
  const [departamentos, setDepartamentos] = useState<Item[]>([]);
  const [cargos, setCargos] = useState<Item[]>([]);
  const [novoDepto, setNovoDepto] = useState("");
  const [novoCargo, setNovoCargo] = useState("");

  async function carregar() {
    const [d, c] = await Promise.all([
      api.listarDepartamentos(empresaId),
      api.listarCargos(empresaId),
    ]);
    setDepartamentos(d.departamentos);
    setCargos(c.cargos);
  }

  useEffect(() => { carregar(); }, [empresaId]);

  async function addDepto(e: FormEvent) {
    e.preventDefault();
    if (!novoDepto.trim()) return;
    await api.criarDepartamento(empresaId, novoDepto.trim());
    setNovoDepto("");
    carregar();
  }

  async function addCargo(e: FormEvent) {
    e.preventDefault();
    if (!novoCargo.trim()) return;
    await api.criarCargo(empresaId, novoCargo.trim());
    setNovoCargo("");
    carregar();
  }

  return (
    <div>
      <h1>Configurações</h1>
      <p className="subtitle">Departamentos e cargos usados no cadastro de colaboradores.</p>

      <div style={{ display: "flex", gap: 20 }}>
        <div className="card" style={{ flex: 1 }}>
          <h3 style={{ marginTop: 0 }}>Departamentos</h3>
          <form onSubmit={addDepto} style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input value={novoDepto} onChange={(e) => setNovoDepto(e.target.value)} placeholder="Nome do departamento" />
            <button className="btn btn-primary">+</button>
          </form>
          <ul style={{ paddingLeft: 18, fontSize: 14 }}>
            {departamentos.map((d) => <li key={d.id}>{d.nome}</li>)}
          </ul>
        </div>

        <div className="card" style={{ flex: 1 }}>
          <h3 style={{ marginTop: 0 }}>Cargos</h3>
          <form onSubmit={addCargo} style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input value={novoCargo} onChange={(e) => setNovoCargo(e.target.value)} placeholder="Nome do cargo" />
            <button className="btn btn-primary">+</button>
          </form>
          <ul style={{ paddingLeft: 18, fontSize: 14 }}>
            {cargos.map((c) => <li key={c.id}>{c.nome}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}
