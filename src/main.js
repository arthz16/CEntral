import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { sessao } from './services/api'
import { atualizarNaoLidas, limpar, validarSessao } from './stores/auth'
import { iniciarTema } from './stores/tema'

const app = createApp(App)

// v-revelar: o elemento é "erguido" de baixo para cima quando aparece na tela
app.directive('revelar', {
  mounted(el) {
    el.classList.add('revelar')

    // Navegador muito antigo: mostra direto
    if (!('IntersectionObserver' in window)) {
      el.classList.add('visivel')
      return
    }

    el._observador = new IntersectionObserver(([entrada]) => {
      if (entrada.isIntersecting) {
        el.classList.add('visivel')
        el._observador.disconnect()
      }
    }, { threshold: 0.12 })

    el._observador.observe(el)
  },

  unmounted(el) {
    if (el._observador) el._observador.disconnect()
  }
})

// Login recusado pelo servidor (vencido ou encerrado): sai da conta.
// Se a página exige login, leva para o Login; nas públicas só volta ao modo visitante.
sessao.aoExpirar = async () => {
  limpar()
  await router.isReady() // se isso acontece na abertura do site, espera a página inicial terminar de carregar
  const atual = router.currentRoute.value
  if (atual.meta.exigeLogin) router.replace({ name: 'Login', query: { voltar: atual.fullPath, expirou: '1' } })
}

iniciarTema()
app.use(router)

app.mount('#app')
validarSessao()

// O sino do menu se atualiza sozinho a cada minuto (só com a aba aberta) e ao voltar para a aba
setInterval(() => { if (!document.hidden) atualizarNaoLidas() }, 60_000)
document.addEventListener('visibilitychange', () => { if (!document.hidden) atualizarNaoLidas() })
