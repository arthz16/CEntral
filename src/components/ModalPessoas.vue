<template>
  <Transition name="modal">
    <div v-if="aberto" class="fundo-modal" @mousedown.self="$emit('fechar')">
      <section class="janela" role="dialog" aria-modal="true" :aria-label="titulo" ref="janela">
        <header>
          <h2>{{ titulo }}</h2>
          <button type="button" class="fechar" aria-label="Fechar" @click="$emit('fechar')">×</button>
        </header>
        <p v-if="carregando" class="info" role="status">Carregando...</p>
        <p v-else-if="!pessoas.length" class="info">{{ vazio }}</p>
        <ul v-else>
          <li v-for="p in pessoas" :key="p.id">
            <RouterLink :to="`/Perfil/${p.usuario}`" @click="$emit('fechar')">
              <span class="avatar" aria-hidden="true">{{ p.nome.charAt(0).toUpperCase() }}</span>
              <span class="nomes"><strong>{{ p.nome }}</strong><SeloAdmin v-if="p.papel === 'admin'" /><small>@{{ p.usuario }}</small></span>
            </RouterLink>
          </li>
        </ul>
      </section>
    </div>
  </Transition>
</template>

<script setup>
// Lista de pessoas (seguidores / quem a pessoa segue) numa janela.
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import SeloAdmin from './SeloAdmin.vue'

const props = defineProps({
  aberto: { type: Boolean, default: false },
  titulo: { type: String, default: '' },
  pessoas: { type: Array, default: () => [] },
  carregando: { type: Boolean, default: false },
  vazio: { type: String, default: 'Ninguém por aqui ainda.' }
})
const emit = defineEmits(['fechar'])

const janela = ref(null)
let focoAnterior = null
const aoTeclar = e => { if (e.key === 'Escape') { e.preventDefault(); emit('fechar') } }

watch(() => props.aberto, async aberto => {
  if (aberto) {
    focoAnterior = document.activeElement
    window.addEventListener('keydown', aoTeclar)
    await nextTick()
    janela.value?.querySelector('.fechar')?.focus()
  } else {
    window.removeEventListener('keydown', aoTeclar)
    focoAnterior?.focus?.()
  }
})
onBeforeUnmount(() => window.removeEventListener('keydown', aoTeclar))
</script>

<style scoped>
.fundo-modal { position: fixed; inset: 0; z-index: 4000; display: grid; place-items: center; padding: 20px; background: rgba(6, 9, 14, 0.6); }
.janela { width: 100%; max-width: 420px; max-height: 80vh; display: flex; flex-direction: column; padding: 20px 22px; background: var(--superficie); color: var(--texto); border: 1px solid var(--borda); border-radius: 16px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35); }
header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
h2 { color: var(--tinta); font-size: 20px; }
.fechar { width: 34px; height: 34px; background: var(--chip); color: var(--texto); border: 0; border-radius: 50%; font-size: 22px; line-height: 1; cursor: pointer; }
.info { padding: 18px 0; color: var(--texto-suave); text-align: center; }
ul { list-style: none; margin: 0; padding: 0; overflow-y: auto; }
li a { display: flex; align-items: center; gap: 12px; padding: 10px 6px; border-radius: 10px; color: var(--tinta); }
li a:hover { background: var(--b-azul-bg); }
.avatar { flex-shrink: 0; width: 38px; height: 38px; display: grid; place-items: center; border-radius: 50%; background: var(--avatar-bg); color: var(--azul-claro); font-weight: 800; }
.nomes { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 6px; min-width: 0; overflow-wrap: anywhere; }
.nomes small { color: var(--texto-suave); }
.modal-enter-active, .modal-leave-active { transition: opacity 0.15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
