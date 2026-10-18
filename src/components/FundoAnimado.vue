<template>
  <!-- Detalhes que se mexem dentro do banner (fica atrás do texto) -->
  <div class="fundo" aria-hidden="true">

    <!-- ===== VARIANTE CLARA (banner de Projetos) ===== -->
    <template v-if="variante === 'claro'">

      <!-- Três barras inclinadas (igual ao canto da imagem) que acendem em sequência -->
      <div class="barras"><i></i><i></i><i></i></div>

      <!-- Grade de pontos com um brilho que varre da esquerda para a direita -->
      <div class="pontos"></div>

      <!-- Circuito: um pulso de luz percorre cada trilha -->
      <svg class="circuito" viewBox="0 0 600 420" preserveAspectRatio="xMinYMid meet">
        <path class="trilha" pathLength="100" d="M20 70 H190 L230 30 H420 L470 -10" />
        <path class="trilha" pathLength="100" d="M10 190 H110 L160 140 H330 L380 90 H520" />
        <path class="trilha" pathLength="100" d="M60 330 H210 L250 290 H400 L440 250 H600" />
        <path class="pulso" pathLength="100" d="M20 70 H190 L230 30 H420 L470 -10" />
        <path class="pulso p2" pathLength="100" d="M10 190 H110 L160 140 H330 L380 90 H520" />
        <path class="pulso p3" pathLength="100" d="M60 330 H210 L250 290 H400 L440 250 H600" />
        <circle class="no" cx="20" cy="70" r="5" />
        <circle class="no n2" cx="10" cy="190" r="5" />
        <circle class="no n3" cx="60" cy="330" r="5" />
      </svg>

      <!-- Hexágonos flutuando devagar (mesma forma da imagem de fundo) -->
      <svg class="hex h1" viewBox="0 0 100 100"><polygon points="50,4 93,27 93,73 50,96 7,73 7,27" /></svg>
      <svg class="hex h2" viewBox="0 0 100 100"><polygon points="50,4 93,27 93,73 50,96 7,73 7,27" /></svg>
      <svg class="hex h3" viewBox="0 0 100 100"><polygon points="50,4 93,27 93,73 50,96 7,73 7,27" /></svg>
    </template>

    <!-- ===== VARIANTE ESCURA (banner de Cadastrar Projeto) ===== -->
    <template v-else>

      <!-- Luz suave que passeia pelo fundo escuro -->
      <div class="luz"></div>

      <!-- Linhas de planta (blueprint) que se desenham sozinhas -->
      <svg class="planta" viewBox="0 0 600 300" preserveAspectRatio="xMaxYMax meet">
        <path class="risco" pathLength="100" d="M10 290 V60 H150" />
        <path class="risco r2" pathLength="100" d="M10 290 H260" />
        <path class="risco r3" pathLength="100" d="M590 10 H450 V120" />
        <circle class="marca" cx="150" cy="60" r="4" />
        <circle class="marca m2" cx="450" cy="120" r="4" />
      </svg>

      <!-- Faíscas subindo devagar, como em obra -->
      <span class="faisca" v-for="n in 14" :key="n" :style="faisca(n)"></span>
    </template>

  </div>
</template>

<script>
export default {
  name: "FundoAnimado",

  props: {
    // "claro" = banner de Projetos | "escuro" = banner de Cadastrar Projeto
    variante: { type: String, default: "claro" }
  },

  methods: {
    // Posição, tamanho e tempo diferentes para cada faísca (sempre os mesmos, sem sortear)
    faisca(n) {
      return {
        left: ((n * 37) % 97) + 1 + "%",
        width: 2 + (n % 3) + "px",
        height: 2 + (n % 3) + "px",
        animationDuration: 6 + (n % 5) * 2 + "s",
        animationDelay: -((n * 1.7) % 10) + "s"
      };
    }
  }
}
</script>

<style scoped>
.fundo {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;   /* não atrapalha os cliques */
  z-index: 0;
}

/* =====================================================
   VARIANTE CLARA
===================================================== */

/* Grade de pontos + brilho varrendo (fica sobre a parte azul da imagem) */
.pontos {
  position: absolute;
  top: 22px;
  right: 3%;
  width: 240px;
  height: 110px;
  background-image: radial-gradient(circle, rgba(255, 255, 255, 0.55) 1.6px, transparent 2.2px);
  background-size: 24px 24px;
}

.pontos::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, #fff 2.6px, transparent 3.2px);
  background-size: 24px 24px;
  -webkit-mask-image: linear-gradient(100deg, transparent 42%, #000 50%, transparent 58%);
          mask-image: linear-gradient(100deg, transparent 42%, #000 50%, transparent 58%);
  -webkit-mask-size: 300% 100%;
          mask-size: 300% 100%;
  animation: varrer 5s ease-in-out infinite;
}

@keyframes varrer {
  from { -webkit-mask-position: 100% 0; mask-position: 100% 0; }
  to   { -webkit-mask-position: 0 0;    mask-position: 0 0; }
}

/* Circuito com pulsos de luz (na parte clara, ao lado do texto) */
.circuito {
  position: absolute;
  top: 0;
  left: 36%;
  width: 30%;
  height: 100%;
}

.trilha {
  fill: none;
  stroke: var(--preto);
  stroke-width: 1.6;
  opacity: 0.35;
}

/* O pulso é um pedacinho da trilha (8%) que anda de ponta a ponta */
.pulso {
  fill: none;
  stroke: var(--azul);
  stroke-width: 3.2;
  stroke-linecap: round;
  stroke-dasharray: 8 92;
  stroke-dashoffset: 0;
  filter: drop-shadow(0 0 4px var(--azul-claro));
  animation: pulso 4.5s linear infinite;
}

.pulso.p2 { animation-duration: 6s;   animation-delay: -2s; }
.pulso.p3 { animation-duration: 5.2s; animation-delay: -3.4s; }

@keyframes pulso {
  from { stroke-dashoffset: 0; }
  to   { stroke-dashoffset: -100; }
}

.no {
  fill: var(--preto);
  transform-box: fill-box;
  transform-origin: center;
  animation: respirar 2.6s ease-in-out infinite;
}

.no.n2 { animation-delay: -0.9s; }
.no.n3 { animation-delay: -1.7s; }

@keyframes respirar {
  0%, 100% { transform: scale(1);   opacity: 1; }
  50%      { transform: scale(1.7); opacity: 0.45; }
}

/* Hexágonos */
.hex {
  position: absolute;
  fill: rgba(255, 255, 255, 0.12);
  stroke: #fff;
  stroke-width: 1.6;
  animation: hex-flutuar 14s ease-in-out infinite;
}

.hex.h1 { width: 56px; right: 14%; bottom: 14%; }
.hex.h2 { width: 34px; right: 23%; top: 16%; animation-duration: 18s; animation-delay: -5s; }
.hex.h3 { width: 44px; left: 40%;  bottom: 12%; fill: rgba(47, 127, 193, 0.12); stroke: var(--azul); animation-duration: 16s; animation-delay: -9s; }

@keyframes hex-flutuar {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50%      { transform: translateY(-12px) rotate(30deg); }
}

/* Três barras inclinadas que acendem uma depois da outra */
.barras {
  position: absolute;
  left: 40px;
  top: 18px;
  display: flex;
  gap: 6px;
}

.barras i {
  width: 14px;
  height: 20px;
  background: var(--azul);
  transform: skewX(-30deg);
  opacity: 0.25;
  animation: acender 2.4s ease-in-out infinite;
}

.barras i:nth-child(2) { animation-delay: 0.3s; }
.barras i:nth-child(3) { animation-delay: 0.6s; }

@keyframes acender {
  0%, 60%, 100% { opacity: 0.25; }
  30%           { opacity: 1; }
}

/* =====================================================
   VARIANTE ESCURA
===================================================== */

/* Luz que passeia devagar por trás do texto */
.luz {
  position: absolute;
  top: -60%;
  left: 0;
  width: 40%;
  height: 220%;
  background: radial-gradient(closest-side, rgba(124, 200, 255, 0.22), transparent);
  filter: blur(10px);
  animation: luz 14s ease-in-out infinite alternate;
}

@keyframes luz {
  from { transform: translateX(-10%); }
  to   { transform: translateX(220%); }
}

/* Linhas de planta que se desenham e se apagam */
.planta {
  position: absolute;
  right: 3%;
  bottom: 0;
  height: 100%;
  aspect-ratio: 600 / 300;
}

.risco {
  fill: none;
  stroke: var(--azul-claro);
  stroke-width: 1.4;
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
  opacity: 0.5;
  animation: desenhar 9s ease-in-out infinite;
}

.risco.r2 { animation-delay: 1.2s; }
.risco.r3 { animation-delay: 2.4s; }

@keyframes desenhar {
  0%   { stroke-dashoffset: 100; opacity: 0.5; }
  40%  { stroke-dashoffset: 0;   opacity: 0.5; }
  80%  { stroke-dashoffset: 0;   opacity: 0.5; }
  100% { stroke-dashoffset: 0;   opacity: 0; }
}

.marca {
  fill: var(--azul-claro);
  opacity: 0;
  animation: surgir 9s ease-in-out infinite;
}

.marca.m2 { animation-delay: 2.4s; }

@keyframes surgir {
  0%, 30%  { opacity: 0; }
  45%, 80% { opacity: 0.9; }
  100%     { opacity: 0; }
}

/* Faíscas subindo */
.faisca {
  position: absolute;
  bottom: -6px;
  background: var(--azul-claro);
  border-radius: 50%;
  opacity: 0;
  animation: subir-faisca linear infinite;
}

@keyframes subir-faisca {
  0%   { transform: translateY(0);      opacity: 0; }
  15%  { opacity: 0.8; }
  85%  { opacity: 0.3; }
  100% { transform: translateY(-280px); opacity: 0; }
}

/* Celular: só ficam os detalhes pequenos */
@media (max-width: 700px) {
  .circuito,
  .pontos { display: none; }
  .barras { left: 16px; }
  .planta { opacity: 0.5; }
}
</style>
