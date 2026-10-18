// Testes da Comunidade: só o dono edita, privado some, curtidas, comentários, filtros, paginação e perfil.
import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { Cliente, criarConta, iniciarServidor, projetoBase } from './ajuda.js'

describe('comunidade', () => {
  let servidor, ana, carlos, publico, privado
  before(async () => {
    servidor = await iniciarServidor()
    ana = await criarConta(servidor, 'Ana Souza', { usuario: 'ana_souza' })
    carlos = await criarConta(servidor, 'Carlos Lima', { usuario: 'carlos' })
    publico = (await ana.post('/projetos', projetoBase({ nome: 'Muro público', favorito: true }))).json
    privado = (await ana.post('/projetos', projetoBase({ nome: 'Segredo da Ana', publico: false }))).json
    for (let i = 1; i <= 14; i++) {
      await carlos.post('/projetos', projetoBase({ nome: `Projeto do Carlos ${String(i).padStart(2, '0')}`, categoria: i % 2 ? 'jardinagem' : 'Jardinagem' }))
    }
  })
  after(() => servidor.parar())

  test('só o dono edita ou apaga: os outros recebem 404', async () => {
    assert.equal((await carlos.put(`/projetos/${publico.id}`, projetoBase({ nome: 'hack' }))).status, 404)
    assert.equal((await carlos.patch(`/projetos/${publico.id}`, { nome: 'hack' })).status, 404)
    assert.equal((await carlos.del(`/projetos/${publico.id}`)).status, 404)
    assert.equal((await ana.put(`/projetos/${publico.id}`, projetoBase({ nome: 'Muro público' }))).status, 200)
  })

  test('a lista mostra o público de todo mundo (inclusive o meu), com @ de quem criou e sem o privado', async () => {
    const r = (await carlos.get('/comunidade?limite=48')).json
    assert.equal(r.total, 15)
    assert.ok(!r.projetos.some(p => p.nome === 'Segredo da Ana'))
    const doAna = r.projetos.find(p => p.nome === 'Muro público')
    assert.deepEqual(doAna.autor, { id: doAna.autor.id, nome: 'Ana Souza', usuario: 'ana_souza', papel: 'usuario' })
    assert.equal(doAna.dono, false)
    assert.ok(!('favorito' in doAna) && !('publico' in doAna), 'marcações pessoais do dono não vazam')
    assert.ok(!JSON.stringify(r).includes('@teste.com'), 'nenhum e-mail na resposta')
    const meu = (await ana.get('/comunidade?busca=Muro')).json.projetos[0]
    assert.equal(meu.dono, true)
    assert.equal(meu.favorito, true, 'o dono vê o próprio favorito')
  })

  test('projeto privado: outra pessoa recebe 404 no detalhe, ao curtir e ao comentar; a dona abre normalmente', async () => {
    assert.equal((await carlos.get(`/comunidade/${privado.id}`)).status, 404)
    assert.equal((await carlos.post(`/comunidade/${privado.id}/curtir`)).status, 404)
    assert.equal((await carlos.post(`/comunidade/${privado.id}/comentarios`, { texto: 'oi' })).status, 404)
    const dona = await ana.get(`/comunidade/${privado.id}`)
    assert.equal(dona.status, 200)
    assert.equal(dona.json.publico, false)
    assert.equal(dona.json.dono, true)
  })

  test('tornar público/privado de novo muda a visibilidade na hora', async () => {
    await ana.patch(`/projetos/${privado.id}`, { publico: true })
    assert.equal((await carlos.get(`/comunidade/${privado.id}`)).status, 200)
    await ana.patch(`/projetos/${privado.id}`, { publico: false })
    assert.equal((await carlos.get(`/comunidade/${privado.id}`)).status, 404)
  })

  test('paginação, busca, categoria (sem diferenciar maiúsculas) e ordem', async () => {
    const p1 = (await carlos.get('/comunidade?limite=6')).json
    assert.equal(p1.paginas, 3)
    assert.equal(p1.projetos.length, 6)
    assert.equal((await carlos.get('/comunidade?limite=6&pagina=3')).json.projetos.length, 3)
    assert.equal((await carlos.get('/comunidade?busca=ana_souza')).json.total, 1, 'busca pelo @')
    assert.equal((await carlos.get('/comunidade?busca=CARLOS LIMA&limite=48')).json.total, 14, 'busca pelo nome de quem criou')
    assert.equal((await carlos.get('/comunidade?categoria=jardinagem&limite=48')).json.total, 14)
    assert.deepEqual((await carlos.get('/comunidade')).json.categorias, ['Construção', 'Jardinagem'], 'jardinagem/Jardinagem contam como uma só')
    assert.equal((await carlos.get('/comunidade?meus=1&limite=48')).json.total, 14)
    const nomes = (await carlos.get('/comunidade?ordem=nome&limite=48')).json.projetos.map(p => p.nome)
    assert.deepEqual(nomes, [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR')))
  })

  test('curtir alterna, conta certo e aparece para quem curtiu', async () => {
    assert.deepEqual((await carlos.post(`/comunidade/${publico.id}/curtir`)).json, { curtiu: true, totalCurtidas: 1 })
    await ana.post(`/comunidade/${publico.id}/curtir`)
    const card = (await carlos.get('/comunidade?busca=Muro')).json.projetos[0]
    assert.equal(card.totalCurtidas, 2)
    assert.equal(card.curtiu, true)
    assert.deepEqual((await carlos.post(`/comunidade/${publico.id}/curtir`)).json, { curtiu: false, totalCurtidas: 1 })
    const maisCurtidos = (await carlos.get('/comunidade?ordem=curtidas')).json.projetos[0]
    assert.equal(maisCurtidos.nome, 'Muro público')
  })

  test('comentários: validam o texto, mostram o autor e só quem escreveu ou o dono apaga', async () => {
    assert.equal((await carlos.post(`/comunidade/${publico.id}/comentarios`, { texto: '   ' })).status, 400)
    assert.equal((await carlos.post(`/comunidade/${publico.id}/comentarios`, { texto: 'a'.repeat(501) })).status, 400)
    const c1 = (await carlos.post(`/comunidade/${publico.id}/comentarios`, { texto: '  Muito bom!  ' })).json
    assert.equal(c1.texto, 'Muito bom!')
    assert.equal(c1.autor.usuario, 'carlos')
    const c2 = (await ana.post(`/comunidade/${publico.id}/comentarios`, { texto: 'Obrigada!' })).json

    const detalhe = (await carlos.get(`/comunidade/${publico.id}`)).json
    assert.equal(detalhe.comentarios.length, 2)
    assert.equal(detalhe.comentarios.find(c => c.id === c1.id).podeApagar, true)
    assert.equal(detalhe.comentarios.find(c => c.id === c2.id).podeApagar, false)

    assert.equal((await carlos.del(`/comunidade/${publico.id}/comentarios/${c2.id}`)).status, 403)
    assert.equal((await ana.del(`/comunidade/${publico.id}/comentarios/${c1.id}`)).status, 204, 'a dona do projeto apaga o de outra pessoa')
    assert.equal((await ana.del(`/comunidade/${publico.id}/comentarios/${c2.id}`)).status, 204)
    assert.equal((await carlos.get(`/comunidade/${publico.id}`)).json.comentarios.length, 0)
  })

  test('perfil público: nome, @, totais e só projetos públicos; sem e-mail', async () => {
    const r = (await carlos.get('/perfil/ANA_SOUZA')).json
    assert.equal(r.perfil.nome, 'Ana Souza')
    assert.equal(r.souEu, false)
    assert.equal(r.totalProjetos, 1, 'o privado não conta')
    assert.ok(!('email' in r.perfil))
    assert.equal((await ana.get('/perfil/ana_souza')).json.souEu, true)
    assert.equal((await carlos.get('/perfil/ninguem')).status, 404)
    assert.equal((await carlos.get('/perfil/carlos?limite=6')).json.paginas, 3)
  })

  test('visitante sem login não vê a comunidade nem perfis', async () => {
    const anonimo = new Cliente(servidor)
    assert.equal((await anonimo.get('/comunidade')).status, 401)
    assert.equal((await anonimo.get('/perfil/carlos')).status, 401)
  })

  test('ao excluir a conta, somem as curtidas e os comentários dela', async () => {
    const dani = await criarConta(servidor, 'Dani', { usuario: 'dani' })
    await dani.post(`/comunidade/${publico.id}/curtir`)
    await dani.post(`/comunidade/${publico.id}/comentarios`, { texto: 'Passei por aqui' })
    const antes = (await carlos.get(`/comunidade/${publico.id}`)).json
    assert.equal(antes.comentarios.length, 1)
    assert.equal((await dani.del('/auth/conta', { senha: '123456' })).status, 204)
    const depois = (await carlos.get(`/comunidade/${publico.id}`)).json
    assert.equal(depois.comentarios.length, 0)
    assert.equal(depois.totalCurtidas, antes.totalCurtidas - 1)
  })
})
