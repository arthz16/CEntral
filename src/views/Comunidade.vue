<template>
  <div>
    <Banner title="Comunidade" subtitle="Todo projeto público aparece aqui. Curta, comente e conheça quem criou. Só o dono edita"
            imagem="/img/fundoVariado.png" variante="claro" />

    <div class="main-container larga">
      <!-- Abas do feed: todos, em alta ou só quem eu sigo -->
      <div class="abas-feed" role="group" aria-label="Tipo de lista">
        <button type="button" :class="{ ativa: abaAtual === 'todos' }" :aria-pressed="abaAtual === 'todos'" @click="aba('todos')">Todos</button>
        <button type="button" :class="{ ativa: abaAtual === 'emalta' }" :aria-pressed="abaAtual === 'emalta'" @click="aba('emalta')">Em alta</button>
        <button type="button" :class="{ ativa: abaAtual === 'seguindo' }" :aria-pressed="abaAtual === 'seguindo'" @click="aba('seguindo')">Seguindo</button>
      </div>

      <div class="filtros card" role="search">
        <CampoBusca v-model="filtros.busca" placeholder="Pesquisar projeto, criador (@) ou categoria..." @categoria="c => (filtros.categoria = c)" />
        <select v-model="filtros.categoria" aria-label="Categoria">
          <option value="">Categoria</option>
          <option v-for="c in dados?.categorias || []" :key="c">{{ c }}</option>
        </select>
        <select v-model="filtros.status" aria-label="Status">
          <option value="">Status</option>
          <option>Planejamento</option><option>Em andamento</option><option>Concluído</option>
        </select>
        <select v-model="filtros.ordem" aria-label="Ordenar por">
          <option value="recentes">Mais recentes</option>
          <option value="emalta">Em alta</option>
          <option value="curtidas">Mais curtidos</option>
          <option value="nome">Nome (A–Z)</option>
        </select>
        <label class="marcar"><input type="checkbox" v-model="filtros.meus"> Só os meus</label>
        <button v-if="temFiltro" type="button" class="btn-filtro escuro" @click="limpar">Limpar</button>
      </div>

      <div v-if="erro" class="vazio erro-box" role="alert">{{ erro }}</div>
      <GradeEsqueleto v-else-if="!dados" />

      <template v-else>
        <EstadoVazio v-if="!dados.total && filtros.seguindo && !filtros.busca && !filtros.categoria && !filtros.status" tipo="comunidade"
                     titulo="Nada por aqui ainda" texto="Quando você seguir alguém e essa pessoa tiver projetos públicos, eles aparecem nesta aba.">
          <button type="button" class="btn" @click="aba('emalta')">Ver o que está em alta</button>
        </EstadoVazio>
        <EstadoVazio v-else-if="!dados.total && temFiltro" tipo="busca" titulo="Nenhum projeto encontrado" texto="Tente outras palavras ou tire alguns filtros.">
          <button type="button" class="btn" @click="limpar">Limpar filtros</button>
        </EstadoVazio>
        <EstadoVazio v-else-if="!dados.total" tipo="comunidade" titulo="Ainda não há projetos públicos" texto="Seja a primeira pessoa: cadastre um projeto e deixe-o público.">
          <RouterLink class="btn" to="/CadastrosProjetos">Cadastrar projeto</RouterLink>
        </EstadoVazio>

        <template v-else>
          <p class="contagem" aria-live="polite">
            {{ dados.total }} {{ dados.total === 1 ? 'projeto' : 'projetos' }}
            <template v-if="dados.paginas > 1"> · página {{ dados.pagina }} de {{ dados.paginas }}</template>
          </p>

          <div class="grade-projetos" :class="{ carregando }">
            <ProjetoCard v-for="p in dados.projetos" :key="p.id" :projeto="p" modo="comunidade" :busca="filtros.busca" />
          </div>

          <Paginacao :pagina="dados.pagina" :paginas="dados.paginas" @ir="irParaPagina" />
        </template>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Banner from '../components/Banner.vue'
import CampoBusca from '../components/CampoBusca.vue'
import EstadoVazio from '../components/EstadoVazio.vue'
import GradeEsqueleto from '../components/GradeEsqueleto.vue'
import Paginacao from '../components/Paginacao.vue'
import ProjetoCard from '../components/ProjetoCard.vue'
import { useListaPaginada } from '../composables/useListaPaginada'

const { filtros, dados, carregando, erro, temFiltro, carregar, irParaPagina, limpar } = useListaPaginada(
  '/comunidade',
  { busca: '', categoria: '', status: '', ordem: 'recentes', meus: false, seguindo: false }
)
carregar()
localStorage.setItem('cp_viu_comunidade', '1') // (o guia do primeiro acesso usa isto)

// As três abas são atalhos para filtros que já existem (ordem e "seguindo")
const abaAtual = computed(() => (filtros.seguindo ? 'seguindo' : filtros.ordem === 'emalta' ? 'emalta' : 'todos'))
function aba(nome) {
  filtros.seguindo = nome === 'seguindo'
  filtros.ordem = nome === 'emalta' ? 'emalta' : 'recentes'
}
</script>

<style scoped>
.abas-feed { display: inline-flex; gap: 4px; margin-bottom: 14px; padding: 4px; background: var(--chip); border-radius: 999px; }
.abas-feed button { padding: 8px 20px; background: transparent; color: var(--texto-suave); border: 0; border-radius: 999px; font: inherit; font-weight: 700; cursor: pointer; transition: var(--transicao); }
.abas-feed button:hover { color: var(--azul); }
.abas-feed button.ativa { background: var(--azul-botao); color: #fff; }
</style>
