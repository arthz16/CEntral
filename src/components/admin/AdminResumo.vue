<template>
  <div>
    <GradeEsqueleto v-if="!resumo" :quantidade="4" />
    <template v-else>
      <section class="numeros" aria-label="Números do site">
        <div class="num destaque" v-if="resumo.denunciasAbertas">
          <strong>{{ resumo.denunciasAbertas }}</strong><span>denúncia(s) esperando análise</span>
          <RouterLink to="/Admin/denuncias">Analisar agora</RouterLink>
        </div>
        <div class="num"><strong>{{ resumo.usuarios }}</strong><span>pessoas</span><small>{{ resumo.novosUsuarios }} nova(s) em 7 dias</small></div>
        <div class="num"><strong>{{ resumo.projetos }}</strong><span>projetos</span><small>{{ resumo.novosProjetos }} novo(s) em 7 dias</small></div>
        <div class="num"><strong>{{ resumo.publicos }}</strong><span>públicos</span><small>{{ resumo.privados }} privado(s) · {{ resumo.ocultos }} oculto(s)</small></div>
        <div class="num"><strong>{{ resumo.comentarios }}</strong><span>comentários</span><small>{{ resumo.curtidas }} curtida(s)</small></div>
        <div class="num"><strong>{{ resumo.suspensos }}</strong><span>suspensa(s)</span><small>{{ resumo.admins }} administrador(es)</small></div>
      </section>

      <section class="card guia">
        <h2>O que a administração pode fazer</h2>
        <ul>
          <li><strong>Denúncias:</strong> ver quem denunciou o quê e resolver, ignorar ou agir (ocultar, excluir ou suspender) direto da fila.</li>
          <li><strong>Pessoas:</strong> suspender por alguns dias ou por tempo indeterminado, encerrar a suspensão, promover a administrador ou excluir uma conta.</li>
          <li><strong>Projetos:</strong> ver todos (inclusive os privados), ocultar da Comunidade sem apagar ou excluir. O dono é avisado do motivo.</li>
          <li><strong>Comentários:</strong> abra o projeto e use "Apagar" em qualquer comentário.</li>
          <li><strong>Registro:</strong> toda ação fica gravada com quem fez, em quem e por quê.</li>
        </ul>
        <p>Toda ação que atinge uma pessoa pede um <strong>motivo</strong>. Ele aparece para ela e fica no registro.</p>
      </section>
    </template>
  </div>
</template>

<script setup>
import GradeEsqueleto from '../GradeEsqueleto.vue'
defineProps({ resumo: { type: Object, default: null } })
</script>

<style scoped>
.numeros { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 16px; margin-bottom: 24px; }
.num { display: flex; flex-direction: column; gap: 2px; padding: 20px; background: var(--superficie); border: 1px solid var(--borda); border-radius: var(--raio); }
.num strong { color: var(--azul); font-size: 34px; line-height: 1.1; }
.num span { color: var(--tinta); font-weight: 700; }
.num small { color: var(--texto-suave); font-size: 13px; }
.num.destaque { background: var(--b-vermelho-bg); border-color: var(--b-vermelho-borda); }
.num.destaque strong, .num.destaque span { color: var(--b-vermelho-fg); }
.num.destaque a { margin-top: 6px; color: var(--b-vermelho-fg); font-weight: 800; text-decoration: underline; }
.guia { padding: 24px; }
.guia:hover { transform: none; box-shadow: none; }
.guia h2 { margin-bottom: 10px; color: var(--tinta); font-size: 20px; }
.guia ul { margin: 0 0 12px 20px; display: grid; gap: 6px; }
.guia p { color: var(--texto-suave); }
</style>
