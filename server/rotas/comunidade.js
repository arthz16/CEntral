// Comunidade: projetos públicos de todas as pessoas, curtidas, comentários e perfil público.
// Todo projeto público vai para a Comunidade, inclusive os seus; os privados só aparecem para o dono,
// em "Meus projetos". Mostra o NOME e o @usuario de quem criou (nunca o e-mail). Editar/excluir só
// existe nas rotas /projetos/:id, que só enxergam os projetos da própria conta.
import { db, salvar } from '../banco.js'
import { ErroHttp, enviar, rota, semConteudo } from '../http.js'
import { limitar } from '../limite.js'
import { autorDe, cardProjeto, categoriasDistintas, combina, lerFiltros, paginar } from '../listagem.js'
import { texto } from '../validacao.js'
import { auditar, avisar, encerrarDenuncias, notificar } from '../contas.js'
import { acharUsuario, banidoAtivo, ehAdmin, escondidoPara, projetoAcessivel, projetoNaLista } from '../visibilidade.js'

// Lista paginada dos projetos públicos. Parâmetros: pagina, limite, busca, categoria, status,
// ordem (recentes | emalta | curtidas | nome), meus=1, seguindo=1 (só de quem eu sigo). "autorFixo" limita a um criador (usado no perfil).
function listarComunidade(eu, consulta, autorFixo = null) {
  const f = lerFiltros(consulta)
  const ordemPedida = consulta.get('ordem')
  const ordem = ['recentes', 'curtidas', 'emalta', 'nome'].includes(ordemPedida) ? ordemPedida : 'recentes'

  const todos = []
  for (const u of db.usuarios) {
    if (autorFixo && u.id !== autorFixo.id) continue
    for (const p of u.projetos) if (projetoNaLista(p, u, eu)) todos.push({ p, u })
  }
  const achados = todos.filter(par => combina(par, f, eu))

  const maisRecente = (a, b) => (b.p.dataCriacao || '').localeCompare(a.p.dataCriacao || '') || b.p.id - a.p.id
  // "Em alta": curtidas e comentários pesam mais quando o projeto é novo (esfria com os dias)
  const pontos = ({ p }) => {
    const dias = Math.max(0, (Date.now() - new Date(`${p.dataCriacao}T12:00:00Z`).getTime()) / 86_400_000)
    return (p.curtidas.length + 2 * p.comentarios.length + 1) / Math.pow(dias + 2, 1.2)
  }
  if (ordem === 'emalta') achados.sort((a, b) => pontos(b) - pontos(a) || maisRecente(a, b))
  else if (ordem === 'nome') achados.sort((a, b) => a.p.nome.localeCompare(b.p.nome, 'pt-BR'))
  else if (ordem === 'curtidas') achados.sort((a, b) => b.p.curtidas.length - a.p.curtidas.length || maisRecente(a, b))
  else achados.sort(maisRecente)

  const pagina = paginar(achados, consulta)
  return {
    projetos: pagina.itens.map(({ p, u }) => cardProjeto(p, u, eu)),
    total: pagina.total, pagina: pagina.pagina, paginas: pagina.paginas, limite: pagina.limite,
    categorias: categoriasDistintas(todos)
  }
}

// Acha um projeto pelo id em qualquer conta. Para você ele "não existe" se for privado, ocultado pela
// moderação, de alguém suspenso ou de alguém com quem há bloqueio (o dono e a moderação sempre veem).
function acharNaComunidade(id, eu) {
  for (const u of db.usuarios) {
    const p = u.projetos.find(p => String(p.id) === id)
    if (p) {
      if (!projetoAcessivel(p, u, eu)) break
      return { p, u }
    }
  }
  throw new ErroHttp(404, 'Projeto não encontrado.')
}

const comentarioPronto = (c, eu, dono) => {
  const a = db.usuarios.find(x => x.id === c.usuarioId)
  return {
    id: c.id, texto: c.texto, criadoEm: c.criadoEm,
    autor: a ? autorDe(a) : { id: c.usuarioId, nome: 'Usuário removido', usuario: '' },
    autorAdmin: a ? ehAdmin(a) : false,
    podeApagar: c.usuarioId === eu.id || dono.id === eu.id || ehAdmin(eu)
  }
}

// Comentários de quem está suspenso, ou de quem eu bloqueei (ou me bloqueou), ficam escondidos
const comentarioVisivel = (c, eu) => {
  const a = db.usuarios.find(x => x.id === c.usuarioId)
  return !a || !escondidoPara(eu, a)
}

rota('GET', '/comunidade', ({ res, usuario, consulta }) => enviar(res, 200, listarComunidade(usuario, consulta)), true)

// Detalhe completo de um projeto (com curtidas e comentários)
rota('GET', '/comunidade/:id', ({ res, usuario, id }) => {
  const { p, u } = acharNaComunidade(id, usuario)
  const { favorito, curtidas, comentarios, oculto, ...dados } = p
  const dono = u.id === usuario.id
  enviar(res, 200, {
    ...dados,
    autor: autorDe(u),
    autorAdmin: ehAdmin(u),
    dono,
    admin: ehAdmin(usuario), // a tela mostra os botões da moderação
    totalCurtidas: curtidas.length,
    curtiu: curtidas.includes(usuario.id),
    // só o dono e a moderação sabem que o projeto está oculto (e por quê)
    ...(oculto && (dono || ehAdmin(usuario)) ? { oculto: { motivo: oculto.motivo } } : {}),
    ...(ehAdmin(usuario) && banidoAtivo(u) ? { autorSuspenso: true } : {}),
    comentarios: comentarios.filter(c => comentarioVisivel(c, usuario)).slice(-100).map(c => comentarioPronto(c, usuario, u))
  })
}, true)

// Curtir / descurtir (a mesma rota alterna)
rota('POST', '/comunidade/:id/curtir', ({ res, usuario, id }) => {
  limitar(`curtir|${usuario.id}`, 120)
  const { p, u } = acharNaComunidade(id, usuario)
  const i = p.curtidas.indexOf(usuario.id)
  if (i >= 0) p.curtidas.splice(i, 1)
  else {
    p.curtidas.push(usuario.id)
    notificar(u, { tipo: 'curtida', de: usuario, projetoId: p.id })
  }
  salvar()
  enviar(res, 200, { curtiu: i < 0, totalCurtidas: p.curtidas.length })
}, true)

rota('POST', '/comunidade/:id/comentarios', async ({ res, usuario, id, ler }) => {
  limitar(`comentar|${usuario.id}`, 20)
  const { p, u } = acharNaComunidade(id, usuario)
  const c = await ler()
  const t = texto(c.texto, 'Comentário', 500, true)
  if (p.comentarios.length >= 300) throw new ErroHttp(400, 'Este projeto atingiu o limite de comentários.')
  const novo = { id: ++db.contadores.comentarios, usuarioId: usuario.id, texto: t, criadoEm: new Date().toISOString() }
  p.comentarios.push(novo)
  notificar(u, { tipo: 'comentario', de: usuario, projetoId: p.id, trecho: t.slice(0, 80) })
  salvar()
  enviar(res, 201, comentarioPronto(novo, usuario, u))
}, true)

// Quem escreveu o comentário, o dono do projeto ou a administração pode apagar
rota('DELETE', '/comunidade/:id/comentarios/:cid', async ({ res, usuario, id, sub, ler }) => {
  const { p, u } = acharNaComunidade(id, usuario)
  const i = p.comentarios.findIndex(c => String(c.id) === sub)
  if (i < 0) throw new ErroHttp(404, 'Comentário não encontrado.')
  const comentario = p.comentarios[i]
  const admin = ehAdmin(usuario)
  if (comentario.usuarioId !== usuario.id && u.id !== usuario.id && !admin) throw new ErroHttp(403, 'Só quem escreveu, o dono do projeto ou a administração pode apagar.')
  p.comentarios.splice(i, 1)
  // Quando a administração apaga o comentário de outra pessoa: fica no registro e a pessoa é avisada
  if (admin && comentario.usuarioId !== usuario.id) {
    const corpo = await ler().catch(() => ({}))
    const motivo = texto(corpo.motivo, 'Motivo', 300) || 'Conteúdo inadequado.'
    const autor = acharUsuario(comentario.usuarioId)
    if (autor) avisar(autor, `Um comentário seu no projeto "${p.nome}" foi removido pela moderação. Motivo: ${motivo}`)
    auditar(usuario, 'apagou comentário', `comentário ${comentario.id} de @${autor?.usuario ?? 'removido'} no projeto ${p.id}`, motivo)
  }
  encerrarDenuncias(d => d.comentarioId === comentario.id, 'O comentário foi apagado.')
  salvar()
  semConteudo(res)
}, true)

// Perfil público: só mostra os projetos públicos, do jeito que os outros veem
rota('GET', '/perfil/:id', ({ res, usuario, id, consulta }) => {
  let handle = ''
  try { handle = decodeURIComponent(id).toLowerCase() } catch { /* cai no 404 */ }
  const alvo = db.usuarios.find(x => x.usuario === handle)
  // Quem está suspenso ou bloqueado "não existe" para os outros (a moderação vê)
  if (!alvo || escondidoPara(usuario, alvo)) throw new ErroHttp(404, 'Perfil não encontrado.')
  const publicos = alvo.projetos.filter(p => projetoNaLista(p, alvo, usuario))
  enviar(res, 200, {
    perfil: { id: alvo.id, nome: alvo.nome, usuario: alvo.usuario, criadoEm: alvo.criadoEm, papel: alvo.papel, bio: alvo.bio },
    souEu: alvo.id === usuario.id,
    euSigo: usuario.seguindo.includes(alvo.id),
    seguidores: db.usuarios.filter(x => x.seguindo.includes(alvo.id) && !banidoAtivo(x)).length,
    seguindo: alvo.seguindo.length,
    ...(ehAdmin(usuario) && banidoAtivo(alvo) ? { suspenso: { motivo: alvo.banido.motivo, ate: alvo.banido.ate } } : {}),
    totalProjetos: publicos.length,
    totalCurtidas: publicos.reduce((s, p) => s + p.curtidas.length, 0),
    ...listarComunidade(usuario, consulta, alvo)
  })
}, true)
