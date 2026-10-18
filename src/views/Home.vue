<template>
  <div class="home-page">

    <!-- ===== Apresentação ===== -->
    <section class="home">
      <div class="texto anim-esquerda">
        <span class="tag">Gestão de projetos</span>
        <h1>Central Projetos</h1>
        <p>Organize, acompanhe e gerencie todos os seus projetos em um único lugar.</p>

        <div class="acoes">
          <RouterLink to="/CadastrosProjetos" class="btn">Criar Projeto</RouterLink>
          <RouterLink to="/Projetos" class="btn btn-outline">Ver Projetos</RouterLink>
        </div>
      </div>

      <!-- Área do vídeo (mesmo tamanho da antiga imagem) -->
      <div class="imagem anim-subir">

        <!-- Se você colocar um vídeo, ele aparece aqui (veja a constante VIDEO abaixo) -->
        <video v-if="VIDEO" :src="VIDEO" poster="/img/FundoProjetos.png"
               autoplay muted loop playsinline></video>

        <!-- Sem vídeo: animação de um muro sendo construído -->
        <div v-else class="cena" role="img" aria-label="Animação de muros, sites, casas e carros sendo construídos">
          <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">

            <!-- Carregamento com foguete -->
            <text x="24" y="26" class="texto-cena">Construindo {{ nomeCena }}</text>
            <text x="776" y="26" class="texto-cena" text-anchor="end">{{ porcentagem }}%</text>
            <rect x="24" y="40" width="752" height="8" rx="4" class="barra-fundo" />
            <rect x="24" y="40" :width="foguetex - 24" height="8" rx="4" class="barra" />
            <g class="foguete" :style="{ transform: `translate(${foguetex}px, 44px)` }">
              <polygon points="-28,-4 -42,0 -28,4" class="chama" />
              <polygon points="-26,-6 -36,-13 -14,-6" class="asa" />
              <polygon points="-26,6 -36,13 -14,6" class="asa" />
              <rect x="-28" y="-6" width="28" height="12" rx="3" class="corpo" />
              <polygon points="0,-6 14,0 0,6" class="nariz" />
              <circle cx="-10" cy="0" r="3" class="janela" />
            </g>

            <!-- Peças da cena atual (muro, site, casa, carro) -->
            <TransitionGroup name="peca" tag="g">
              <component v-for="p in pecas" :key="cena + p.id" :is="p.tag"
                         v-bind="p.a" :class="p.cls">{{ p.txt }}</component>
            </TransitionGroup>

            <!-- Chão -->
            <rect x="0" y="430" width="800" height="20" class="chao" />
          </svg>
        </div>
      </div>
    </section>

    <!-- ===== Primeiros passos (quem acabou de chegar) ===== -->
    <GuiaInicial v-if="auth.usuario && !eAdmin && numerosProntos" :total="total" :publicos="publicos" />

    <!-- ===== Administração: resumo geral do site ===== -->
    <section v-if="eAdmin" class="resumo-site anim-subir" aria-labelledby="resumo-titulo">
      <header>
        <h2 id="resumo-titulo">Resumo geral do site</h2>
        <RouterLink to="/Admin" class="btn-mini principal">Abrir a administração</RouterLink>
      </header>
      <div v-if="resumoSite" class="grade-resumo">
        <RouterLink to="/Admin/denuncias" class="item destaque" :class="{ alerta: resumoSite.denunciasAbertas }">
          <strong>{{ resumoSite.denunciasAbertas }}</strong>
          <span>denúncia(s) aberta(s)</span>
          <small>{{ resumoSite.denunciasAbertas ? 'Clique para analisar' : 'Tudo em dia' }}</small>
        </RouterLink>
        <RouterLink to="/Admin/projetos" class="item">
          <strong>{{ resumoSite.novosProjetos }}</strong>
          <span>projetos novos</span>
          <small>nos últimos 7 dias</small>
        </RouterLink>
        <RouterLink to="/Admin/pessoas" class="item">
          <strong>{{ resumoSite.novosUsuarios }}</strong>
          <span>pessoas novas</span>
          <small>nos últimos 7 dias</small>
        </RouterLink>
        <RouterLink to="/Admin/projetos" class="item">
          <strong>{{ resumoSite.projetos }}</strong>
          <span>projetos no site</span>
          <small>{{ resumoSite.publicos }} públicos · {{ resumoSite.privados }} privados · {{ resumoSite.ocultos }} ocultos</small>
        </RouterLink>
        <RouterLink to="/Admin/pessoas" class="item">
          <strong>{{ resumoSite.usuarios }}</strong>
          <span>pessoas</span>
          <small>{{ resumoSite.suspensos }} suspensa(s) · {{ resumoSite.admins }} admin(s)</small>
        </RouterLink>
        <div class="item">
          <strong>{{ resumoSite.comentarios }}</strong>
          <span>comentários</span>
          <small>{{ resumoSite.curtidas }} curtida(s)</small>
        </div>
      </div>
      <div v-else class="grade-resumo" aria-busy="true"><span v-for="n in 6" :key="n" class="esqueleto" style="height: 104px"></span></div>
    </section>

    <!-- ===== Números ===== -->
    <section v-else class="numeros anim-subir">
      <div class="numero">
        <strong>{{ total }}</strong>
        <span>{{ auth.usuario ? 'Meus projetos' : 'Projetos de exemplo' }}</span>
      </div>
      <div class="numero">
        <strong>{{ andamento }}</strong>
        <span>Em andamento</span>
      </div>

      <div class="numero">
        <strong>{{ concluidos }}</strong>
        <span>Concluídos</span>
      </div>
    </section>

    <!-- ===== Recursos ===== -->
    <section class="recursos">
      <div class="card anim-subir" v-for="(item, i) in recursos" :key="item.titulo"
           :style="{ animationDelay: (i * 0.15) + 's' }">
        <span class="numero-card">{{ item.numero }}</span>
        <h3>{{ item.titulo }}</h3>
        <p>{{ item.texto }}</p>
      </div>
    </section>

  </div>
</template>

<script>
import { api, vitrine } from "../services/api";
import GuiaInicial from "../components/GuiaInicial.vue";
import { auth } from "../stores/auth";

// Para usar um vídeo de verdade, coloque o arquivo em public/video/
// e escreva o caminho aqui. Exemplo: "/video/construcao.mp4"
// Deixe vazio ("") para mostrar a animação.
const VIDEO = "";

const PASSO_MS = 200;   // tempo de cada passo da animação
const PAUSA = 6;        // passos parados no fim de cada cena

// Cada peça: id, t (passo em que aparece), tag, cls, a (atributos) e txt (texto)
function muro() {
  const l = [];
  for (let f = 0; f < 5; f++) {
    const d = f % 2 === 1, q = d ? 7 : 8, ini = d ? 71 : 24;
    for (let c = 0; c < q; c++) {
      l.push({ id: "b" + l.length, t: Math.floor(l.length / 2), tag: "rect", cls: "tijolo cor-" + ((c + f) % 3 + 1),
               a: { x: ini + c * 94, y: 392 - f * 38, width: 90, height: 34, rx: 4 } });
    }
  }
  return l;
}

function sites() {
  const nomes = ["index.html", "style.css", "app.js", "main.py", "api.py", "banco.db"];
  const l = [];
  nomes.forEach((n, i) => {
    const x = 80 + (i % 3) * 230, y = 120 + Math.floor(i / 3) * 150, t = i * 2;
    l.push({ id: "f" + i, t, tag: "rect", cls: "arquivo", a: { x, y, width: 180, height: 110, rx: 10 } });
    l.push({ id: "h" + i, t, tag: "rect", cls: "arq-topo", a: { x, y, width: 180, height: 22, rx: 10 } });
    l.push({ id: "n" + i, t, tag: "text", cls: "arq-nome", a: { x: x + 90, y: y + 68, "text-anchor": "middle" }, txt: n });
  });
  return l;
}

function casa() {
  const r = (id, t, cls, x, y, width, height) => ({ id, t, tag: "rect", cls, a: { x, y, width, height } });
  return [
    r("base", 0, "base", 200, 390, 400, 40),
    r("q1", 2, "quarto-1", 223, 253, 174, 134),
    r("q2", 4, "quarto-2", 403, 253, 174, 134),
    r("par", 6, "parede", 220, 250, 360, 140),
    r("div", 7, "base", 397, 250, 6, 140),
    r("sofa", 8, "movel", 235, 345, 90, 40),
    r("cama", 9, "movel", 430, 340, 120, 45),
    r("porta", 10, "porta", 340, 320, 36, 70),
    r("j1", 10, "janela", 260, 280, 50, 40),
    r("j2", 11, "janela", 500, 280, 50, 40),
    { id: "telhado", t: 12, tag: "polygon", cls: "telhado", a: { points: "200,252 400,130 600,252" } }
  ];
}

function carro() {
  const corpo = "M220 390 L220 330 L290 320 L330 260 L470 260 L520 320 L590 330 L590 390 Z";
  const roda = (id, cx) => [
    { id: id, t: 0, tag: "circle", cls: "roda", a: { cx, cy: 395, r: 30 } },
    { id: id + "h", t: 0, tag: "circle", cls: "cubo", a: { cx, cy: 395, r: 12 } }
  ];
  return [
    { id: "c1", t: 2, tag: "path", cls: "carro-1", a: { d: corpo } },
    { id: "c2", t: 7, tag: "path", cls: "carro-2", a: { d: corpo } },
    { id: "c3", t: 10, tag: "path", cls: "carro-3", a: { d: corpo } },
    { id: "v1", t: 4, tag: "polygon", cls: "vidro", a: { points: "340,270 400,270 400,318 318,318" } },
    { id: "v2", t: 5, tag: "polygon", cls: "vidro", a: { points: "410,270 460,270 490,318 410,318" } },
    { id: "l1", t: 6, tag: "circle", cls: "farol", a: { cx: 580, cy: 345, r: 8 } },
    ...roda("r1", 300), ...roda("r2", 510)
  ];
}

const CENAS = [
  { nome: "um muro", pecas: muro() },
  { nome: "um site", pecas: sites() },
  { nome: "uma casa", pecas: casa() },
  { nome: "um carro", pecas: carro() }
].map(c => ({ ...c, duracao: Math.max(...c.pecas.map(p => p.t)) + 1 + PAUSA }));

const TOTAL = CENAS.reduce((soma, c) => soma + c.duracao, 0);

export default {
  name: "Home",

  data() {
    return {
      VIDEO,
      auth,
      cena: 0,           // cena atual
      passo: 0,          // passo dentro da cena
      timer: null,
      total: 0,
      publicos: 0,
      andamento: 0,
      concluidos: 0,
      numerosProntos: false,
      resumoSite: null, // resumo geral do site (só para administradores)
      recursos: [
        { numero: "01", titulo: "Organize",  texto: "Cadastre projetos com categoria, itens, quantidades, valores e orçamento." },
        { numero: "02", titulo: "Acompanhe", texto: "Controle status, prazos e prioridade. Edite ou exclua direto da lista." },
        { numero: "03", titulo: "Descubra",  texto: "Todo projeto vai para a Comunidade: todos curtem e comentam, mas só o dono edita." }
      ]
    }
  },

  components: { GuiaInicial },

  computed: {
    eAdmin() { return auth.usuario?.papel === "admin"; },
    nomeCena() { return CENAS[this.cena].nome; },

    // Peças que já apareceram na cena atual
    pecas() { return CENAS[this.cena].pecas.filter(p => p.t < this.passo); },

    // Porcentagem total do carregamento (0 a 100)
    porcentagem() {
      const antes = CENAS.slice(0, this.cena).reduce((soma, c) => soma + c.duracao, 0);
      const atual = Math.min(this.passo, CENAS[this.cena].duracao);
      return Math.round(((antes + atual) / TOTAL) * 100);
    },

    // Posição do foguete na barra
    foguetex() {
      return Math.min(Math.max(24 + 752 * this.porcentagem / 100, 44), 758);
    }
  },

  methods: {
    // Avança um passo; ao terminar a cena, vai para a próxima
    avancar() {
      this.passo++;
      if (this.passo > CENAS[this.cena].duracao) {
        this.cena = (this.cena + 1) % CENAS.length;
        this.passo = 0;
      }
    },

    // Logado: números da própria conta. Visitante: números dos projetos prontos
    async carregarNumeros() {
      try {
        if (auth.usuario?.papel === "admin") {
          this.resumoSite = await api("/admin/resumo");
        } else if (auth.usuario) {
          const r = await api("/resumo");
          this.total = r.total;
          this.publicos = r.publicos;
          this.andamento = r.andamento;
          this.concluidos = r.concluidos;
        } else {
          const projetos = await vitrine();
          this.total = projetos.length;
          this.andamento = projetos.filter(p => p.status === "Em andamento").length;
          this.concluidos = projetos.filter(p => p.status === "Concluído").length;
        }
      } catch (erro) {
        // Servidor desligado: os números ficam em 0
      }
      this.numerosProntos = true;
    }
  },

  mounted() {
    this.carregarNumeros();
    if (!VIDEO) this.timer = setInterval(this.avancar, PASSO_MS);
  },

  // Para o relógio ao sair da página
  beforeUnmount() {
    clearInterval(this.timer);
  }
}
</script>

<style scoped>
.home-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px;
}

/* ---- Apresentação ---- */
.home {
  min-height: 60vh;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 40px;
}

.texto { width: 45%; }

.tag {
  display: inline-block;
  margin-bottom: 14px;
  padding: 4px 12px;

  background: var(--azul-claro);
  color: var(--preto);
  font-size: 13px;
  font-weight: 600;
  border-radius: 999px;
}

.texto h1 {
  color: var(--tinta);
  font-size: 56px;
  line-height: 1.1;
}

.texto p {
  margin-top: 14px;
  color: var(--texto-suave);
  font-size: 19px;
}

.acoes {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 26px;
}

/* ---- Área do vídeo / animação (mesma proporção da imagem: 1672 x 941) ---- */
.imagem {
  width: 50%;
  aspect-ratio: 1672 / 941;
  overflow: hidden;
  border-radius: 24px;

  box-shadow: 0 20px 50px rgba(47, 127, 193, 0.35);
}

.imagem video,
.cena {
  display: block;
  width: 100%;
  height: 100%;
}

.imagem video { object-fit: cover; }

.cena {
  position: relative;
  background-image: url('/img/FundoProjetos.png');
  background-size: cover;
  background-position: center;
}

/* Administração: a foto de fundo da animação fica roxa (o desenho por cima já usa as cores do tema) */
:root[data-papel="admin"] .cena::before {
  content: "";
  position: absolute;
  inset: 0;
  background: #8b5cf6;
  mix-blend-mode: hue;
}
.cena svg { position: relative; }

/* ---- Resumo geral do site (administração) ---- */
.resumo-site { margin-bottom: 40px; padding: 24px; background: var(--superficie); border: 1px solid var(--azul-claro); border-radius: 20px; box-shadow: var(--sombra); }
.resumo-site header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; }
.resumo-site h2 { color: var(--tinta); font-size: 22px; }
.grade-resumo { display: grid; grid-template-columns: repeat(auto-fit, minmax(235px, 1fr)); gap: 14px; }
.item { display: flex; flex-direction: column; gap: 2px; padding: 16px 18px; background: var(--superficie-suave); border: 1px solid var(--borda); border-radius: 14px; color: var(--texto); transition: var(--transicao); }
a.item:hover { transform: translateY(-3px); border-color: var(--azul); }
.item strong { color: var(--azul); font-size: 34px; line-height: 1.1; }
.item span { color: var(--tinta); font-weight: 700; }
.item small { color: var(--texto-suave); font-size: 12px; }
.item.alerta { background: var(--b-vermelho-bg); border-color: var(--b-vermelho-borda); }
.item.alerta strong, .item.alerta span, .item.alerta small { color: var(--b-vermelho-fg); }

.cena svg {
  display: block;
  width: 100%;
  height: 100%;
}

/* ---- Cena animada ---- */
.texto-cena { fill: var(--branco); font-size: 16px; font-weight: 600; }
.barra-fundo { fill: rgba(255, 255, 255, 0.25); }
.barra { fill: var(--azul-claro); transition: width 0.2s linear; }
.chao { fill: var(--preto); }

/* Foguete */
.foguete { transition: transform 0.2s linear; }
.foguete .corpo { fill: var(--branco); stroke: var(--preto); stroke-width: 1.5; }
.foguete .nariz { fill: var(--azul); stroke: var(--preto); stroke-width: 1.5; }
.foguete .asa { fill: var(--azul-escuro); stroke: var(--preto); stroke-width: 1.5; }
.foguete .janela { fill: var(--azul-claro); stroke: var(--preto); }
.chama { fill: var(--azul-claro); animation: chama 0.15s infinite alternate; transform-box: fill-box; transform-origin: right center; }
@keyframes chama { to { transform: scaleX(0.6); } }

/* Muro */
.tijolo { stroke: var(--preto); stroke-width: 1.5; }
.tijolo.cor-1 { fill: var(--azul); }
.tijolo.cor-2 { fill: var(--azul-escuro); }
.tijolo.cor-3 { fill: var(--azul-claro); }

/* Site */
.arquivo { fill: var(--branco); stroke: var(--preto); stroke-width: 2; }
.arq-topo { fill: var(--azul); }
.arq-nome { fill: var(--preto); font-size: 20px; font-weight: 700; }

/* Casa */
.base, .porta { fill: var(--preto); }
.parede { fill: none; stroke: var(--preto); stroke-width: 6; }
.quarto-1 { fill: var(--azul-claro); }
.quarto-2 { fill: var(--branco); }
.movel { fill: var(--azul); stroke: var(--preto); stroke-width: 2; }
.janela { fill: var(--branco); stroke: var(--azul-escuro); stroke-width: 3; }
.telhado { fill: var(--azul-escuro); stroke: var(--preto); stroke-width: 4; }

/* Carro (a cor da lataria muda) */
.carro-1 { fill: var(--azul); stroke: var(--preto); stroke-width: 3; }
.carro-2 { fill: var(--azul-claro); stroke: var(--preto); stroke-width: 3; }
.carro-3 { fill: var(--branco); stroke: var(--preto); stroke-width: 3; }
.vidro { fill: var(--preto); opacity: 0.8; }
.farol { fill: var(--branco); stroke: var(--preto); stroke-width: 2; }
.roda { fill: var(--preto); stroke: var(--branco); stroke-width: 3; }
.cubo { fill: var(--azul-claro); }

/* Peça entrando no lugar */
.peca-enter-active { transition: opacity 0.25s ease, transform 0.25s ease-in; }
.peca-leave-active { transition: opacity 0.5s ease; }
.peca-enter-from   { opacity: 0; transform: translateY(-50px); }
.peca-leave-to     { opacity: 0; }

/* ---- Números ---- */
.numeros {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 50px;
  padding: 30px;
  background: var(--preto);
  border-radius: 20px;
}

.numero {
  text-align: center;
  color: #aeb8c6;
}

.numero strong {

  display: block;
  color: var(--azul-claro);
  font-size: 42px;
  line-height: 1.1;
}

/* ---- Recursos ---- */
.recursos {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 30px;
}

.numero-card {
  display: block;
  margin-bottom: 8px;
  color: var(--azul);
  font-size: 28px;
  font-weight: 700;
}

.card h3 {
  margin-bottom: 6px;
  color: var(--tinta);
}

.card p {
  color: var(--texto-suave);
  font-size: 15px;
}


/* ---- Celular e tablet ---- */
@media (max-width: 900px) {
  .home-page { padding: 24px 16px; }
  .home { flex-direction: column; }
  .texto, .imagem { width: 100%; }
  .texto h1 { font-size: 40px; }
  .numeros, .recursos { grid-template-columns: 1fr; }
}
</style>