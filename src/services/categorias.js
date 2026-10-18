// Cor e ícone de cada categoria (para os cards ficarem fáceis de distinguir, sem imagens pesadas).
// As categorias da lista têm cor e ícone próprios; as digitadas em "Outros" ganham uma cor calculada do nome
// (sempre a mesma para o mesmo nome) e um ícone de etiqueta.
const FIXAS = {
  'construção': { h: 28, icone: 'M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6' },
  'sites': { h: 212, icone: 'M8 8l-4 4 4 4M16 8l4 4-4 4M13.500 6l-3 12' },
  'manutenção de carros': { h: 350, icone: 'M5 16V12l2-5h10l2 5v4M3 16h18M7 19a1.500 1.500 0 1 0 0-3 1.500 1.500 0 0 0 0 3zM17 19a1.500 1.500 0 1 0 0-3 1.500 1.500 0 0 0 0 3z' },
  'marcenaria': { h: 140, icone: 'M4 7h13l3 3-3 3H4zM7 17h10M9 20h6' }
}
const GENERICO = 'M3 12V4h8l9 9-8 8zM7.500 8.500h.01'

function hash(texto) {
  let h = 0
  for (const c of texto) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h
}

export function estiloDaCategoria(nome = '') {
  const chave = String(nome).trim().toLowerCase()
  const fixa = FIXAS[chave]
  return { h: fixa ? fixa.h : hash(chave) % 360, icone: fixa ? fixa.icone : GENERICO }
}
