// Parte "web" do servidor: rotas, leitura do corpo, respostas, CORS e a conferência de origem.
import http from 'node:http'
import { createHash } from 'node:crypto'
import { ORIGENS_EXTRAS, PORTA } from './config.js'
import { ErroHttp } from './erro.js'
import { autenticar } from './seguranca.js'
import { ehAdmin } from './visibilidade.js'

export { ErroHttp }

const rotas = []
// "privada" = só quem está logado ('admin' = só quem é administrador). Parâmetros do endereço: id = 1º (:id), sub = 2º (ex.: /comunidade/:id/comentarios/:cid)
export function rota(metodo, padrao, handler, privada = false) {
  rotas.push({ metodo, regex: new RegExp(`^${padrao.replace(/:\w+/g, '([^/]+)')}$`), handler, privada })
}

export function enviar(res, status, dados) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(dados === undefined ? undefined : JSON.stringify(dados))
}
export function semConteudo(res) {
  res.writeHead(204)
  res.end()
}

// Respostas que não mudam (categorias e projetos prontos): o navegador guarda
// uma cópia e só baixa de novo se o conteúdo mudar.
export function prepararEstatico(dados) {
  const corpo = JSON.stringify(dados)
  return { corpo, etag: `"${createHash('sha1').update(corpo).digest('base64url')}"` }
}
export function enviarEstatico(req, res, { corpo, etag }) {
  const cabecalhos = { ETag: etag, 'Cache-Control': 'public, max-age=300' }
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, cabecalhos)
    return res.end()
  }
  res.writeHead(200, { ...cabecalhos, 'Content-Type': 'application/json; charset=utf-8' })
  res.end(corpo)
}

function lerCorpo(req, limite = 100_000) {
  return new Promise((resolve, reject) => {
    const partes = []
    let tamanho = 0
    req.on('data', parte => {
      tamanho += parte.length
      if (tamanho <= limite) partes.push(parte)
    })
    req.on('error', reject)
    req.on('end', () => {
      if (tamanho > limite) return reject(new ErroHttp(413, 'Dados grandes demais.'))
      try {
        const corpo = partes.length ? JSON.parse(Buffer.concat(partes).toString()) : {}
        if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) throw new Error()
        resolve(corpo)
      } catch {
        reject(new ErroHttp(400, 'Dados inválidos.'))
      }
    })
  })
}

export const ip = req => req.socket.remoteAddress || 'local'

// Só aceita pedidos vindos do site rodando na sua própria máquina (ou de ORIGENS_PERMITIDAS no .env)
const ORIGEM_LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/
const origemPermitida = origem => ORIGEM_LOCAL.test(origem) || ORIGENS_EXTRAS.includes(origem)

function liberarCors(req, res) {
  const origem = req.headers.origin
  if (!origem || !origemPermitida(origem)) return
  res.setHeader('Access-Control-Allow-Origin', origem)
  res.setHeader('Access-Control-Allow-Credentials', 'true') // necessário para o cookie de login
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Max-Age', '86400')
}

async function atender(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  liberarCors(req, res)
  if (req.method === 'OPTIONS') return semConteudo(res)

  try {
    // Como o login vai em cookie, um site qualquer poderia tentar "disparar" ações em nome da pessoa.
    // Pedidos que alteram dados e vêm de uma origem desconhecida são recusados.
    const alteraDados = !['GET', 'HEAD'].includes(req.method)
    if (alteraDados && req.headers.origin && !origemPermitida(req.headers.origin)) {
      throw new ErroHttp(403, 'Origem não permitida.')
    }

    const url = new URL(req.url, 'http://localhost')
    for (const r of rotas) {
      if (r.metodo !== req.method) continue
      const achou = r.regex.exec(url.pathname)
      if (!achou) continue
      const sessao = r.privada ? autenticar(req) : {}
      if (r.privada === 'admin' && !ehAdmin(sessao.usuario)) throw new ErroHttp(403, 'Só a administração pode fazer isso.')
      return await r.handler({
        req, res, id: achou[1], sub: achou[2], consulta: url.searchParams,
        usuario: sessao.usuario ?? null, jti: sessao.jti ?? null, ler: () => lerCorpo(req)
      })
    }
    throw new ErroHttp(404, 'Rota não encontrada.')
  } catch (erro) {
    if (erro instanceof ErroHttp) return enviar(res, erro.status, { erro: erro.message })
    console.error(erro)
    enviar(res, 500, { erro: 'Erro interno do servidor.' })
  }
}

export function criarServidor() {
  const servidor = http.createServer(atender)
  servidor.on('error', erro => {
    if (erro.code === 'EADDRINUSE') {
      console.error(`A porta ${PORTA} já está em uso. Feche o servidor antigo e rode de novo.`)
      process.exit(1)
    }
    throw erro
  })
  return servidor
}
