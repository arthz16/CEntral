<template>
  <span class="selo" :class="[`t-${tamanho}`, { 'com-rotulo': rotulo }]" role="img" aria-label="Administrador verificado" title="Administrador verificado">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path class="escudo" d="M12 2.500l7.500 3v5.600c0 4.700-3.100 8.500-7.500 10.400-4.400-1.900-7.500-5.700-7.500-10.400V5.500z" />
      <path class="visto" d="M8.300 12.200l2.700 2.700 4.800-5.300" />
    </svg>
    <span v-if="rotulo" class="texto">Administrador</span>
  </span>
</template>

<script setup>
// Selo de "conta verificada" da administração (escudo roxo com ✓), igual nas duas cores do site.
defineProps({
  tamanho: { type: String, default: 'p' }, // p | m | g
  rotulo: { type: Boolean, default: false } // mostra a palavra "Administrador" ao lado
})
</script>

<style scoped>
.selo { display: inline-flex; align-items: center; gap: 5px; vertical-align: middle; line-height: 1; }
svg { flex-shrink: 0; width: 1.1em; height: 1.1em; margin-left: 4px; }
.escudo { fill: #6d28d9; stroke: #c4b5fd; stroke-width: 1.200; stroke-linejoin: round; }
.visto { fill: none; stroke: #fff; stroke-width: 2.400; stroke-linecap: round; stroke-linejoin: round; }
.t-p { font-size: 15px; }
.t-m { font-size: 20px; }
.t-g { font-size: 26px; }
.com-rotulo { padding: 2px 10px 2px 4px; background: #6d28d9; border-radius: 999px; }
.com-rotulo svg { margin-left: 0; }
.com-rotulo .escudo { stroke: transparent; fill: #4c1d95; }
.texto { color: #fff; font-size: 12px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
</style>
