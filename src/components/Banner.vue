<template>
  <div id="main-banner" :class="[variante, { compacto }]" :style="{ backgroundImage: `url('${imagem}')` }">

    <!-- Detalhes animados (só aparecem se a página pedir uma variante) -->
    <FundoAnimado v-if="variante" :variante="variante" />

    <div class="banner-texto anim-esquerda">
      <h1>{{ title }}</h1>
      <p v-if="subtitle">{{ subtitle }}</p>
    </div>
  </div>
</template>

<script>
import FundoAnimado from "./FundoAnimado.vue";

export default {
  name: "Banner",
  components: { FundoAnimado },

  props: {
    title: { type: String, default: "Coloque suas ideias em prática" },
    subtitle: { type: String, default: "" },

    // Imagem de fundo do banner
    imagem: { type: String, default: "/img/FundoProjetos.png" },

    // "claro" ou "escuro" liga os detalhes animados. Vazio = banner simples
    variante: { type: String, default: "" },

    // Cabeçalho baixo para páginas internas (detalhes, editar)
    compacto: { type: Boolean, default: false }
  }
}
</script>

<style scoped>
/* No modo escuro a foto do banner é escurecida para não "estourar" a tela */
:root[data-tema="escuro"] #main-banner::before {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(6, 9, 14, 0.62);
  pointer-events: none;
}
:root[data-tema="escuro"] .banner-texto { position: relative; }

/* Administração: a foto azul do banner vira roxa (a camada só muda o matiz, não o brilho) */
:root[data-papel="admin"] #main-banner::after {
  content: "";
  position: absolute;
  inset: 0;
  background: #8b5cf6;
  mix-blend-mode: hue;
  pointer-events: none;
}
:root[data-papel="admin"] .banner-texto { position: relative; }

#main-banner {
  position: relative;
  overflow: hidden;
  height: 260px;
  padding: 0 max(40px, calc((100% - 1200px) / 2 + 20px));
  display: flex;
  align-items: center;
  background-color: var(--preto);
  background-position: center;
  background-size: cover;
}

.banner-texto {
  position: relative;
  z-index: 1;   /* fica na frente dos detalhes animados */
  max-width: 600px;

  padding: 20px 32px;
  background: rgba(11, 11, 15, 0.78);
  border-left: 6px solid var(--azul-claro);
  border-radius: 0 var(--raio) var(--raio) 0;
}

/* Banner escuro: caixa de vidro em vez de preto chapado */
.escuro .banner-texto {
  background: rgba(124, 200, 255, 0.08);
  border: 1px solid rgba(124, 200, 255, 0.25);
  border-left: 6px solid var(--azul-claro);
  -webkit-backdrop-filter: blur(6px);
          backdrop-filter: blur(6px);
}

.banner-texto h1 {
  color: var(--branco);
  font-size: 36px;
  line-height: 1.2;
}

.banner-texto p {
  margin-top: 6px;
  color: var(--azul-claro);
}

#main-banner.compacto { height: 140px; }
.compacto .banner-texto h1 { font-size: 28px; }

@media (max-width: 700px) {
  #main-banner { height: 200px; padding: 0 16px; }
  .banner-texto h1 { font-size: 26px; }
}
</style>
