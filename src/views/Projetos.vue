<template>
  <div>
    <!-- Imagem azul + detalhes animados só no banner de cima -->
    <Banner :title="auth.usuario ? 'Meus Projetos' : 'Projetos Prontos'"
            :subtitle="auth.usuario
              ? (aba === 'painel' ? 'Acompanhe seus projetos de forma rápida' : 'Pesquise, filtre, edite e acompanhe seus projetos')
              : 'Veja exemplos de projetos já montados. Entre na sua conta para criar os seus'"
            imagem="/img/fundoVariado.png" variante="claro" />

    <div class="main-container larga">
      <!-- Logado: os projetos da própria conta (e o painel de controle). Visitante: projetos prontos de exemplo -->
      <template v-if="auth.usuario">
        <div class="abas" role="tablist" aria-label="Meus projetos">
          <button type="button" role="tab" id="aba-projetos" :aria-selected="aba === 'projetos'" aria-controls="painel-projetos"
                  :class="{ ativa: aba === 'projetos' }" @click="trocar('projetos')">Projetos</button>
          <button type="button" role="tab" id="aba-painel" :aria-selected="aba === 'painel'" aria-controls="painel-painel"
                  :class="{ ativa: aba === 'painel' }" @click="trocar('painel')">Painel de controle</button>
        </div>

        <!-- A lista fica montada (v-show) para os filtros e a página não se perderem ao trocar de aba -->
        <div v-show="aba === 'projetos'" id="painel-projetos" role="tabpanel" aria-labelledby="aba-projetos"><Dashboard /></div>
        <div v-if="aba === 'painel'" id="painel-painel" role="tabpanel" aria-labelledby="aba-painel"><PainelResumo /></div>
      </template>
      <Vitrine v-else />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Banner from '../components/Banner.vue'
import Dashboard from '../components/Dashboard.vue'
import PainelResumo from '../components/PainelResumo.vue'
import Vitrine from '../components/Vitrine.vue'
import { auth } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const aba = computed(() => (route.query.aba === 'painel' ? 'painel' : 'projetos'))

// A aba fica no endereço (?aba=painel). Os filtros da lista são preservados.
function trocar(nova) {
  const p = new URLSearchParams(window.location.search)
  if (nova === 'painel') p.set('aba', 'painel')
  else p.delete('aba')
  router.replace({ path: route.path, query: Object.fromEntries(p) })
}
</script>

<style scoped>
.abas { display: flex; gap: 6px; margin-bottom: 22px; border-bottom: 2px solid var(--borda); }
.abas button {
  margin-bottom: -2px;
  padding: 11px 20px;
  background: transparent;
  color: var(--texto-suave);
  border: 0;
  border-bottom: 3px solid transparent;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition: var(--transicao);
}
.abas button:hover { color: var(--azul); }
.abas button.ativa { color: var(--azul); border-bottom-color: var(--azul); }
</style>
