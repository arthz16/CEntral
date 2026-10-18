<template>
  <div>
    <Banner title="Administração" subtitle="Moderação da comunidade: denúncias, pessoas, projetos e o registro de tudo o que foi feito"
            imagem="/img/fundoVariado.png" variante="claro" compacto />

    <div class="main-container">
      <nav class="abas" aria-label="Seções da administração">
        <RouterLink v-for="a in ABAS" :key="a.id" :to="a.id === 'resumo' ? '/Admin' : `/Admin/${a.id}`" class="aba" :class="{ ativa: aba === a.id }"
                    :aria-current="aba === a.id ? 'page' : undefined">
          {{ a.nome }}
          <span v-if="a.id === 'denuncias' && resumo?.denunciasAbertas" class="contador" :aria-label="`${resumo.denunciasAbertas} abertas`">{{ resumo.denunciasAbertas }}</span>
        </RouterLink>
      </nav>

      <div v-if="erro" class="vazio erro-box" role="alert">{{ erro }}</div>
      <template v-else>
        <AdminResumo v-if="aba === 'resumo'" :resumo="resumo" />
        <AdminDenuncias v-else-if="aba === 'denuncias'" @mudou="carregarResumo" />
        <AdminUsuarios v-else-if="aba === 'pessoas'" @mudou="carregarResumo" />
        <AdminProjetos v-else-if="aba === 'projetos'" @mudou="carregarResumo" />
        <AdminCategorias v-else-if="aba === 'categorias'" />
        <AdminRegistro v-else-if="aba === 'registro'" />
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import Banner from '../components/Banner.vue'
import AdminCategorias from '../components/admin/AdminCategorias.vue'
import AdminDenuncias from '../components/admin/AdminDenuncias.vue'
import AdminProjetos from '../components/admin/AdminProjetos.vue'
import AdminRegistro from '../components/admin/AdminRegistro.vue'
import AdminResumo from '../components/admin/AdminResumo.vue'
import AdminUsuarios from '../components/admin/AdminUsuarios.vue'
import { api } from '../services/api'

const ABAS = [
  { id: 'resumo', nome: 'Visão geral' },
  { id: 'denuncias', nome: 'Denúncias' },
  { id: 'pessoas', nome: 'Pessoas' },
  { id: 'projetos', nome: 'Projetos' },
  { id: 'categorias', nome: 'Categorias' },
  { id: 'registro', nome: 'Registro' }
]

const route = useRoute()
const aba = computed(() => (ABAS.some(a => a.id === route.params.aba) ? route.params.aba : 'resumo'))

const resumo = ref(null)
const erro = ref('')
async function carregarResumo() {
  try { resumo.value = await api('/admin/resumo') } catch (e) { erro.value = e.message }
}
onMounted(carregarResumo)
</script>

<style scoped>
.abas { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 24px; border-bottom: 2px solid var(--borda); }
.aba {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: -2px;
  padding: 11px 18px;
  color: var(--texto-suave);
  border-bottom: 3px solid transparent;
  font-weight: 700;
  transition: var(--transicao);
}
.aba:hover { color: var(--azul); }
.aba.ativa { color: var(--azul); border-bottom-color: var(--azul); }
.contador { min-width: 22px; padding: 1px 7px; background: #b3261e; color: #fff; border-radius: 999px; font-size: 12px; text-align: center; }
</style>
