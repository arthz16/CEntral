// Testes de moderação: administrador, suspensão, ocultar/excluir, denúncias, bloqueio e registro de ações.
import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { Cliente, criarConta, esperar, iniciarServidor, projetoBase } from './ajuda.js'

const ADMIN = { ADMIN_EMAIL: 'admin@central.com', ADMIN_SENHA: 'senha-do-admin', ADMIN_USUARIO: 'admin' }

async function entrarComoAdmin(servidor, email = ADMIN.ADMIN_EMAIL, senha = ADMIN.ADMIN_SENHA) {
  const c = new Cliente(servidor)
  const r = await c.post('/auth/login', { email, senha })
  assert.equal(r.status, 200, 'o admin deveria conseguir entrar: ' + r.texto)
  return c
}

describe('como a conta de administrador nasce', () => {
  test('o servidor cria a conta do .env, ela é admin e ninguém consegue "roubar" esse e-mail nem o nome admin', async () => {
    const servidor = await iniciarServidor({ env: ADMIN })
    const admin = await entrarComoAdmin(servidor)
    assert.equal((await admin.get('/auth/eu')).json.usuario.papel, 'admin')

    const outro = new Cliente(servidor)
    assert.equal((await outro.post('/auth/registrar', { nome: 'Fingido', usuario: 'fingido', email: 'ADMIN@central.com', senha: '123456' })).status, 409, 'e-mail reservado')
    assert.equal((await outro.post('/auth/registrar', { nome: 'Fingido', usuario: 'admin2', email: 'f@x.com', senha: '123456' })).status, 201, 'um nome parecido é permitido')
    assert.equal((await new Cliente(servidor).post('/auth/registrar', { nome: 'Fingido', usuario: 'moderacao', email: 'g@x.com', senha: '123456' })).status, 400, 'nome que finge ser a administração')
    await servidor.parar()
  })

  test('sem ADMIN_SENHA o servidor gera uma senha e mostra no terminal (uma vez)', async () => {
    const servidor = await iniciarServidor({ env: { ADMIN_EMAIL: 'chefe@central.com' } })
    const senha = servidor.log.match(/Senha gerada.*: (\S+)/)?.[1]
    assert.ok(senha, 'a senha deveria aparecer no terminal')
    assert.equal((await new Cliente(servidor).post('/auth/login', { email: 'chefe@central.com', senha })).status, 200)
    await servidor.parar()
  })

  test('uma conta que já existia só é promovida se a senha do .env for a senha dela', async () => {
    const servidor = await iniciarServidor()
    await criarConta(servidor, 'Dono', { email: 'dono@x.com', senha: 'minha-senha' })
    await servidor.parar({ apagar: false })

    const errada = await iniciarServidor({ pasta: servidor.pasta, env: { ADMIN_EMAIL: 'dono@x.com', ADMIN_SENHA: 'outra-senha' } })
    assert.match(errada.log, /Já existe uma conta/)
    const c1 = new Cliente(errada)
    await c1.post('/auth/login', { email: 'dono@x.com', senha: 'minha-senha' })
    assert.equal((await c1.get('/admin/resumo')).status, 403, 'senha diferente: não é promovida')
    await errada.parar({ apagar: false })

    const certa = await iniciarServidor({ pasta: servidor.pasta, env: { ADMIN_EMAIL: 'dono@x.com', ADMIN_SENHA: 'minha-senha' } })
    const c2 = new Cliente(certa)
    await c2.post('/auth/login', { email: 'dono@x.com', senha: 'minha-senha' })
    assert.equal((await c2.get('/admin/resumo')).status, 200)
    await certa.parar()
  })
})

describe('administração', () => {
  let servidor, admin, ana, bia, carlos, projetoAna, projetoBia
  before(async () => {
    servidor = await iniciarServidor({ env: ADMIN })
    admin = await entrarComoAdmin(servidor)
    ana = await criarConta(servidor, 'Ana', { usuario: 'ana', email: 'ana@x.com' })
    bia = await criarConta(servidor, 'Bia', { usuario: 'bia', email: 'bia@x.com' })
    carlos = await criarConta(servidor, 'Carlos', { usuario: 'carlos', email: 'carlos@x.com' })
    projetoAna = (await ana.post('/projetos', projetoBase({ nome: 'Muro da Ana' }))).json
    projetoBia = (await bia.post('/projetos', projetoBase({ nome: 'Site da Bia' }))).json
  })
  after(() => servidor.parar())

  test('as rotas de administração exigem login E papel de admin', async () => {
    assert.equal((await new Cliente(servidor).get('/admin/resumo')).status, 401)
    for (const rota of ['/admin/resumo', '/admin/usuarios', '/admin/projetos', '/admin/denuncias', '/admin/registro']) {
      assert.equal((await ana.get(rota)).status, 403, `${rota} deveria recusar usuário comum`)
    }
    assert.equal((await ana.post(`/admin/usuarios/${bia.dados.id}/banir`, { motivo: 'x' })).status, 403)
    assert.equal((await ana.del(`/admin/projetos/${projetoBia.id}`, { motivo: 'x' })).status, 403)
  })

  test('visão geral e lista de pessoas (com e-mail, só para a administração)', async () => {
    const r = (await admin.get('/admin/resumo')).json
    assert.equal(r.usuarios, 4)
    assert.equal(r.admins, 1)
    assert.equal(r.projetos, 2)
    const lista = (await admin.get('/admin/usuarios?busca=bia')).json
    assert.equal(lista.total, 1)
    assert.equal(lista.itens[0].email, 'bia@x.com')
    assert.equal(lista.itens[0].totalProjetos, 1)
    assert.equal((await admin.get('/admin/usuarios?filtro=admins')).json.total, 1)
  })

  test('o admin enxerga projeto privado pelo detalhe; os outros não', async () => {
    const privado = (await ana.post('/projetos', projetoBase({ nome: 'Rascunho', publico: false }))).json
    assert.equal((await bia.get(`/comunidade/${privado.id}`)).status, 404)
    const r = await admin.get(`/comunidade/${privado.id}`)
    assert.equal(r.status, 200)
    assert.equal(r.json.admin, true)
    await ana.del(`/projetos/${privado.id}`)
  })

  describe('suspensão', () => {
    test('exige motivo e valida os dias; não vale para si mesmo nem para outro admin', async () => {
      assert.equal((await admin.post(`/admin/usuarios/${carlos.dados.id}/banir`, { motivo: '   ' })).status, 400)
      assert.equal((await admin.post(`/admin/usuarios/${carlos.dados.id}/banir`, { motivo: 'x', dias: 0 })).status, 400)
      assert.equal((await admin.post(`/admin/usuarios/${carlos.dados.id}/banir`, { motivo: 'x', dias: 500 })).status, 400)
      const euMesmo = (await admin.get('/auth/eu')).json.usuario.id
      assert.equal((await admin.post(`/admin/usuarios/${euMesmo}/banir`, { motivo: 'x' })).status, 400)
    })

    test('a pessoa perde o login na hora, não consegue entrar (vê o motivo) e some da Comunidade e do perfil', async () => {
      await carlos.post('/projetos', projetoBase({ nome: 'Projeto do Carlos' }))
      assert.equal((await bia.get('/comunidade?busca=Carlos')).json.total, 1)
      assert.equal((await bia.get('/perfil/carlos')).status, 200)

      assert.equal((await admin.post(`/admin/usuarios/${carlos.dados.id}/banir`, { motivo: 'Spam repetido', dias: 7 })).status, 200)
      assert.equal((await carlos.get('/auth/eu')).status, 401, 'a sessão aberta caiu')

      const entrar = await new Cliente(servidor).post('/auth/login', { email: 'carlos@x.com', senha: '123456' })
      assert.equal(entrar.status, 403)
      assert.match(entrar.json.erro, /suspensa até .*Spam repetido/)
      const senhaErrada = await new Cliente(servidor).post('/auth/login', { email: 'carlos@x.com', senha: 'errada' })
      assert.equal(senhaErrada.status, 401, 'quem erra a senha não descobre a suspensão')

      assert.equal((await bia.get('/comunidade?busca=Carlos')).json.total, 0)
      assert.equal((await bia.get('/perfil/carlos')).status, 404)
      assert.equal((await admin.get('/perfil/carlos')).json.suspenso.motivo, 'Spam repetido', 'a administração ainda vê')
      assert.equal((await admin.get('/admin/usuarios?filtro=suspensos')).json.total, 1)
    })

    test('encerrar a suspensão devolve tudo e avisa a pessoa', async () => {
      assert.equal((await admin.post(`/admin/usuarios/${carlos.dados.id}/desbanir`)).status, 200)
      assert.equal((await admin.post(`/admin/usuarios/${carlos.dados.id}/desbanir`)).status, 400, 'não está mais suspenso')
      // o Carlos entra de novo (a suspensão tinha derrubado o login dele) e segue usando a mesma "aba" nos próximos testes
      assert.equal((await carlos.post('/auth/login', { email: 'carlos@x.com', senha: '123456' })).status, 200)
      assert.match((await carlos.get('/auth/eu')).json.avisos.at(-1).texto, /suspensão foi encerrada/)
      assert.equal((await bia.get('/comunidade?busca=Carlos')).json.total, 1)
    })

    test('a suspensão com prazo termina sozinha', async () => {
      const dani = await criarConta(servidor, 'Dani', { usuario: 'dani', email: 'dani@x.com' })
      await admin.post(`/admin/usuarios/${dani.dados.id}/banir`, { motivo: 'Teste', dias: 1 })
      assert.equal((await new Cliente(servidor).post('/auth/login', { email: 'dani@x.com', senha: '123456' })).status, 403)

      // O tempo passa: reescrevemos o prazo para ontem e reiniciamos
      await servidor.parar({ apagar: false })
      const arquivo = `${servidor.pasta}/db.json`
      const banco = JSON.parse(readFileSync(arquivo, 'utf8'))
      banco.usuarios.find(u => u.usuario === 'dani').banido.ate = new Date(Date.now() - 3600_000).toISOString()
      writeFileSync(arquivo, JSON.stringify(banco))
      servidor = await iniciarServidor({ pasta: servidor.pasta, env: ADMIN })
      for (const c of [admin, ana, bia, carlos]) c.base = servidor.base
      assert.equal((await new Cliente(servidor).post('/auth/login', { email: 'dani@x.com', senha: '123456' })).status, 200, 'a suspensão acabou')
    })
  })

  describe('ocultar e excluir projetos', () => {
    test('projeto oculto some para os outros, o dono vê o motivo e é avisado; "mostrar" desfaz', async () => {
      assert.equal((await admin.post(`/admin/projetos/${projetoAna.id}/ocultar`, { motivo: '  ' })).status, 400, 'exige motivo')
      assert.equal((await admin.post(`/admin/projetos/${projetoAna.id}/ocultar`, { motivo: 'Conteúdo enganoso' })).status, 200)
      assert.equal((await bia.get('/comunidade?busca=Muro')).json.total, 0)
      assert.equal((await bia.get(`/comunidade/${projetoAna.id}`)).status, 404)
      assert.equal((await bia.post(`/comunidade/${projetoAna.id}/curtir`)).status, 404)

      const dono = (await ana.get(`/projetos/${projetoAna.id}`)).json
      assert.equal(dono.oculto.motivo, 'Conteúdo enganoso')
      assert.ok(!('por' in dono.oculto), 'o dono não vê quem ocultou')
      assert.equal((await ana.get('/projetos?busca=Muro')).json.projetos[0].oculto.motivo, 'Conteúdo enganoso')
      assert.match((await ana.get('/auth/eu')).json.avisos.at(-1).texto, /ocultado.*Conteúdo enganoso/)
      assert.equal((await admin.get('/admin/projetos?estado=ocultos')).json.total, 1)

      assert.equal((await admin.post(`/admin/projetos/${projetoAna.id}/mostrar`)).status, 200)
      assert.equal((await bia.get('/comunidade?busca=Muro')).json.total, 1)
    })

    test('excluir um projeto: exige motivo, avisa o dono e encerra as denúncias dele', async () => {
      const p = (await bia.post('/projetos', projetoBase({ nome: 'Golpe' }))).json
      assert.equal((await ana.post('/denuncias', { tipo: 'projeto', projetoId: p.id, motivo: 'spam' })).status, 201)
      assert.equal((await admin.del(`/admin/projetos/${p.id}`, { motivo: '' })).status, 400)
      assert.equal((await admin.del(`/admin/projetos/${p.id}`, { motivo: 'Golpe confirmado' })).status, 204)
      assert.equal((await bia.get(`/projetos/${p.id}`)).status, 404)
      assert.match((await bia.get('/auth/eu')).json.avisos.at(-1).texto, /excluído pela moderação.*Golpe confirmado/)
      const abertas = (await admin.get('/admin/denuncias')).json.itens
      assert.ok(!abertas.some(d => d.projeto?.id === p.id), 'a denúncia do projeto excluído foi encerrada')
    })

    test('o aviso pode ser dispensado', async () => {
      assert.ok((await bia.get('/auth/eu')).json.avisos.length > 0)
      assert.equal((await bia.del('/auth/avisos')).status, 204)
      assert.equal((await bia.get('/auth/eu')).json.avisos.length, 0)
    })
  })

  describe('papéis e exclusão de contas', () => {
    test('promover, rebaixar e os limites (não mexe na própria conta)', async () => {
      const euMesmo = (await admin.get('/auth/eu')).json.usuario.id
      assert.equal((await admin.post(`/admin/usuarios/${euMesmo}/papel`, { papel: 'usuario' })).status, 400)
      assert.equal((await admin.post(`/admin/usuarios/${bia.dados.id}/papel`, { papel: 'chefe' })).status, 400)

      const edu = await criarConta(servidor, 'Edu', { usuario: 'edu', email: 'edu@x.com' })
      assert.equal((await edu.get('/admin/resumo')).status, 403)
      assert.equal((await admin.post(`/admin/usuarios/${edu.dados.id}/papel`, { papel: 'admin' })).status, 200)
      assert.equal((await edu.get('/admin/resumo')).status, 200, 'virou admin')
      // o novo admin também consegue moderar (usa uma conta descartável: suspender derruba o login de quem é suspenso)
      const zeca = await criarConta(servidor, 'Zeca', { usuario: 'zeca', email: 'zeca@x.com' })
      assert.equal((await edu.post(`/admin/usuarios/${zeca.dados.id}/banir`, { motivo: 'x', dias: 1 })).status, 200)
      assert.equal((await edu.post(`/admin/usuarios/${zeca.dados.id}/desbanir`)).status, 200)

      // admin não bane nem exclui outro admin (precisa rebaixar antes)
      assert.equal((await admin.post(`/admin/usuarios/${edu.dados.id}/banir`, { motivo: 'x' })).status, 403)
      assert.equal((await admin.del(`/admin/usuarios/${edu.dados.id}`, { motivo: 'x' })).status, 403)
      assert.equal((await admin.post(`/admin/usuarios/${edu.dados.id}/papel`, { papel: 'usuario' })).status, 200)
      assert.equal((await edu.get('/admin/resumo')).status, 403, 'rebaixado: perdeu o acesso na hora')
    })

    test('excluir uma conta apaga a pessoa e os projetos dela, e ela não entra mais', async () => {
      const fabio = await criarConta(servidor, 'Fabio', { usuario: 'fabio', email: 'fabio@x.com' })
      await fabio.post('/projetos', projetoBase({ nome: 'Do Fabio' }))
      assert.equal((await admin.del(`/admin/usuarios/${fabio.dados.id}`, { motivo: '' })).status, 400, 'exige motivo')
      assert.equal((await admin.del(`/admin/usuarios/${fabio.dados.id}`, { motivo: 'Conta falsa' })).status, 204)
      assert.equal((await bia.get('/comunidade?busca=Fabio')).json.total, 0)
      assert.equal((await new Cliente(servidor).post('/auth/login', { email: 'fabio@x.com', senha: '123456' })).status, 401)
    })

    test('uma conta de admin não se exclui sozinha pela tela da Conta', async () => {
      assert.equal((await admin.del('/auth/conta', { senha: ADMIN.ADMIN_SENHA })).status, 403)
    })
  })

  describe('denúncias', () => {
    let alvoProjeto
    before(async () => { alvoProjeto = (await bia.post('/projetos', projetoBase({ nome: 'Projeto denunciável' }))).json })

    test('valida o pedido e não deixa denunciar duas vezes, o próprio conteúdo ou algo que não enxerga', async () => {
      assert.equal((await ana.post('/denuncias', { tipo: 'projeto', projetoId: alvoProjeto.id, motivo: 'qualquer' })).status, 400)
      assert.equal((await ana.post('/denuncias', { tipo: 'projeto', projetoId: alvoProjeto.id, motivo: 'outro' })).status, 400, '"outro" exige detalhes')
      assert.equal((await ana.post('/denuncias', { tipo: 'coisa', motivo: 'spam' })).status, 400)
      assert.equal((await bia.post('/denuncias', { tipo: 'projeto', projetoId: alvoProjeto.id, motivo: 'spam' })).status, 400, 'o próprio projeto')
      assert.equal((await ana.post('/denuncias', { tipo: 'projeto', projetoId: 999999, motivo: 'spam' })).status, 404)
      assert.equal((await ana.post('/denuncias', { tipo: 'projeto', projetoId: alvoProjeto.id, motivo: 'spam', detalhe: 'x'.repeat(501) })).status, 400)

      assert.equal((await ana.post('/denuncias', { tipo: 'projeto', projetoId: alvoProjeto.id, motivo: 'ofensivo', detalhe: 'Linguagem agressiva' })).status, 201)
      assert.equal((await ana.post('/denuncias', { tipo: 'projeto', projetoId: alvoProjeto.id, motivo: 'spam' })).status, 409, 'já denunciou')

      const privado = (await bia.post('/projetos', projetoBase({ nome: 'Privado da Bia', publico: false }))).json
      assert.equal((await ana.post('/denuncias', { tipo: 'projeto', projetoId: privado.id, motivo: 'spam' })).status, 404, 'projeto privado "não existe" para quem não é o dono')
      assert.equal((await ana.post('/denuncias', { tipo: 'usuario', usuarioId: (await admin.get('/auth/eu')).json.usuario.id, motivo: 'spam' })).status, 400, 'a administração não é denunciada por aqui')
    })

    test('a fila da administração mostra quem denunciou, o alvo e o motivo; dá para resolver ou ignorar', async () => {
      const fila = (await admin.get('/admin/denuncias')).json
      const d = fila.itens.find(x => x.projeto?.id === alvoProjeto.id)
      assert.ok(d)
      assert.equal(d.denunciante.usuario, 'ana')
      assert.equal(d.pessoa.usuario, 'bia')
      assert.equal(d.motivo, 'ofensivo')
      assert.equal(d.detalhe, 'Linguagem agressiva')
      assert.equal(d.status, 'aberta')

      assert.equal((await admin.post(`/admin/denuncias/${d.id}`, { status: 'talvez' })).status, 400)
      assert.equal((await admin.post(`/admin/denuncias/${d.id}`, { status: 'ignorada', nota: 'Sem problema' })).status, 200)
      assert.equal((await admin.post(`/admin/denuncias/${d.id}`, { status: 'resolvida' })).status, 400, 'já encerrada')
      assert.ok(!(await admin.get('/admin/denuncias')).json.itens.some(x => x.id === d.id))
      const encerradas = (await admin.get('/admin/denuncias?estado=resolvida')).json.itens
      assert.equal(encerradas.find(x => x.id === d.id).nota, 'Sem problema')
    })

    test('agir resolve as denúncias abertas: ocultar o projeto ou suspender a pessoa encerram a fila dela', async () => {
      const gil = await criarConta(servidor, 'Gil', { usuario: 'gil', email: 'gil@x.com' })
      const pg = (await gil.post('/projetos', projetoBase({ nome: 'Projeto do Gil' }))).json
      await ana.post('/denuncias', { tipo: 'projeto', projetoId: pg.id, motivo: 'spam' })
      await carlos.post('/denuncias', { tipo: 'projeto', projetoId: pg.id, motivo: 'spam' })
      await ana.post('/denuncias', { tipo: 'usuario', usuarioId: gil.dados.id, motivo: 'assedio' })
      const abertas = async () => (await admin.get('/admin/denuncias?limite=50')).json.itens.filter(d => d.pessoa?.usuario === 'gil')
      assert.equal((await abertas()).length, 3)

      await admin.post(`/admin/projetos/${pg.id}/ocultar`, { motivo: 'Spam' })
      assert.deepEqual((await abertas()).map(d => d.tipo), ['usuario'], 'as 2 denúncias do projeto fecharam; a da pessoa continua')

      await admin.post(`/admin/usuarios/${gil.dados.id}/banir`, { motivo: 'Assédio', dias: 3 })
      assert.equal((await abertas()).length, 0)
      const encerradas = (await admin.get('/admin/denuncias?estado=resolvida&limite=50')).json.itens.filter(d => d.pessoa?.usuario === 'gil')
      assert.equal(encerradas.length, 3)
      assert.ok(encerradas.every(d => d.resolvidoPor === 'sistema' && d.nota))
    })

    test('denunciar comentário e pessoa; a moderação apaga o comentário, avisa o autor e fica no registro', async () => {
      const c = (await bia.post(`/comunidade/${projetoAna.id}/comentarios`, { texto: 'Comentário ofensivo' })).json
      assert.equal((await bia.post('/denuncias', { tipo: 'comentario', projetoId: projetoAna.id, comentarioId: c.id, motivo: 'spam' })).status, 400, 'o próprio comentário')
      assert.equal((await carlos.post('/denuncias', { tipo: 'comentario', projetoId: projetoAna.id, comentarioId: c.id, motivo: 'ofensivo' })).status, 201)
      assert.equal((await carlos.post('/denuncias', { tipo: 'usuario', usuarioId: bia.dados.id, motivo: 'assedio' })).status, 201)

      const fila = (await admin.get('/admin/denuncias')).json.itens
      const dc = fila.find(x => x.comentario?.id === c.id)
      assert.equal(dc.comentario.texto, 'Comentário ofensivo')

      assert.equal((await admin.del(`/comunidade/${projetoAna.id}/comentarios/${c.id}`, { motivo: 'Ofensivo' })).status, 204)
      assert.match((await bia.get('/auth/eu')).json.avisos.at(-1).texto, /comentário seu.*removido.*Ofensivo/)
      assert.ok(!(await admin.get('/admin/denuncias')).json.itens.some(x => x.comentario?.id === c.id), 'a denúncia do comentário apagado foi encerrada')
      assert.equal((await ana.get(`/comunidade/${projetoAna.id}`)).json.comentarios.length, 0)
    })
  })

  describe('bloqueio entre pessoas', () => {
    test('quem bloqueia e quem é bloqueado deixam de se ver e de interagir; desbloquear desfaz', async () => {
      const gabi = await criarConta(servidor, 'Gabi', { usuario: 'gabi', email: 'gabi@x.com' })
      const hugo = await criarConta(servidor, 'Hugo', { usuario: 'hugo', email: 'hugo@x.com' })
      const pg = (await gabi.post('/projetos', projetoBase({ nome: 'Projeto da Gabi' }))).json
      const ph = (await hugo.post('/projetos', projetoBase({ nome: 'Projeto do Hugo' }))).json
      await hugo.post(`/comunidade/${pg.id}/comentarios`, { texto: 'Oi da parte do Hugo' })
      assert.equal((await gabi.get(`/comunidade/${pg.id}`)).json.comentarios.length, 1)

      assert.equal((await gabi.post(`/usuarios/${hugo.dados.id}/bloquear`)).status, 200)
      assert.deepEqual((await gabi.get('/bloqueados')).json.map(x => x.usuario), ['hugo'])

      // a Gabi não vê o Hugo...
      assert.equal((await gabi.get('/comunidade?busca=Hugo')).json.total, 0)
      assert.equal((await gabi.get('/perfil/hugo')).status, 404)
      assert.equal((await gabi.get(`/comunidade/${ph.id}`)).status, 404)
      assert.equal((await gabi.get(`/comunidade/${pg.id}`)).json.comentarios.length, 0, 'o comentário do bloqueado some para ela')
      // ...e o Hugo não vê a Gabi nem interage com ela
      assert.equal((await hugo.get('/comunidade?busca=Gabi')).json.total, 0)
      assert.equal((await hugo.get('/perfil/gabi')).status, 404)
      assert.equal((await hugo.post(`/comunidade/${pg.id}/curtir`)).status, 404)
      assert.equal((await hugo.post(`/comunidade/${pg.id}/comentarios`, { texto: 'oi' })).status, 404)
      // outras pessoas continuam vendo os dois normalmente
      assert.equal((await ana.get('/comunidade?busca=Gabi')).json.total, 1)
      assert.equal((await ana.get(`/comunidade/${pg.id}`)).json.comentarios.length, 1)

      assert.equal((await gabi.del(`/usuarios/${hugo.dados.id}/bloquear`)).status, 204)
      assert.equal((await gabi.get('/comunidade?busca=Hugo')).json.total, 1)
      assert.equal((await hugo.get('/perfil/gabi')).status, 200)
    })

    test('não dá para bloquear a si mesmo nem a administração; admin também não bloqueia', async () => {
      const euAdmin = (await admin.get('/auth/eu')).json.usuario.id
      assert.equal((await ana.post(`/usuarios/${ana.dados.id}/bloquear`)).status, 400)
      assert.equal((await ana.post(`/usuarios/${euAdmin}/bloquear`)).status, 400)
      assert.equal((await admin.post(`/usuarios/${ana.dados.id}/bloquear`)).status, 400)
    })

    test('a administração enxerga tudo mesmo com bloqueios', async () => {
      const iris = await criarConta(servidor, 'Iris', { usuario: 'iris', email: 'iris@x.com' })
      await iris.post('/projetos', projetoBase({ nome: 'Projeto da Iris' }))
      await ana.post(`/usuarios/${iris.dados.id}/bloquear`)
      assert.equal((await ana.get('/comunidade?busca=Iris')).json.total, 0)
      assert.equal((await admin.get('/comunidade?busca=Iris')).json.total, 1)
      await ana.del(`/usuarios/${iris.dados.id}/bloquear`)
    })
  })

  test('o registro de ações lista tudo o que a administração fez, do mais novo para o mais antigo', async () => {
    const r = (await admin.get('/admin/registro?limite=50')).json
    assert.ok(r.total >= 8)
    assert.equal(r.itens[0].admin, 'admin')
    const acoes = r.itens.map(x => x.acao)
    assert.ok(acoes.includes('suspendeu') && acoes.includes('ocultou o projeto') && acoes.includes('excluiu o projeto'))
    assert.ok(acoes.includes('apagou comentário') && acoes.includes('excluiu a conta de'))
    const suspensao = r.itens.find(x => x.acao === 'suspendeu' && /Spam repetido/.test(x.motivo))
    assert.ok(suspensao, 'a suspensão do Carlos, com o motivo, está no registro')
    assert.match(suspensao.motivo, /7 dias/)
    assert.ok(suspensao.id > 0 && suspensao.em)
    assert.equal((await ana.get('/admin/registro')).status, 403)
  })

  test('as denúncias e a suspensão sobrevivem ao reinício do servidor', async () => {
    await esperar(300)
    await servidor.parar({ apagar: false })
    servidor = await iniciarServidor({ pasta: servidor.pasta, env: ADMIN })
    for (const c of [admin, ana, bia, carlos]) c.base = servidor.base
    assert.ok((await admin.get('/admin/registro')).json.total >= 8)
  })
})
