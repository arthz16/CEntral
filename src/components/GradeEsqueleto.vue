<template>
  <div role="status" aria-live="polite">
    <span class="sr-only">Carregando...</span>
    <div class="grade-projetos" aria-hidden="true">
      <div class="card cartao" v-for="n in quantidade" :key="n">
        <div class="linha"><span class="esqueleto" style="width: 72px; height: 22px"></span><span class="esqueleto" style="width: 56px; height: 22px"></span></div>
        <span class="esqueleto" style="width: 75%; height: 24px"></span>
        <span class="esqueleto" style="width: 100%; height: 14px"></span>
        <span class="esqueleto" style="width: 85%; height: 14px"></span>
        <span class="esqueleto" style="width: 40%; height: 22px; margin-top: 4px"></span>
        <span class="esqueleto" style="width: 100%; height: 36px; margin-top: auto"></span>
      </div>
    </div>
  </div>
</template>

<script setup>
// Cartões cinza que "respiram" no lugar dos projetos enquanto eles carregam
defineProps({ quantidade: { type: Number, default: 6 } })
</script>

<style scoped>
.cartao { display: flex; flex-direction: column; gap: 12px; min-height: 250px; padding: 22px; }
.cartao:hover { transform: none; box-shadow: none; }
.linha { display: flex; gap: 8px; }
</style>
