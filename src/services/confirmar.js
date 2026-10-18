// Janela de confirmação do próprio site (no lugar da caixinha feia do navegador).
// Uso simples:  if (!(await confirmar({ titulo: 'Excluir?', texto: '...', botao: 'Excluir', perigo: true }))) return
// Pedindo o motivo (ações da administração): const r = await confirmar({ ..., motivo: true, duracao: true })
//   -> false se cancelou, ou { motivo: 'texto', dias: 7 | null } se confirmou.
// Pedindo um texto (ex.: novo nome): confirmar({ ..., entrada: true, rotuloEntrada: 'Novo nome', valorInicial: 'x', opcoes: ['a', 'b'] }) -> { entrada: 'texto' }
import { reactive } from 'vue'

export const modal = reactive({
  aberto: false, titulo: '', texto: '', botao: 'Confirmar', perigo: false,
  motivo: false, duracao: false, rotuloMotivo: 'Motivo', valorMotivo: '', valorDias: '',
  entrada: false, rotuloEntrada: 'Nome', valorEntrada: '', opcoesEntrada: []
})
let resolver = null

export function confirmar({ titulo = 'Tem certeza?', texto = '', botao = 'Confirmar', perigo = false, motivo = false, duracao = false, rotuloMotivo = 'Motivo', entrada = false, rotuloEntrada = 'Nome', valorInicial = '', opcoes = [] } = {}) {
  resolver?.(false) // se já havia uma aberta, cancela
  Object.assign(modal, { aberto: true, titulo, texto, botao, perigo, motivo, duracao, rotuloMotivo, valorMotivo: '', valorDias: '', entrada, rotuloEntrada, valorEntrada: valorInicial, opcoesEntrada: opcoes })
  return new Promise(resolve => { resolver = resolve })
}

export function responder(valor) {
  const comCampos = valor && (modal.motivo || modal.duracao || modal.entrada)
  const resposta = comCampos ? { motivo: modal.valorMotivo.trim(), dias: modal.valorDias === '' ? null : Number(modal.valorDias), entrada: modal.valorEntrada.trim() } : valor
  modal.aberto = false
  resolver?.(resposta)
  resolver = null
}
