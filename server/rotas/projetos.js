// Projetos da conta que está logada: listar (paginado), criar, ver, editar e excluir.
// Só o dono mexe: estas rotas só enxergam os projetos da própria conta.
import { db, salvar } from '../banco.js'
import { ErroHttp, enviar, rota, semConteudo } from '../http.js'
import { arredondar, categoriasDistintas, cardProjeto, combina, diasAtePrazo, lerFiltros, paginar, somaComprado, somaItens } from '../listagem.js'
import { hoje, limparProjeto } from '../validacao.js'
import { encerrarDenuncias } from '../contas.js'

// O dono vê só os totais de curtidas e comentários (a lista de quem curtiu não sai do servidor)
const paraDono = ({ curtidas = [], comentarios = [], oculto, ...p }) => ({
  ...p, totalCurtidas: curtidas.length, totalComentarios: comentarios.length,
  ...(oculto ? { oculto: { motivo: oculto.motivo } } : {}) // o dono vê o motivo, não quem ocultou
})

const acharProjeto = (usuario, id) => {
  const posicao = usuario.projetos.findIndex(p => String(p.id) === id)
  if (posicao < 0) throw new ErroHttp(404, 'Projeto não encontrado.')
  return posicao
}

const PESO_PRIORIDADE = { Alta: 0, 'Média': 1, Baixa: 2 }
const maisNovoPrimeiro = (a, b) => b.p.id - a.p.id
const ORDENS = {
  // padrão: favoritos primeiro, depois por prioridade (Alta > Média > Baixa), depois os mais novos
  padrao: (a, b) => (b.p.favorito === true) - (a.p.favorito === true) || PESO_PRIORIDADE[a.p.prioridade] - PESO_PRIORIDADE[b.p.prioridade] || maisNovoPrimeiro(a, b),
  recentes: maisNovoPrimeiro,
  nome: (a, b) => a.p.nome.localeCompare(b.p.nome, 'pt-BR'),
  // prazo mais próximo primeiro; quem não tem prazo vai para o fim
  prazo: (a, b) => (a.p.prazo || '9999').localeCompare(b.p.prazo || '9999') || maisNovoPrimeiro(a, b)
}

// Lista paginada. Filtros: busca, categoria, status, prioridade, favoritos=1, ordem (padrao | recentes | nome | prazo).
// Com todos=1 devolve tudo que passou nos filtros (usado para exportar CSV).
rota('GET', '/projetos', ({ res, usuario, consulta }) => {
  const f = lerFiltros(consulta)
  const pares = usuario.projetos.map(p => ({ p, u: usuario }))
  const ordem = ORDENS[consulta.get('ordem')] || ORDENS.padrao
  const achados = pares.filter(par => combina(par, f, usuario)).sort(ordem)

  if (consulta.get('todos') === '1') {
    return enviar(res, 200, { projetos: achados.slice(0, 2000).map(({ p }) => paraDono(p)), total: achados.length })
  }
  const pagina = paginar(achados, consulta)
  enviar(res, 200, {
    projetos: pagina.itens.map(({ p }) => cardProjeto(p, usuario, usuario)),
    total: pagina.total, pagina: pagina.pagina, paginas: pagina.paginas, limite: pagina.limite,
    totalGeral: usuario.projetos.length, // para diferenciar "não tenho projetos" de "o filtro não achou nada"
    categorias: categoriasDistintas(pares)
  })
}, true)

// Números prontos para o painel e a conta: o navegador não precisa baixar todos os projetos.
rota('GET', '/resumo', ({ res, usuario }) => {
  const resumo = {
    total: usuario.projetos.length, publicos: usuario.projetos.filter(p => p.publico && !p.oculto).length, planejamento: 0, andamento: 0, concluidos: 0,
    orcamentoTotal: 0, previstoTotal: 0, compradoTotal: 0,
    atrasados: 0, aVencer: 0, favoritos: 0,
    prioridades: { Alta: 0, 'Média': 0, Baixa: 0 }
  }
  const categorias = new Map()
  for (const p of usuario.projetos) {
    if (p.status === 'Concluído') resumo.concluidos++
    else if (p.status === 'Em andamento') resumo.andamento++
    else resumo.planejamento++
    categorias.set(p.categoria, (categorias.get(p.categoria) || 0) + 1)
    resumo.orcamentoTotal += Number(p.orcamento) || 0
    resumo.previstoTotal += somaItens(p)
    resumo.compradoTotal += somaComprado(p)
    if (p.favorito) resumo.favoritos++
    if (resumo.prioridades[p.prioridade] != null) resumo.prioridades[p.prioridade]++
    if (p.status !== 'Concluído') {
      const dias = diasAtePrazo(p.prazo)
      if (dias != null && dias < 0) resumo.atrasados++
      else if (dias != null && dias <= 7) resumo.aVencer++
    }
  }
  resumo.orcamentoTotal = arredondar(resumo.orcamentoTotal)
  resumo.previstoTotal = arredondar(resumo.previstoTotal)
  resumo.compradoTotal = arredondar(resumo.compradoTotal)
  resumo.categorias = [...categorias].sort((a, b) => b[1] - a[1]).map(([nome, valor]) => ({ nome, valor }))
  resumo.ultimos = usuario.projetos.slice(-5).reverse().map(({ id, nome, categoria, responsavel, status, prioridade, favorito, prazo }) =>
    ({ id, nome, categoria, responsavel, status, prioridade, favorito, prazo }))
  enviar(res, 200, resumo)
}, true)

rota('POST', '/projetos', async ({ res, usuario, ler }) => {
  const d = limparProjeto(await ler(), true)
  const projeto = {
    id: ++db.contadores.projetos,
    nome: d.nome,
    descricao: d.descricao ?? '',
    categoria: d.categoria,
    subcategoria: d.subcategoria ?? '',
    itens: d.itens ?? [],
    orcamento: d.orcamento ?? 0,
    responsavel: d.responsavel,
    dataCriacao: hoje(),
    prazo: d.prazo ?? '',
    status: d.status ?? 'Planejamento',
    prioridade: d.prioridade ?? 'Média',
    favorito: d.favorito ?? false,
    publico: d.publico ?? true,
    curtidas: [],
    comentarios: []
  }
  usuario.projetos.push(projeto)
  salvar()
  enviar(res, 201, paraDono(projeto))
}, true)

rota('GET', '/projetos/:id', ({ res, usuario, id }) => {
  enviar(res, 200, paraDono(usuario.projetos[acharProjeto(usuario, id)]))
}, true)

const atualizar = exigir => async ({ res, usuario, id, ler }) => {
  const projeto = usuario.projetos[acharProjeto(usuario, id)]
  Object.assign(projeto, limparProjeto(await ler(), exigir, projeto))
  salvar()
  enviar(res, 200, paraDono(projeto))
}
rota('PUT', '/projetos/:id', atualizar(true), true)
rota('PATCH', '/projetos/:id', atualizar(false), true)

rota('DELETE', '/projetos/:id', ({ res, usuario, id }) => {
  const [removido] = usuario.projetos.splice(acharProjeto(usuario, id), 1)
  encerrarDenuncias(d => d.projetoId === removido.id, 'O projeto foi excluído pelo dono.')
  salvar()
  semConteudo(res)
}, true)
