<template>
  <nav v-if="paginas > 1" class="paginacao" aria-label="Paginação">
    <button type="button" class="seta" :disabled="pagina <= 1" @click="ir(pagina - 1)">‹ Anterior</button>
    <template v-for="(item, i) in itens" :key="i">
      <span v-if="item === '…'" class="reticencias" aria-hidden="true">…</span>
      <button v-else type="button" class="numero" :class="{ atual: item === pagina }"
              :aria-current="item === pagina ? 'page' : undefined" @click="ir(item)">{{ item }}</button>
    </template>
    <button type="button" class="seta" :disabled="pagina >= paginas" @click="ir(pagina + 1)">Próxima ›</button>
  </nav>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ pagina: { type: Number, required: true }, paginas: { type: Number, required: true } })
const emit = defineEmits(['ir'])

const ir = n => { if (n >= 1 && n <= props.paginas && n !== props.pagina) emit('ir', n) }

// Mostra a primeira, a última e as vizinhas da atual: 1 … 4 5 [6] 7 8 … 20
const itens = computed(() => {
  const { pagina, paginas } = props
  const mostrar = new Set([1, paginas, pagina - 1, pagina, pagina + 1])
  if (pagina <= 3) { mostrar.add(2); mostrar.add(3) }
  if (pagina >= paginas - 2) { mostrar.add(paginas - 1); mostrar.add(paginas - 2) }
  const ordenadas = [...mostrar].filter(n => n >= 1 && n <= paginas).sort((a, b) => a - b)
  const saida = []
  ordenadas.forEach((n, i) => {
    if (i && n - ordenadas[i - 1] > 1) saida.push('…')
    saida.push(n)
  })
  return saida
})
</script>

<style scoped>
.paginacao { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 6px; margin-top: 28px; }
button { min-width: 40px; height: 40px; padding: 0 12px; border: 1px solid var(--borda); border-radius: 8px; background: var(--superficie); color: var(--tinta); font: inherit; font-weight: 600; cursor: pointer; }
button:hover:not(:disabled):not(.atual) { border-color: var(--azul); color: var(--azul); }
button:disabled { opacity: .45; cursor: not-allowed; }
.atual { background: var(--acao); border-color: var(--acao); color: white; cursor: default; }
.reticencias { padding: 0 4px; color: var(--texto-suave); }
</style>
