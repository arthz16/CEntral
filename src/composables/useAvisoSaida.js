// Pergunta antes de sair de uma página com alterações não salvas (trocar de página, voltar ou fechar a aba).
import { onBeforeUnmount, onMounted } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { confirmar } from '../services/confirmar'

// "sujo" é um ref(boolean): true quando há alterações sem salvar
export function useAvisoSaida(sujo) {
  onBeforeRouteLeave(async () => {
    if (!sujo.value) return true
    return !!(await confirmar({
      titulo: 'Sair sem salvar?',
      texto: 'As alterações que você fez neste formulário serão perdidas.',
      botao: 'Sair sem salvar',
      perigo: true
    }))
  })

  // Fechar a aba ou recarregar: o próprio navegador mostra o aviso dele
  const aoFechar = e => { if (sujo.value) { e.preventDefault(); e.returnValue = '' } }
  onMounted(() => window.addEventListener('beforeunload', aoFechar))
  onBeforeUnmount(() => window.removeEventListener('beforeunload', aoFechar))
}
