<template>
  <div>
    <GradeEsqueleto v-if="carregando" />
    <div v-else-if="erro" class="vazio erro-box">{{ erro }}</div>

    <template v-else>
      <!-- Filtro por categoria -->
      <div class="filtro" role="group" aria-label="Filtrar por categoria">
        <button v-for="c in ['Todos', ...categorias]" :key="c" type="button"
                :class="{ ativo: (c === 'Todos' ? '' : c) === filtro }"
                @click="filtro = c === 'Todos' ? '' : c">{{ c }}</button>
      </div>

      <div class="grade">
        <article class="card projeto-card" v-for="p in filtrados" :key="p.id">
          <span class="badge" :class="classeStatus(p.status)">{{ p.status }}</span>
          <h3><RouterLink class="abrir" :to="`/ProjetosProntos/${p.id}`">{{ p.nome }}</RouterLink></h3>
          <p class="descricao">{{ p.descricao }}</p>
          <div class="info">
            <span class="categoria">{{ p.categoria }}</span>
            <span class="categoria">{{ p.subcategoria }}</span>
          </div>
          <div class="meta">
            <span>Responsável: {{ p.responsavel }}</span>
            <strong>{{ dinheiro(p.orcamento) }}</strong>
          </div>
          <div class="itens">
            <span v-for="item in p.itens.slice(0, 4)" :key="item">{{ item }}</span>
            <span v-if="p.itens.length > 4">+{{ p.itens.length - 4 }}</span>
          </div>
        </article>
      </div>

      <!-- Convite para criar conta -->
      <section class="convite">
        <div>
          <h3>Quer criar e acompanhar os seus projetos?</h3>
          <p>Entre na sua conta (ou crie uma em um minuto) para cadastrar projetos e guardá-los com segurança.</p>
        </div>
        <div class="botoes">
          <RouterLink class="btn" to="/Login">Entrar</RouterLink>
          <RouterLink class="btn btn-outline claro" :to="{ name: 'Login', query: { modo: 'criar' } }">Criar conta</RouterLink>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import GradeEsqueleto from './GradeEsqueleto.vue'
import { vitrine } from '../services/api'

const projetos = ref([])
const carregando = ref(true)
const erro = ref('')
const filtro = ref('')

const categorias = computed(() => [...new Set(projetos.value.map(p => p.categoria))])
const filtrados = computed(() => (filtro.value ? projetos.value.filter(p => p.categoria === filtro.value) : projetos.value))

const dinheiro = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const classeStatus = s => (s === 'Concluído' ? 'concluido' : s === 'Em andamento' ? 'andamento' : 'planejamento')

onMounted(async () => {
  try {
    projetos.value = await vitrine()
  } catch (e) {
    erro.value = e.message
  } finally {
    carregando.value = false
  }
})
</script>

<style scoped>
.filtro {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 22px;
}

.filtro button {
  padding: 7px 16px;
  background: var(--superficie);
  border: 2px solid var(--borda);
  border-radius: 999px;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transicao);
}

.filtro button:hover { border-color: var(--azul); }
.filtro button.ativo { background: var(--azul-botao); border-color: var(--azul); color: var(--branco); }

.grade {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.projeto-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 22px;
}

.projeto-card h3 { margin-top: 12px; font-size: 20px; overflow-wrap: anywhere; }
.abrir { color: var(--tinta); }
.abrir::after { content: ""; position: absolute; inset: 0; border-radius: var(--raio); }
.abrir:hover { color: var(--azul); }

.descricao {
  margin: 6px 0 12px;
  color: var(--texto-suave);
  font-size: 14px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.info { display: flex; flex-wrap: wrap; gap: 7px; }

.categoria {
  padding: 3px 9px;
  background: var(--b-azul-bg);
  border: 1px solid var(--azul-claro);
  border-radius: 999px;
  color: var(--b-azul-fg);
  font-size: 12px;
  font-weight: 600;
}

.meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin: 14px 0;
  color: var(--texto-suave);
  font-size: 12px;
}

.meta strong { color: var(--tinta); font-size: 16px; white-space: nowrap; }

.itens { display: flex; flex-wrap: wrap; gap: 5px; margin-top: auto; }

.itens span {
  padding: 3px 9px;
  background: var(--chip);
  border: 1px solid var(--borda);
  border-radius: 999px;
  color: var(--b-cinza-fg);
  font-size: 11px;
}

.badge {
  align-self: flex-start;
  padding: 5px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.planejamento { background: var(--b-amarelo-bg); color: var(--b-amarelo-fg); }
.andamento { background: var(--b-azul-bg); color: var(--b-azul-fg); }
.concluido { background: var(--b-verde-bg); color: var(--b-verde-fg); }

.convite {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  margin-top: 36px;
  padding: 28px 32px;
  background: var(--preto);
  border-left: 6px solid var(--azul-claro);
  border-radius: var(--raio);
  color: var(--branco);
}

.convite h3 { font-size: 22px; }
.convite p { margin-top: 4px; color: #b9c6d4; }
.botoes { display: flex; gap: 10px; flex-shrink: 0; }
.btn-outline.claro { color: var(--azul-claro); border-color: var(--azul-claro); }
.btn-outline.claro:hover { color: var(--tinta); background: var(--azul-claro); border-color: var(--azul-claro); }

@media (max-width: 700px) {
  .convite { flex-direction: column; align-items: flex-start; padding: 22px; }
}
</style>
