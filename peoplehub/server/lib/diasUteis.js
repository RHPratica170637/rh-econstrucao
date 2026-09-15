// Soma N dias úteis (seg-sex, sem considerar feriados nacionais por enquanto)
// a partir de uma data. Usado para os prazos de assinatura de holerite (5 dias
// úteis) e validação de atestado (2 dias úteis) do CLAUDE.md.
function somarDiasUteis(dataBase, quantidade) {
  const data = new Date(dataBase);
  let adicionados = 0;
  while (adicionados < quantidade) {
    data.setUTCDate(data.getUTCDate() + 1);
    const diaSemana = data.getUTCDay(); // 0 = domingo, 6 = sábado
    if (diaSemana !== 0 && diaSemana !== 6) adicionados++;
  }
  return data.toISOString().slice(0, 10);
}

module.exports = { somarDiasUteis };
