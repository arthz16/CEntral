<template>
  <div>
    <Message :msg="aviso" />

    <div class="filtros card" role="search">
      <div class="busca">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
        <input type="search" v-model="filtros.busca" placeholder="Pesquisar por projeto, categoria ou @ do dono..." aria-label="Pesquisar projetos">
      </div>
      <select v-model="filtros.estado" aria-label="Situação do projeto">
        <option value="">Todos os projetos</option>
        <option value="publicos">Públicos</option>
        <option value="privados">Privados</option>
        <option value="ocultos">Ocultos pela moderação</option>
      </select>
      <button v-if="temFiltro" type="button" class="btn-filtro escuro" @click="limpar">Limpar</button>
    </div>

    <div v-if="erro" class="vazio erro-box" role="alert">{{ erro }}</div>
    <GradeEsqueleto v-else-if="!dados" :quantidade="3" />
    <template v-else>
      <div v-if="!dados.total" class="vazio">Nenhum projeto encontrado.</div>
      <template v-else>
        <p class="contagem" aria-live="polite">{{ dados.total }} projeto(s)<template v-if="dados.paginas > 1"> · página {{ dados.pagina }} de {{ dados.paginas }}</template></p>

        <div class="lista-admin" :class="{ carregando }">
          <article v-for="p in dados.itens" :key="p.id" class="card linha-admin">
            <div class="topo">
              <h3><RouterLink :to="`/Comunidade/${p.id}`">{{ p.nome }}</RouterLink></h3>
              <span class="etq cinza">{{ p.categoria }}</span>
              <span v-if="p.oculto" class="etq vermelho">Oculto</span>
              <span v-else-if="p.publico" class="etq verde">Público</span>
              <span v-else class="etq cinza">Privado</span>
              <span v-if="p.donoSuspenso" class="etq vermelho">Dono suspenso</span>
            </div>
            <div class="meta-linha">
              <span>de <RouterLink :to="`/Perfil/${p.dono.usuario}`">@{{ p.dono.usuario }}</RouterLink></span>
              <span>{{ p.dataCriacao }}</span>
              <span>{{ p.totalCurtidas }} curtida(s) · {{ p.totalComentarios }} comentário(s)</span>
            </div>
            <p v-if="p.oculto" class="citacao">Ocultado por @{{ p.oculto.por }}. Motivo: {{ p.oculto.motivo }}</p>

            <div class="acoes-linha">
              <RouterLink class="btn-mini" :to="`/Comunidade/${p.id}`">Abrir</RouterLink>
              <button v-if="p.oculto" type="button" class="btn-mini principal" @click="mostrar(p)">Mostrar de novo</button>
              <button v-else type="button" class="btn-mini" @click="ocultar(p)">Ocultar da Comunidade</button>
              <button type="button" class="btn-mini perigo" @click="excluir(p)">Excluir</button>
            </div>
          </article>
        </div>

        <Paginacao :pagina="dados.pagina" :paginas="dados.paginas" @ir="irParaPagina" />
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import GradeEsqueleto from '../GradeEsqueleto.vue'
import Message from '../Message.vue'
import Paginacao from '../Paginacao.vue'
import { useListaPaginada } from '../../composables/useListaPaginada'
import { useAviso } from '../../composables/useAviso'
import { api } from '../../services/api'
import { confirmar } from '../../services/confirmar'

const emit = defineEmits(['mudou'])
const { filtros, dados, carregando, erro, temFiltro, carregar, limpar, irParaPagina } = useListaPaginada('/admin/projetos', { busca: '', estado: '' }, { limite: 15 })
carregar()

const { aviso, avisar } = useAviso()
async function executar(fn, sucesso) {
  try { await fn(); avisar(sucesso); await carregar(true); emit('mudou') } catch (e) { avisar(e.message, 'erro') }
}

async function ocultar(p) {
  const r = await confirmar({ titulo: 'Ocultar este projeto?', texto: `"${p.nome}" sai da Comunidade, mas não é apagado. O dono vê o motivo.`, botao: 'Ocultar', motivo: true })
  if (r) executar(() => api(`/admin/projetos/${p.id}/ocultar`, { metodo: 'POST', corpo: { motivo: r.motivo } }), 'Projeto ocultado.')
}
async function mostrar(p) {
  if (await confirmar({ titulo: 'Mostrar de novo?', texto: `"${p.nome}" volta para a Comunidade (se for público).`, botao: 'Mostrar' })) {
    executar(() => api(`/admin/projetos/${p.id}/mostrar`, { metodo: 'POST' }), 'Projeto visível de novo.')
  }
}
async function excluir(p) {
  const r = await confirmar({ titulo: 'Excluir este projeto?', texto: `"${p.nome}" será apagado para sempre. O dono vê o motivo.`, botao: 'Excluir', perigo: true, motivo: true })
  if (r) executar(() => api(`/admin/projetos/${p.id}`, { metodo: 'DELETE', corpo: { motivo: r.motivo } }), 'Projeto excluído.')
}
</script>

<style scoped>
.carregando { opacity: 0.55; pointer-events: none; }
.meta-linha a { color: var(--azul); font-weight: 700; }
a.btn-mini { display: inline-block; text-align: center; }
</style>
