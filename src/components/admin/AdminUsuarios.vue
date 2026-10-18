<template>
  <div>
    <Message :msg="aviso" />

    <div class="filtros card" role="search">
      <div class="busca">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
        <input type="search" v-model="filtros.busca" placeholder="Pesquisar por nome, @ ou e-mail..." aria-label="Pesquisar pessoas">
      </div>
      <select v-model="filtros.filtro" aria-label="Filtrar pessoas">
        <option value="">Todas as pessoas</option>
        <option value="suspensos">Só suspensas</option>
        <option value="admins">Só administradores</option>
      </select>
      <button v-if="temFiltro" type="button" class="btn-filtro escuro" @click="limpar">Limpar</button>
    </div>

    <div v-if="erro" class="vazio erro-box" role="alert">{{ erro }}</div>
    <GradeEsqueleto v-else-if="!dados" :quantidade="3" />
    <template v-else>
      <div v-if="!dados.total" class="vazio">Nenhuma pessoa encontrada.</div>
      <template v-else>
        <p class="contagem" aria-live="polite">{{ dados.total }} pessoa(s)<template v-if="dados.paginas > 1"> · página {{ dados.pagina }} de {{ dados.paginas }}</template></p>

        <div class="lista-admin" :class="{ carregando }">
          <article v-for="u in dados.itens" :key="u.id" class="card linha-admin">
            <div class="topo">
              <h3><RouterLink :to="`/Perfil/${u.usuario}`">{{ u.nome }}</RouterLink><SeloAdmin v-if="u.papel === 'admin'" /> <small>@{{ u.usuario }}</small></h3>
              <span v-if="u.papel === 'admin'" class="etq azul">Administrador</span>
              <span v-if="u.suspenso" class="etq vermelho">Suspensa</span>
              <span v-if="u.denunciasAbertas" class="etq amarelo">{{ u.denunciasAbertas }} denúncia(s) aberta(s)</span>
            </div>
            <div class="meta-linha">
              <span>{{ u.email }}</span>
              <span>{{ u.totalProjetos }} projeto(s)</span>
              <span>Entrou em {{ quando(u.criadoEm) }}</span>
            </div>
            <p v-if="u.suspenso" class="citacao">
              Suspensa {{ u.suspenso.ate ? `até ${new Date(u.suspenso.ate).toLocaleDateString('pt-BR')}` : 'por tempo indeterminado' }}
              por @{{ u.suspenso.por }}. Motivo: {{ u.suspenso.motivo }}
            </p>

            <div class="acoes-linha">
              <template v-if="u.id !== auth.usuario.id">
                <button v-if="u.suspenso" type="button" class="btn-mini principal" @click="encerrarSuspensao(u)">Encerrar suspensão</button>
                <button v-else-if="u.papel !== 'admin'" type="button" class="btn-mini perigo" @click="suspender(u)">Suspender</button>
                <button v-if="u.papel !== 'admin' && !u.suspenso" type="button" class="btn-mini" @click="mudarPapel(u, 'admin')">Tornar administrador</button>
                <button v-if="u.papel === 'admin'" type="button" class="btn-mini" @click="mudarPapel(u, 'usuario')">Rebaixar para usuário</button>
                <button v-if="u.papel !== 'admin'" type="button" class="btn-mini perigo" @click="excluir(u)">Excluir conta</button>
              </template>
              <span v-else class="detalhe">Esta é a sua conta.</span>
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
import SeloAdmin from '../SeloAdmin.vue'
import Paginacao from '../Paginacao.vue'
import { useListaPaginada } from '../../composables/useListaPaginada'
import { useAviso } from '../../composables/useAviso'
import { api } from '../../services/api'
import { confirmar } from '../../services/confirmar'
import { quando } from '../../services/utils'
import { auth } from '../../stores/auth'

const emit = defineEmits(['mudou'])
const { filtros, dados, carregando, erro, temFiltro, carregar, limpar, irParaPagina } = useListaPaginada('/admin/usuarios', { busca: '', filtro: '' }, { limite: 15 })
carregar()

const { aviso, avisar } = useAviso()
async function executar(fn, sucesso) {
  try { await fn(); avisar(sucesso); await carregar(true); emit('mudou') } catch (e) { avisar(e.message, 'erro') }
}

async function suspender(u) {
  const r = await confirmar({ titulo: `Suspender @${u.usuario}?`, texto: 'A pessoa perde o login na hora e some da Comunidade. Ao tentar entrar, ela vê o motivo.', botao: 'Suspender', perigo: true, motivo: true, duracao: true })
  if (r) executar(() => api(`/admin/usuarios/${u.id}/banir`, { metodo: 'POST', corpo: r }), `@${u.usuario} foi suspensa.`)
}
async function encerrarSuspensao(u) {
  if (await confirmar({ titulo: `Encerrar a suspensão de @${u.usuario}?`, texto: 'A pessoa volta a poder entrar e os projetos dela voltam a aparecer.', botao: 'Encerrar suspensão' })) {
    executar(() => api(`/admin/usuarios/${u.id}/desbanir`, { metodo: 'POST' }), 'Suspensão encerrada.')
  }
}
async function mudarPapel(u, papel) {
  const promover = papel === 'admin'
  const ok = await confirmar({
    titulo: promover ? `Tornar @${u.usuario} administrador?` : `Rebaixar @${u.usuario}?`,
    texto: promover ? 'Administradores veem tudo, suspendem pessoas e excluem conteúdo. Só faça isso com quem você confia.' : 'A pessoa perde o acesso à administração na hora.',
    botao: promover ? 'Tornar administrador' : 'Rebaixar', perigo: !promover
  })
  if (ok) executar(() => api(`/admin/usuarios/${u.id}/papel`, { metodo: 'POST', corpo: { papel } }), promover ? 'Agora é administrador.' : 'Rebaixado para usuário.')
}
async function excluir(u) {
  const r = await confirmar({ titulo: `Excluir a conta de @${u.usuario}?`, texto: 'A conta, os projetos, os comentários e as curtidas dela serão apagados para sempre.', botao: 'Excluir conta', perigo: true, motivo: true })
  if (r) executar(() => api(`/admin/usuarios/${u.id}`, { metodo: 'DELETE', corpo: { motivo: r.motivo } }), 'Conta excluída.')
}
</script>

<style scoped>
.carregando { opacity: 0.55; pointer-events: none; }
h3 small { color: var(--texto-suave); font-weight: 600; font-size: 14px; }
</style>
