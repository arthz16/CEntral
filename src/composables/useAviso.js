// Aviso rápido (toast) de sucesso ou erro. Uso:
//   const { aviso, avisar } = useAviso()
//   avisar('Projeto excluído.')                 // sucesso (verde, com ✓)
//   avisar(e.message, 'erro')                   // erro (vermelho, anunciado por leitores de tela)
//   avisar('Dica...', 'info')                   // informação (azul)
// e no template:  <Message :msg="aviso" />
import { onBeforeUnmount, ref } from 'vue'

export function useAviso() {
  const aviso = ref(null)
  let espera = null

  function avisar(texto, tipo = 'sucesso') {
    clearTimeout(espera)
    aviso.value = { texto, tipo }
    espera = setTimeout(() => { aviso.value = null }, tipo === 'erro' ? 6000 : 4000) // erro fica um pouco mais
  }

  onBeforeUnmount(() => clearTimeout(espera))
  return { aviso, avisar }
}
