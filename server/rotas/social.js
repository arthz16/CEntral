// Rede social: seguir pessoas, notificações e sugestões da busca.
import { db, salvar } from '../banco.js'
import { ErroHttp, enviar, rota, semConteudo } from '../http.js'
import { limitar } from '../limite.js'
import { autorDe, norm, paginar } from '../listagem.js'
import { notificar } from '../contas.js'
import { acharUsuario, banidoAtivo, escondidoPara, projetoAcessivel, projetoNaLista } from '../visibilidade.js'

const contarSeguidores = id => db.usuarios.filter(u => u.seguindo.includes(id) && !banidoAtivo(u)).length

// ---------- Seguir ----------
rota('POST', '/usuarios/:id/seguir', ({ res, usuario, id }) => {
  limitar(`seguir|${usuario.id}`, 120)
  const alvo = acharUsuario(id)
  if (!alvo || escondidoPara(usuario, alvo)) throw new ErroHttp(404, 'Pessoa não encontrada.')
  if (alvo.id === usuario.id) throw new ErroHttp(400, 'Você não pode seguir a si mesmo.')
  if (!usuario.seguindo.includes(alvo.id)) {
    usuario.seguindo.push(alvo.id)
    notificar(alvo, { tipo: 'seguidor', de: usuario })
  }
  salvar()
  enviar(res, 200, { seguindo: true, seguidores: contarSeguidores(alvo.id) })
}, true)

rota('DELETE', '/usuarios/:id/seguir', ({ res, usuario, id }) => {
  const alvo = acharUsuario(id)
  usuario.seguindo = usuario.seguindo.filter(x => String(x) !== id)
  salvar()
  enviar(res, 200, { seguindo: false, seguidores: alvo ? contarSeguidores(alvo.id) : 0 })
}, true)

// Quem segue a pessoa e quem ela segue (?tipo=seguidores | seguindo)
rota('GET', '/perfil/:id/rede', ({ res, usuario, id, consulta }) => {
  let handle = ''
  try { handle = decodeURIComponent(id).toLowerCase() } catch { /* cai no 404 */ }
  const alvo = db.usuarios.find(x => x.usuario === handle)
  if (!alvo || escondidoPara(usuario, alvo)) throw new ErroHttp(404, 'Perfil não encontrado.')
  const brutos = consulta.get('tipo') === 'seguindo'
    ? alvo.seguindo.map(acharUsuario).filter(Boolean)
    : db.usuarios.filter(u => u.seguindo.includes(alvo.id))
  const pessoas = brutos.filter(u => !escondidoPara(usuario, u)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).slice(0, 200)
  enviar(res, 200, pessoas.map(autorDe))
}, true)

// ---------- Notificações ----------
function prepararNotificacao(n, eu) {
  const de = acharUsuario(n.deId)
  if (!de || escondidoPara(eu, de)) return null // de quem está suspenso, bloqueado ou removido não aparece
  let projeto = null
  if (n.projetoId) {
    for (const u of db.usuarios) {
      const p = u.projetos.find(p => p.id === n.projetoId)
      if (p) { if (projetoAcessivel(p, u, eu)) projeto = { id: p.id, nome: p.nome }; break }
    }
  }
  return { id: n.id, tipo: n.tipo, em: n.em, lida: n.lida, trecho: n.trecho, de: autorDe(de), projeto }
}
const visiveis = eu => eu.notificacoes.map(n => prepararNotificacao(n, eu)).filter(Boolean).reverse()

rota('GET', '/notificacoes', ({ res, usuario, consulta }) => {
  const todas = visiveis(usuario)
  const pagina = paginar(todas, consulta, 20, 50)
  enviar(res, 200, { ...pagina, naoLidas: todas.filter(n => !n.lida).length })
}, true)

rota('GET', '/notificacoes/contagem', ({ res, usuario }) => {
  enviar(res, 200, { naoLidas: visiveis(usuario).filter(n => !n.lida).length })
}, true)

rota('POST', '/notificacoes/lidas', ({ res, usuario }) => {
  for (const n of usuario.notificacoes) n.lida = true
  salvar()
  semConteudo(res)
}, true)

rota('DELETE', '/notificacoes', ({ res, usuario }) => {
  usuario.notificacoes = []
  salvar()
  semConteudo(res)
}, true)

// ---------- Sugestões enquanto a pessoa digita na busca ----------
// escopo=meus: só os projetos da própria conta. Padrão: Comunidade (só o que a pessoa pode ver).
rota('GET', '/busca/sugestoes', ({ res, usuario, consulta }) => {
  limitar(`sugestoes|${usuario.id}`, 600)
  const q = norm((consulta.get('q') || '').trim().slice(0, 60))
  const vazio = { projetos: [], pessoas: [], categorias: [] }
  if (q.length < 2) return enviar(res, 200, vazio)

  const meus = consulta.get('escopo') === 'meus'
  const pares = meus
    ? usuario.projetos.map(p => ({ p, u: usuario }))
    : db.usuarios.flatMap(u => u.projetos.filter(p => projetoNaLista(p, u, usuario)).map(p => ({ p, u })))
  const tem = t => norm(t).includes(q)

  const projetos = pares.filter(({ p }) => tem(p.nome)).sort((a, b) => b.p.curtidas.length - a.p.curtidas.length || b.p.id - a.p.id).slice(0, 5)
    .map(({ p }) => ({ id: p.id, nome: p.nome, categoria: p.categoria }))
  const categorias = [...new Map(pares.filter(({ p }) => tem(p.categoria)).map(({ p }) => [p.categoria.toLowerCase(), p.categoria])).values()].slice(0, 3)
  const pessoas = meus ? [] : db.usuarios.filter(u => (tem(u.nome) || tem(u.usuario)) && !banidoAtivo(u) && !escondidoPara(usuario, u))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).slice(0, 4).map(autorDe)
  enviar(res, 200, { projetos, pessoas, categorias })
}, true)
