<template>
  <Transition name="msg">
    <div v-if="texto" class="message-container" :class="tipo" :role="tipo === 'erro' ? 'alert' : 'status'" :aria-live="tipo === 'erro' ? 'assertive' : 'polite'">
      <svg class="icone" viewBox="0 0 24 24" aria-hidden="true">
        <template v-if="tipo === 'sucesso'"><circle cx="12" cy="12" r="9.500" /><path d="M7.500 12.500l3 3 6-6.500" /></template>
        <template v-else-if="tipo === 'erro'"><path d="M12 3.500l9.500 16.500h-19z" /><path d="M12 10v4.500M12 17.200v.1" /></template>
        <template v-else><circle cx="12" cy="12" r="9.500" /><path d="M12 11v5.500M12 7.800v.1" /></template>
      </svg>
      <p>{{ texto }}</p>
    </div>
  </Transition>
</template>

<script setup>
// Aceita um texto simples (aviso de informação) ou { texto, tipo } com tipo 'sucesso' | 'erro' | 'info'
import { computed } from 'vue'

const props = defineProps({ msg: { type: [String, Object], default: null } })
const texto = computed(() => (typeof props.msg === 'string' ? props.msg : props.msg?.texto || ''))
const tipo = computed(() => (typeof props.msg === 'object' && props.msg?.tipo) || 'info')
</script>

<style scoped>
.message-container {
  position: fixed;
  top: 88px;
  right: 20px;
  z-index: 20;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  max-width: 380px;
  padding: 12px 16px;
  box-shadow: var(--sombra);
  font-weight: 600;
  border: 1px solid;
  border-left-width: 6px;
  border-radius: 10px;
}
p { margin: 0; overflow-wrap: anywhere; }
.icone { flex-shrink: 0; width: 22px; height: 22px; margin-top: 1px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

.info { color: var(--b-azul-fg); background: var(--b-azul-bg); border-color: var(--azul-claro); border-left-color: var(--azul); }
.sucesso { color: var(--b-verde-fg); background: var(--b-verde-bg); border-color: var(--b-verde-fg); }
.erro { color: var(--b-vermelho-fg); background: var(--b-vermelho-bg); border-color: var(--b-vermelho-fg); }

@media (max-width: 520px) {
  .message-container { left: 12px; right: 12px; max-width: none; }
}

/* Animação de entrada e saída */
.msg-enter-active,
.msg-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.msg-enter-from,
.msg-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
