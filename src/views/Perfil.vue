<template>
  <div>
    <Banner title="Perfil" subtitle="Os projetos públicos de quem faz parte da comunidade"
            imagem="/img/fundoVariado.png" variante="claro" compacto />

    <div class="main-container">
      <Message :msg="aviso" />
      <ModalPessoas :aberto="rede.aberta" :titulo="rede.titulo" :pessoas="rede.lista" :carregando="rede.carregando"
                    :vazio="rede.tipo === 'seguidores' ? 'Ainda não há seguidores.' : 'Ainda não segue ninguém.'" @fechar="rede.aberta = false" />
      <div v-if="erro" class="vazio erro-box" role="alert">
        {{ erro }}
        <p><RouterLink to="/Comunidade">Voltar para a Comunidade</RouterLink></p>
      </div>
      <GradeEsqueleto v-else-if="!dados" :quantidade="3" />

      <template v-else>
        <section class="cabecalho card" aria-label="Dados do perfil">
          <div class="avatar-grande" aria-hidden="true">{{ dados.perfil.nome.charAt(0).toUpperCase() }}</div>
          <div class="quem">
            <h2>{{ dados.perfil.nome }}<span v-if="dados.souEu" class="voce">você</span><SeloAdmin v-if="dados.perfil.papel === 'admin'" tamanho="g" class="selo-perfil" /></h2>
            <p class="arroba">@{{ dados.perfil.usuario }}</p>
            <p v-if="dados.perfil.bio" class="bio">{{ dados.perfil.bio }}</p>
            <p class="desde">Na comunidade desde {{ desde }}</p>
          </div>
          <div class="numeros">
            <div><strong>{{ dados.totalProjetos }}</strong><span>{{ dados.totalProjetos === 1 ? 'projeto' : 'projetos' }}</span></div>
            <div><strong>{{ dados.totalCurtidas }}</strong><span>{{ dados.totalCurtidas === 1 ? 'curtida' : 'curtidas' }}</span></div>
            <button type="button" @click="abrirRede('seguidores')"><strong>{{ dados.seguidores }}</strong><span>{{ dados.seguidores === 1 ? 'seguidor' : 'seguidores' }}</span></button>
            <button type="button" @click="abrirRede('seguindo')"><strong>{{ dados.seguindo }}</strong><span>seguindo</span></button>
          </div>
          <RouterLink v-if="dados.souEu" class="btn btn-outline" to="/Conta">Editar perfil</RouterLink>

          <!-- Denunciar e bloquear (pessoas comuns) / suspender (administração) -->
          <div v-if="!dados.souEu" class="acoes-perfil">
            <button type="button" class="btn seguir" :class="{ 'btn-outline': dados.euSigo }" :aria-pressed="dados.euSigo" :disabled="seguindoAgora" @click="alternarSeguir">
              {{ dados.euSigo ? '✓ Seguindo' : 'Seguir' }}
            </button>
            <template v-if="!eAdmin">
              <button type="button" class="btn-mini" @click="denunciarPessoa">Denunciar</button>
              <button v-if="dados.perfil.papel !== 'admin'" type="button" class="btn-mini" @click="bloquear">Bloquear</button>
            </template>
            <template v-else-if="dados.perfil.papel !== 'admin'">
              <button v-if="dados.suspenso" type="button" class="btn-mini principal" @click="encerrarSuspensao">Encerrar suspensão</button>
              <button v-else type="button" class="btn-mini perigo" @click="suspender">Suspender</button>
            </template>
          </div>
        </section>

        <p v-if="dados.suspenso" class="aviso-suspenso" role="note">
          Esta pessoa está <strong>suspensa</strong> {{ dados.suspenso.ate ? `até ${new Date(dados.suspenso.ate).toLocaleDateString('pt-BR')}` : 'por tempo indeterminado' }}.
          Motivo: {{ dados.suspenso.motivo }}. Só a administração vê esta página.
        </p>

        <p v-if="dados.souEu" class="nota">Assim as outras pessoas veem o seu perfil. Projetos privados não aparecem aqui.</p>

        <EstadoVazio v-if="!dados.total" tipo="comunidade"
                     :titulo="dados.souEu ? 'Você ainda não tem projetos públicos' : 'Nenhum projeto público ainda'"
                     :texto="dados.souEu ? 'Cadastre um projeto (ou deixe um dos seus como público) para ele aparecer aqui e na Comunidade.' : 'Quando esta pessoa publicar um projeto, ele aparece aqui.'">
          <RouterLink v-if="dados.souEu" class="btn" to="/CadastrosProjetos">Cadastrar projeto</RouterLink>
        </EstadoVazio>

        <template v-else>
          <div class="grade-projetos" :class="{ carregando }">
            <ProjetoCard v-for="p in dados.projetos" :key="p.id" :projeto="p" modo="perfil" />
          </div>
          <Paginacao :pagina="dados.pagina" :paginas="dados.paginas" @ir="irParaPagina" />
        </template>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Banner from '../components/Banner.vue'
import Message from '../components/Message.vue'
import ModalPessoas from '../components/ModalPessoas.vue'
import SeloAdmin from '../components/SeloAdmin.vue'
import EstadoVazio from '../components/EstadoVazio.vue'
import GradeEsqueleto from '../components/GradeEsqueleto.vue'
import Paginacao from '../components/Paginacao.vue'
import ProjetoCard from '../components/ProjetoCard.vue'
import { useListaPaginada } from '../composables/useListaPaginada'
import { useAviso } from '../composables/useAviso'
import { api } from '../services/api'
import { confirmar } from '../services/confirmar'
import { denunciar } from '../services/denunciar'
import { auth } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const eAdmin = computed(() => auth.usuario?.papel === 'admin')
const { aviso, avisar } = useAviso()
const { pagina, dados, carregando, erro, carregar, irParaPagina } = useListaPaginada(
  () => `/perfil/${encodeURIComponent(route.params.usuario)}`, {}, { rolarPara: '.cabecalho' }
)

const desde = computed(() =>
  new Date(dados.value.perfil.criadoEm).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
)

// Seguir / deixar de seguir
const seguindoAgora = ref(false)
async function alternarSeguir() {
  const p = dados.value.perfil
  seguindoAgora.value = true
  try {
    const r = await api(`/usuarios/${p.id}/seguir`, { metodo: dados.value.euSigo ? 'DELETE' : 'POST' })
    dados.value.euSigo = r.seguindo
    dados.value.seguidores = r.seguidores
    avisar(r.seguindo ? `Você começou a seguir ${p.nome}.` : `Você deixou de seguir ${p.nome}.`)
  } catch (e) { avisar(e.message, 'erro') } finally { seguindoAgora.value = false }
}

// Lista de seguidores / de quem a pessoa segue
const rede = ref({ aberta: false, tipo: 'seguidores', titulo: '', lista: [], carregando: false })
async function abrirRede(tipo) {
  const p = dados.value.perfil
  rede.value = { aberta: true, tipo, titulo: tipo === 'seguidores' ? `Seguidores de ${p.nome}` : `${p.nome} segue`, lista: [], carregando: true }
  try { rede.value.lista = await api(`/perfil/${encodeURIComponent(p.usuario)}/rede?tipo=${tipo}`) } catch (e) { avisar(e.message, 'erro') } finally { rede.value.carregando = false }
}

async function denunciarPessoa() {
  if (await denunciar({ tipo: 'usuario', usuarioId: dados.value.perfil.id, titulo: `Denunciar @${dados.value.perfil.usuario}` })) {
    avisar('Denúncia enviada. A administração vai analisar.')
  }
}
async function bloquear() {
  const p = dados.value.perfil
  const ok = await confirmar({
    titulo: `Bloquear @${p.usuario}?`,
    texto: 'Vocês dois deixam de ver os projetos, o perfil e os comentários um do outro, e @' + p.usuario + ' não consegue curtir nem comentar nos seus projetos. Você pode desbloquear em Conta.',
    botao: 'Bloquear', perigo: true
  })
  if (!ok) return
  try {
    await api(`/usuarios/${p.id}/bloquear`, { metodo: 'POST' })
    router.push('/Comunidade')
  } catch (e) { avisar(e.message, 'erro') }
}
async function suspender() {
  const p = dados.value.perfil
  const r = await confirmar({ titulo: `Suspender @${p.usuario}?`, texto: 'A pessoa perde o login na hora e some da Comunidade. Ao tentar entrar, ela vê o motivo.', botao: 'Suspender', perigo: true, motivo: true, duracao: true })
  if (!r) return
  try { await api(`/admin/usuarios/${p.id}/banir`, { metodo: 'POST', corpo: r }); avisar('Pessoa suspensa.'); carregar(true) } catch (e) { avisar(e.message, 'erro') }
}
async function encerrarSuspensao() {
  const p = dados.value.perfil
  if (!(await confirmar({ titulo: `Encerrar a suspensão de @${p.usuario}?`, botao: 'Encerrar suspensão' }))) return
  try { await api(`/admin/usuarios/${p.id}/desbanir`, { metodo: 'POST' }); avisar('Suspensão encerrada.'); carregar(true) } catch (e) { avisar(e.message, 'erro') }
}

// Ao ir de um perfil para outro (clicando no nome de alguém), volta para a página 1
watch(() => route.params.usuario, () => { pagina.value = 1; dados.value = null; carregar() })
carregar()
</script>

<style scoped>
.cabecalho { display: flex; align-items: center; flex-wrap: wrap; gap: 14px 24px; margin-bottom: 22px; padding: 24px; }
.cabecalho:hover { transform: none; box-shadow: none; }
.avatar-grande { flex-shrink: 0; width: 76px; height: 76px; display: grid; place-items: center; border-radius: 50%; background: var(--avatar-bg); color: var(--azul-claro); font-size: 32px; font-weight: 800; }
.quem { flex: 1; min-width: 200px; }
.quem h2 { color: var(--tinta); overflow-wrap: anywhere; }
.voce { margin-left: 10px; padding: 3px 9px; border-radius: 999px; background: var(--b-azul-bg); border: 1px solid var(--azul-claro); color: var(--b-azul-fg); font-size: 12px; font-weight: 700; vertical-align: middle; }
.arroba { color: var(--azul); font-weight: 700; }
.desde { margin-top: 2px; color: var(--texto-suave); font-size: 13px; }
.numeros { display: flex; flex-wrap: wrap; gap: 10px; }
.numeros div, .numeros button { min-width: 92px; padding: 10px 14px; background: transparent; border: 1px solid var(--borda); border-radius: 10px; font: inherit; text-align: center; }
.numeros button { cursor: pointer; transition: var(--transicao); }
.numeros button:hover { border-color: var(--azul); background: var(--b-azul-bg); }
.bio { margin: 6px 0 4px; max-width: 520px; color: var(--texto); overflow-wrap: anywhere; white-space: pre-wrap; }
.seguir { padding: 7px 18px; font-size: 14px; }
@media (max-width: 560px) {
  .cabecalho { padding: 18px; }
  .numeros { width: 100%; }
  .numeros div, .numeros button { flex: 1 1 70px; min-width: 0; padding: 8px 6px; }
}
.numeros strong { display: block; color: var(--tinta); font-size: 22px; }
.numeros span { color: var(--texto-suave); font-size: 12px; }
.nota { margin-bottom: 20px; color: var(--texto-suave); font-size: 13px; }
.selo-perfil { margin-left: 8px; }
.acoes-perfil { display: flex; flex-wrap: wrap; gap: 8px; width: 100%; }
.aviso-suspenso { margin-bottom: 20px; padding: 12px 16px; background: var(--b-vermelho-bg); border: 1px solid var(--b-vermelho-borda); border-radius: 10px; color: var(--b-vermelho-fg); font-size: 14px; }
</style>
