// Peças usadas pelas listas de projetos (Meus Projetos, Comunidade e Perfil): contas, filtros,
// paginação e o "card" resumido que vai para a tela.
import { hoje } from './validacao.js'

export const custoItem = i => (Number(i.quantidade) || 0) * (Number(i.valorUnitario) || 0)
export const somaItens = p => (p.itens || []).reduce((s, i) => s + custoItem(i), 0)
export const somaComprado = p => (p.itens || []).reduce((s, i) => s + (i.comprado ? custoItem(i) : 0), 0)
export const arredondar = v => Math.round(v * 100) / 100

export function diasAtePrazo(prazo) {
  if (!prazo) return null
  const base = new Date(hoje() + 'T00:00:00Z')
  const alvo = new Date(prazo + 'T00:00:00Z')
  return Math.round((alvo - base) / 86_400_000)
}

// Para comparar texto sem se importar com maiúsculas e acentos ("construcao" acha "Construção")
export const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export const autorDe = u => ({ id: u.id, nome: u.nome, usuario: u.usuario, papel: u.papel })

export const inteiroPositivo = (v, padrao, max) => {
  const n = Math.floor(Number(v))
  return Number.isFinite(n) && n >= 1 ? Math.min(n, max) : padrao
}

// Filtros que as listas aceitam no endereço: busca, categoria, status, prioridade, favoritos=1, meus=1, seguindo=1
export function lerFiltros(consulta) {
  return {
    busca: norm((consulta.get('busca') || '').trim().slice(0, 80)),
    categoria: (consulta.get('categoria') || '').trim().toLowerCase(),
    status: consulta.get('status') || '',
    prioridade: consulta.get('prioridade') || '',
    favoritos: consulta.get('favoritos') === '1',
    meus: consulta.get('meus') === '1',
    seguindo: consulta.get('seguindo') === '1'
  }
}

// "par" = { p: projeto, u: dono do projeto }
export function combina({ p, u }, f, eu) {
  return (!f.meus || u.id === eu.id) &&
    (!f.seguindo || eu.seguindo.includes(u.id)) &&
    (!f.categoria || p.categoria.toLowerCase() === f.categoria) &&
    (!f.status || p.status === f.status) &&
    (!f.prioridade || p.prioridade === f.prioridade) &&
    (!f.favoritos || p.favorito) &&
    (!f.busca || norm([p.nome, p.descricao, p.responsavel, p.categoria, p.subcategoria, u.nome, u.usuario].join(' ')).includes(f.busca))
}

// Categorias sem repetir por maiúscula/minúscula (as digitadas em "Outros" também entram)
export function categoriasDistintas(pares) {
  const mapa = new Map()
  for (const { p } of pares) if (!mapa.has(p.categoria.toLowerCase())) mapa.set(p.categoria.toLowerCase(), p.categoria)
  return [...mapa.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

// Pagina uma lista já filtrada e ordenada. Parâmetros: pagina e limite (12 por padrão, no máximo 48).
export function paginar(lista, consulta, padrao = 12, max = 48) {
  const limite = inteiroPositivo(consulta.get('limite'), padrao, max)
  const total = lista.length
  const paginas = Math.max(1, Math.ceil(total / limite))
  const pagina = Math.min(inteiroPositivo(consulta.get('pagina'), 1, 1_000_000), paginas)
  return { itens: lista.slice((pagina - 1) * limite, pagina * limite), total, pagina, paginas, limite }
}

// Dados do card (leve: os itens completos e os comentários só vêm no detalhe).
// O "favorito" e o "publico" só saem para o dono: são marcações pessoais dele.
export function cardProjeto(p, u, eu) {
  const { itens, descricao, favorito, curtidas, comentarios, publico, oculto, ...resto } = p
  const dono = u.id === eu.id
  return {
    ...resto,
    descricao: descricao.length > 240 ? descricao.slice(0, 240) + '…' : descricao,
    itensTotal: itens.length,
    itensNomes: itens.slice(0, 4).map(i => i.nome),
    previsto: arredondar(somaItens(p)),
    comprado: arredondar(somaComprado(p)),
    autor: autorDe(u),
    dono,
    totalCurtidas: curtidas.length,
    curtiu: curtidas.includes(eu.id),
    totalComentarios: comentarios.length,
    ...(dono ? { favorito, publico, oculto: oculto ? { motivo: oculto.motivo } : undefined } : {})
  }
}
