// Testes dos projetos de cada conta: regras de data, categoria "Outros", filtros e paginação.
import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { criarConta, dias, iniciarServidor, projetoBase } from './ajuda.js'

describe('criar e editar projetos', () => {
  let servidor, ana
  before(async () => { servidor = await iniciarServidor(); ana = await criarConta(servidor, 'Ana') })
  after(() => servidor.parar())

  test('novo projeto nasce público, com data de criação definida pelo servidor', async () => {
    const r = await ana.post('/projetos', projetoBase({ nome: 'Muro', dataCriacao: '2001-01-01', progresso: 80 }))
    assert.equal(r.status, 201)
    assert.equal(r.json.publico, true)
    assert.equal(r.json.dataCriacao, dias.hoje, 'a data enviada pelo cliente é ignorada')
    assert.ok(!('progresso' in r.json), 'a barra de progresso não existe mais')
    assert.equal(r.json.totalCurtidas, 0)
    assert.ok(!('curtidas' in r.json) && !('comentarios' in r.json), 'o dono recebe só os totais')
  })

  test('a data de criação não muda em nenhuma edição', async () => {
    const { json: p } = await ana.post('/projetos', projetoBase())
    const put = await ana.put(`/projetos/${p.id}`, projetoBase({ nome: 'Novo nome', dataCriacao: '1999-09-09' }))
    assert.equal(put.json.dataCriacao, dias.hoje)
    const patch = await ana.patch(`/projetos/${p.id}`, { dataCriacao: '1999-09-09' })
    assert.equal(patch.json.dataCriacao, dias.hoje)
  })

  test('prazo precisa ser de amanhã em diante (nem hoje, nem passado)', async () => {
    assert.equal((await ana.post('/projetos', projetoBase({ prazo: dias.ontem }))).status, 400)
    assert.equal((await ana.post('/projetos', projetoBase({ prazo: dias.hoje }))).status, 400)
    assert.equal((await ana.post('/projetos', projetoBase({ prazo: dias.amanha }))).status, 201)
    assert.equal((await ana.post('/projetos', projetoBase({ prazo: '2026-02-31' }))).status, 400, 'data que não existe')
  })

  test('prazo que venceu depois de salvo continua aceito se a pessoa não mexer nele', async () => {
    const { json: p } = await ana.post('/projetos', projetoBase({ prazo: dias.amanha }))
    // O tempo passa: reescrevemos o arquivo com o prazo de ontem e reiniciamos o servidor
    await servidor.parar({ apagar: false })
    const arquivo = `${servidor.pasta}/db.json`
    const banco = JSON.parse(readFileSync(arquivo, 'utf8'))
    banco.usuarios[0].projetos.find(x => x.id === p.id).prazo = dias.ontem
    writeFileSync(arquivo, JSON.stringify(banco))
    servidor = await iniciarServidor({ pasta: servidor.pasta })
    ana.base = servidor.base // o login continua valendo: as sessões e o segredo ficam em disco

    assert.equal((await ana.put(`/projetos/${p.id}`, projetoBase({ nome: 'Só mudei o nome', prazo: dias.ontem }))).status, 200)
    assert.equal((await ana.put(`/projetos/${p.id}`, projetoBase({ prazo: '2000-01-01' }))).status, 400, 'trocar por outra data passada não pode')
    assert.equal((await ana.put(`/projetos/${p.id}`, projetoBase({ prazo: dias.amanha }))).status, 200)
  })

  test('categoria "Outros": aceita texto digitado e arruma a grafia', async () => {
    const a = await ana.post('/projetos', projetoBase({ categoria: '  jardinagem   urbana ' }))
    assert.equal(a.json.categoria, 'Jardinagem urbana')
    const conhecida = await ana.post('/projetos', projetoBase({ categoria: 'construção' }))
    assert.equal(conhecida.json.categoria, 'Construção', 'usa a grafia da lista quando já existe')
    assert.equal((await ana.post('/projetos', projetoBase({ categoria: '   ' }))).status, 400)
    assert.equal((await ana.post('/projetos', projetoBase({ categoria: 'x'.repeat(41) }))).status, 400)
  })

  test('campos inválidos são recusados', async () => {
    assert.equal((await ana.post('/projetos', projetoBase({ nome: '' }))).status, 400)
    assert.equal((await ana.post('/projetos', projetoBase({ status: 'Qualquer' }))).status, 400)
    assert.equal((await ana.post('/projetos', projetoBase({ prioridade: 'Urgente' }))).status, 400)
    assert.equal((await ana.post('/projetos', projetoBase({ itens: [{ nome: 'x', quantidade: -1 }] }))).status, 400)
  })
})

describe('lista de Meus Projetos: filtros, ordem e paginação', () => {
  let servidor, ana, bia
  before(async () => {
    servidor = await iniciarServidor()
    ana = await criarConta(servidor, 'Ana')
    bia = await criarConta(servidor, 'Bia')
    for (let i = 1; i <= 15; i++) {
      await ana.post('/projetos', projetoBase({
        nome: `Projeto ${String(i).padStart(2, '0')}`,
        categoria: i % 3 === 0 ? 'Sites' : 'Construção',
        status: i % 2 ? 'Planejamento' : 'Em andamento',
        prioridade: i === 15 ? 'Alta' : 'Média',
        favorito: i === 4,
        publico: i !== 7,
        itens: [{ nome: 'Tijolo', quantidade: 10, valorUnitario: 2.5, comprado: true }, { nome: 'Cimento', quantidade: 2, valorUnitario: 30, comprado: false }]
      }))
    }
    await bia.post('/projetos', projetoBase({ nome: 'Projeto da Bia' }))
  })
  after(() => servidor.parar())

  test('pagina de 12 em 12 e mostra só os projetos da própria conta', async () => {
    const p1 = (await ana.get('/projetos')).json
    assert.equal(p1.total, 15)
    assert.equal(p1.paginas, 2)
    assert.equal(p1.projetos.length, 12)
    const p2 = (await ana.get('/projetos?pagina=2')).json
    assert.equal(p2.projetos.length, 3)
    assert.equal((await ana.get('/projetos?pagina=99')).json.pagina, 2, 'página que não existe vira a última')
    assert.equal((await bia.get('/projetos')).json.total, 1)
  })

  test('ordem padrão: favoritos primeiro, depois prioridade alta', async () => {
    const { projetos } = (await ana.get('/projetos')).json
    assert.equal(projetos[0].nome, 'Projeto 04', 'o favorito vem primeiro')
    assert.equal(projetos[1].nome, 'Projeto 15', 'depois a prioridade Alta')
  })

  test('filtros: busca, categoria sem diferenciar maiúsculas, status e favoritos', async () => {
    assert.equal((await ana.get('/projetos?busca=projeto 07')).json.total, 1)
    assert.equal((await ana.get('/projetos?categoria=SITES')).json.total, 5)
    assert.equal((await ana.get('/projetos?status=Em andamento')).json.total, 7)
    assert.equal((await ana.get('/projetos?favoritos=1')).json.total, 1)
    assert.equal((await ana.get('/projetos?prioridade=Alta')).json.total, 1)
  })

  test('traz as categorias para o filtro, o total geral e os valores de cada projeto', async () => {
    const r = (await ana.get('/projetos?status=Planejamento')).json
    assert.deepEqual(r.categorias, ['Construção', 'Sites'])
    assert.equal(r.totalGeral, 15)
    const card = r.projetos[0]
    assert.equal(card.previsto, 85)
    assert.equal(card.comprado, 25)
    assert.deepEqual(card.itensNomes, ['Tijolo', 'Cimento'])
    assert.equal(card.dono, true)
    assert.ok('favorito' in card && 'publico' in card)
  })

  test('privado aparece em Meus Projetos com publico=false', async () => {
    const { projetos } = (await ana.get('/projetos?busca=Projeto 07')).json
    assert.equal(projetos[0].publico, false)
  })

  test('ordem por nome e todos=1 (exportar) devolvem tudo o que passou nos filtros', async () => {
    const nomes = (await ana.get('/projetos?ordem=nome&limite=48')).json.projetos.map(p => p.nome)
    assert.deepEqual(nomes, [...nomes].sort())
    const todos = (await ana.get('/projetos?todos=1&categoria=Sites')).json
    assert.equal(todos.projetos.length, 5)
    assert.ok(Array.isArray(todos.projetos[0].itens), 'a exportação traz os itens completos')
  })

  test('um projeto de outra conta não pode ser visto, editado nem apagado por /projetos', async () => {
    const id = (await ana.get('/projetos?busca=Projeto 01')).json.projetos[0].id
    assert.equal((await bia.get(`/projetos/${id}`)).status, 404)
    assert.equal((await bia.put(`/projetos/${id}`, projetoBase({ nome: 'hack' }))).status, 404)
    assert.equal((await bia.patch(`/projetos/${id}`, { nome: 'hack' })).status, 404)
    assert.equal((await bia.del(`/projetos/${id}`)).status, 404)
    assert.equal((await ana.get(`/projetos/${id}`)).json.nome, 'Projeto 01')
  })
})
