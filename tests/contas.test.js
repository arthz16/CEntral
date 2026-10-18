// Testes de conta: cadastro, @ único, login por cookie, sair, trocar senha, recuperar senha por e-mail.
import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { Cliente, criarConta, esperar, iniciarServidor, iniciarSmtpFalso } from './ajuda.js'

describe('cadastro e nome de usuário (@)', () => {
  let servidor
  before(async () => { servidor = await iniciarServidor() })
  after(() => servidor.parar())

  test('cria a conta, põe o @ em minúsculas e entra por cookie httpOnly (sem token no corpo)', async () => {
    const c = new Cliente(servidor)
    const r = await c.post('/auth/registrar', { nome: 'Ana Souza', usuario: 'Ana_S', email: 'ana@x.com', senha: '123456' })
    assert.equal(r.status, 201)
    assert.equal(r.json.usuario.usuario, 'ana_s')
    assert.ok(!('token' in r.json), 'o token não pode ir no corpo da resposta')
    assert.match(r.setCookie, /HttpOnly/)
    assert.match(r.setCookie, /SameSite=Lax/)
    assert.equal((await c.get('/auth/eu')).status, 200)
  })

  test('@ repetido é recusado, mesmo com @ na frente ou maiúsculas', async () => {
    const c = new Cliente(servidor)
    const r = await c.post('/auth/registrar', { nome: 'Outra', usuario: '@ANA_S', email: 'outra@x.com', senha: '123456' })
    assert.equal(r.status, 409)
  })

  test('@ inválido ou ausente é recusado', async () => {
    const c = new Cliente(servidor)
    for (const usuario of ['ab', 'zé!', 'com espaço', 'a'.repeat(21), undefined]) {
      const r = await c.post('/auth/registrar', { nome: 'Teste', usuario, email: 't@x.com', senha: '123456' })
      assert.equal(r.status, 400, `deveria recusar @ ${usuario}`)
    }
  })

  test('e-mail repetido e senha curta são recusados', async () => {
    const c = new Cliente(servidor)
    assert.equal((await c.post('/auth/registrar', { nome: 'Ana 2', usuario: 'ana_2', email: 'ANA@x.com', senha: '123456' })).status, 409)
    assert.equal((await c.post('/auth/registrar', { nome: 'Bia', usuario: 'bia', email: 'bia@x.com', senha: '123' })).status, 400)
  })

  test('trocar para um @ que outra pessoa usa é recusado', async () => {
    const bia = await criarConta(servidor, 'Bia', { usuario: 'bia_t' })
    assert.equal((await bia.patch('/auth/perfil', { usuario: 'ana_s' })).status, 409)
    assert.equal((await bia.patch('/auth/perfil', { usuario: 'bia_nova' })).status, 200)
  })
})

describe('sessões e segurança do login', () => {
  let servidor
  before(async () => { servidor = await iniciarServidor() })
  after(() => servidor.parar())

  test('rotas privadas exigem login', async () => {
    const anonimo = new Cliente(servidor)
    assert.equal((await anonimo.get('/projetos')).status, 401)
    assert.equal((await anonimo.get('/comunidade')).status, 401)
  })

  test('sair invalida o login NO SERVIDOR: copiar o cookie antes não adianta', async () => {
    const ana = await criarConta(servidor, 'Ana')
    const copiado = ana.cookie
    assert.equal((await ana.post('/auth/sair')).status, 204)
    assert.equal((await ana.get('/auth/eu')).status, 401)
    const ladrao = new Cliente(servidor)
    ladrao.cookie = copiado
    assert.equal((await ladrao.get('/auth/eu')).status, 401, 'o cookie copiado deixou de valer')
  })

  test('cookie adulterado não vale', async () => {
    const ana = await criarConta(servidor, 'Ana')
    const falso = new Cliente(servidor)
    falso.cookie = ana.cookie.slice(0, -3) + 'abc'
    assert.equal((await falso.get('/auth/eu')).status, 401)
  })

  test('trocar a senha desconecta os outros aparelhos e mantém este', async () => {
    const ana = await criarConta(servidor, 'Ana', { usuario: 'ana_dois_aparelhos' })
    const outro = new Cliente(servidor)
    assert.equal((await outro.post('/auth/login', { email: ana.dados.email, senha: '123456' })).status, 200)
    assert.equal((await outro.get('/auth/eu')).status, 200)
    assert.equal((await ana.patch('/auth/senha', { senhaAtual: '123456', novaSenha: 'nova-senha' })).status, 200)
    assert.equal((await ana.get('/auth/eu')).status, 200, 'o aparelho que trocou continua logado')
    assert.equal((await outro.get('/auth/eu')).status, 401, 'o outro aparelho caiu')
  })

  test('senha atual errada não troca a senha', async () => {
    const ana = await criarConta(servidor, 'Ana')
    assert.equal((await ana.patch('/auth/senha', { senhaAtual: 'errada', novaSenha: 'qualquer1' })).status, 401)
  })

  test('pedido que altera dados vindo de outro site (Origin) é recusado', async () => {
    const ana = await criarConta(servidor, 'Ana')
    const r = await ana.req('POST', '/projetos', { nome: 'x', categoria: 'x', responsavel: 'x' }, { Origin: 'https://site-malicioso.com' })
    assert.equal(r.status, 403)
    const ok = await ana.req('POST', '/projetos', { nome: 'x', categoria: 'x', responsavel: 'x' }, { Origin: 'http://localhost:5173' })
    assert.equal(ok.status, 201)
    assert.equal(ok.cabecalhos.get('access-control-allow-credentials'), 'true')
  })
})

describe('limite de tentativas', () => {
  test('o limite de login continua valendo depois de reiniciar o servidor', async () => {
    const servidor = await iniciarServidor({ env: { LIMITES_MULTIPLICADOR: '1' } })
    const conta = await criarConta(servidor, 'Ana', { email: 'ana@x.com' })
    const tentar = c => c.post('/auth/login', { email: 'ana@x.com', senha: 'errada' })
    const c = new Cliente(servidor)
    let ultimo
    for (let i = 0; i < 10; i++) ultimo = await tentar(c)
    assert.equal(ultimo.status, 401)
    assert.equal((await tentar(c)).status, 429, 'a 11ª tentativa é barrada')

    await servidor.parar({ apagar: false }) // grava o limite no disco
    const depois = await iniciarServidor({ pasta: servidor.pasta, env: { LIMITES_MULTIPLICADOR: '1' } })
    assert.equal((await tentar(new Cliente(depois))).status, 429, 'reiniciar não zera o limite')
    await depois.parar()
    void conta
  })
})

describe('recuperação de senha por e-mail', () => {
  let servidor, smtp
  before(async () => {
    smtp = await iniciarSmtpFalso()
    servidor = await iniciarServidor({
      env: { SMTP_HOST: 'localhost', SMTP_PORT: String(smtp.porta), SMTP_USER: 'conta@teste.com', SMTP_PASS: 'segredo', SMTP_FROM: 'Central Projetos <conta@teste.com>' }
    })
  })
  after(async () => { await servidor.parar(); await smtp.fechar() })

  test('manda o código por e-mail, nunca na resposta, e só uma vez por minuto', async () => {
    const ana = await criarConta(servidor, 'Ana', { email: 'ana@x.com' })
    const c = new Cliente(servidor)
    const inexistente = await c.post('/auth/esqueci', { email: 'ninguem@x.com' })
    assert.equal(inexistente.status, 200)
    await esperar(300)
    assert.equal(smtp.recebidos.length, 0, 'e-mail sem conta: nada é enviado')

    const r = await c.post('/auth/esqueci', { email: 'ANA@x.com' })
    assert.equal(r.status, 200)
    assert.deepEqual(r.json, { ok: true, emailAtivo: true }, 'a resposta é igual exista a conta ou não')
    await esperar(500)
    assert.equal(smtp.recebidos.length, 1)
    const msg = smtp.recebidos[0]
    assert.equal(msg.usuario, 'conta@teste.com')
    assert.equal(msg.senha, 'segredo')
    assert.match(msg.para, /ana@x\.com/)
    const { assunto, texto } = smtp.leitura(msg)
    assert.match(assunto, /Código/)
    assert.match(texto, /Ana/)
    assert.match(texto, /15 minutos/)

    await c.post('/auth/esqueci', { email: 'ana@x.com' })
    await esperar(300)
    assert.equal(smtp.recebidos.length, 1, 'um segundo pedido em menos de 1 minuto não manda outro e-mail')
    void ana
  })

  test('código certo redefine a senha, uma vez só, e derruba os logins antigos', async () => {
    const bia = await criarConta(servidor, 'Bia', { email: 'bia@x.com' })
    const antes = smtp.recebidos.length
    const c = new Cliente(servidor)
    await c.post('/auth/esqueci', { email: 'bia@x.com' })
    await esperar(500)
    assert.equal(smtp.recebidos.length, antes + 1)
    const codigo = smtp.leitura(smtp.recebidos.at(-1)).texto.match(/\b(\d{6})\b/)[1]

    const outroUsuario = await c.post('/auth/redefinir', { email: 'ana@x.com', codigo, senha: 'nova-senha' })
    assert.equal(outroUsuario.status, 400, 'o código não vale para outra conta')
    const errado = await c.post('/auth/redefinir', { email: 'bia@x.com', codigo: codigo === '000000' ? '111111' : '000000', senha: 'nova-senha' })
    assert.equal(errado.status, 400)

    const certo = await c.post('/auth/redefinir', { email: 'bia@x.com', codigo, senha: 'nova-senha' })
    assert.equal(certo.status, 200)
    assert.equal((await c.get('/auth/eu')).status, 200, 'já entra logado')
    assert.equal((await new Cliente(servidor).post('/auth/redefinir', { email: 'bia@x.com', codigo, senha: 'outra-senha' })).status, 400, 'o código só vale uma vez')
    assert.equal((await bia.get('/auth/eu')).status, 401, 'o login antigo caiu')
    assert.equal((await new Cliente(servidor).post('/auth/login', { email: 'bia@x.com', senha: '123456' })).status, 401)
    assert.equal((await new Cliente(servidor).post('/auth/login', { email: 'bia@x.com', senha: 'nova-senha' })).status, 200)
  })
})

describe('recuperação de senha sem e-mail configurado', () => {
  test('o código aparece só no terminal do servidor e 5 palpites errados o invalidam', async () => {
    const servidor = await iniciarServidor()
    await criarConta(servidor, 'Ana', { email: 'ana@x.com' })
    const c = new Cliente(servidor)
    const r = await c.post('/auth/esqueci', { email: 'ana@x.com' })
    assert.deepEqual(r.json, { ok: true, emailAtivo: false })
    await esperar(200)
    const codigo = servidor.log.match(/Código de recuperação de ana@x\.com: (\d{6})/)?.[1]
    assert.ok(codigo, 'o código deveria estar no terminal do servidor')
    assert.ok(!r.texto.includes(codigo), 'e não na resposta')

    const errado = codigo === '123456' ? '654321' : '123456'
    for (let i = 0; i < 6; i++) await c.post('/auth/redefinir', { email: 'ana@x.com', codigo: errado, senha: 'abcdef' })
    assert.equal((await c.post('/auth/redefinir', { email: 'ana@x.com', codigo, senha: 'abcdef' })).status, 400, 'depois de 5 erros o código certo também morre')
    await servidor.parar()
  })
})

describe('excluir a conta', () => {
  test('exige a senha e encerra o login', async () => {
    const servidor = await iniciarServidor()
    const ana = await criarConta(servidor, 'Ana')
    assert.equal((await ana.del('/auth/conta', { senha: 'errada' })).status, 401)
    assert.equal((await ana.del('/auth/conta', { senha: '123456' })).status, 204)
    assert.equal((await ana.get('/auth/eu')).status, 401)
    await servidor.parar()
  })
})
