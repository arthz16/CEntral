<template><template v-for="(parte, i) in partes" :key="i"><mark v-if="parte.achou">{{ parte.texto }}</mark><template v-else>{{ parte.texto }}</template></template></template>

<script setup>
// Mostra o texto com o trecho pesquisado em destaque (sem diferenciar maiúsculas nem acentos).
import { computed } from 'vue'

const props = defineProps({ texto: { type: String, default: '' }, termo: { type: String, default: '' } })

// "Ação" -> "acao": letra por letra, para as posições continuarem iguais às do texto original
const plano = s => [...s].map(c => c.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() || c.toLowerCase()).join('')

const partes = computed(() => {
  const texto = props.texto || ''
  const termo = plano((props.termo || '').trim())
  if (!termo || termo.length < 1) return [{ texto, achou: false }]
  const base = plano(texto)
  if (base.length !== texto.length) return [{ texto, achou: false }] // caracteres especiais: não arrisca marcar errado
  const saida = []
  let inicio = 0
  for (let i = base.indexOf(termo); i >= 0; i = base.indexOf(termo, inicio)) {
    if (i > inicio) saida.push({ texto: texto.slice(inicio, i), achou: false })
    saida.push({ texto: texto.slice(i, i + termo.length), achou: true })
    inicio = i + termo.length
  }
  if (inicio < texto.length) saida.push({ texto: texto.slice(inicio), achou: false })
  return saida.length ? saida : [{ texto, achou: false }]
})
</script>

<style scoped>
mark {
  padding: 0 2px;
  background: var(--b-amarelo-bg);
  color: var(--b-amarelo-fg);
  border-radius: 3px;
  box-shadow: 0 0 0 1px var(--b-amarelo-borda);
}
</style>
