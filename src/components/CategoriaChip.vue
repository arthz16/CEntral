<template>
  <span class="chip-cat" :style="{ '--h': estilo.h }">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="estilo.icone" /></svg>{{ nome }}
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { estiloDaCategoria } from '../services/categorias'

const props = defineProps({ nome: { type: String, required: true } })
const estilo = computed(() => estiloDaCategoria(props.nome))
</script>

<style scoped>
.chip-cat {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px 3px 8px;
  background: hsl(var(--h) 75% var(--cat-bg-l));
  color: hsl(var(--h) 70% var(--cat-fg-l));
  border: 1px solid hsl(var(--h) 60% var(--cat-borda-l));
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}
svg { width: 14px; height: 14px; flex-shrink: 0; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
</style>
