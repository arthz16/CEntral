// Ferramentas dos testes: sobe um servidor de verdade numa pasta temporária (os seus dados em db/
// nunca são tocados), um "navegador" com cookies e um servidor de e-mail falso.
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export function pastaTemporaria() {
  const pasta = mkdtempSync(path.join(os.tmpdir(), 'central-teste-'))
  const original = JSON.parse(readFileSync(path.join(RAIZ, 'db', 'db.json'), 'utf8').replace(/^\uFEFF/, ''))
  writeFileSync(path.join(pasta, 'db.json'), JSON.stringify({ categorias: original.categorias, usuarios: [], contadores: { usuarios: 0, projetos: 0 } }))
  if (existsSync(path.join(RAIZ, 'db', 'vitrine.json'))) cpSync(path.join(RAIZ, 'db', 'vitrine.json'), path.join(pasta, 'vitrine.json'))
  return pasta
}

function portaLivre() {
  return new Promise(resolve => {
    const s = net.createServer().listen(0, () => { const { port } = s.address(); s.close(() => resolve(port)) })
  })
}

// Sobe o servidor. Passe "pasta" para reiniciar com os mesmos dados e "env" para configurar (ex.: e-mail).
export async function iniciarServidor({ pasta = pastaTemporaria(), env = {} } = {}) {
  const porta = await portaLivre()
  const proc = spawn(process.execPath, [path.join(RAIZ, 'server', 'index.js')], {
    env: {
      ...process.env, PORT: String(porta), PASTA_DB: pasta, LIMITES_MULTIPLICADOR: '1000',
      SMTP_HOST: '', SMTP_PORT: '', SMTP_USER: '', SMTP_PASS: '', SMTP_FROM: '', ...env
    },
    stdio: ['ignore', 'pipe', 'pipe']
  })
  let log = ''
  proc.stdout.on('data', d => (log += d))
  proc.stderr.on('data', d => (log += d))
  const limite = Date.now() + 8000
  while (!log.includes('Servidor rodando')) {
    if (proc.exitCode !== null || Date.now() > limite) throw new Error('O servidor de teste não subiu:\n' + log)
    await new Promise(r => setTimeout(r, 50))
  }
  return {
    base: `http://localhost:${porta}`, pasta,
    get log() { return log },
    async parar({ apagar = true } = {}) {
      if (proc.exitCode === null) {
        const saiu = new Promise(r => proc.once('exit', r))
        proc.kill('SIGTERM')
        await saiu
      }
      if (apagar) rmSync(pasta, { recursive: true, force: true })
    }
  }
}

// Um "navegador": guarda o cookie de login como um navegador de verdade guardaria.
export class Cliente {
  constructor(servidor) { this.base = servidor.base; this.cookie = '' }

  async req(metodo, url, corpo, cabecalhos = {}) {
    const resposta = await fetch(this.base + url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...(this.cookie ? { Cookie: this.cookie } : {}), ...cabecalhos },
      body: corpo === undefined ? undefined : JSON.stringify(corpo)
    })
    const setCookie = resposta.headers.getSetCookie().find(c => c.startsWith('cp_sessao='))
    if (setCookie) {
      const valor = setCookie.split(';')[0].split('=')[1]
      this.cookie = valor ? `cp_sessao=${valor}` : ''
    }
    const texto = await resposta.text()
    let json = null
    try { json = JSON.parse(texto) } catch { /* sem corpo */ }
    return { status: resposta.status, json, cabecalhos: resposta.headers, texto, setCookie }
  }

  get = url => this.req('GET', url)
  post = (url, corpo = {}) => this.req('POST', url, corpo)
  put = (url, corpo) => this.req('PUT', url, corpo)
  patch = (url, corpo) => this.req('PATCH', url, corpo)
  del = (url, corpo) => this.req('DELETE', url, corpo)
}

let contador = 0
// Cria uma conta e devolve o cliente já logado
export async function criarConta(servidor, nome, extra = {}) {
  const cliente = new Cliente(servidor)
  const n = ++contador
  const usuario = extra.usuario || `${nome.toLowerCase().replace(/[^a-z]/g, '')}${n}`
  const r = await cliente.post('/auth/registrar', { nome, usuario, email: extra.email || `${usuario}@teste.com`, senha: extra.senha || '123456' })
  if (r.status !== 201) throw new Error('Não consegui criar a conta de teste: ' + r.texto)
  cliente.dados = r.json.usuario
  return cliente
}

export const projetoBase = (extra = {}) => ({ nome: 'Projeto', categoria: 'Construção', responsavel: 'Fulano', itens: [], ...extra })

// Datas no horário de Brasília, como o servidor
const brasilia = deslocamento => {
  const d = new Date(Date.now() + deslocamento * 86_400_000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d)
}
export const dias = { ontem: brasilia(-1), hoje: brasilia(0), amanha: brasilia(1) }

// ---- Servidor de e-mail falso (aceita AUTH LOGIN) ----
export async function iniciarSmtpFalso() {
  const recebidos = []
  const servidor = net.createServer(s => {
    s.on('error', () => {})
    let modo = 'cmd', dados = '', msg = {}, buf = ''
    s.write('220 falso ESMTP\r\n')
    s.on('data', d => {
      buf += d.toString()
      let i
      while ((i = buf.indexOf('\r\n')) >= 0) {
        const linha = buf.slice(0, i); buf = buf.slice(i + 2)
        if (modo === 'dados') {
          if (linha === '.') { modo = 'cmd'; msg.corpo = dados; recebidos.push(msg); msg = {}; dados = ''; s.write('250 ok\r\n') }
          else dados += linha + '\n'
        } else if (modo === 'user') { modo = 'pass'; msg.usuario = Buffer.from(linha, 'base64').toString(); s.write('334 UGFzc3dvcmQ6\r\n') }
        else if (modo === 'pass') { modo = 'cmd'; msg.senha = Buffer.from(linha, 'base64').toString(); s.write('235 ok\r\n') }
        else if (/^EHLO/.test(linha)) s.write('250-falso\r\n250 AUTH LOGIN\r\n')
        else if (/^AUTH LOGIN/.test(linha)) { modo = 'user'; s.write('334 VXNlcm5hbWU6\r\n') }
        else if (/^MAIL FROM/.test(linha)) { msg.de = linha; s.write('250 ok\r\n') }
        else if (/^RCPT TO/.test(linha)) { msg.para = linha; s.write('250 ok\r\n') }
        else if (/^DATA/.test(linha)) { modo = 'dados'; s.write('354 pode mandar\r\n') }
        else if (/^QUIT/.test(linha)) { s.write('221 tchau\r\n'); s.end() }
        else s.write('500 não entendi\r\n')
      }
    })
  })
  await new Promise(r => servidor.listen(0, r))
  return {
    porta: servidor.address().port,
    recebidos,
    fechar: () => new Promise(r => servidor.close(r)),
    // Lê o texto do e-mail (vem em base64) e o assunto
    leitura(mensagem) {
      const [cab, ...resto] = mensagem.corpo.split('\n\n')
      const assunto = Buffer.from((cab.match(/Subject: =\?UTF-8\?B\?(.+?)\?=/) || [])[1] || '', 'base64').toString()
      return { assunto, texto: Buffer.from(resto.join('').replace(/\n/g, ''), 'base64').toString('utf8') }
    }
  }
}

export const esperar = ms => new Promise(r => setTimeout(r, ms))
