<template>
  <div>
    <Message :msg="aviso" />

    <div class="filtros card" role="search">
      <select v-model="filtros.estado" aria-label="Situação das denúncias">
        <option value="aberta">Abertas (esperando análise)</option>
        <option value="resolvida">Já encerradas</option>
        <option value="todas">Todas</option>
      </select>
    </div>

    <div v-if="erro" class="vazio erro-box" role="alert">{{ erro }}</div>
    <GradeEsqueleto v-else-if="!dados" :quantidade="3" />
    <template v-else>
      <EstadoVazio v-if="!dados.total" tipo="ok" :titulo="filtros.estado === 'aberta' ? 'Nenhuma denúncia esperando análise' : 'Nenhuma denúncia encontrada'"
                   :texto="filtros.estado === 'aberta' ? 'Tudo em dia! Quando alguém denunciar algo, aparece aqui.' : 'Troque o filtro para ver outras.'" />
      <template v-else>
        <p class="contagem" aria-live="polite">{{ dados.total }} denúncia(s)<template v-if="dados.paginas > 1"> · página {{ dados.pagina }} de {{ dados.paginas }}</template></p>

        <div class="lista-admin" :class="{ carregando }">
          <article v-for="d in dados.itens" :key="d.id" class="card linha-admin">
            <div class="topo">
              <span class="etq azul">{{ NOMES_TIPO[d.tipo] }}</span>
              <span class="etq amarelo">{{ NOMES_MOTIVO[d.motivo] }}</span>
              <span v-if="d.status !== 'aberta'" class="etq" :class="d.status === 'resolvida' ? 'verde' : 'cinza'">{{ d.status === 'resolvida' ? 'Resolvida' : 'Ignorada' }}</span>
              <span v-if="d.alvoRemovido" class="etq cinza">Alvo já removido</span>
            </div>

            <h3>
              <template v-if="d.tipo === 'projeto' && d.projeto"><RouterLink :to="`/Comunidade/${d.projeto.id}`">{{ d.projeto.nome }}</RouterLink></template>
              <template v-else-if="d.tipo === 'comentario'">Comentário em <RouterLink v-if="d.projeto" :to="`/Comunidade/${d.projeto.id}`">{{ d.projeto.nome }}</RouterLink></template>
              <template v-else-if="d.pessoa"><RouterLink :to="`/Perfil/${d.pessoa.usuario}`">{{ d.pessoa.nome }}</RouterLink> <small>@{{ d.pessoa.usuario }}</small></template>
              <template v-else>(removido)</template>
            </h3>

            <p v-if="d.comentario" class="citacao">{{ d.comentario.texto }}</p>
            <p v-if="d.detalhe" class="detalhe"><strong>O que a pessoa contou:</strong> {{ d.detalhe }}</p>
            <div class="meta-linha">
              <span>Denunciado por <strong>{{ d.denunciante ? '@' + d.denunciante.usuario : 'conta removida' }}</strong></span>
              <span v-if="d.pessoa && d.tipo !== 'usuario'">Autor: <strong>@{{ d.pessoa.usuario }}</strong><template v-if="d.pessoa.suspenso"> (suspenso)</template></span>
              <span>{{ quando(d.criadoEm) }}</span>
              <span v-if="d.status !== 'aberta'">Encerrada por @{{ d.resolvidoPor }}<template v-if="d.nota"> · {{ d.nota }}</template></span>
            </div>

            <div class="acoes-linha" v-if="d.status === 'aberta'">
              <template v-if="!d.alvoRemovido">
                <template v-if="d.tipo === 'projeto' && d.projeto">
                  <button v-if="!d.projeto.oculto" type="button" class="btn-mini" @click="ocultar(d)">Ocultar projeto</button>
                  <button type="button" class="btn-mini perigo" @click="excluirProjeto(d)">Excluir projeto</button>
                </template>
                <button v-if="d.tipo === 'comentario'" type="button" class="btn-mini perigo" @click="apagarComentario(d)">Apagar comentário</button>
                <button v-if="d.pessoa && !d.pessoa.admin && !d.pessoa.suspenso" type="button" class="btn-mini perigo" @click="suspender(d)">Suspender @{{ d.pessoa.usuario }}</button>
              </template>
              <button type="button" class="btn-mini" @click="encerrar(d, 'ignorada')">Ignorar</button>
              <button type="button" class="btn-mini principal" @click="encerrar(d, 'resolvida')">Marcar como resolvida</button>
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
import EstadoVazio from '../EstadoVazio.vue'
import GradeEsqueleto from '../GradeEsqueleto.vue'
import Message from '../Message.vue'
import Paginacao from '../Paginacao.vue'
import { useListaPaginada } from '../../composables/useListaPaginada'
import { useAviso } from '../../composables/useAviso'
import { api } from '../../services/api'
import { confirmar } from '../../services/confirmar'
import { NOMES_MOTIVO, NOMES_TIPO } from '../../services/moderacao'
import { quando } from '../../services/utils'

const emit = defineEmits(['mudou'])
const { filtros, dados, carregando, erro, carregar, irParaPagina } = useListaPaginada('/admin/denuncias', { estado: 'aberta' }, { limite: 10 })
carregar()

const { aviso, avisar } = useAviso()

// Faz a ação, avisa e atualiza a fila e os contadores
async function executar(fn, sucesso) {
  try { await fn(); avisar(sucesso); await carregar(true); emit('mudou') } catch (e) { avisar(e.message, 'erro') }
}

async function ocultar(d) {
  const r = await confirmar({ titulo: 'Ocultar este projeto?', texto: `"${d.projeto.nome}" sai da Comunidade, mas não é apagado. O dono vê o motivo.`, botao: 'Ocultar', motivo: true })
  if (r) executar(() => api(`/admin/projetos/${d.projeto.id}/ocultar`, { metodo: 'POST', corpo: { motivo: r.motivo } }), 'Projeto ocultado.')
}
async function excluirProjeto(d) {
  const r = await confirmar({ titulo: 'Excluir este projeto?', texto: `"${d.projeto.nome}" será apagado para sempre. O dono vê o motivo.`, botao: 'Excluir', perigo: true, motivo: true })
  if (r) executar(() => api(`/admin/projetos/${d.projeto.id}`, { metodo: 'DELETE', corpo: { motivo: r.motivo } }), 'Projeto excluído.')
}
async function apagarComentario(d) {
  const r = await confirmar({ titulo: 'Apagar este comentário?', texto: 'A pessoa que escreveu é avisada do motivo.', botao: 'Apagar', perigo: true, motivo: true })
  if (r) executar(() => api(`/comunidade/${d.projeto.id}/comentarios/${d.comentario.id}`, { metodo: 'DELETE', corpo: { motivo: r.motivo } }), 'Comentário apagado.')
}
async function suspender(d) {
  const r = await confirmar({ titulo: `Suspender @${d.pessoa.usuario}?`, texto: 'A pessoa perde o login na hora e some da Comunidade. Ao tentar entrar, ela vê o motivo.', botao: 'Suspender', perigo: true, motivo: true, duracao: true })
  if (r) executar(() => api(`/admin/usuarios/${d.pessoa.id}/banir`, { metodo: 'POST', corpo: r }), 'Pessoa suspensa.')
}
async function encerrar(d, status) {
  const r = await confirmar({
    titulo: status === 'resolvida' ? 'Marcar como resolvida?' : 'Ignorar esta denúncia?',
    texto: status === 'resolvida' ? 'Use depois de tomar as providências.' : 'Use quando não há problema no que foi denunciado.',
    botao: status === 'resolvida' ? 'Resolver' : 'Ignorar', motivo: true, rotuloMotivo: 'Anotação (fica no registro)'
  })
  if (r) executar(() => api(`/admin/denuncias/${d.id}`, { metodo: 'POST', corpo: { status, nota: r.motivo } }), status === 'resolvida' ? 'Denúncia resolvida.' : 'Denúncia ignorada.')
}
</script>

<style scoped>
.carregando { opacity: 0.55; pointer-events: none; }
h3 small { color: var(--texto-suave); font-weight: 600; }
</style>
