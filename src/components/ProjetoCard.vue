<template>
  <article class="card projeto-card" :aria-labelledby="idNome" :style="{ '--h': estilo.h }">
    <!-- Comunidade: quem criou -->
    <div class="autor" v-if="modo === 'comunidade'">
      <span class="avatar" aria-hidden="true">{{ inicial(p.autor.nome) }}</span>
      <span class="quem">
        Criado por
        <RouterLink class="link-autor" :to="`/Perfil/${p.autor.usuario}`">{{ p.autor.nome }}</RouterLink><SeloAdmin v-if="p.autor.papel === 'admin'" />
        <small>@{{ p.autor.usuario }}<em v-if="p.dono"> · você</em></small>
      </span>
    </div>

    <div class="topo">
      <span class="badge" :class="classeStatus(p.status)">{{ p.status }}</span>
      <span class="badge" :class="classePrioridade(p.prioridade)">{{ p.prioridade || 'Média' }}</span>
      <span v-if="alerta" class="badge" :class="alerta.tipo === 'atrasado' ? 'atrasado' : 'vence'">{{ alerta.texto }}</span>
      <span v-if="modo === 'meu' && p.publico === false" class="badge privado" title="Só você vê este projeto">Privado</span>
      <span v-if="modo === 'meu' && p.oculto" class="badge oculto" :title="`Ocultado pela moderação: ${p.oculto.motivo}`">Oculto pela moderação</span>
      <button v-if="modo === 'meu'" type="button" class="estrela" :class="{ ativa: p.favorito }" :aria-pressed="p.favorito === true"
              :aria-label="p.favorito ? 'Tirar dos favoritos' : 'Favoritar'" title="Favorito" @click="$emit('favoritar', p)">★</button>
    </div>

    <h3><RouterLink :id="idNome" class="abrir" :to="destino"><TextoDestacado :texto="p.nome" :termo="busca" /></RouterLink></h3>
    <p class="descricao"><TextoDestacado :texto="p.descricao || 'Sem descrição.'" :termo="busca" /></p>

    <div class="info">
      <CategoriaChip :nome="p.categoria" />
      <span class="categoria" v-if="p.subcategoria">{{ p.subcategoria }}</span>
    </div>

    <!-- Meus projetos: quanto já foi comprado do previsto -->
    <div class="gasto" v-if="modo === 'meu' && p.previsto > 0">
      <span>Comprado</span>
      <strong>{{ dinheiro(p.comprado) }} <em>de {{ dinheiro(p.previsto) }}</em></strong>
    </div>

    <div class="meta">
      <span>Responsável: <TextoDestacado :texto="p.responsavel" :termo="busca" /></span>
      <strong v-if="p.orcamento && modo !== 'meu'">{{ dinheiro(p.orcamento) }}</strong>
    </div>

    <div class="itens" v-if="modo !== 'meu' && p.itensTotal">
      <span v-for="(nome, i) in p.itensNomes" :key="i">{{ nome }}</span>
      <span v-if="p.itensTotal > p.itensNomes.length">+{{ p.itensTotal - p.itensNomes.length }}</span>
    </div>

    <p class="social-mini" v-if="modo === 'meu' && p.publico !== false && (p.totalCurtidas || p.totalComentarios)">
      {{ p.totalCurtidas }} {{ p.totalCurtidas === 1 ? 'curtida' : 'curtidas' }}
      · {{ p.totalComentarios }} {{ p.totalComentarios === 1 ? 'comentário' : 'comentários' }}
    </p>

    <!-- Rodapé: muda conforme onde o card aparece -->
    <div class="rodape" v-if="modo === 'meu'">
      <select :value="p.status" :aria-label="`Status de ${p.nome}`" @change="$emit('status', p, $event.target.value)">
        <option>Planejamento</option><option>Em andamento</option><option>Concluído</option>
      </select>
      <RouterLink class="acao editar" :to="`/EditarProjeto/${p.id}`" :aria-label="`Editar ${p.nome}`">Editar</RouterLink>
      <button type="button" class="acao excluir" :aria-label="`Excluir ${p.nome}`" @click="$emit('excluir', p)">Excluir</button>
    </div>

    <div class="rodape curtidas" v-else>
      <button type="button" class="curtir" :class="{ ativo: p.curtiu }" :aria-pressed="p.curtiu"
              :aria-label="`${p.curtiu ? 'Descurtir' : 'Curtir'} (${p.totalCurtidas} curtidas)`"
              :disabled="curtindo" @click="curtir">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.500s-8-5-8-10.500a4.500 4.500 0 0 1 8-2.800A4.500 4.500 0 0 1 20 10c0 5.500-8 10.500-8 10.500z" /></svg>
        {{ p.totalCurtidas }}
      </button>
      <RouterLink class="comentarios" :to="`/Comunidade/${p.id}#comentarios`" :aria-label="`Ver comentários (${p.totalComentarios})`">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" /></svg>
        {{ p.totalComentarios }}
      </RouterLink>
      <RouterLink v-if="p.dono" class="btn-editar" :to="`/EditarProjeto/${p.id}`" :aria-label="`Editar ${p.nome}`">Editar</RouterLink>
    </div>
  </article>
</template>

<script setup>
// O card de projeto, usado em Meus Projetos, na Comunidade e no Perfil (antes eram dois componentes quase iguais).
// modo: 'meu' (estrela, status, editar, excluir) | 'comunidade' (quem criou, curtir) | 'perfil' (como comunidade, sem o criador)
import { computed, ref } from 'vue'
import CategoriaChip from './CategoriaChip.vue'
import SeloAdmin from './SeloAdmin.vue'
import TextoDestacado from './TextoDestacado.vue'
import { api } from '../services/api'
import { estiloDaCategoria } from '../services/categorias'
import { alertaPrazo, classePrioridade, classeStatus, dinheiro } from '../services/utils'

const props = defineProps({
  projeto: { type: Object, required: true },
  modo: { type: String, default: 'comunidade' },
  busca: { type: String, default: '' } // o que a pessoa pesquisou: aparece em destaque no card
})
defineEmits(['favoritar', 'status', 'excluir'])

// "p" é o mesmo objeto da lista da página: ao curtir ele muda e o card atualiza na hora
const p = props.projeto
const idNome = `projeto-${p.id}-nome-${props.modo}`
const estilo = estiloDaCategoria(p.categoria)
const alerta = computed(() => alertaPrazo(p.prazo, p.status))
const destino = computed(() => (props.modo === 'meu' ? `/Projetos/${p.id}` : `/Comunidade/${p.id}`))
const inicial = nome => (nome || '?').charAt(0).toUpperCase()

const curtindo = ref(false)
async function curtir() {
  if (curtindo.value) return
  curtindo.value = true
  // muda na tela primeiro (parece instantâneo) e desfaz se o servidor falhar
  const antes = { curtiu: p.curtiu, total: p.totalCurtidas }
  p.curtiu = !p.curtiu
  p.totalCurtidas += p.curtiu ? 1 : -1
  try {
    const r = await api(`/comunidade/${p.id}/curtir`, { metodo: 'POST' })
    p.curtiu = r.curtiu
    p.totalCurtidas = r.totalCurtidas
  } catch {
    p.curtiu = antes.curtiu
    p.totalCurtidas = antes.total
  } finally {
    curtindo.value = false
  }
}
</script>

<style scoped>
.projeto-card { position: relative; display: flex; flex-direction: column; min-width: 0; padding: 22px; border-top: 4px solid hsl(var(--h) 65% var(--cat-barra-l)); }
/* o card inteiro é clicável (pelo link do título); quem usa o teclado vê o contorno no card todo */
.projeto-card:focus-within { border-color: var(--azul); }

.autor { display: flex; align-items: center; gap: 9px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--borda); color: var(--texto-suave); font-size: 13px; min-width: 0; }
.avatar { flex-shrink: 0; width: 30px; height: 30px; display: grid; place-items: center; border-radius: 50%; background: var(--avatar-bg); color: var(--azul-claro); font-size: 13px; font-weight: 800; }
.quem { min-width: 0; line-height: 1.35; overflow-wrap: anywhere; }
.quem small { display: block; font-size: 12px; }
.quem em { font-style: normal; }
/* o nome de quem criou fica acima do link que cobre o card inteiro */
.link-autor { position: relative; z-index: 1; color: var(--tinta); font-weight: 700; }
.link-autor:hover { color: var(--azul); }

.topo { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 12px; }
.estrela { margin-left: auto; position: relative; z-index: 1; width: 32px; height: 32px; background: var(--chip); border: 1px solid var(--borda); border-radius: 8px; color: var(--texto-suave); font-size: 17px; line-height: 1; cursor: pointer; transition: var(--transicao); }
.estrela:hover { border-color: #e5b800; color: var(--b-amarelo-fg); }
.estrela.ativa { background: var(--b-amarelo-bg); border-color: #e5b800; color: var(--b-amarelo-fg); }

.projeto-card h3 { font-size: 20px; overflow-wrap: anywhere; }
.abrir { color: var(--tinta); }
.abrir::after { content: ""; position: absolute; inset: 0; border-radius: var(--raio); }
.abrir:hover { color: var(--azul); }
.abrir:focus-visible { outline: none; }
.abrir:focus-visible::after { outline: 3px solid var(--foco); outline-offset: 2px; }

.descricao { margin: 6px 0 12px; color: var(--texto-suave); font-size: 14px; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

.info { display: flex; flex-wrap: wrap; gap: 7px; }
.categoria { padding: 3px 9px; border-radius: 999px; background: var(--b-azul-bg); border: 1px solid var(--azul-claro); color: var(--b-azul-fg); font-size: 12px; font-weight: 600; }

.gasto { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin: 12px 0 0; font-size: 12px; color: var(--texto-suave); }
.gasto strong { color: var(--b-verde-fg); font-size: 14px; }
.gasto em { color: var(--texto-suave); font-style: normal; font-weight: 600; }

.meta { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin: 12px 0; color: var(--texto-suave); font-size: 12px; }
.meta strong { color: var(--tinta); font-size: 16px; white-space: nowrap; }

.itens { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 4px; }
.itens span { padding: 3px 9px; background: var(--chip); border: 1px solid var(--borda); border-radius: 999px; color: var(--b-cinza-fg); font-size: 11px; }

.social-mini { margin-bottom: 8px; color: var(--texto-suave); font-size: 12px; }

/* tudo que é clicável no rodapé fica acima do link que cobre o card, para o clique cair neles */
.rodape { position: relative; z-index: 1; margin-top: auto; padding-top: 14px; border-top: 1px solid var(--borda); display: flex; align-items: center; gap: 8px; }
.rodape.curtidas { gap: 8px; }

/* Meus projetos */
.rodape:not(.curtidas) { display: grid; grid-template-columns: 1fr auto auto; gap: 6px; }
.rodape select { min-width: 0; border: 1px solid var(--borda); border-radius: 7px; padding: 7px; background: var(--superficie); color: var(--texto); }
.acao { border: 0; border-radius: 7px; padding: 7px 10px; font-size: 12px; font-weight: 700; text-align: center; cursor: pointer; }
.editar { background: var(--chip); color: var(--texto); }
.excluir { background: var(--b-vermelho-bg); color: var(--b-vermelho-fg); }
.acao:hover { filter: brightness(0.95); }

/* Comunidade e perfil */
.curtir, .comentarios { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 12px; border: 1px solid var(--borda); border-radius: 999px; background: var(--superficie); color: var(--b-cinza-fg); font-size: 14px; font-weight: 600; cursor: pointer; }
.curtir svg, .comentarios svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linejoin: round; }
.curtir:hover, .comentarios:hover { border-color: var(--azul); color: var(--azul); }
.curtir.ativo { border-color: var(--b-rosa-fg); background: var(--b-rosa-bg); color: var(--b-rosa-fg); }
.curtir.ativo svg { fill: var(--b-rosa-fg); }
.curtir:disabled { cursor: wait; }
.btn-editar { margin-left: auto; padding: 8px 16px; border-radius: 8px; background: var(--acao); color: #fff; font-size: 14px; font-weight: 700; }
.btn-editar:hover { background: var(--azul-escuro); color: #fff; }

.badge { padding: 5px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; }
.planejamento { background: var(--b-amarelo-bg); color: var(--b-amarelo-fg); }
.andamento { background: var(--b-azul-bg); color: var(--b-azul-fg); }
.concluido { background: var(--b-verde-bg); color: var(--b-verde-fg); }
.prio-alta { background: var(--b-vermelho-bg); color: var(--b-vermelho-fg); }
.prio-media { background: var(--b-cinza-bg); color: var(--b-cinza-fg); }
.prio-baixa { background: var(--b-azul-bg); color: var(--b-azul-fg); }
.atrasado { background: var(--b-vermelho-bg); color: var(--b-vermelho-fg); }
.vence { background: var(--b-laranja-bg); color: var(--b-laranja-fg); }
.oculto { background: var(--b-vermelho-bg); color: var(--b-vermelho-fg); border: 1px dashed var(--b-vermelho-fg); }
.privado { background: var(--b-cinza-bg); color: var(--b-cinza-fg); border: 1px dashed var(--borda-forte); }

@media (max-width: 500px) {
  .rodape:not(.curtidas) { grid-template-columns: 1fr 1fr; }
  .rodape:not(.curtidas) select { grid-column: 1 / -1; }
}
</style>
