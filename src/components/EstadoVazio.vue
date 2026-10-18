<template>
  <section class="vazio-estado" :aria-label="titulo">
    <svg class="desenho" viewBox="0 0 160 120" aria-hidden="true">
      <!-- projetos: pastas empilhadas com um + -->
      <template v-if="tipo === 'projetos'">
        <rect class="fundo" x="30" y="30" width="100" height="70" rx="10" />
        <rect class="linha" x="22" y="22" width="100" height="70" rx="10" />
        <rect class="cheio" x="14" y="14" width="100" height="70" rx="10" />
        <path class="traco" d="M64 38v22M53 49h22" />
        <circle class="ponto" cx="122" cy="96" r="3" /><circle class="ponto" cx="140" cy="40" r="2.500" />
      </template>
      <!-- busca: lupa sobre cartões -->
      <template v-else-if="tipo === 'busca'">
        <rect class="fundo" x="20" y="24" width="86" height="22" rx="7" /><rect class="fundo" x="20" y="54" width="86" height="22" rx="7" />
        <circle class="lupa" cx="88" cy="62" r="24" /><path class="traco" d="M106 80l22 22" />
        <path class="traco fino" d="M78 56l20 12M98 56l-20 12" />
      </template>
      <!-- comunidade / seguindo: pessoas ligadas -->
      <template v-else-if="tipo === 'comunidade'">
        <path class="linha-fina" d="M80 44L42 84M80 44L118 84M42 84h76" />
        <circle class="cheio" cx="80" cy="34" r="16" /><circle class="cheio" cx="40" cy="86" r="14" /><circle class="cheio" cx="120" cy="86" r="14" />
        <circle class="olho" cx="80" cy="30" r="5" /><path class="traco fino" d="M71 46c4-5 14-5 18 0" />
        <circle class="olho" cx="40" cy="83" r="4" /><circle class="olho" cx="120" cy="83" r="4" />
      </template>
      <!-- notificações: sino -->
      <template v-else-if="tipo === 'sino'">
        <path class="cheio" d="M80 22c-18 0-28 14-28 32v18l-10 12h76l-10-12V54c0-18-10-32-28-32z" />
        <path class="traco" d="M70 92c1 7 5 10 10 10s9-3 10-10" />
        <path class="traco fino" d="M80 14v8" /><circle class="ponto" cx="124" cy="36" r="3" /><circle class="ponto" cx="36" cy="40" r="2.500" />
      </template>
      <!-- tudo certo -->
      <template v-else>
        <circle class="fundo" cx="80" cy="60" r="44" /><circle class="cheio" cx="80" cy="60" r="32" />
        <path class="traco" d="M64 61l11 11 21-23" />
        <circle class="ponto" cx="130" cy="30" r="3" /><circle class="ponto" cx="30" cy="92" r="2.500" />
      </template>
    </svg>

    <h3>{{ titulo }}</h3>
    <p v-if="texto">{{ texto }}</p>
    <div class="acoes" v-if="$slots.default"><slot /></div>
  </section>
</template>

<script setup>
// Tela vazia amigável: desenho + título + explicação + botões (slot).
// tipo: projetos | busca | comunidade | sino | ok
defineProps({
  tipo: { type: String, default: 'ok' },
  titulo: { type: String, required: true },
  texto: { type: String, default: '' }
})
</script>

<style scoped>
.vazio-estado {
  display: grid;
  justify-items: center;
  gap: 6px;
  padding: 36px 20px;
  text-align: center;
  background: var(--superficie);
  border: 1px dashed var(--borda-forte);
  border-radius: var(--raio);
}
.desenho { width: 170px; height: auto; margin-bottom: 6px; }
.fundo { fill: var(--b-azul-bg); stroke: none; }
.cheio { fill: var(--superficie); stroke: var(--azul); stroke-width: 3; }
.linha { fill: var(--superficie-suave); stroke: var(--borda-forte); stroke-width: 2.500; }
.lupa { fill: var(--superficie); stroke: var(--azul); stroke-width: 5; }
.linha-fina { fill: none; stroke: var(--borda-forte); stroke-width: 2.500; stroke-dasharray: 4 5; }
.traco { fill: none; stroke: var(--azul); stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; }
.traco.fino { stroke-width: 3; }
.olho { fill: var(--azul); }
.ponto { fill: var(--azul-claro); }
h3 { color: var(--tinta); font-size: 20px; }
p { max-width: 460px; color: var(--texto-suave); }
.acoes { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 12px; }
</style>
