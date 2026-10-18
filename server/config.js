// Configurações do servidor: pastas, limites e variáveis do arquivo .env.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, readFileSync } from 'node:fs'

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Lê o arquivo .env da raiz do projeto (se existir), sem instalar nada. Serve para configurar o e-mail.
// Variáveis que já existem no ambiente (mesmo vazias) têm prioridade sobre o arquivo.
const ARQ_ENV = path.join(RAIZ, '.env')
if (existsSync(ARQ_ENV)) {
  for (const linha of readFileSync(ARQ_ENV, 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2')
  }
}

// PASTA_DB deixa trocar a pasta dos dados (os testes usam uma cópia temporária)
export const PASTA_DB = process.env.PASTA_DB ? path.resolve(process.env.PASTA_DB) : path.join(RAIZ, 'db')
export const ARQ_DB = path.join(PASTA_DB, 'db.json')
export const ARQ_VITRINE = path.join(PASTA_DB, 'vitrine.json')
export const ARQ_SEGREDO = path.join(PASTA_DB, '.segredo')
export const ARQ_LIMITES = path.join(PASTA_DB, 'limites.json')

export const PORTA = Number(process.env.PORT) || 3000
export const VALIDADE_TOKEN_MS = 7 * 24 * 60 * 60 * 1000 // 7 dias
export const VALIDADE_RESET_MS = 15 * 60 * 1000 // 15 minutos
export const STATUS = ['Planejamento', 'Em andamento', 'Concluído']
export const PRIORIDADES = ['Alta', 'Média', 'Baixa']

// Cookie de login. Em site com HTTPS use COOKIE_SEGURO=1; se o site e o servidor ficarem em
// domínios diferentes, use também COOKIE_ENTRE_SITES=1.
export const NOME_COOKIE = 'cp_sessao'
export const COOKIE_ENTRE_SITES = process.env.COOKIE_ENTRE_SITES === '1'
export const COOKIE_SEGURO = process.env.COOKIE_SEGURO === '1' || COOKIE_ENTRE_SITES

// Administrador: o servidor cria (ou promove) esta conta ao ligar. Veja o .env.example.
export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
export const ADMIN_SENHA = process.env.ADMIN_SENHA || ''
export const ADMIN_USUARIO = (process.env.ADMIN_USUARIO || 'admin').trim().toLowerCase()

// Além do site local (localhost e 127.0.0.1), aceita estes endereços (separados por vírgula)
export const ORIGENS_EXTRAS = (process.env.ORIGENS_PERMITIDAS || '').split(',').map(s => s.trim()).filter(Boolean)
