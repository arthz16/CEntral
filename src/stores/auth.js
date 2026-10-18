// Estado do login (sem biblioteca extra: o próprio Vue já resolve).
import { reactive } from 'vue'
import { api, sessao, guardarLocal, lerLocal } from '../services/api'

// Só os dados públicos da conta (nome, @, e-mail) ficam guardados aqui, para a tela abrir já com o nome.
// O login em si fica no cookie httpOnly, que o JavaScript não consegue ler.
const CHAVE_USUARIO = 'cp_usuario'

function usuarioSalvo() {
  try { return JSON.parse(lerLocal(CHAVE_USUARIO)) } catch { return null }
}

// auth.usuario é null quando ninguém está logado
export const auth = reactive({ usuario: usuarioSalvo(), avisos: [], naoLidas: 0 }) // avisos = recados da moderação; naoLidas = notificações novas
sessao.ativa = !!auth.usuario

// A administração enxerga o site todo em outra cor (o CSS usa data-papel="admin")
export const souAdmin = () => auth.usuario?.papel === 'admin'
const aplicarPapel = () => { document.documentElement.dataset.papel = souAdmin() ? 'admin' : 'usuario' }
aplicarPapel()

function iniciarSessao({ usuario }) {
  sessao.ativa = true
  guardarLocal(CHAVE_USUARIO, JSON.stringify(usuario))
  auth.usuario = usuario
  aplicarPapel()
  // Recados da moderação (o pontinho no menu): a resposta do login não os traz, então busca em seguida
  api('/auth/eu').then(r => { auth.avisos = r.avisos || []; auth.naoLidas = r.naoLidas || 0 }).catch(() => {})
}

export function limpar() {
  sessao.ativa = false
  guardarLocal(CHAVE_USUARIO, null)
  auth.usuario = null
  auth.avisos = []
  auth.naoLidas = 0
  aplicarPapel()
}

// Confere quantas notificações novas existem (o sino do menu). Chamado de tempos em tempos pelo main.js.
export async function atualizarNaoLidas() {
  if (!auth.usuario) return
  try { auth.naoLidas = (await api('/notificacoes/contagem')).naoLidas } catch { /* sem conexão: mantém o número */ }
}

export async function entrar(email, senha) {
  iniciarSessao(await api('/auth/login', { metodo: 'POST', corpo: { email, senha } }))
}

export async function registrar(nome, usuario, email, senha) {
  iniciarSessao(await api('/auth/registrar', { metodo: 'POST', corpo: { nome, usuario, email, senha } }))
}

// Atualiza nome, @usuario e/ou e-mail da conta e guarda o novo usuário.
export async function atualizarPerfil(dados) {
  const { usuario } = await api('/auth/perfil', { metodo: 'PATCH', corpo: dados })
  auth.usuario = usuario
  guardarLocal(CHAVE_USUARIO, JSON.stringify(usuario))
  return usuario
}

// Troca a senha (precisa da senha atual).
export async function trocarSenha(senhaAtual, novaSenha) {
  await api('/auth/senha', { metodo: 'PATCH', corpo: { senhaAtual, novaSenha } })
}

// Exclui a conta e encerra a sessão.
export async function excluirConta(senha) {
  await api('/auth/conta', { metodo: 'DELETE', corpo: { senha } })
  limpar()
}

// Esqueci a senha: o servidor manda um código de 6 dígitos para o e-mail (a resposta nunca traz o código).
export async function esqueciSenha(email) {
  return api('/auth/esqueci', { metodo: 'POST', corpo: { email } })
}

// Redefine a senha com o e-mail + o código recebido e já entra na conta.
export async function redefinirSenha(email, codigo, senha) {
  iniciarSessao(await api('/auth/redefinir', { metodo: 'POST', corpo: { email, codigo, senha } }))
}

// Sair: avisa o servidor (que encerra este login de verdade) e limpa a tela na hora
export function sair() {
  api('/auth/sair', { metodo: 'POST' }).catch(() => { /* sem conexão: sai da tela do mesmo jeito */ })
  limpar()
}

// Ao abrir o site, confere em segundo plano se o login guardado ainda vale
export async function validarSessao() {
  if (!sessao.ativa) return
  try {
    const { usuario, avisos, naoLidas } = await api('/auth/eu')
    auth.usuario = usuario
    auth.avisos = avisos || []
    auth.naoLidas = naoLidas || 0
    guardarLocal(CHAVE_USUARIO, JSON.stringify(usuario))
    aplicarPapel()
  } catch { /* login vencido: o api() já cuida; servidor desligado: mantém a tela como está */ }
}
