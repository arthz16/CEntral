<template>
  <div>
    <Message :msg="aviso" />

    <div class="filtros card" role="search">
      <CampoBusca v-model="filtros.busca" escopo="meus" placeholder="Pesquisar projeto, responsável ou categoria..." @categoria="c => (filtros.categoria = c)" />
      <select v-model="filtros.categoria" aria-label="Categoria">
        <option value="">Categoria</option>
        <option v-for="c in dados?.categorias || []" :key="c">{{ c }}</option>
      </select>
      <select v-model="filtros.status" aria-label="Status">
        <option value="">Status</option>
        <option>Planejamento</option><option>Em andamento</option><option>Concluído</option>
      </select>
      <select v-model="filtros.prioridade" aria-label="Prioridade">
        <option value="">Prioridade</option>
        <option>Alta</option><option>Média</option><option>Baixa</option>
      </select>
      <select v-model="filtros.ordem" aria-label="Ordenar por" title="Ordem da lista">
        <option value="padrao">Padrão</option>
        <option value="recentes">Recentes</option>
        <option value="nome">Nome (A–Z)</option>
        <option value="prazo">Prazo</option>
      </select>
      <button type="button" class="btn-filtro estrela-filtro" :class="{ ativo: filtros.favoritos }" :aria-pressed="filtros.favoritos"
              @click="filtros.favoritos = !filtros.favoritos">★ Favoritos</button>
      <button type="button" class="btn-filtro azul" :disabled="!dados?.total || exportando" @click="exportarCsv">
        {{ exportando ? 'Exportando...' : 'Exportar CSV' }}
      </button>
      <button v-if="temFiltro" type="button" class="btn-filtro escuro" @click="limpar">Limpar</button>
    </div>

    <GradeEsqueleto v-if="!dados && !erro" />
    <div v-else-if="erro" class="vazio erro-box" role="alert">{{ erro }}</div>

    <template v-else>
      <EstadoVazio v-if="!dados.totalGeral" tipo="projetos" titulo="Você ainda não criou nenhum projeto"
                   texto="Cadastre o primeiro: dá para listar os itens, acompanhar o orçamento e, se quiser, mostrar na Comunidade.">
        <RouterLink class="btn" to="/CadastrosProjetos">Cadastrar o primeiro projeto</RouterLink>
      </EstadoVazio>
      <EstadoVazio v-else-if="!dados.total" tipo="busca" titulo="Nenhum projeto encontrado" texto="Nenhum dos seus projetos combina com esses filtros.">
        <button type="button" class="btn" @click="limpar">Limpar filtros</button>
      </EstadoVazio>

      <template v-else>
        <p class="contagem" aria-live="polite">
          {{ dados.total }} {{ dados.total === 1 ? 'projeto' : 'projetos' }}
          <template v-if="dados.paginas > 1"> · página {{ dados.pagina }} de {{ dados.paginas }}</template>
        </p>

        <div class="grade-projetos" :class="{ carregando }">
          <ProjetoCard v-for="p in dados.projetos" :key="p.id" :projeto="p" modo="meu" :busca="filtros.busca"
                       @status="mudarStatus" @favoritar="alternarFavorito" @excluir="excluir" />
        </div>

        <Paginacao :pagina="dados.pagina" :paginas="dados.paginas" @ir="irParaPagina" />
      </template>
    </template>
  </div>
</template>

<script setup>
// Meus Projetos: lista paginada no servidor (12 por vez), com filtros, ordem e exportação em CSV.
import { ref } from 'vue'
import CampoBusca from './CampoBusca.vue'
import EstadoVazio from './EstadoVazio.vue'
import GradeEsqueleto from './GradeEsqueleto.vue'
import Message from './Message.vue'
import Paginacao from './Paginacao.vue'
import ProjetoCard from './ProjetoCard.vue'
import { useListaPaginada } from '../composables/useListaPaginada'
import { useAviso } from '../composables/useAviso'
import { api } from '../services/api'
import { confirmar } from '../services/confirmar'
import { baixarArquivo, hojeLocal, projetosParaCsv } from '../services/utils'

const { filtros, dados, carregando, erro, temFiltro, carregar, irParaPagina, limpar, parametros } = useListaPaginada(
  '/projetos',
  { busca: '', categoria: '', status: '', prioridade: '', favoritos: false, ordem: 'padrao' }
)
carregar()

const { aviso, avisar } = useAviso()

async function mudarStatus(p, status) {
  try {
    await api(`/projetos/${p.id}`, { metodo: 'PATCH', corpo: { status } })
    p.status = status
  } catch (e) { avisar(e.message, 'erro') }
}

async function alternarFavorito(p) {
  try {
    await api(`/projetos/${p.id}`, { metodo: 'PATCH', corpo: { favorito: !p.favorito } })
    p.favorito = !p.favorito
    carregar(true) // atualiza a ordem (favoritos primeiro) sem escurecer a lista
  } catch (e) { avisar(e.message, 'erro') }
}

async function excluir(p) {
  const confirmou = await confirmar({
    titulo: 'Excluir este projeto?',
    texto: `"${p.nome}" será apagado para sempre, junto com as curtidas e os comentários dele.`,
    botao: 'Excluir',
    perigo: true
  })
  if (!confirmou) return
  try {
    await api(`/projetos/${p.id}`, { metodo: 'DELETE' })
    avisar('Projeto excluído.')
    carregar(true)
  } catch (e) { avisar(e.message, 'erro') }
}

// Baixa tudo que passou nos filtros (não só a página que está na tela)
const exportando = ref(false)
async function exportarCsv() {
  exportando.value = true
  try {
    const r = await api(`/projetos?${parametros()}&todos=1`)
    baixarArquivo(`projetos-${hojeLocal()}.csv`, projetosParaCsv(r.projetos))
  } catch (e) { avisar(e.message, 'erro') }
  finally { exportando.value = false }
}
</script>
