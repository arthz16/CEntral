<template>
  <div>
    <Banner title="Notificações" subtitle="Curtidas, comentários e novos seguidores" imagem="/img/fundoVariado.png" variante="claro" compacto />

    <div class="main-container">
      <Message :msg="aviso" />

      <div v-if="erro" class="vazio erro-box" role="alert">{{ erro }}</div>
      <GradeEsqueleto v-else-if="!dados" :quantidade="3" />

      <template v-else>
        <EstadoVazio v-if="!dados.total" tipo="sino" titulo="Nenhuma notificação por enquanto"
                     texto="Quando alguém curtir ou comentar um projeto seu, ou começar a seguir você, aparece aqui.">
          <RouterLink class="btn" to="/Comunidade">Explorar a Comunidade</RouterLink>
        </EstadoVazio>

        <template v-else>
          <div class="topo">
            <p class="contagem" aria-live="polite">{{ novasNaTela }} nova(s) · {{ dados.total }} no total</p>
            <button type="button" class="btn-mini perigo" @click="limparTudo">Limpar tudo</button>
          </div>

          <ul class="lista" :class="{ carregando }">
            <li v-for="n in dados.itens" :key="n.id" class="card item" :class="{ nova: !visto.has(n.id) }">
              <span class="icone" :class="n.tipo" aria-hidden="true">{{ ICONES[n.tipo] }}</span>
              <div class="corpo">
                <p>
                  <RouterLink class="quem" :to="`/Perfil/${n.de.usuario}`">{{ n.de.nome }}</RouterLink><SeloAdmin v-if="n.de.papel === 'admin'" />
                  {{ TEXTOS[n.tipo] }}
                  <RouterLink v-if="n.projeto" class="alvo" :to="`/Comunidade/${n.projeto.id}${n.tipo === 'comentario' ? '#comentarios' : ''}`">{{ n.projeto.nome }}</RouterLink>
                  <span v-else-if="n.tipo !== 'seguidor'" class="removido">(projeto indisponível)</span>
                </p>
                <p v-if="n.trecho" class="trecho">“{{ n.trecho }}”</p>
                <small>{{ quando(n.em) }}</small>
              </div>
              <span v-if="!visto.has(n.id)" class="ponto" role="img" aria-label="Nova"></span>
            </li>
          </ul>

          <Paginacao :pagina="dados.pagina" :paginas="dados.paginas" @ir="irParaPagina" />
        </template>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import Banner from '../components/Banner.vue'
import EstadoVazio from '../components/EstadoVazio.vue'
import GradeEsqueleto from '../components/GradeEsqueleto.vue'
import Message from '../components/Message.vue'
import Paginacao from '../components/Paginacao.vue'
import SeloAdmin from '../components/SeloAdmin.vue'
import { useAviso } from '../composables/useAviso'
import { useListaPaginada } from '../composables/useListaPaginada'
import { api } from '../services/api'
import { confirmar } from '../services/confirmar'
import { quando } from '../services/utils'
import { auth } from '../stores/auth'

const ICONES = { curtida: '♥', comentario: '✎', seguidor: '+' }
const TEXTOS = { curtida: 'curtiu o seu projeto', comentario: 'comentou no seu projeto', seguidor: 'começou a seguir você' }

const { dados, carregando, erro, carregar, irParaPagina } = useListaPaginada('/notificacoes', {}, { limite: 20, rolarPara: '.topo' })
const { aviso, avisar } = useAviso()
carregar()

// As novas ficam destacadas enquanto a pessoa lê; depois de 2 segundos o servidor as marca como lidas
const visto = ref(new Set())
const novasNaTela = computed(() => (dados.value?.itens || []).filter(n => !visto.value.has(n.id) && !n.lida).length)
let espera = null
watch(dados, d => {
  if (!d) return
  const ids = d.itens.filter(n => n.lida).map(n => n.id)
  visto.value = new Set(ids)
  if (d.naoLidas) {
    clearTimeout(espera)
    espera = setTimeout(async () => {
      try { await api('/notificacoes/lidas', { metodo: 'POST' }); auth.naoLidas = 0 } catch { /* tenta de novo na próxima visita */ }
    }, 2000)
  }
})
onBeforeUnmount(() => clearTimeout(espera))

async function limparTudo() {
  if (!(await confirmar({ titulo: 'Limpar todas as notificações?', texto: 'Elas somem da lista. Não dá para desfazer.', botao: 'Limpar', perigo: true }))) return
  try {
    await api('/notificacoes', { metodo: 'DELETE' })
    auth.naoLidas = 0
    avisar('Notificações apagadas.')
    await carregar(true)
  } catch (e) { avisar(e.message, 'erro') }
}
</script>

<style scoped>
.topo { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 14px; }
.topo .contagem { margin: 0; }
.lista { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; transition: opacity 0.2s; }
.lista.carregando { opacity: 0.55; }
.item { display: flex; align-items: flex-start; gap: 14px; padding: 14px 18px; }
.item:hover { transform: none; box-shadow: none; }
.item.nova { border-color: var(--azul); background: var(--superficie-suave); }
.icone { flex-shrink: 0; width: 38px; height: 38px; display: grid; place-items: center; border-radius: 50%; font-size: 17px; font-weight: 800; }
.icone.curtida { background: var(--b-rosa-bg); color: var(--b-rosa-fg); }
.icone.comentario { background: var(--b-azul-bg); color: var(--b-azul-fg); }
.icone.seguidor { background: var(--b-verde-bg); color: var(--b-verde-fg); }
.corpo { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.corpo p { margin: 0; }
.quem, .alvo { color: var(--tinta); font-weight: 700; }
.quem:hover, .alvo:hover { color: var(--azul); }
.removido { color: var(--texto-suave); font-style: italic; }
.trecho { margin-top: 4px; color: var(--texto-suave); font-size: 14px; }
small { color: var(--texto-suave); font-size: 12px; }
.ponto { flex-shrink: 0; width: 10px; height: 10px; margin-top: 6px; background: var(--azul); border-radius: 50%; }
</style>
