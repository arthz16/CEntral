// Segurança: senha (hash), login por cookie httpOnly e sessões que podem ser encerradas.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { promisify } from 'node:util'
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { ARQ_SEGREDO, COOKIE_ENTRE_SITES, COOKIE_SEGURO, NOME_COOKIE, VALIDADE_TOKEN_MS } from './config.js'
import { db, salvar } from './banco.js'
import { ErroHttp } from './erro.js'

const scrypt = promisify(scryptCb)

function carregarSegredo() {
  if (process.env.SEGREDO_TOKEN) return process.env.SEGREDO_TOKEN
  if (existsSync(ARQ_SEGREDO)) return readFileSync(ARQ_SEGREDO, 'utf8').trim()
  const novo = randomBytes(32).toString('hex')
  writeFileSync(ARQ_SEGREDO, novo, { mode: 0o600 })
  return novo
}
export const SEGREDO = carregarSegredo()

// A senha nunca é guardada: só o "hash" (scrypt + sal aleatório).
export async function gerarHash(senha) {
  const sal = randomBytes(16)
  const hash = await scrypt(senha, sal, 64)
  return `${sal.toString('hex')}:${hash.toString('hex')}`
}
export async function conferirSenha(senha, guardado) {
  const [sal, hash] = guardado.split(':')
  const esperado = Buffer.from(hash, 'hex')
  const calculado = await scrypt(senha, Buffer.from(sal, 'hex'), esperado.length)
  return timingSafeEqual(calculado, esperado)
}
export const HASH_FALSO = await gerarHash('senha-falsa') // gasta o mesmo tempo quando o e-mail não existe

const assinar = corpo => createHmac('sha256', SEGREDO).update(corpo).digest()

function emitirToken(dados) {
  const corpo = Buffer.from(JSON.stringify(dados)).toString('base64url')
  return `${corpo}.${assinar(corpo).toString('base64url')}`
}
function lerToken(token) {
  const [corpo, assinatura] = String(token).split('.')
  if (!corpo || !assinatura) return null
  const recebida = Buffer.from(assinatura, 'base64url')
  const esperada = assinar(corpo)
  if (recebida.length !== esperada.length || !timingSafeEqual(recebida, esperada)) return null
  try {
    const dados = JSON.parse(Buffer.from(corpo, 'base64url').toString())
    return dados.exp > Date.now() ? dados : null
  } catch {
    return null
  }
}

/* ---------- Cookie de sessão ----------
   O token fica num cookie "httpOnly": o JavaScript da página não consegue ler (nem roubar com um
   script malicioso). SameSite=Lax + conferência da origem protegem contra pedidos de outros sites. */
function textoDoCookie(valor, segundos) {
  const partes = [`${NOME_COOKIE}=${valor}`, 'Path=/', 'HttpOnly', `SameSite=${COOKIE_ENTRE_SITES ? 'None' : 'Lax'}`, `Max-Age=${segundos}`]
  if (COOKIE_SEGURO) partes.push('Secure')
  return partes.join('; ')
}
function lerCookie(req, nome) {
  for (const parte of String(req.headers.cookie || '').split(';')) {
    const i = parte.indexOf('=')
    if (i > 0 && parte.slice(0, i).trim() === nome) return decodeURIComponent(parte.slice(i + 1).trim())
  }
  return null
}

// Cria uma sessão nova (um "login") e manda o cookie. Cada login tem um id (jti) guardado na conta;
// por isso dá para encerrar um login só, ou todos, sem esperar o token vencer.
export function iniciarSessao(res, usuario) {
  const agora = Date.now()
  const jti = randomBytes(12).toString('hex')
  usuario.sessoes = (usuario.sessoes || []).filter(s => s.exp > agora).slice(-9) // até 10 aparelhos por conta
  usuario.sessoes.push({ jti, exp: agora + VALIDADE_TOKEN_MS })
  salvar()
  res.setHeader('Set-Cookie', textoDoCookie(emitirToken({ sub: usuario.id, jti, iat: agora, exp: agora + VALIDADE_TOKEN_MS }), VALIDADE_TOKEN_MS / 1000))
  return jti
}

export function encerrarSessao(res, usuario, jti) {
  usuario.sessoes = (usuario.sessoes || []).filter(s => s.jti !== jti)
  salvar()
  res.setHeader('Set-Cookie', textoDoCookie('', 0))
}

// Encerra todos os logins da conta (menos o que está em "manter", se for passado)
export function encerrarOutrasSessoes(usuario, manter = null) {
  usuario.sessoes = (usuario.sessoes || []).filter(s => s.jti === manter)
  salvar()
}

// Descobre quem está logado pelo cookie. Devolve { usuario, jti }.
export function autenticar(req) {
  const dados = lerToken(lerCookie(req, NOME_COOKIE) || '')
  const usuario = dados && db.usuarios.find(u => u.id === dados.sub)
  if (!usuario || !usuario.sessoes.some(s => s.jti === dados.jti)) {
    throw new ErroHttp(401, 'Sessão expirada. Faça login novamente.')
  }
  return { usuario, jti: dados.jti }
}
