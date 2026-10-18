// Janela para denunciar um projeto, um comentário ou uma pessoa.
// Uso:  const enviou = await denunciar({ tipo: 'projeto', projetoId: 7, titulo: 'Denunciar este projeto' })
import { reactive } from 'vue'

export const denuncia = reactive({ aberta: false, titulo: '', alvo: {} })
let resolver = null

export function denunciar({ tipo, projetoId, comentarioId, usuarioId, titulo = 'Denunciar' }) {
  resolver?.(false)
  Object.assign(denuncia, { aberta: true, titulo, alvo: { tipo, projetoId, comentarioId, usuarioId } })
  return new Promise(resolve => { resolver = resolve })
}

export function fecharDenuncia(enviou = false) {
  denuncia.aberta = false
  resolver?.(enviou)
  resolver = null
}
