<template>
  <Transition name="modal">
    <div v-if="modal.aberto" class="fundo-modal" @mousedown.self="responder(false)">
      <form class="janela" role="alertdialog" aria-modal="true" aria-labelledby="modal-titulo" aria-describedby="modal-texto" ref="janela"
            @submit.prevent="confirmarAgora">
        <h2 id="modal-titulo">{{ modal.titulo }}</h2>
        <p id="modal-texto" v-if="modal.texto">{{ modal.texto }}</p>

        <!-- Um campo de texto (ex.: novo nome), com sugestões -->
        <label v-if="modal.entrada" class="campo">
          <span>{{ modal.rotuloEntrada }}</span>
          <input v-model="modal.valorEntrada" type="text" maxlength="40" :list="`${idLista}-opcoes`" required>
          <datalist :id="`${idLista}-opcoes`"><option v-for="o in modal.opcoesEntrada" :key="o" :value="o" /></datalist>
        </label>

        <!-- Ações da administração: motivo (e duração) -->
        <label v-if="modal.motivo" class="campo">
          <span>{{ modal.rotuloMotivo }}</span>
          <textarea v-model="modal.valorMotivo" rows="3" maxlength="300" placeholder="Explique em poucas palavras (a pessoa pode ler)" required minlength="3"></textarea>
        </label>
        <label v-if="modal.duracao" class="campo">
          <span>Duração</span>
          <select v-model="modal.valorDias">
            <option value="">Por tempo indeterminado</option>
            <option value="1">1 dia</option>
            <option value="7">7 dias</option>
            <option value="30">30 dias</option>
            <option value="90">90 dias</option>
          </select>
        </label>

        <div class="botoes">
          <button type="button" class="cancelar" @click="responder(false)">Cancelar</button>
          <button type="submit" class="confirmar" :class="{ perigo: modal.perigo }" :disabled="faltaMotivo">{{ modal.botao }}</button>
        </div>
      </form>
    </div>
  </Transition>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { modal, responder } from '../services/confirmar'

const janela = ref(null)
let focoAnterior = null

const idLista = `modal-${Math.random().toString(36).slice(2, 7)}`
const faltaMotivo = computed(() => (modal.motivo && modal.valorMotivo.trim().length < 3) || (modal.entrada && !modal.valorEntrada.trim()))
const confirmarAgora = () => { if (!faltaMotivo.value) responder(true) }

const focaveis = () => [...(janela.value?.querySelectorAll('input, textarea, select, button:not([disabled])') || [])]

// Ao abrir: foca no primeiro campo (ou no botão seguro, Cancelar). Ao fechar: devolve o foco para onde estava.
watch(() => modal.aberto, async aberto => {
  if (aberto) {
    focoAnterior = document.activeElement
    window.addEventListener('keydown', aoTeclar)
    await nextTick()
    const lista = focaveis()
    ;(modal.motivo || modal.entrada ? lista[0] : lista.find(b => b.classList.contains('cancelar')))?.focus()
  } else {
    window.removeEventListener('keydown', aoTeclar)
    focoAnterior?.focus?.()
    focoAnterior = null
  }
})
onBeforeUnmount(() => window.removeEventListener('keydown', aoTeclar))

// Esc cancela e o Tab fica preso dentro da janela (vale em qualquer lugar da página, mesmo se o foco saiu dela)
function aoTeclar(e) {
  if (e.key === 'Escape') { e.preventDefault(); responder(false) }
  if (e.key === 'Tab') {
    const lista = focaveis()
    if (!lista.length) return
    const primeiro = lista[0], ultimo = lista[lista.length - 1]
    if (!janela.value?.contains(document.activeElement)) { e.preventDefault(); primeiro.focus() }
    else if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus() }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus() }
  }
}
</script>

<style scoped>
.fundo-modal {
  position: fixed;
  inset: 0;
  z-index: 4000;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(6, 9, 14, 0.6);
}
.janela {
  width: 100%;
  max-width: 440px;
  padding: 26px;
  background: var(--superficie);
  color: var(--texto);
  border: 1px solid var(--borda);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
}
h2 { margin-bottom: 8px; color: var(--tinta); font-size: 20px; }
p { color: var(--texto-suave); overflow-wrap: anywhere; }
.campo { display: block; margin-top: 16px; }
.campo span { display: block; margin-bottom: 6px; color: var(--texto); font-size: 14px; font-weight: 600; }
textarea, select, input {
  width: 100%;
  padding: 10px 12px;
  background: var(--superficie);
  color: var(--texto);
  border: 2px solid var(--borda);
  border-radius: 8px;
  font: inherit;
}
textarea { resize: vertical; }
textarea:focus, select:focus, input:focus { outline: none; border-color: var(--azul); box-shadow: 0 0 0 3px rgba(124, 200, 255, 0.3); }
.botoes { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; }
button { padding: 10px 20px; border-radius: 8px; font: inherit; font-weight: 700; cursor: pointer; transition: var(--transicao); }
.cancelar { background: transparent; color: var(--texto); border: 2px solid var(--borda-forte); }
.cancelar:hover { border-color: var(--azul); color: var(--azul); }
.confirmar { background: var(--azul-botao); color: #fff; border: 2px solid var(--azul-botao); }
.confirmar:hover:not(:disabled) { background: var(--azul-escuro); border-color: var(--azul-escuro); }
.confirmar.perigo { background: #b3261e; border-color: #b3261e; }
.confirmar.perigo:hover:not(:disabled) { background: #8f1d17; border-color: #8f1d17; }
.confirmar:disabled { opacity: 0.55; cursor: not-allowed; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.15s ease; }
.modal-enter-active .janela, .modal-leave-active .janela { transition: transform 0.15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .janela { transform: translateY(10px) scale(0.98); }

@media (max-width: 420px) { .botoes { flex-direction: column-reverse; } }
</style>
