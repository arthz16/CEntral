<template>
  <div>
    <Message :msg="aviso" />
    <p class="intro">
      Quem escolhe <strong>Outros</strong> digita a própria categoria. Aqui você arruma a lista: <strong>renomeie</strong> ou <strong>junte</strong> as digitadas
      (se o novo nome já existir, as duas viram uma só) e <strong>adicione à lista</strong> as que merecem aparecer no formulário.
      As categorias oficiais não mudam de nome, mas podem receber as outras.
    </p>

    <div v-if="erro" class="vazio erro-box" role="alert">{{ erro }}</div>
    <GradeEsqueleto v-else-if="!lista" :quantidade="3" />
    <template v-else>
      <div class="lista-admin">
        <article v-for="c in lista" :key="c.nome" class="card linha-admin">
          <div class="topo">
            <CategoriaChip :nome="c.nome" />
            <span v-if="c.oficial" class="etq azul">Oficial</span>
            <span v-else-if="c.naLista" class="etq verde">Na lista do formulário</span>
            <span v-else class="etq amarelo">Só digitada pelas pessoas</span>
          </div>
          <div class="meta-linha">
            <span>{{ c.projetos }} projeto(s)</span>
            <span>{{ c.pessoas }} pessoa(s)</span>
            <span v-if="c.subcategorias">{{ c.subcategorias }} subcategoria(s)</span>
          </div>
          <div class="acoes-linha" v-if="!c.oficial">
            <button type="button" class="btn-mini" @click="renomear(c)">Renomear ou juntar</button>
            <button v-if="!c.naLista && c.projetos" type="button" class="btn-mini principal" @click="adicionar(c)">Adicionar à lista</button>
          </div>
          <p v-else class="detalhe">Categoria da lista oficial: não pode ser renomeada.</p>
        </article>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import CategoriaChip from '../CategoriaChip.vue'
import GradeEsqueleto from '../GradeEsqueleto.vue'
import Message from '../Message.vue'
import { useAviso } from '../../composables/useAviso'
import { api } from '../../services/api'
import { confirmar } from '../../services/confirmar'

const lista = ref(null)
const erro = ref('')
const { aviso, avisar } = useAviso()

async function carregar() {
  try { lista.value = await api('/admin/categorias') } catch (e) { erro.value = e.message }
}
carregar()

async function renomear(c) {
  const r = await confirmar({
    titulo: `Renomear ou juntar "${c.nome}"`,
    texto: `${c.projetos} projeto(s) vão passar a usar o novo nome. Para juntar, digite o nome de outra categoria (aparecem as existentes).`,
    botao: 'Salvar', entrada: true, rotuloEntrada: 'Novo nome', valorInicial: c.nome, opcoes: lista.value.filter(x => x.nome !== c.nome).map(x => x.nome)
  })
  if (!r) return
  try {
    const res = await api('/admin/categorias/renomear', { metodo: 'POST', corpo: { de: c.nome, para: r.entrada } })
    avisar(`${res.alterados} projeto(s) agora estão em "${res.nome}".`)
    await carregar()
  } catch (e) { avisar(e.message, 'erro') }
}

async function adicionar(c) {
  const ok = await confirmar({ titulo: `Adicionar "${c.nome}" à lista?`, texto: 'Ela passa a aparecer no campo Categoria do formulário para todo mundo.', botao: 'Adicionar' })
  if (!ok) return
  try {
    await api('/admin/categorias/adicionar', { metodo: 'POST', corpo: { nome: c.nome } })
    avisar('Categoria adicionada à lista.')
    await carregar()
  } catch (e) { avisar(e.message, 'erro') }
}
</script>

<style scoped>
.intro { margin-bottom: 18px; color: var(--texto-suave); }
.intro strong { color: var(--tinta); }
</style>
