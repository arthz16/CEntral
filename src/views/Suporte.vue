<template>
  <div>
    <Banner title="Suporte" subtitle="Fale conosco" />

    <div class="main-container">
      <h1 class="titulo-pagina">Fale conosco</h1>

      <section class="contatos">
        <div class="contato anim-subir" v-for="(c, i) in contatos" :key="c.titulo"
             :style="{ animationDelay: (i * 0.1) + 's' }">
          <strong>{{ c.titulo }}</strong>
          <span>{{ c.texto }}</span>
        </div>
      </section>

      <form class="form-suporte anim-subir" @submit.prevent="enviar">
        <div class="campo">
          <label for="s-nome">Seu nome</label>
          <input id="s-nome" v-model="nome" placeholder="Digite seu nome" required>
        </div>
        <div class="campo">
          <label for="s-assunto">Assunto</label>
          <select id="s-assunto" v-model="assunto">
            <option>Dúvida</option>
            <option>Problema no site</option>
            <option>Sugestão</option>
          </select>
        </div>
        <div class="campo">
          <label for="s-msg">Mensagem</label>
          <textarea id="s-msg" v-model="mensagem" placeholder="Escreva sua mensagem" required></textarea>
        </div>
        <input type="submit" class="enviar" value="Enviar mensagem">
        <p class="dica">Ao enviar, abre o seu programa de e-mail com a mensagem pronta.</p>
      </form>

      <p class="ajuda-link">Procurando o passo a passo? <RouterLink to="/Ajuda">Veja a página de Ajuda</RouterLink></p>
    </div>
  </div>
</template>

<script>
import Banner from '../components/Banner.vue';

// Troque pelo e-mail real de suporte
const EMAIL = "suporte@centralprojetos.com";

export default {
  name: 'Suporte',
  components: { Banner },

  data() {
    return {
      nome: "",
      assunto: "Dúvida",
      mensagem: "",
      contatos: [
        { titulo: "E-mail", texto: EMAIL },
        { titulo: "Atendimento", texto: "Segunda a sexta, das 8h às 18h" },
        { titulo: "Resposta", texto: "Em até 2 dias úteis" }
      ]
    }
  },

  methods: {
    // Abre o e-mail com a mensagem pronta
    enviar() {
      const assunto = encodeURIComponent(`[${this.assunto}] Central Projetos`);
      const corpo = encodeURIComponent(`Nome: ${this.nome}\n\n${this.mensagem}`);
      window.location.href = `mailto:${EMAIL}?subject=${assunto}&body=${corpo}`;
    }
  }
}
</script>

<style scoped>
.contatos {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 18px;
  margin-bottom: 34px;
}

.contato {
  min-width: 0;
  padding: 18px 20px;
  background: var(--superficie);
  color: var(--texto-suave);
  border: 1px solid var(--borda);
  border-left: 5px solid var(--azul);
  border-radius: var(--raio);
  transition: var(--transicao);
}

.contato:hover { transform: translateY(-4px); box-shadow: var(--sombra); }
.contato strong { display: block; color: var(--tinta); font-size: 18px; margin-bottom: 4px; }
.contato span { overflow-wrap: anywhere; }

.form-suporte {
  max-width: 560px;
  margin: 0 auto;
  padding: 30px;
  background: var(--superficie);
  border: 1px solid var(--borda);
  border-top: 5px solid var(--azul-botao);
  border-radius: 16px;
  box-shadow: var(--sombra);
}

.campo { display: flex; flex-direction: column; margin-bottom: 18px; }

label {
  margin-bottom: 8px;
  padding-left: 10px;
  font-weight: 700;
  border-left: 4px solid var(--azul);
}

input, select, textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid var(--borda);
  border-radius: 8px;
  font-family: inherit;
  font-size: 15px;
  outline: none;
  transition: var(--transicao);
}

input:focus, select:focus, textarea:focus {
  border-color: var(--azul);
  box-shadow: 0 0 0 3px rgba(124, 200, 255, 0.35);
}

textarea { height: 130px; resize: none; }

.enviar {
  background: var(--azul-botao);
  color: var(--branco);
  border-color: var(--azul-botao);
  font-weight: 700;
  cursor: pointer;
}

.enviar:hover { background: var(--azul-escuro); border-color: var(--azul-escuro); transform: translateY(-2px); }
.dica { margin-top: 10px; text-align: center; color: var(--texto-suave); font-size: 13px; }
.ajuda-link { margin-top: 30px; text-align: center; }
.ajuda-link a { font-weight: 700; }
</style>
