// Limita tentativas (login, cadastro, comentários...) por chave. Os contadores ficam salvos em
// db/limites.json, então reiniciar o servidor NÃO zera o limite (antes dava para burlar assim).
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { ARQ_LIMITES } from './config.js'
import { ErroHttp } from './erro.js'

// Só os testes mexem nisto (para criar muitas contas sem bater no limite): LIMITES_MULTIPLICADOR=1000
const MULTIPLICADOR = Number(process.env.LIMITES_MULTIPLICADOR) || 1

const tentativas = new Map()
try {
  if (existsSync(ARQ_LIMITES)) {
    const agora = Date.now()
    for (const [chave, r] of Object.entries(JSON.parse(readFileSync(ARQ_LIMITES, 'utf8')))) {
      if (r && r.fim > agora) tentativas.set(chave, r)
    }
  }
} catch { /* arquivo estragado: começa do zero */ }

let temporizador = null
function persistir() {
  clearTimeout(temporizador)
  temporizador = setTimeout(gravarLimites, 1000)
  temporizador.unref()
}
export function gravarLimites() {
  clearTimeout(temporizador)
  temporizador = null
  try {
    writeFileSync(ARQ_LIMITES + '.tmp', JSON.stringify(Object.fromEntries(tentativas)))
    renameSync(ARQ_LIMITES + '.tmp', ARQ_LIMITES)
  } catch (erro) {
    console.error('Não consegui salvar os limites de tentativas:', erro.message)
  }
}

export function limitar(chave, maximo = 10, janelaMs = 10 * 60 * 1000) {
  const agora = Date.now()
  const registro = tentativas.get(chave)
  if (!registro || registro.fim < agora) {
    tentativas.set(chave, { n: 1, fim: agora + janelaMs })
    return persistir()
  }
  registro.n++
  persistir()
  if (registro.n > maximo * MULTIPLICADOR) throw new ErroHttp(429, 'Muitas tentativas. Aguarde alguns minutos e tente de novo.')
}

// Depois de um login certo, zera as tentativas daquela chave
export function liberar(chave) {
  if (tentativas.delete(chave)) persistir()
}

setInterval(() => {
  const agora = Date.now()
  for (const [chave, r] of tentativas) if (r.fim < agora) tentativas.delete(chave)
}, 10 * 60 * 1000).unref()
