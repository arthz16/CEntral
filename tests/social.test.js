// Testes da rede social: bio, seguir, "em alta", notificações e sugestões da busca.
import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { Cliente, criarConta, iniciarServidor, projetoBase } from './ajuda.js'

describe('rede social', () => {
  let servidor, ana, bia, carlos, admin, pAna, pBia
  before(async () => {
    servidor = await iniciarServidor({ env: { ADMIN_EMAIL: 'admin@central.com', ADMIN_SENHA: 'senha-do-admin' } })
    ana = await criarConta(servidor, 'Ana', { usuario: 'ana', email: 'ana@x.com' })
    bia = await criarConta(servidor, 'Bia', { usuario: 'bia', email: 'bia@x.com' })
    carlos = await criarConta(servidor, 'Carlos', { usuario: 'carlos', email: 'carlos@x.com' })
    admin = new Cliente(servidor)
    await admin.post('/auth/login', { email: 'admin@central.com', senha: 'senha-do-admin' })
    pAna = (await ana.post('/projetos', projetoBase({ nome: 'Horta da Ana', categoria: 'jardinagem' }))).json
    pBia = (await bia.post('/projetos', projetoBase({ nome: 'Site da Bia', categoria: 'Sites' }))).json
  })
  after(() => servidor.parar())

  describe('bio', () => {
    test('a pessoa escreve a bio, ela aparece no perfil e não passa de 200 caracteres', async () => {
      assert.equal((await ana.patch('/auth/perfil', { bio: 'x'.repeat(201) })).status, 400)
      const r = await ana.patch('/auth/perfil', { bio: '  Estudante de sistemas e fã de hortas.  ' })
      assert.equal(r.json.usuario.bio, 'Estudante de sistemas e fã de hortas.')
      assert.equal((await bia.get('/perfil/ana')).json.perfil.bio, 'Estudante de sistemas e fã de hortas.')
      assert.equal((await bia.get('/perfil/carlos')).json.perfil.bio, '')
    })
  })

  describe('seguir', () => {
    test('seguir, deixar de seguir, contadores e "euSigo"', async () => {
      assert.equal((await ana.post(`/usuarios/${ana.dados.id}/seguir`)).status, 400, 'a si mesmo')
      assert.equal((await ana.post('/usuarios/99999/seguir')).status, 404)
      assert.deepEqual((await bia.post(`/usuarios/${ana.dados.id}/seguir`)).json, { seguindo: true, seguidores: 1 })
      assert.deepEqual((await bia.post(`/usuarios/${ana.dados.id}/seguir`)).json, { seguindo: true, seguidores: 1 }, 'seguir de novo não duplica')
      await carlos.post(`/usuarios/${ana.dados.id}/seguir`)
      const perfil = (await bia.get('/perfil/ana')).json
      assert.equal(perfil.seguidores, 2)
      assert.equal(perfil.euSigo, true)
      assert.equal((await carlos.get('/perfil/bia')).json.euSigo, false)
      assert.equal((await ana.get('/perfil/ana')).json.seguidores, 2)
      assert.deepEqual((await bia.del(`/usuarios/${ana.dados.id}/seguir`)).json, { seguindo: false, seguidores: 1 })
      await bia.post(`/usuarios/${ana.dados.id}/seguir`)
    })

    test('listas de seguidores e de quem a pessoa segue', async () => {
      await ana.post(`/usuarios/${carlos.dados.id}/seguir`)
      const seguidores = (await bia.get('/perfil/ana/rede?tipo=seguidores')).json.map(x => x.usuario)
      assert.deepEqual(seguidores, ['bia', 'carlos'])
      const seguindo = (await bia.get('/perfil/ana/rede?tipo=seguindo')).json.map(x => x.usuario)
      assert.deepEqual(seguindo, ['carlos'])
      assert.equal((await bia.get('/perfil/ninguem/rede')).status, 404)
    })

    test('o feed "só de quem eu sigo" mostra apenas projetos de quem eu sigo', async () => {
      await carlos.post('/projetos', projetoBase({ nome: 'Projeto do Carlos' }))
      const doFeed = (await bia.get('/comunidade?seguindo=1&limite=48')).json
      assert.deepEqual(doFeed.projetos.map(p => p.nome), ['Horta da Ana'], 'a Bia só segue a Ana')
      assert.deepEqual((await carlos.get('/comunidade?seguindo=1')).json.projetos.map(p => p.nome), ['Horta da Ana'], 'o Carlos também só segue a Ana')
      const novo = await criarConta(servidor, 'Novo', { usuario: 'novo', email: 'novo@x.com' })
      assert.equal((await novo.get('/comunidade?seguindo=1')).json.total, 0, 'quem não segue ninguém vê a lista vazia')
    })

    test('bloquear desfaz o "seguir" dos dois lados e não dá para seguir quem não se enxerga', async () => {
      const gil = await criarConta(servidor, 'Gil', { usuario: 'gil', email: 'gil@x.com' })
      const hana = await criarConta(servidor, 'Hana', { usuario: 'hana', email: 'hana@x.com' })
      await gil.post(`/usuarios/${hana.dados.id}/seguir`)
      await hana.post(`/usuarios/${gil.dados.id}/seguir`)
      await gil.post(`/usuarios/${hana.dados.id}/bloquear`)
      assert.equal((await gil.get('/perfil/gil')).json.seguindo, 0)
      assert.equal((await hana.get('/perfil/hana')).json.seguindo, 0)
      assert.equal((await gil.post(`/usuarios/${hana.dados.id}/seguir`)).status, 404)
      assert.equal((await hana.post(`/usuarios/${gil.dados.id}/seguir`)).status, 404)
    })

    test('quem foi suspenso some das listas e dos contadores de seguidores', async () => {
      const ivo = await criarConta(servidor, 'Ivo', { usuario: 'ivo', email: 'ivo@x.com' })
      await ivo.post(`/usuarios/${bia.dados.id}/seguir`)
      assert.equal((await ana.get('/perfil/bia')).json.seguidores, 1)
      await admin.post(`/admin/usuarios/${ivo.dados.id}/banir`, { motivo: 'Teste', dias: 1 })
      assert.equal((await ana.get('/perfil/bia')).json.seguidores, 0)
      assert.deepEqual((await ana.get('/perfil/bia/rede?tipo=seguidores')).json, [])
      await admin.post(`/admin/usuarios/${ivo.dados.id}/desbanir`)
    })
  })

  describe('em alta', () => {
    test('curtidas e comentários empurram o projeto para cima, mesmo sendo igualmente novo', async () => {
      const dani = await criarConta(servidor, 'Dani', { usuario: 'dani', email: 'dani@x.com' })
      const pop = (await dani.post('/projetos', projetoBase({ nome: 'Projeto popular' }))).json
      const quieto = (await dani.post('/projetos', projetoBase({ nome: 'Projeto sossegado' }))).json
      for (const c of [ana, bia, carlos]) await c.post(`/comunidade/${pop.id}/curtir`)
      await ana.post(`/comunidade/${pop.id}/comentarios`, { texto: 'Gostei muito' })
      const recentes = (await ana.get('/comunidade?ordem=recentes&limite=48')).json.projetos.map(p => p.nome)
      assert.ok(recentes.indexOf('Projeto sossegado') < recentes.indexOf('Projeto popular'), 'por data, o sossegado (criado depois) vem primeiro')
      const emAlta = (await ana.get('/comunidade?ordem=emalta&limite=48')).json.projetos.map(p => p.nome)
      assert.equal(emAlta[0], 'Projeto popular')
      assert.ok(emAlta.indexOf('Projeto popular') < emAlta.indexOf('Projeto sossegado'))
      void quieto
    })
  })

  describe('notificações', () => {
    let dona, fa, outro, projeto
    before(async () => {
      dona = await criarConta(servidor, 'Dona', { usuario: 'dona', email: 'dona@x.com' })
      fa = await criarConta(servidor, 'Fa', { usuario: 'fan', email: 'fan@x.com' })
      outro = await criarConta(servidor, 'Outro', { usuario: 'outro', email: 'outro@x.com' })
      projeto = (await dona.post('/projetos', projetoBase({ nome: 'Projeto da Dona' }))).json
    })

    test('curtir, comentar e seguir geram notificações para a dona (uma de cada), nunca para si mesmo', async () => {
      assert.equal((await dona.get('/auth/eu')).json.naoLidas, 0)
      await fa.post(`/comunidade/${projeto.id}/curtir`)
      await fa.post(`/comunidade/${projeto.id}/curtir`) // descurtir
      await fa.post(`/comunidade/${projeto.id}/curtir`) // curtir de novo: não notifica outra vez
      await fa.post(`/comunidade/${projeto.id}/comentarios`, { texto: 'Que projeto bacana, parabéns!' })
      await fa.post(`/usuarios/${dona.dados.id}/seguir`)
      await dona.post(`/comunidade/${projeto.id}/curtir`) // a própria dona curtindo: sem notificação
      await dona.post(`/comunidade/${projeto.id}/comentarios`, { texto: 'Obrigada!' })

      const r = (await dona.get('/notificacoes')).json
      assert.equal(r.total, 3)
      assert.equal(r.naoLidas, 3)
      assert.deepEqual(r.itens.map(n => n.tipo).sort(), ['comentario', 'curtida', 'seguidor'])
      const comentario = r.itens.find(n => n.tipo === 'comentario')
      assert.equal(comentario.de.usuario, 'fan')
      assert.equal(comentario.projeto.nome, 'Projeto da Dona')
      assert.equal(comentario.trecho, 'Que projeto bacana, parabéns!')
      assert.equal(r.itens.find(n => n.tipo === 'seguidor').projeto, null)
      assert.equal((await dona.get('/auth/eu')).json.naoLidas, 3)
      assert.deepEqual((await dona.get('/notificacoes/contagem')).json, { naoLidas: 3 })
      assert.equal((await fa.get('/notificacoes')).json.total, 0, 'quem curtiu não recebe nada')
    })

    test('marcar como lidas zera o contador e limpar apaga tudo', async () => {
      assert.equal((await dona.post('/notificacoes/lidas')).status, 204)
      const r = (await dona.get('/notificacoes')).json
      assert.equal(r.naoLidas, 0)
      assert.equal(r.total, 3, 'continuam na lista, só deixam de ser novas')
      await outro.post(`/comunidade/${projeto.id}/curtir`)
      assert.equal((await dona.get('/notificacoes/contagem')).json.naoLidas, 1)
      assert.equal((await dona.del('/notificacoes')).status, 204)
      assert.equal((await dona.get('/notificacoes')).json.total, 0)
    })

    test('notificações de quem foi bloqueado ou suspenso somem; projeto apagado vira texto sem link', async () => {
      const novo = await criarConta(servidor, 'Novinho', { usuario: 'novinho', email: 'novinho@x.com' })
      await novo.post(`/comunidade/${projeto.id}/curtir`)
      assert.equal((await dona.get('/notificacoes')).json.total, 1)
      await dona.post(`/usuarios/${novo.dados.id}/bloquear`)
      assert.equal((await dona.get('/notificacoes')).json.total, 0, 'bloqueado não aparece')
      await dona.del(`/usuarios/${novo.dados.id}/bloquear`)
      assert.equal((await dona.get('/notificacoes')).json.total, 1, 'ao desbloquear volta')

      const efemero = (await dona.post('/projetos', projetoBase({ nome: 'Efêmero' }))).json
      await outro.post(`/comunidade/${efemero.id}/curtir`)
      await dona.del(`/projetos/${efemero.id}`)
      const sem = (await dona.get('/notificacoes')).json.itens.find(n => n.de.usuario === 'outro' && n.projeto === null)
      assert.ok(sem, 'a notificação do projeto apagado continua, sem link')
    })

    test('visitante não acessa notificações', async () => {
      assert.equal((await new Cliente(servidor).get('/notificacoes')).status, 401)
    })
  })

  describe('sugestões da busca', () => {
    test('devolve projetos, pessoas e categorias, e nada com menos de 2 letras', async () => {
      assert.deepEqual((await bia.get('/busca/sugestoes?q=a')).json, { projetos: [], pessoas: [], categorias: [] })
      const r = (await bia.get('/busca/sugestoes?q=hor')).json
      assert.ok(r.projetos.some(p => p.nome === 'Horta da Ana'))
      assert.deepEqual((await bia.get('/busca/sugestoes?q=carl')).json.pessoas.map(p => p.usuario), ['carlos'])
      assert.deepEqual((await bia.get('/busca/sugestoes?q=jardin')).json.categorias, ['Jardinagem'])
    })

    test('não diferencia maiúsculas nem acentos, na lista e nas sugestões', async () => {
      await carlos.post('/projetos', projetoBase({ nome: 'Construção do muro', categoria: 'Construção' }))
      for (const q of ['construcao', 'CONSTRUÇÃO', 'Construcão']) {
        assert.ok((await bia.get(`/busca/sugestoes?q=${encodeURIComponent(q)}`)).json.projetos.some(p => p.nome === 'Construção do muro'), `sugestões com "${q}"`)
        assert.ok((await bia.get(`/comunidade?busca=${encodeURIComponent(q)}&limite=48`)).json.projetos.some(p => p.nome === 'Construção do muro'), `lista com "${q}"`)
      }
      assert.ok((await bia.get('/comunidade?busca=jose')).json.total === 0)
    })

    test('respeita privacidade, ocultação e bloqueio; "meus" olha só a própria conta', async () => {
      const zeca = await criarConta(servidor, 'Zeca', { usuario: 'zeca', email: 'zeca@x.com' })
      await zeca.post('/projetos', projetoBase({ nome: 'Segredo do Zeca', publico: false }))
      const publico = (await zeca.post('/projetos', projetoBase({ nome: 'Vitrine do Zeca' }))).json
      assert.deepEqual((await bia.get('/busca/sugestoes?q=zeca')).json.projetos.map(p => p.nome), ['Vitrine do Zeca'], 'o privado não aparece')
      assert.deepEqual((await zeca.get('/busca/sugestoes?q=zeca&escopo=meus')).json.projetos.map(p => p.nome).sort(), ['Segredo do Zeca', 'Vitrine do Zeca'])
      assert.deepEqual((await zeca.get('/busca/sugestoes?q=zeca&escopo=meus')).json.pessoas, [])

      await admin.post(`/admin/projetos/${publico.id}/ocultar`, { motivo: 'Teste' })
      assert.deepEqual((await bia.get('/busca/sugestoes?q=zeca')).json.projetos, [], 'o oculto some')
      await bia.post(`/usuarios/${zeca.dados.id}/bloquear`)
      assert.deepEqual((await bia.get('/busca/sugestoes?q=zeca')).json.pessoas, [], 'o bloqueado some')
    })
  })
})
