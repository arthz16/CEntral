// Funções auxiliares usadas em várias telas: dinheiro, datas, itens com
// quantidade/preço, alertas de prazo e exportação em CSV.

// ---- Dinheiro e datas ----
export const dinheiro = v =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatarData(v, vazio = 'Não informada') {
  if (!v) return vazio
  return new Date(v + 'T12:00:00').toLocaleDateString('pt-BR')
}

// ---- Itens (nome + quantidade + valor unitário + comprado) ----
// Aceita o formato antigo (só o nome em texto) e devolve sempre um objeto.
export function normalizarItem(i) {
  if (typeof i === 'string') return { nome: i, quantidade: 1, valorUnitario: 0, comprado: false }
  return {
    nome: String(i?.nome || ''),
    quantidade: Number(i?.quantidade) || 0,
    valorUnitario: Number(i?.valorUnitario) || 0,
    comprado: i?.comprado === true
  }
}

export const normalizarItens = itens => (Array.isArray(itens) ? itens.map(normalizarItem) : [])

export const custoItem = i => (Number(i.quantidade) || 0) * (Number(i.valorUnitario) || 0)
export const somaItens = itens => normalizarItens(itens).reduce((s, i) => s + custoItem(i), 0)
export const somaComprado = itens =>
  normalizarItens(itens).reduce((s, i) => s + (i.comprado ? custoItem(i) : 0), 0)

// Tem preços/quantidades para valer a pena mostrar a tabela detalhada?
// (Projetos antigos e os exemplos prontos têm só nomes: aí mostramos como etiquetas.)
export const temPrecos = itens =>
  normalizarItens(itens).some(i => i.valorUnitario > 0 || i.quantidade !== 1 || i.comprado)

// ---- Status e prioridade (classes de cor) ----
export const classeStatus = s =>
  s === 'Concluído' ? 'concluido' : s === 'Em andamento' ? 'andamento' : 'planejamento'

export const classePrioridade = p =>
  p === 'Alta' ? 'prio-alta' : p === 'Baixa' ? 'prio-baixa' : 'prio-media'

// "07/10/2026 14:32" a partir de uma data ISO (usado nos comentários e na administração)
export const quando = iso => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// ---- Datas locais (AAAA-MM-DD) ----
// toISOString() usa UTC e, à noite no Brasil, já cai no dia seguinte. Aqui usamos o dia do relógio da pessoa.
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const hojeLocal = () => iso(new Date())
export const amanhaLocal = () => { const d = new Date(); d.setDate(d.getDate() + 1); return iso(d) }

// ---- Alerta de prazo ----
// Devolve null quando não há prazo ou o projeto já foi concluído.
// Senão: { tipo: 'atrasado' | 'vence', dias, texto }.
export function alertaPrazo(prazo, status) {
  if (!prazo || status === 'Concluído') return null
  const hoje = new Date(hojeLocal() + 'T00:00:00Z')
  const alvo = new Date(prazo + 'T00:00:00Z')
  if (Number.isNaN(alvo.getTime())) return null
  const dias = Math.round((alvo - hoje) / 86_400_000)
  if (dias < 0) {
    const n = Math.abs(dias)
    return { tipo: 'atrasado', dias, texto: `Atrasado há ${n} ${n === 1 ? 'dia' : 'dias'}` }
  }
  if (dias === 0) return { tipo: 'vence', dias, texto: 'Vence hoje' }
  if (dias <= 7) return { tipo: 'vence', dias, texto: `Vence em ${dias} ${dias === 1 ? 'dia' : 'dias'}` }
  return null
}

// ---- Exportar CSV e baixar arquivo ----
function celulaCsv(valor) {
  const texto = valor == null ? '' : String(valor)
  return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

export function projetosParaCsv(projetos) {
  const cabecalho = [
    'Nome', 'Descrição', 'Categoria', 'Subcategoria', 'Responsável', 'Status',
    'Prioridade', 'Favorito', 'Data de criação', 'Prazo',
    'Orçamento', 'Total previsto', 'Já comprado', 'Itens'
  ]
  const linhas = projetos.map(p => {
    const itens = normalizarItens(p.itens)
    const resumoItens = itens
      .map(i => `${i.nome} (${i.quantidade}x ${dinheiro(i.valorUnitario)}${i.comprado ? ', comprado' : ''})`)
      .join(' | ')
    return [
      p.nome, p.descricao, p.categoria, p.subcategoria, p.responsavel, p.status,
      p.prioridade || 'Média', p.favorito ? 'Sim' : 'Não',
      p.dataCriacao, p.prazo,
      Number(p.orcamento || 0).toFixed(2), somaItens(itens).toFixed(2), somaComprado(itens).toFixed(2),
      resumoItens
    ].map(celulaCsv).join(';')
  })
  // BOM no início para o Excel abrir os acentos corretamente.
  return '\uFEFF' + [cabecalho.join(';'), ...linhas].join('\r\n')
}

export function baixarArquivo(nome, conteudo, tipo = 'text/csv;charset=utf-8') {
  const blob = new Blob([conteudo], { type: tipo })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
