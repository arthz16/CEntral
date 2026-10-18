<template>
  <div>
    <!-- Imagem escura + detalhes animados só no banner de cima -->
    <Banner :title="criado ? 'Projeto criado!' : 'Cadastrar Projeto'"
            :subtitle="criado ? 'Tudo certo. Veja o que fazer agora' : 'Preencha os dados para criar um novo projeto'"
            imagem="/img/fundoCadastro.jpg" variante="escuro" />

    <div class="main-container">
      <!-- Depois de cadastrar: para onde ir agora -->
      <section v-if="criado" class="sucesso card anim-subir" role="status">
        <div class="marca" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M5 12.500l4.500 4.500L19 7.500" /></svg>
        </div>
        <h2>"{{ criado.nome }}" foi cadastrado!</h2>
        <p v-if="criado.publico">Ele já aparece na Comunidade. Só você pode editá-lo.</p>
        <p v-else>Ele está como privado: só você vê. Dá para torná-lo público quando quiser, editando o projeto.</p>
        <div class="botoes">
          <RouterLink class="btn" :to="`/Projetos/${criado.id}`">Ver projeto</RouterLink>
          <RouterLink v-if="criado.publico" class="btn btn-outline" :to="`/Comunidade/${criado.id}`">Ver na Comunidade</RouterLink>
          <button type="button" class="btn btn-outline" @click="criado = null">Cadastrar outro</button>
        </div>
      </section>

      <FormularioProjeto v-else texto-botao="Cadastrar Projeto" :ao-enviar="cadastrar" @sujo="sujo = $event" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Banner from '../components/Banner.vue'
import FormularioProjeto from '../components/FormularioProjeto.vue'
import { useAvisoSaida } from '../composables/useAvisoSaida'
import { api } from '../services/api'

const criado = ref(null)
const sujo = ref(false)
useAvisoSaida(sujo)

async function cadastrar(dados) {
  criado.value = await api('/projetos', { metodo: 'POST', corpo: dados })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<style scoped>
.sucesso { max-width: 660px; margin: 0 auto; padding: 36px 30px; text-align: center; }
.sucesso:hover { transform: none; box-shadow: none; }
.marca {
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  margin: 0 auto 16px;
  background: var(--b-verde-bg);
  border: 3px solid var(--b-verde-fg);
  border-radius: 50%;
  animation: estalar 0.5s ease both;
}
.marca svg { width: 38px; height: 38px; fill: none; stroke: var(--b-verde-fg); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
h2 { margin-bottom: 8px; color: var(--tinta); overflow-wrap: anywhere; }
p { color: var(--texto-suave); }
.botoes { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 24px; }
@keyframes estalar { 0% { transform: scale(0.4); opacity: 0; } 70% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
</style>
