// Administração: só quem tem papel "admin" entra aqui (o servidor confere em TODA rota).
// Banir, excluir, ocultar, resolver denúncias e o registro de tudo o que foi feito.
import { db, salvar } from '../banco.js'
import { ErroHttp, enviar, rota, semConteudo } from '../http.js'
import { paginar } from '../listagem.js'
import { normalizarCategoria, texto } from '../validacao.js'
import { acharUsuario, banidoAtivo, ehAdmin } from '../visibilidade.js'
import { auditar, avisar, encerrarDenuncias, removerUsuario } from '../contas.js'

const resumoUsuario = u => ({ id: u.id, nome: u.nome, usuario: u.usuario })

// A ação precisa de um motivo (fica no registro e a pessoa é avisada)
const motivoDe = corpo => texto(corpo.motivo, 'Motivo', 300, true)

// Contas de administrador só mudam por "papel": não dá para banir ou excluir outro admin, nem a si mesmo
function alvoDeAcao(admin, id, { admins = false } = {}) {
  const alvo = acharUsuario(id)
  if (!alvo) throw new ErroHttp(404, 'Pessoa não encontrada.')
  if (alvo.id === admin.id) throw new ErroHttp(400, 'Você não pode fazer isso com a sua própria conta.')
  if (ehAdmin(alvo) && !admins) throw new ErroHttp(403, 'Esta conta é de administrador. Rebaixe-a antes.')
  return alvo
}

function acharProjeto(id) {
  for (const u of db.usuarios) {
    const posicao = u.projetos.findIndex(p => String(p.id) === id)
    if (posicao >= 0) return { u, posicao, p: u.projetos[posicao] }
  }
  throw new ErroHttp(404, 'Projeto não encontrado.')
}

// ---------- Visão geral ----------
rota('GET', '/admin/resumo', ({ res }) => {
  const todos = db.usuarios.flatMap(u => u.projetos)
  const umaSemana = Date.now() - 7 * 86_400_000
  const desde = new Date(umaSemana).toISOString().slice(0, 10)
  enviar(res, 200, {
    usuarios: db.usuarios.length,
    admins: db.usuarios.filter(ehAdmin).length,
    suspensos: db.usuarios.filter(banidoAtivo).length,
    novosUsuarios: db.usuarios.filter(u => new Date(u.criadoEm).getTime() > umaSemana).length,
    projetos: todos.length,
    publicos: todos.filter(p => p.publico && !p.oculto).length,
    privados: todos.filter(p => !p.publico).length,
    ocultos: todos.filter(p => p.oculto).length,
    novosProjetos: todos.filter(p => p.dataCriacao >= desde).length,
    comentarios: todos.reduce((s, p) => s + p.comentarios.length, 0),
    curtidas: todos.reduce((s, p) => s + p.curtidas.length, 0),
    denunciasAbertas: db.denuncias.filter(d => d.status === 'aberta').length
  })
}, 'admin')

// ---------- Pessoas ----------
rota('GET', '/admin/usuarios', ({ res, consulta }) => {
  const busca = (consulta.get('busca') || '').trim().toLowerCase().slice(0, 80)
  const filtro = consulta.get('filtro') || ''
  const lista = db.usuarios
    .filter(u => (!busca || [u.nome, u.usuario, u.email].join(' ').toLowerCase().includes(busca)) &&
      (filtro !== 'suspensos' || banidoAtivo(u)) && (filtro !== 'admins' || ehAdmin(u)))
    .sort((a, b) => b.id - a.id)
  const pagina = paginar(lista, consulta, 15, 50)
  enviar(res, 200, {
    ...pagina,
    itens: pagina.itens.map(u => ({
      ...resumoUsuario(u), email: u.email, papel: u.papel, criadoEm: u.criadoEm,
      totalProjetos: u.projetos.length,
      suspenso: banidoAtivo(u) ? { motivo: u.banido.motivo, ate: u.banido.ate, por: u.banido.por } : null,
      denunciasAbertas: db.denuncias.filter(d => d.status === 'aberta' && d.usuarioId === u.id).length
    }))
  })
}, 'admin')

// Suspender: "dias" vazio = por tempo indeterminado. A pessoa perde o login na hora e some da Comunidade.
rota('POST', '/admin/usuarios/:id/banir', async ({ res, usuario, id, ler }) => {
  const c = await ler()
  const motivo = motivoDe(c)
  let dias = null
  if (c.dias !== null && c.dias !== undefined && c.dias !== '') {
    dias = Number(c.dias)
    if (!Number.isInteger(dias) || dias < 1 || dias > 365) throw new ErroHttp(400, 'A suspensão vai de 1 a 365 dias (ou por tempo indeterminado).')
  }
  const alvo = alvoDeAcao(usuario, id)
  alvo.banido = { em: new Date().toISOString(), ate: dias ? new Date(Date.now() + dias * 86_400_000).toISOString() : null, motivo, por: usuario.usuario }
  alvo.sessoes = []
  encerrarDenuncias(d => d.usuarioId === alvo.id, 'A pessoa foi suspensa pela moderação.')
  auditar(usuario, 'suspendeu', `@${alvo.usuario}`, `${motivo} (${dias ? `${dias} dias` : 'por tempo indeterminado'})`)
  salvar()
  enviar(res, 200, { ok: true })
}, 'admin')

rota('POST', '/admin/usuarios/:id/desbanir', ({ res, usuario, id }) => {
  const alvo = alvoDeAcao(usuario, id, { admins: true })
  if (!banidoAtivo(alvo)) throw new ErroHttp(400, 'Esta conta não está suspensa.')
  delete alvo.banido
  avisar(alvo, 'A sua suspensão foi encerrada pela administração.')
  auditar(usuario, 'encerrou a suspensão de', `@${alvo.usuario}`)
  salvar()
  enviar(res, 200, { ok: true })
}, 'admin')

// Promover a administrador / voltar a usuário comum
rota('POST', '/admin/usuarios/:id/papel', async ({ res, usuario, id, ler }) => {
  const c = await ler()
  if (!['admin', 'usuario'].includes(c.papel)) throw new ErroHttp(400, 'Papel inválido.')
  const alvo = alvoDeAcao(usuario, id, { admins: true })
  if (c.papel === 'admin' && banidoAtivo(alvo)) throw new ErroHttp(400, 'Encerre a suspensão antes de promover.')
  if (alvo.papel === c.papel) throw new ErroHttp(400, 'A conta já tem este papel.')
  alvo.papel = c.papel
  auditar(usuario, c.papel === 'admin' ? 'promoveu a administrador' : 'rebaixou para usuário', `@${alvo.usuario}`)
  salvar()
  enviar(res, 200, { ok: true })
}, 'admin')

rota('DELETE', '/admin/usuarios/:id', async ({ res, usuario, id, ler }) => {
  const motivo = motivoDe(await ler())
  const alvo = alvoDeAcao(usuario, id)
  auditar(usuario, 'excluiu a conta de', `@${alvo.usuario} (${alvo.email})`, motivo)
  removerUsuario(alvo.id)
  semConteudo(res)
}, 'admin')

// ---------- Projetos (todos, inclusive privados e ocultos) ----------
rota('GET', '/admin/projetos', ({ res, consulta }) => {
  const busca = (consulta.get('busca') || '').trim().toLowerCase().slice(0, 80)
  const estado = consulta.get('estado') || ''
  const lista = db.usuarios.flatMap(u => u.projetos.map(p => ({ p, u })))
    .filter(({ p, u }) => (!busca || [p.nome, p.categoria, u.usuario, u.nome].join(' ').toLowerCase().includes(busca)) &&
      (estado !== 'ocultos' || p.oculto) && (estado !== 'privados' || !p.publico) && (estado !== 'publicos' || (p.publico && !p.oculto)))
    .sort((a, b) => b.p.id - a.p.id)
  const pagina = paginar(lista, consulta, 15, 50)
  enviar(res, 200, {
    ...pagina,
    itens: pagina.itens.map(({ p, u }) => ({
      id: p.id, nome: p.nome, categoria: p.categoria, dataCriacao: p.dataCriacao, publico: p.publico,
      oculto: p.oculto ? { motivo: p.oculto.motivo, por: p.oculto.por } : null,
      dono: resumoUsuario(u), donoSuspenso: banidoAtivo(u),
      totalCurtidas: p.curtidas.length, totalComentarios: p.comentarios.length
    }))
  })
}, 'admin')

// Ocultar tira o projeto da Comunidade sem apagar (o dono ainda o vê e é avisado do motivo)
rota('POST', '/admin/projetos/:id/ocultar', async ({ res, usuario, id, ler }) => {
  const motivo = motivoDe(await ler())
  const { p, u } = acharProjeto(id)
  p.oculto = { motivo, por: usuario.usuario, em: new Date().toISOString() }
  encerrarDenuncias(d => d.projetoId === p.id && !d.comentarioId, 'O projeto foi ocultado pela moderação.')
  avisar(u, `O seu projeto "${p.nome}" foi ocultado da Comunidade pela moderação. Motivo: ${motivo}`)
  auditar(usuario, 'ocultou o projeto', `${p.id} "${p.nome}" de @${u.usuario}`, motivo)
  salvar()
  enviar(res, 200, { ok: true })
}, 'admin')

rota('POST', '/admin/projetos/:id/mostrar', ({ res, usuario, id }) => {
  const { p, u } = acharProjeto(id)
  if (!p.oculto) throw new ErroHttp(400, 'Este projeto não está oculto.')
  delete p.oculto
  avisar(u, `O seu projeto "${p.nome}" voltou a aparecer na Comunidade.`)
  auditar(usuario, 'mostrou de novo o projeto', `${p.id} "${p.nome}" de @${u.usuario}`)
  salvar()
  enviar(res, 200, { ok: true })
}, 'admin')

rota('DELETE', '/admin/projetos/:id', async ({ res, usuario, id, ler }) => {
  const motivo = motivoDe(await ler())
  const { p, u, posicao } = acharProjeto(id)
  u.projetos.splice(posicao, 1)
  avisar(u, `O seu projeto "${p.nome}" foi excluído pela moderação. Motivo: ${motivo}`)
  encerrarDenuncias(d => d.projetoId === p.id, 'O projeto foi excluído pela moderação.')
  auditar(usuario, 'excluiu o projeto', `${p.id} "${p.nome}" de @${u.usuario}`, motivo)
  salvar()
  semConteudo(res)
}, 'admin')

// ---------- Denúncias ----------
function descreverDenuncia(d) {
  const denunciante = acharUsuario(d.denuncianteId)
  const pessoa = acharUsuario(d.usuarioId)
  let projeto = null, comentario = null
  if (d.projetoId) {
    for (const u of db.usuarios) {
      const p = u.projetos.find(p => p.id === d.projetoId)
      if (p) {
        projeto = { id: p.id, nome: p.nome, publico: p.publico, oculto: !!p.oculto }
        comentario = d.comentarioId ? p.comentarios.find(c => c.id === d.comentarioId) : null
        break
      }
    }
  }
  return {
    id: d.id, tipo: d.tipo, motivo: d.motivo, detalhe: d.detalhe, criadoEm: d.criadoEm, status: d.status,
    nota: d.nota, resolvidoPor: d.resolvidoPor, resolvidoEm: d.resolvidoEm,
    denunciante: denunciante ? resumoUsuario(denunciante) : null,
    pessoa: pessoa ? { ...resumoUsuario(pessoa), suspenso: banidoAtivo(pessoa), admin: ehAdmin(pessoa) } : null,
    projeto,
    comentario: comentario ? { id: comentario.id, texto: comentario.texto } : null,
    alvoRemovido: d.tipo === 'usuario' ? !pessoa : d.tipo === 'projeto' ? !projeto : !comentario
  }
}

rota('GET', '/admin/denuncias', ({ res, consulta }) => {
  const estado = consulta.get('estado') || 'aberta'
  const lista = db.denuncias.filter(d => estado === 'todas' || (estado === 'aberta') === (d.status === 'aberta')).sort((a, b) => b.id - a.id)
  const pagina = paginar(lista, consulta, 10, 50)
  enviar(res, 200, { ...pagina, itens: pagina.itens.map(descreverDenuncia) })
}, 'admin')

// Encerrar a denúncia: "resolvida" (a administração agiu) ou "ignorada" (sem problema)
rota('POST', '/admin/denuncias/:id', async ({ res, usuario, id, ler }) => {
  const c = await ler()
  if (!['resolvida', 'ignorada'].includes(c.status)) throw new ErroHttp(400, 'Status inválido.')
  const d = db.denuncias.find(x => String(x.id) === id)
  if (!d) throw new ErroHttp(404, 'Denúncia não encontrada.')
  if (d.status !== 'aberta') throw new ErroHttp(400, 'Esta denúncia já foi encerrada.')
  Object.assign(d, { status: c.status, nota: texto(c.nota, 'Nota', 300), resolvidoPor: usuario.usuario, resolvidoEm: new Date().toISOString() })
  auditar(usuario, `marcou a denúncia ${d.id} como ${c.status}`, `${d.tipo}`, d.nota)
  salvar()
  enviar(res, 200, { ok: true })
}, 'admin')

// ---------- Categorias ----------
// Quem escolhe "Outros" digita a própria categoria; aqui a administração arruma a bagunça
// (renomear/juntar as digitadas) e pode adicionar uma delas à lista que aparece no formulário.
const emUso = () => {
  const mapa = new Map()
  for (const u of db.usuarios) for (const p of u.projetos) {
    const chave = p.categoria.toLowerCase()
    const item = mapa.get(chave) || { nome: p.categoria, projetos: 0, pessoas: new Set() }
    item.projetos++
    item.pessoas.add(u.id)
    mapa.set(chave, item)
  }
  return mapa
}
const naLista = nome => db.categorias.find(c => c.nome.toLowerCase() === nome.toLowerCase())

rota('GET', '/admin/categorias', ({ res }) => {
  const uso = emUso()
  const itens = db.categorias.map(c => ({
    nome: c.nome, projetos: uso.get(c.nome.toLowerCase())?.projetos || 0, pessoas: uso.get(c.nome.toLowerCase())?.pessoas.size || 0,
    naLista: true, oficial: !c.adicionada, subcategorias: c.subcategorias.length
  }))
  for (const [chave, u] of uso) {
    if (!db.categorias.some(c => c.nome.toLowerCase() === chave)) {
      itens.push({ nome: u.nome, projetos: u.projetos, pessoas: u.pessoas.size, naLista: false, oficial: false, subcategorias: 0 })
    }
  }
  itens.sort((a, b) => Number(b.naLista) - Number(a.naLista) || b.projetos - a.projetos || a.nome.localeCompare(b.nome, 'pt-BR'))
  enviar(res, 200, itens)
}, 'admin')

// Renomear ou juntar: troca o nome da categoria em todos os projetos. Se o novo nome já existe, as duas viram uma só.
// As categorias oficiais da lista (com subcategorias e itens sugeridos) não mudam de nome: só recebem as outras.
rota('POST', '/admin/categorias/renomear', async ({ res, usuario, ler }) => {
  const c = await ler()
  const de = texto(c.de, 'Categoria atual', 40, true)
  const para = normalizarCategoria(c.para)
  const oficial = db.categorias.find(x => x.nome.toLowerCase() === de.toLowerCase() && !x.adicionada)
  if (oficial) throw new ErroHttp(403, 'Esta categoria faz parte da lista oficial e não pode ser renomeada. Dá para juntar outras categorias nela.')
  let alterados = 0
  for (const u of db.usuarios) for (const p of u.projetos) {
    if (p.categoria.toLowerCase() === de.toLowerCase()) { p.categoria = para; alterados++ }
  }
  if (!alterados && !naLista(de)) throw new ErroHttp(404, 'Nenhum projeto usa esta categoria.')
  const adicionada = db.categorias.find(x => x.nome.toLowerCase() === de.toLowerCase() && x.adicionada)
  if (adicionada) { // categoria que o admin tinha posto na lista: a lista acompanha o novo nome (ou funde)
    if (naLista(para) && naLista(para) !== adicionada) db.categorias.splice(db.categorias.indexOf(adicionada), 1)
    else adicionada.nome = para
  }
  auditar(usuario, 'renomeou/juntou a categoria', `"${de}" → "${para}" (${alterados} projeto(s))`)
  salvar()
  enviar(res, 200, { alterados, nome: para })
}, 'admin')

// Coloca uma categoria digitada na lista do formulário (sem subcategorias; o admin pode editar o db.json para detalhar)
rota('POST', '/admin/categorias/adicionar', async ({ res, usuario, ler }) => {
  const nome = normalizarCategoria((await ler()).nome)
  if (naLista(nome)) throw new ErroHttp(400, 'Esta categoria já está na lista.')
  if (!emUso().has(nome.toLowerCase())) throw new ErroHttp(404, 'Nenhum projeto usa esta categoria.')
  db.categorias.push({ id: Math.max(0, ...db.categorias.map(x => Number(x.id) || 0)) + 1, nome, subcategorias: [], adicionada: true })
  auditar(usuario, 'adicionou a categoria à lista', `"${nome}"`)
  salvar()
  enviar(res, 200, { ok: true })
}, 'admin')

// ---------- Registro de ações ----------
rota('GET', '/admin/registro', ({ res, consulta }) => {
  const pagina = paginar([...db.auditoria].reverse(), consulta, 20, 50)
  enviar(res, 200, pagina)
}, 'admin')
