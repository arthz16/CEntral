// Testes das categorias: o admin renomeia, junta e adiciona à lista as categorias digitadas em "Outros".
import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { Cliente, criarConta, iniciarServidor, projetoBase } from './ajuda.js'

describe('gerenciar categorias', () => {
  let servidor, admin, ana, bia
  before(async () => {
    servidor = await iniciarServidor({ env: { ADMIN_EMAIL: 'admin@central.com', ADMIN_SENHA: 'senha-do-admin' } })
    admin = new Cliente(servidor)
    await admin.post('/auth/login', { email: 'admin@central.com', senha: 'senha-do-admin' })
    ana = await criarConta(servidor, 'Ana', { usuario: 'ana', email: 'ana@x.com' })
    bia = await criarConta(servidor, 'Bia', { usuario: 'bia', email: 'bia@x.com' })
    await ana.post('/projetos', projetoBase({ nome: 'A1', categoria: 'horta' }))
    await ana.post('/projetos', projetoBase({ nome: 'A2', categoria: 'Hortas' }))
    await bia.post('/projetos', projetoBase({ nome: 'B1', categoria: 'HORTA' }))
    await bia.post('/projetos', projetoBase({ nome: 'B2', categoria: 'Construção' }))
  })
  after(() => servidor.parar())

  test('só a administração enxerga e mexe nas categorias', async () => {
    assert.equal((await ana.get('/admin/categorias')).status, 403)
    assert.equal((await ana.post('/admin/categorias/renomear', { de: 'Horta', para: 'Jardim' })).status, 403)
    assert.equal((await ana.post('/admin/categorias/adicionar', { nome: 'Horta' })).status, 403)
  })

  test('lista as oficiais e as digitadas, com quantos projetos e pessoas usam (sem repetir por maiúscula)', async () => {
    const lista = (await admin.get('/admin/categorias')).json
    const horta = lista.find(c => c.nome.toLowerCase() === 'horta')
    assert.equal(horta.projetos, 2, '"horta" e "HORTA" contam como uma só')
    assert.equal(horta.pessoas, 2)
    assert.equal(horta.naLista, false)
    assert.equal(lista.find(c => c.nome === 'Hortas').projetos, 1)
    const construcao = lista.find(c => c.nome === 'Construção')
    assert.equal(construcao.oficial, true)
    assert.equal(construcao.naLista, true)
    assert.equal(construcao.projetos, 1)
  })

  test('juntar: "Hortas" vira "Horta" em todos os projetos e some da lista', async () => {
    const r = await admin.post('/admin/categorias/renomear', { de: 'Hortas', para: 'horta' })
    assert.equal(r.status, 200)
    assert.equal(r.json.alterados, 1)
    const lista = (await admin.get('/admin/categorias')).json
    assert.ok(!lista.some(c => c.nome === 'Hortas'))
    assert.equal(lista.find(c => c.nome.toLowerCase() === 'horta').projetos, 3)
    assert.deepEqual((await ana.get('/comunidade?categoria=horta&limite=48')).json.projetos.map(p => p.categoria).sort(), ['Horta', 'Horta', 'Horta'])
  })

  test('juntar numa categoria oficial usa a grafia oficial; as oficiais não podem ser renomeadas', async () => {
    await ana.post('/projetos', projetoBase({ nome: 'A3', categoria: 'obras em casa' }))
    assert.equal((await admin.post('/admin/categorias/renomear', { de: 'obras em casa', para: 'construção' })).json.nome, 'Construção')
    assert.equal((await admin.post('/admin/categorias/renomear', { de: 'Construção', para: 'Obras' })).status, 403)
    assert.equal((await admin.post('/admin/categorias/renomear', { de: 'Inexistente', para: 'Outra' })).status, 404)
    assert.equal((await admin.post('/admin/categorias/renomear', { de: 'Horta', para: '   ' })).status, 400)
  })

  test('adicionar à lista: a categoria passa a aparecer no formulário (GET /categorias) e pode ser renomeada junto', async () => {
    const antes = (await new Cliente(servidor).get('/categorias')).json
    assert.ok(!antes.some(c => c.nome === 'Horta'))
    assert.equal((await admin.post('/admin/categorias/adicionar', { nome: 'Sem uso' })).status, 404)
    assert.equal((await admin.post('/admin/categorias/adicionar', { nome: 'Horta' })).status, 200)
    assert.equal((await admin.post('/admin/categorias/adicionar', { nome: 'horta' })).status, 400, 'já está na lista')
    const depois = (await new Cliente(servidor).get('/categorias')).json
    assert.ok(depois.some(c => c.nome === 'Horta' && c.subcategorias.length === 0))
    const item = (await admin.get('/admin/categorias')).json.find(c => c.nome === 'Horta')
    assert.deepEqual([item.naLista, item.oficial], [true, false])

    assert.equal((await admin.post('/admin/categorias/renomear', { de: 'Horta', para: 'Jardim e horta' })).status, 200)
    assert.ok((await new Cliente(servidor).get('/categorias')).json.some(c => c.nome === 'Jardim e horta'), 'a lista acompanha o novo nome')
    assert.ok(!(await new Cliente(servidor).get('/categorias')).json.some(c => c.nome === 'Horta'))
  })

  test('as mudanças ficam no registro de ações', async () => {
    const acoes = (await admin.get('/admin/registro?limite=50')).json.itens.map(x => x.acao)
    assert.ok(acoes.includes('renomeou/juntou a categoria') && acoes.includes('adicionou a categoria à lista'))
  })
})
