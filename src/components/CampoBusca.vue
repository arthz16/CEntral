<template>
  <div class="busca" ref="raiz">
    <svg class="lupa" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
    <input ref="campo" type="search" role="combobox" autocomplete="off" aria-autocomplete="list" aria-label="Pesquisar"
           :aria-expanded="aberto" :aria-controls="idLista" :aria-activedescendant="ativo >= 0 ? `${idLista}-${ativo}` : undefined"
           :value="modelValue" :placeholder="placeholder"
           @input="digitou" @focus="focou" @blur="aoSair" @keydown="teclou">

    <ul v-if="aberto" :id="idLista" class="sugestoes" role="listbox" aria-label="Sugestões" @mousedown.prevent>
      <template v-for="grupo in grupos" :key="grupo.nome">
        <li class="grupo" role="presentation">{{ grupo.nome }}</li>
        <li v-for="item in grupo.itens" :key="item.id" :id="`${idLista}-${item.indice}`" role="option"
            :aria-selected="ativo === item.indice" :class="{ ativo: ativo === item.indice }"
            @mouseenter="ativo = item.indice" @click="escolher(item)">
          <span class="tipo">{{ item.icone }}</span>
          <span class="rotulo"><TextoDestacado :texto="item.rotulo" :termo="modelValue" /></span>
          <small v-if="item.detalhe">{{ item.detalhe }}</small>
        </li>
      </template>
    </ul>
  </div>
</template>

<script setup>
// Campo de busca com sugestões (projetos, pessoas e categorias) enquanto a pessoa digita.
// escopo: 'comunidade' (padrão) ou 'meus' (só os projetos da própria conta).
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import TextoDestacado from './TextoDestacado.vue'
import { api } from '../services/api'

const props = defineProps({
  modelValue: { type: String, default: '' },
  escopo: { type: String, default: 'comunidade' },
  placeholder: { type: String, default: 'Pesquisar...' }
})
const emit = defineEmits(['update:modelValue', 'categoria'])

const router = useRouter()
const idLista = `sug-${Math.random().toString(36).slice(2, 8)}`
const campo = ref(null)
const aberto = ref(false)
const ativo = ref(-1)
const dados = ref({ projetos: [], pessoas: [], categorias: [] })

// Junta tudo numa lista com índice contínuo (para as setas do teclado)
const grupos = computed(() => {
  let i = 0
  const montar = (nome, lista, fazer) => lista.length ? { nome, itens: lista.map(x => ({ ...fazer(x), indice: i++ })) } : null
  return [
    montar('Projetos', dados.value.projetos, p => ({ id: `p${p.id}`, tipo: 'projeto', alvo: p, icone: '▣', rotulo: p.nome, detalhe: p.categoria })),
    montar('Pessoas', dados.value.pessoas, p => ({ id: `u${p.id}`, tipo: 'pessoa', alvo: p, icone: '☺', rotulo: p.nome, detalhe: '@' + p.usuario })),
    montar('Categorias', dados.value.categorias, c => ({ id: `c${c}`, tipo: 'categoria', alvo: c, icone: '#', rotulo: c, detalhe: 'filtrar' }))
  ].filter(Boolean)
})
const itens = computed(() => grupos.value.flatMap(g => g.itens))

let espera = null
let pedido = 0
function digitou(e) {
  emit('update:modelValue', e.target.value)
  clearTimeout(espera)
  const q = e.target.value.trim()
  if (q.length < 2) { aberto.value = false; dados.value = { projetos: [], pessoas: [], categorias: [] }; return }
  espera = setTimeout(() => buscar(q), 250)
}

async function buscar(q) {
  const meu = ++pedido // descarta resposta velha se a pessoa continuou digitando
  try {
    const r = await api(`/busca/sugestoes?q=${encodeURIComponent(q)}&escopo=${props.escopo}`)
    if (meu !== pedido) return
    dados.value = r
    ativo.value = -1
    aberto.value = itens.value.length > 0 && document.activeElement === campo.value
  } catch { aberto.value = false }
}

const focou = () => { if (itens.value.length && (props.modelValue || '').trim().length >= 2) aberto.value = true }
const aoSair = () => setTimeout(() => { aberto.value = false }, 120)

function escolher(item) {
  aberto.value = false
  if (item.tipo === 'projeto') router.push(props.escopo === 'meus' ? `/Projetos/${item.alvo.id}` : `/Comunidade/${item.alvo.id}`)
  else if (item.tipo === 'pessoa') router.push(`/Perfil/${item.alvo.usuario}`)
  else emit('categoria', item.alvo)
}

function teclou(e) {
  if (e.key === 'Escape' && aberto.value) { e.preventDefault(); aberto.value = false; return }
  if (!itens.value.length) return
  if (e.key === 'ArrowDown') { e.preventDefault(); aberto.value = true; ativo.value = (ativo.value + 1) % itens.value.length }
  else if (e.key === 'ArrowUp') { e.preventDefault(); aberto.value = true; ativo.value = (ativo.value - 1 + itens.value.length) % itens.value.length }
  else if (e.key === 'Enter' && aberto.value && ativo.value >= 0) { e.preventDefault(); escolher(itens.value[ativo.value]) }
}

// Se o texto foi limpo de fora (botão "Limpar"), fecha as sugestões
watch(() => props.modelValue, v => { if (!(v || '').trim()) aberto.value = false })
onBeforeUnmount(() => clearTimeout(espera))
</script>

<style scoped>
.busca { position: relative; min-width: 0; }
.lupa { position: absolute; left: 12px; top: 21px; width: 18px; height: 18px; transform: translateY(-50%); fill: none; stroke: var(--texto-suave); stroke-width: 2; stroke-linecap: round; pointer-events: none; }
input { width: 100%; height: 42px; padding: 0 12px 0 40px; border: 1px solid var(--borda); border-radius: 8px; background: var(--superficie); color: var(--texto); font: inherit; }

.sugestoes {
  position: absolute;
  top: 46px;
  left: 0;
  right: 0;
  z-index: 30;
  max-height: 360px;
  overflow-y: auto;
  margin: 0;
  padding: 6px;
  list-style: none;
  background: var(--superficie);
  border: 1px solid var(--borda);
  border-radius: 10px;
  box-shadow: var(--sombra);
}
.grupo { padding: 8px 10px 4px; color: var(--texto-suave); font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
li[role="option"] { display: flex; align-items: baseline; gap: 10px; padding: 8px 10px; border-radius: 7px; cursor: pointer; }
li[role="option"].ativo { background: var(--b-azul-bg); }
.tipo { flex-shrink: 0; width: 18px; color: var(--azul); text-align: center; font-weight: 800; }
.rotulo { flex: 1; min-width: 0; overflow: hidden; color: var(--tinta); font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
small { flex-shrink: 0; color: var(--texto-suave); font-size: 12px; }
</style>
