<template>
  <div>
    <p class="intro">Tudo o que a administração fez fica aqui, do mais novo para o mais antigo. Não dá para apagar nem editar.</p>
    <div v-if="erro" class="vazio erro-box" role="alert">{{ erro }}</div>
    <GradeEsqueleto v-else-if="!dados" :quantidade="3" />
    <template v-else>
      <div v-if="!dados.total" class="vazio">Nenhuma ação registrada ainda.</div>
      <template v-else>
        <p class="contagem">{{ dados.total }} ação(ões) registrada(s)<template v-if="dados.paginas > 1"> · página {{ dados.pagina }} de {{ dados.paginas }}</template></p>
        <div class="lista-admin" :class="{ carregando }">
          <article v-for="r in dados.itens" :key="r.id" class="card linha-admin">
            <div class="topo">
              <span class="etq azul">@{{ r.admin }}</span>
              <strong>{{ r.acao }}</strong>
              <span class="detalhe">{{ r.alvo }}</span>
            </div>
            <p v-if="r.motivo" class="citacao">{{ r.motivo }}</p>
            <div class="meta-linha"><span>{{ quando(r.em) }}</span><span>#{{ r.id }}</span></div>
          </article>
        </div>
        <Paginacao :pagina="dados.pagina" :paginas="dados.paginas" @ir="irParaPagina" />
      </template>
    </template>
  </div>
</template>

<script setup>
import GradeEsqueleto from '../GradeEsqueleto.vue'
import Paginacao from '../Paginacao.vue'
import { useListaPaginada } from '../../composables/useListaPaginada'
import { quando } from '../../services/utils'

const { dados, carregando, erro, carregar, irParaPagina } = useListaPaginada('/admin/registro', {}, { limite: 20, rolarPara: '.intro' })
carregar()
</script>

<style scoped>
.intro { margin-bottom: 18px; color: var(--texto-suave); }
.carregando { opacity: 0.55; pointer-events: none; }
</style>
