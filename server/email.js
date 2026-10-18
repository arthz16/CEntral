// E-mail de recuperação de senha. Fala SMTP direto, sem instalar nada.
// Configure no arquivo .env (veja .env.example). Sem configuração, o código aparece só no
// terminal do servidor (nunca na tela do site).
import net from 'node:net'
import tls from 'node:tls'
import { createHmac, randomInt } from 'node:crypto'
import { VALIDADE_RESET_MS } from './config.js'
import { SEGREDO } from './seguranca.js'

const SMTP = {
  host: process.env.SMTP_HOST || '',
  port: Number(process.env.SMTP_PORT) || 465,
  usuario: process.env.SMTP_USER || '',
  senha: process.env.SMTP_PASS || '',
  de: process.env.SMTP_FROM || process.env.SMTP_USER || ''
}
export const emailAtivo = !!(SMTP.host && SMTP.de)

export async function enviarEmail(para, assunto, texto) {
  if (/[<>\r\n]/.test(para)) throw new Error('Endereço de e-mail inválido.')
  const local = ['localhost', '127.0.0.1', '::1'].includes(SMTP.host)
  const direto = SMTP.port === 465 // 465 já abre criptografado; as outras portas usam STARTTLS
  let socket = direto
    ? tls.connect({ host: SMTP.host, port: SMTP.port, servername: SMTP.host })
    : net.connect({ host: SMTP.host, port: SMTP.port })
  let buffer = ''
  let esperando = null
  let falha = null

  const checar = () => {
    if (!esperando) return
    const linhas = buffer.split('\r\n')
    const completas = linhas.slice(0, -1)
    const ultima = completas[completas.length - 1]
    if (!ultima || !/^\d{3}( |$)/.test(ultima)) return // resposta de várias linhas ainda não terminou
    buffer = linhas[linhas.length - 1]
    const pedido = esperando
    esperando = null
    pedido.resolve({ codigo: Number(ultima.slice(0, 3)), linhas: completas })
  }
  const aoFalhar = erro => {
    falha ??= erro
    if (esperando) { esperando.reject(falha); esperando = null }
  }
  const ligar = s => {
    s.on('data', d => { buffer += d.toString('utf8'); checar() })
    s.on('error', aoFalhar)
    s.on('close', () => aoFalhar(new Error('A conexão com o servidor de e-mail foi fechada.')))
  }
  const ler = () => new Promise((resolve, reject) => {
    if (falha) return reject(falha)
    esperando = { resolve, reject }
    checar()
  })
  const exigir = (r, aceitos) => {
    if (!aceitos.includes(r.codigo)) throw new Error(`O servidor de e-mail recusou: ${r.linhas[r.linhas.length - 1]}`)
    return r
  }
  const comando = async (linha, aceitos) => {
    socket.write(linha + '\r\n')
    return exigir(await ler(), aceitos)
  }

  ligar(socket)
  const limite = setTimeout(() => aoFalhar(new Error('O servidor de e-mail demorou demais para responder.')), 20_000)
  try {
    exigir(await ler(), [220])
    let r = await comando('EHLO central-projetos', [250])
    if (!direto) {
      if (r.linhas.some(l => /STARTTLS/i.test(l))) {
        await comando('STARTTLS', [220])
        socket.removeAllListeners('data')
        socket.removeAllListeners('close')
        socket = tls.connect({ socket, servername: SMTP.host })
        ligar(socket)
        r = await comando('EHLO central-projetos', [250])
      } else if (!local) {
        throw new Error('O servidor de e-mail não oferece conexão criptografada (STARTTLS).')
      }
    }
    if (SMTP.usuario && SMTP.senha) {
      await comando('AUTH LOGIN', [334])
      await comando(Buffer.from(SMTP.usuario).toString('base64'), [334])
      await comando(Buffer.from(SMTP.senha).toString('base64'), [235])
    }
    const remetente = (SMTP.de.match(/<([^>]+)>/) || [null, SMTP.de])[1].trim()
    await comando(`MAIL FROM:<${remetente}>`, [250])
    await comando(`RCPT TO:<${para}>`, [250, 251])
    await comando('DATA', [354])
    const cabecalho = [
      `From: ${SMTP.de}`,
      `To: <${para}>`,
      `Subject: =?UTF-8?B?${Buffer.from(assunto).toString('base64')}?=`,
      `Date: ${new Date().toUTCString()}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: base64'
    ].join('\r\n')
    const corpo = Buffer.from(texto).toString('base64').match(/.{1,76}/g).join('\r\n')
    socket.write(`${cabecalho}\r\n\r\n${corpo}\r\n.\r\n`)
    exigir(await ler(), [250])
    socket.write('QUIT\r\n')
    await ler().catch(() => {}) // a mensagem já foi aceita; só espera o "tchau" do servidor
  } finally {
    clearTimeout(limite)
    socket.destroy()
  }
}

// Códigos de recuperação: 6 dígitos, valem 15 minutos, uso único, no máximo 5 tentativas.
// No arquivo só fica o "hash" do código (como a senha).
export const gerarCodigo = () => String(randomInt(0, 1_000_000)).padStart(6, '0')
export const hashCodigo = (usuario, codigo) => createHmac('sha256', SEGREDO).update(`reset|${usuario.id}|${codigo}`).digest('hex')

export function mandarCodigo(usuario, codigo) {
  if (!emailAtivo) {
    console.log(`[e-mail não configurado] Código de recuperação de ${usuario.email}: ${codigo} (vale 15 minutos)`)
    return
  }
  const minutos = VALIDADE_RESET_MS / 60_000
  enviarEmail(
    usuario.email,
    'Código para redefinir sua senha - Central Projetos',
    `Olá, ${usuario.nome}!\n\nSeu código para redefinir a senha é: ${codigo}\n\nEle vale por ${minutos} minutos e só pode ser usado uma vez.\nSe não foi você que pediu, ignore este e-mail: sua senha continua a mesma.\n\nCentral Projetos`
  ).catch(erro => console.error(`[e-mail] Não consegui enviar o código para ${usuario.email}: ${erro.message}`))
}
