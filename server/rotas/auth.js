// Conta: cadastro, login (cookie), sair, esqueci a senha, perfil, trocar senha e excluir a conta.
import { timingSafeEqual } from 'node:crypto'
import { ADMIN_EMAIL, NOME_COOKIE, VALIDADE_RESET_MS } from '../config.js'
import { db, salvar } from '../banco.js'
import { ErroHttp, enviar, ip, rota, semConteudo } from '../http.js'
import { liberar, limitar } from '../limite.js'
import { conferirSenha, encerrarOutrasSessoes, encerrarSessao, gerarHash, HASH_FALSO, iniciarSessao } from '../seguranca.js'
import { emailAtivo, gerarCodigo, hashCodigo, mandarCodigo } from '../email.js'
import { removerUsuario } from '../contas.js'
import { banidoAtivo, ehAdmin } from '../visibilidade.js'
import { normalizarEmail, publico, texto, validarEmail, validarSenha, validarUsuario } from '../validacao.js'

rota('POST', '/auth/registrar', async ({ req, res, ler }) => {
  limitar(`registro|${ip(req)}`)
  const c = await ler()
  const nome = texto(c.nome, 'Nome', 60, true)
  const nomeUsuario = validarUsuario(c.usuario)
  const email = normalizarEmail(c.email)
  const senha = typeof c.senha === 'string' ? c.senha : ''

  if (nome.length < 2) throw new ErroHttp(400, 'O nome precisa ter pelo menos 2 letras.')
  validarEmail(email)
  validarSenha(senha)
  if (ADMIN_EMAIL && email === ADMIN_EMAIL) throw new ErroHttp(409, 'Este e-mail é reservado.')
  const jaExiste = () => db.usuarios.some(u => u.email === email)
  if (jaExiste()) throw new ErroHttp(409, 'Já existe uma conta com este e-mail.')

  const senhaHash = await gerarHash(senha)
  if (jaExiste()) throw new ErroHttp(409, 'Já existe uma conta com este e-mail.') // outro cadastro igual terminou antes
  validarUsuario(nomeUsuario) // idem para o nome de usuário

  const usuario = { id: ++db.contadores.usuarios, nome, usuario: nomeUsuario, email, senhaHash, criadoEm: new Date().toISOString(), projetos: [], sessoes: [], papel: 'usuario', bloqueados: [], avisos: [], bio: '', seguindo: [], notificacoes: [] }
  db.usuarios.push(usuario)
  iniciarSessao(res, usuario)
  enviar(res, 201, { usuario: publico(usuario) })
})

rota('POST', '/auth/login', async ({ req, res, ler }) => {
  const chave = `login|${ip(req)}`
  limitar(chave)
  const c = await ler()
  const usuario = db.usuarios.find(u => u.email === normalizarEmail(c.email))
  const senha = typeof c.senha === 'string' && c.senha.length <= 128 ? c.senha : ''
  const certa = await conferirSenha(senha, usuario ? usuario.senhaHash : HASH_FALSO)
  if (!usuario || !certa) throw new ErroHttp(401, 'E-mail ou senha incorretos.')
  liberar(chave)
  // A suspensão só é revelada a quem acertou a senha (o dono da conta)
  if (banidoAtivo(usuario)) {
    const { ate, motivo } = usuario.banido
    const ateTexto = ate ? `até ${new Date(ate).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}` : 'por tempo indeterminado'
    throw new ErroHttp(403, `Sua conta está suspensa ${ateTexto}. Motivo: ${motivo}`)
  }
  iniciarSessao(res, usuario)
  enviar(res, 200, { usuario: publico(usuario) })
})

rota('GET', '/auth/eu', ({ res, usuario }) => {
  enviar(res, 200, { usuario: publico(usuario), totalProjetos: usuario.projetos.length, avisos: usuario.avisos, naoLidas: usuario.notificacoes.filter(n => !n.lida).length })
}, true)

// Avisos da moderação já lidos
rota('DELETE', '/auth/avisos', ({ res, usuario }) => {
  usuario.avisos = []
  salvar()
  semConteudo(res)
}, true)

// Sair: encerra este login no servidor (o token deixa de valer na hora, mesmo que alguém o tenha copiado)
rota('POST', '/auth/sair', ({ res, usuario, jti }) => {
  encerrarSessao(res, usuario, jti)
  semConteudo(res)
}, true)

// Esqueci a senha: manda um código de 6 dígitos por e-mail. A resposta é sempre a mesma, exista a
// conta ou não, para ninguém descobrir quais e-mails têm cadastro. O código NUNCA volta na resposta.
rota('POST', '/auth/esqueci', async ({ req, res, ler }) => {
  limitar(`esqueci|${ip(req)}`, 5)
  const c = await ler()
  const usuario = db.usuarios.find(u => u.email === normalizarEmail(c.email))
  // no máximo um pedido por minuto por conta (evita encher a caixa de e-mails de alguém)
  if (usuario && !(usuario.reset && usuario.reset.pedidoEm > Date.now() - 60_000)) {
    const codigo = gerarCodigo()
    usuario.reset = { hash: hashCodigo(usuario, codigo), exp: Date.now() + VALIDADE_RESET_MS, tentativas: 0, pedidoEm: Date.now() }
    salvar()
    mandarCodigo(usuario, codigo) // em segundo plano: a resposta não demora mais para quem tem conta
  }
  enviar(res, 200, { ok: true, emailAtivo })
})

// Redefinir a senha com e-mail + código recebido. Todos os logins antigos da conta caem.
rota('POST', '/auth/redefinir', async ({ req, res, ler }) => {
  limitar(`redefinir|${ip(req)}`)
  const c = await ler()
  const usuario = db.usuarios.find(u => u.email === normalizarEmail(c.email))
  const invalido = () => new ErroHttp(400, 'Código inválido ou expirado. Peça um novo.')
  const reset = usuario?.reset
  if (!reset || reset.exp < Date.now()) throw invalido()
  if (++reset.tentativas > 5) { delete usuario.reset; salvar(); throw invalido() }
  const codigo = typeof c.codigo === 'string' ? c.codigo.replace(/\s/g, '') : ''
  const certo = /^\d{6}$/.test(codigo) &&
    timingSafeEqual(Buffer.from(hashCodigo(usuario, codigo), 'hex'), Buffer.from(reset.hash, 'hex'))
  if (!certo) { salvar(); throw invalido() }
  const senha = typeof c.senha === 'string' ? c.senha : ''
  validarSenha(senha)
  usuario.senhaHash = await gerarHash(senha)
  delete usuario.reset // uso único
  usuario.sessoes = [] // quem tinha a senha velha perde o acesso
  iniciarSessao(res, usuario)
  enviar(res, 200, { usuario: publico(usuario) })
})

// Editar o perfil (nome, @usuario e/ou e-mail).
rota('PATCH', '/auth/perfil', async ({ res, usuario, ler }) => {
  const c = await ler()
  if ('nome' in c) {
    const nome = texto(c.nome, 'Nome', 60, true)
    if (nome.length < 2) throw new ErroHttp(400, 'O nome precisa ter pelo menos 2 letras.')
    usuario.nome = nome
  }
  if ('usuario' in c) usuario.usuario = validarUsuario(c.usuario, usuario)
  if ('bio' in c) usuario.bio = texto(c.bio, 'Bio', 200)
  if ('email' in c) {
    const email = normalizarEmail(c.email)
    validarEmail(email)
    if (db.usuarios.some(u => u.email === email && u.id !== usuario.id)) throw new ErroHttp(409, 'Já existe uma conta com este e-mail.')
    usuario.email = email
  }
  salvar()
  enviar(res, 200, { usuario: publico(usuario) })
}, true)

// Trocar a senha (confere a senha atual antes). Os outros aparelhos conectados são desconectados.
rota('PATCH', '/auth/senha', async ({ res, usuario, jti, ler }) => {
  const c = await ler()
  const atual = typeof c.senhaAtual === 'string' ? c.senhaAtual : ''
  const nova = typeof c.novaSenha === 'string' ? c.novaSenha : ''
  if (!(await conferirSenha(atual, usuario.senhaHash))) throw new ErroHttp(401, 'Senha atual incorreta.')
  validarSenha(nova, 'A nova senha')
  usuario.senhaHash = await gerarHash(nova)
  encerrarOutrasSessoes(usuario, jti)
  enviar(res, 200, { ok: true })
}, true)

// Excluir a conta (confere a senha; apaga o usuário, os projetos dele e as curtidas/comentários que fez).
rota('DELETE', '/auth/conta', async ({ res, usuario, ler }) => {
  const c = await ler()
  const senha = typeof c.senha === 'string' ? c.senha : ''
  if (ehAdmin(usuario)) throw new ErroHttp(403, 'Uma conta de administrador não pode ser excluída por aqui. Peça a outro administrador para rebaixá-la antes.')
  if (!(await conferirSenha(senha, usuario.senhaHash))) throw new ErroHttp(401, 'Senha incorreta.')
  removerUsuario(usuario.id)
  res.setHeader('Set-Cookie', `${NOME_COOKIE}=; Path=/; HttpOnly; Max-Age=0`)
  semConteudo(res)
}, true)
