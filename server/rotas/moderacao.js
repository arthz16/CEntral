// Moderação feita pelas próprias pessoas: denunciar e bloquear.
import { db, salvar } from '../banco.js'
import { ErroHttp, enviar, rota, semConteudo } from '../http.js'
import { limitar } from '../limite.js'
import { texto } from '../validacao.js'
import { acharUsuario, ehAdmin, escondidoPara, projetoAcessivel } from '../visibilidade.js'

export const MOTIVOS_DENUNCIA = ['spam', 'ofensivo', 'assedio', 'inadequado', 'outro']

// Denunciar um projeto, um comentário ou uma pessoa. Vai para a fila da administração.
rota('POST', '/denuncias', async ({ res, usuario, ler }) => {
  limitar(`denunciar|${usuario.id}`, 10, 60 * 60 * 1000)
  const c = await ler()
  if (!['projeto', 'comentario', 'usuario'].includes(c.tipo)) throw new ErroHttp(400, 'Tipo de denúncia inválido.')
  if (!MOTIVOS_DENUNCIA.includes(c.motivo)) throw new ErroHttp(400, 'Escolha o motivo da denúncia.')
  const detalhe = texto(c.detalhe, 'Detalhes', 500)
  if (c.motivo === 'outro' && !detalhe) throw new ErroHttp(400, 'Conte o que aconteceu no campo de detalhes.')

  const alvo = { tipo: c.tipo }
  if (c.tipo === 'usuario') {
    const pessoa = acharUsuario(c.usuarioId)
    if (!pessoa || escondidoPara(usuario, pessoa)) throw new ErroHttp(404, 'Pessoa não encontrada.')
    if (pessoa.id === usuario.id) throw new ErroHttp(400, 'Você não pode denunciar a si mesmo.')
    if (ehAdmin(pessoa)) throw new ErroHttp(400, 'A administração não pode ser denunciada por aqui. Use a página de Suporte.')
    alvo.usuarioId = pessoa.id
  } else {
    let projeto = null, dono = null
    for (const u of db.usuarios) {
      const p = u.projetos.find(p => String(p.id) === String(c.projetoId))
      if (p) { projeto = p; dono = u; break }
    }
    if (!projeto || !projetoAcessivel(projeto, dono, usuario)) throw new ErroHttp(404, 'Projeto não encontrado.')
    alvo.projetoId = projeto.id
    alvo.usuarioId = dono.id
    if (c.tipo === 'projeto') {
      if (dono.id === usuario.id) throw new ErroHttp(400, 'Você não pode denunciar o seu próprio projeto.')
    } else {
      const comentario = projeto.comentarios.find(x => String(x.id) === String(c.comentarioId))
      if (!comentario) throw new ErroHttp(404, 'Comentário não encontrado.')
      if (comentario.usuarioId === usuario.id) throw new ErroHttp(400, 'Você não pode denunciar o seu próprio comentário.')
      alvo.comentarioId = comentario.id
      alvo.usuarioId = comentario.usuarioId
    }
  }

  const repetida = db.denuncias.some(d => d.status === 'aberta' && d.denuncianteId === usuario.id &&
    d.tipo === alvo.tipo && d.projetoId === alvo.projetoId && d.comentarioId === alvo.comentarioId && d.usuarioId === alvo.usuarioId)
  if (repetida) throw new ErroHttp(409, 'Você já denunciou isto. A administração está analisando.')

  db.denuncias.push({
    id: ++db.contadores.denuncias, ...alvo, motivo: c.motivo, detalhe,
    denuncianteId: usuario.id, criadoEm: new Date().toISOString(), status: 'aberta'
  })
  salvar()
  enviar(res, 201, { ok: true })
}, true)

// ---- Bloqueio: quem bloqueia e quem é bloqueado deixam de se ver (projetos, perfil, comentários, curtidas) ----
rota('GET', '/bloqueados', ({ res, usuario }) => {
  const lista = usuario.bloqueados.map(acharUsuario).filter(Boolean).map(u => ({ id: u.id, nome: u.nome, usuario: u.usuario }))
  enviar(res, 200, lista)
}, true)

rota('POST', '/usuarios/:id/bloquear', ({ res, usuario, id }) => {
  const alvo = acharUsuario(id)
  if (!alvo) throw new ErroHttp(404, 'Pessoa não encontrada.')
  if (alvo.id === usuario.id) throw new ErroHttp(400, 'Você não pode bloquear a si mesmo.')
  if (ehAdmin(alvo)) throw new ErroHttp(400, 'Não é possível bloquear a administração.')
  if (ehAdmin(usuario)) throw new ErroHttp(400, 'Administradores não bloqueiam pessoas: usem as ferramentas de moderação.')
  if (!usuario.bloqueados.includes(alvo.id)) usuario.bloqueados.push(alvo.id)
  usuario.seguindo = usuario.seguindo.filter(x => x !== alvo.id) // bloquear desfaz o "seguir" dos dois lados
  alvo.seguindo = alvo.seguindo.filter(x => x !== usuario.id)
  salvar()
  enviar(res, 200, { ok: true })
}, true)

rota('DELETE', '/usuarios/:id/bloquear', ({ res, usuario, id }) => {
  usuario.bloqueados = usuario.bloqueados.filter(x => String(x) !== id)
  salvar()
  semConteudo(res)
}, true)
