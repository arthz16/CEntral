<template>
  <section v-if="visivel" class="guia card anim-subir" aria-labelledby="guia-titulo">
    <header>
      <div>
        <h2 id="guia-titulo">Primeiros passos</h2>
        <p>{{ feitos }} de 3 concluídos. É rapidinho!</p>
      </div>
      <button type="button" class="btn-mini" @click="esconder">Já entendi, esconder</button>
    </header>

    <ol>
      <li v-for="(p, i) in passos" :key="p.titulo" :class="{ feito: p.feito }">
        <span class="marca" aria-hidden="true">
          <svg v-if="p.feito" viewBox="0 0 24 24"><path d="M5.500 12.500l4 4L18.500 8" /></svg>
          <template v-else>{{ i + 1 }}</template>
        </span>
        <div class="corpo">
          <h3>{{ p.titulo }}<span v-if="p.feito" class="sr-only"> (feito)</span></h3>
          <p>{{ p.texto }}</p>
        </div>
        <RouterLink v-if="!p.feito" class="btn-mini principal" :to="p.link">{{ p.botao }}</RouterLink>
      </li>
    </ol>
  </section>
</template>

<script setup>
// Guia de 3 passos para quem acabou de chegar. Some sozinho quando tudo está feito ou quando a pessoa o esconde.
import { computed, ref, watchEffect } from 'vue'

const props = defineProps({
  total: { type: Number, default: 0 }, // quantos projetos a pessoa tem
  publicos: { type: Number, default: 0 } // quantos deles são públicos
})

const fechado = ref(localStorage.getItem('cp_guia_fechado') === '1')
const viuComunidade = localStorage.getItem('cp_viu_comunidade') === '1'

const passos = computed(() => [
  { titulo: 'Cadastre o seu primeiro projeto', texto: 'Dê um nome, escolha a categoria e liste os itens do orçamento.', botao: 'Cadastrar projeto', link: '/CadastrosProjetos', feito: props.total >= 1 },
  { titulo: 'Deixe-o público', texto: 'Projeto público aparece na Comunidade. Já vem ligado, e dá para esconder quando quiser (só você edita).', botao: 'Ver meus projetos', link: '/Projetos', feito: props.publicos >= 1 },
  { titulo: 'Descubra a Comunidade', texto: 'Veja os projetos de outras pessoas, curta, comente e siga quem você gostar.', botao: 'Abrir a Comunidade', link: '/Comunidade', feito: viuComunidade }
])
const feitos = computed(() => passos.value.filter(p => p.feito).length)
const visivel = computed(() => !fechado.value && feitos.value < 3)

// Quando tudo está feito, guarda para nunca mais aparecer
watchEffect(() => { if (feitos.value === 3) localStorage.setItem('cp_guia_fechado', '1') })
function esconder() { fechado.value = true; localStorage.setItem('cp_guia_fechado', '1') }
</script>

<style scoped>
.guia { margin-bottom: 40px; padding: 24px 28px; border-color: var(--azul-claro); }
.guia:hover { transform: none; box-shadow: none; }
header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
h2 { color: var(--tinta); font-size: 22px; }
header p { color: var(--texto-suave); }
ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
li { display: flex; align-items: center; gap: 14px; padding: 12px 14px; background: var(--superficie-suave); border: 1px solid var(--borda); border-radius: 12px; }
li.feito { opacity: 0.75; }
.marca { flex-shrink: 0; width: 34px; height: 34px; display: grid; place-items: center; background: var(--azul-botao); color: #fff; border-radius: 50%; font-weight: 800; }
li.feito .marca { background: var(--b-verde-bg); color: var(--b-verde-fg); border: 2px solid var(--b-verde-fg); }
.marca svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
.corpo { flex: 1; min-width: 0; }
h3 { color: var(--tinta); font-size: 16px; }
li.feito h3 { text-decoration: line-through; }
.corpo p { color: var(--texto-suave); font-size: 14px; }
li a { white-space: nowrap; }
@media (max-width: 640px) { li { flex-wrap: wrap; } li a { margin-left: 48px; } }
</style>
