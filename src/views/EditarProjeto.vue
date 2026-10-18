<template>
  <div>
    <Banner title="Editar Projeto" subtitle="Atualize as informações do projeto" imagem="/img/fundoCadastro.jpg" compacto />
    <div class="main-container">
      <div v-if="erro" class="vazio erro-box" role="alert">
        {{ erro }}
        <p><RouterLink to="/Projetos">Voltar para Meus Projetos</RouterLink></p>
      </div>
      <div v-else-if="!projeto" class="vazio">Carregando projeto...</div>
      <FormularioProjeto v-else :projeto="projeto" texto-botao="Salvar alterações"
                         :cancelar-para="`/Projetos/${projeto.id}`" :ao-enviar="salvar" @sujo="sujo = $event" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Banner from '../components/Banner.vue'
import FormularioProjeto from '../components/FormularioProjeto.vue'
import { useAvisoSaida } from '../composables/useAvisoSaida'
import { api } from '../services/api'

const route = useRoute()
const router = useRouter()
const projeto = ref(null)
const erro = ref('')
const sujo = ref(false)
useAvisoSaida(sujo)

// Só o dono consegue abrir: para o projeto de outra pessoa o servidor responde "não encontrado"
api(`/projetos/${route.params.id}`)
  .then(dados => { projeto.value = dados })
  .catch(e => { erro.value = e.status === 404 ? 'Projeto não encontrado. Só quem criou o projeto pode editá-lo.' : e.message })

async function salvar(dados) {
  await api(`/projetos/${projeto.value.id}`, { metodo: 'PUT', corpo: dados })
  router.push(`/Projetos/${projeto.value.id}`)
}
</script>
