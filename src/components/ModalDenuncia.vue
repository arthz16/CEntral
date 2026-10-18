<template>
  <Transition name="modal">
    <div v-if="denuncia.aberta" class="fundo-modal" @mousedown.self="fecharDenuncia(false)">
      <form class="janela" role="dialog" aria-modal="true" aria-labelledby="den-titulo" ref="janela" @submit.prevent="enviar">
        <h2 id="den-titulo">{{ denuncia.titulo }}</h2>
        <p class="intro">A administração vai analisar. Quem você denunciou não sabe que foi você.</p>

        <fieldset>
          <legend>Qual é o problema?</legend>
          <label v-for="m in MOTIVOS" :key="m.id" class="opcao" :class="{ marcada: motivo === m.id }">
            <input type="radio" name="motivo" :value="m.id" v-model="motivo" required>
            <span><strong>{{ m.nome }}</strong><small>{{ m.dica }}</small></span>
          </label>
        </fieldset>

        <label class="campo">
          <span>Detalhes {{ motivo === 'outro' ? '(obrigatório)' : '(opcional)' }}</span>
          <textarea v-model="detalhe" rows="3" maxlength="500" :required="motivo === 'outro'" placeholder="Conte o que aconteceu"></textarea>
        </label>

        <p v-if="erro" class="erro" role="alert">{{ erro }}</p>

        <div class="botoes">
          <button type="button" class="cancelar" @click="fecharDenuncia(false)">Cancelar</button>
          <button type="submit" class="confirmar" :disabled="enviando || !motivo">{{ enviando ? 'Enviando...' : 'Enviar denúncia' }}</button>
        </div>
      </form>
    </div>
  </Transition>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { api } from '../services/api'
import { denuncia, fecharDenuncia } from '../services/denunciar'

const MOTIVOS = [
  { id: 'spam', nome: 'Spam ou golpe', dica: 'Propaganda, links suspeitos, enganação' },
  { id: 'ofensivo', nome: 'Ofensivo', dica: 'Palavrões, humilhação, discurso de ódio' },
  { id: 'assedio', nome: 'Assédio ou ameaça', dica: 'Perseguição, intimidação' },
  { id: 'inadequado', nome: 'Conteúdo inadequado', dica: 'Não combina com o site' },
  { id: 'outro', nome: 'Outro motivo', dica: 'Explique nos detalhes' }
]

const motivo = ref('')
const detalhe = ref('')
const erro = ref('')
const enviando = ref(false)

const janela = ref(null)
let focoAnterior = null
const focaveis = () => [...(janela.value?.querySelectorAll('input, textarea, button:not([disabled])') || [])]

// Esc e Tab valem em qualquer lugar da página enquanto a janela está aberta (o foco pode ter saído dela)
function aoTeclar(e) {
  if (e.key === 'Escape') { e.preventDefault(); fecharDenuncia(false) }
  if (e.key === 'Tab') {
    const lista = focaveis()
    if (!lista.length) return
    const primeiro = lista[0], ultimo = lista[lista.length - 1]
    if (!janela.value.contains(document.activeElement)) { e.preventDefault(); primeiro.focus() }
    else if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus() }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus() }
  }
}

// Cada vez que abre, começa limpa e o foco vai para dentro; ao fechar, volta para onde estava
watch(() => denuncia.aberta, async aberta => {
  if (aberta) {
    motivo.value = ''; detalhe.value = ''; erro.value = ''
    focoAnterior = document.activeElement
    window.addEventListener('keydown', aoTeclar)
    await nextTick()
    focaveis()[0]?.focus()
  } else {
    window.removeEventListener('keydown', aoTeclar)
    focoAnterior?.focus?.()
    focoAnterior = null
  }
})
onBeforeUnmount(() => window.removeEventListener('keydown', aoTeclar))

async function enviar() {
  erro.value = ''
  enviando.value = true
  try {
    await api('/denuncias', { metodo: 'POST', corpo: { ...denuncia.alvo, motivo: motivo.value, detalhe: detalhe.value } })
    fecharDenuncia(true)
  } catch (e) {
    erro.value = e.message
  } finally {
    enviando.value = false
  }
}
</script>

<style scoped>
.fundo-modal { position: fixed; inset: 0; z-index: 4000; display: grid; place-items: center; padding: 20px; background: rgba(6, 9, 14, 0.6); overflow-y: auto; }
.janela { width: 100%; max-width: 460px; padding: 26px; background: var(--superficie); color: var(--texto); border: 1px solid var(--borda); border-radius: 16px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35); }
h2 { margin-bottom: 4px; color: var(--tinta); font-size: 20px; }
.intro { margin-bottom: 14px; color: var(--texto-suave); font-size: 14px; }
fieldset { margin: 0 0 14px; padding: 0; border: 0; display: grid; gap: 8px; }
legend { margin-bottom: 8px; padding: 0; color: var(--texto); font-size: 14px; font-weight: 700; }
.opcao { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border: 2px solid var(--borda); border-radius: 10px; cursor: pointer; transition: var(--transicao); }
.opcao:hover { border-color: var(--borda-forte); }
.opcao.marcada { border-color: var(--azul); background: var(--superficie-suave); }
.opcao input { margin-top: 4px; accent-color: var(--azul-botao); }
.opcao strong { display: block; color: var(--tinta); font-size: 14px; }
.opcao small { display: block; color: var(--texto-suave); font-size: 12px; }
.campo span { display: block; margin-bottom: 6px; color: var(--texto); font-size: 14px; font-weight: 600; }
textarea { width: 100%; padding: 10px 12px; background: var(--superficie); color: var(--texto); border: 2px solid var(--borda); border-radius: 8px; font: inherit; resize: vertical; }
textarea:focus { outline: none; border-color: var(--azul); }
.erro { margin-top: 10px; color: var(--b-vermelho-fg); font-size: 14px; font-weight: 600; }
.botoes { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }
button { padding: 10px 20px; border-radius: 8px; font: inherit; font-weight: 700; cursor: pointer; transition: var(--transicao); }
.cancelar { background: transparent; color: var(--texto); border: 2px solid var(--borda-forte); }
.cancelar:hover { border-color: var(--azul); color: var(--azul); }
.confirmar { background: var(--azul-botao); color: #fff; border: 2px solid var(--azul-botao); }
.confirmar:hover:not(:disabled) { background: var(--azul-escuro); border-color: var(--azul-escuro); }
.confirmar:disabled { opacity: 0.55; cursor: not-allowed; }
.modal-enter-active, .modal-leave-active { transition: opacity 0.15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
@media (max-width: 420px) { .botoes { flex-direction: column-reverse; } }
</style>
