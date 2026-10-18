// Único ponto de comunicação com o servidor.
// O login vai num cookie "httpOnly" que o navegador manda sozinho (o JavaScript nunca vê o token).
// Aqui também ficam guardadas as cópias dos dados que não mudam.

// Usa o mesmo endereço em que o site foi aberto (localhost ou 127.0.0.1), porta 3000: assim o cookie vale
export const API_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3000`

// localStorage pode estar bloqueado (aba anônima): nesse caso o login vale só até fechar a aba
function lerLocal(chave) {
  try { return localStorage.getItem(chave) } catch { return null }
}
export function guardarLocal(chave, valor) {
  try { valor == null ? localStorage.removeItem(chave) : localStorage.setItem(chave, valor) } catch { /* ignora */ }
}
export { lerLocal }

export const sessao = {
  ativa: false, // true quando há alguém logado (definido pelo auth.js)
  aoExpirar: null // função definida no main.js
}

export class ApiError extends Error {
  constructor(status, mensagem) {
    super(mensagem)
    this.status = status
  }
}

export async function api(caminho, { metodo = 'GET', corpo } = {}) {
  const cabecalhos = {}
  if (corpo !== undefined) cabecalhos['Content-Type'] = 'application/json'

  let resposta
  try {
    resposta = await fetch(API_URL + caminho, {
      method: metodo,
      headers: cabecalhos,
      credentials: 'include', // manda o cookie de login
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined
    })
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao servidor. Rode npm run server.')
  }

  const dados = resposta.status === 204 ? null : await resposta.json().catch(() => null)

  if (!resposta.ok) {
    // Estava logado e o servidor recusou o login: a sessão acabou
    if (resposta.status === 401 && sessao.ativa) sessao.aoExpirar?.()
    throw new ApiError(resposta.status, dados?.erro || 'Algo deu errado. Tente novamente.')
  }
  return dados
}

// Categorias e projetos prontos não mudam: busca uma vez só e reaproveita
const guardados = {}
const umaVez = (chave, caminho) =>
  (guardados[chave] ??= api(caminho).catch(erro => {
    delete guardados[chave]
    throw erro
  }))

export const categorias = () => umaVez('categorias', '/categorias')
export const vitrine = () => umaVez('vitrine', '/vitrine')
