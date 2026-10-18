// Dados que qualquer visitante pode ver: categorias e projetos prontos (exemplos).
import { db, vitrine } from '../banco.js'
import { ErroHttp, enviar, enviarEstatico, prepararEstatico, rota } from '../http.js'

const estatico = { vitrine: prepararEstatico(vitrine) }

// A lista de categorias pode ganhar itens (o admin adiciona as que as pessoas digitam em "Outros"): sempre atual
rota('GET', '/categorias', ({ req, res }) => enviarEstatico(req, res, prepararEstatico(db.categorias)))
rota('GET', '/vitrine', ({ req, res }) => enviarEstatico(req, res, estatico.vitrine))
rota('GET', '/vitrine/:id', ({ res, id }) => {
  const projeto = vitrine.find(p => String(p.id) === id)
  if (!projeto) throw new ErroHttp(404, 'Projeto não encontrado.')
  enviar(res, 200, projeto)
})
