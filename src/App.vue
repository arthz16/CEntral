<template>
  <!-- Quem usa o teclado pula o menu direto para o conteúdo -->
  <a href="#conteudo" class="pular-conteudo" @click.prevent="irParaConteudo">Pular para o conteúdo</a>

  <Navbar />

  <main id="conteudo" class="main-content" tabindex="-1" ref="principal">
    <!-- Animação simples ao trocar de página -->
    <router-view v-slot="{ Component }">
      <Transition name="pagina" mode="out-in">
        <component :is="Component" />
      </Transition>
    </router-view>
  </main>

  <Footer />

  <!-- Janelas do site: confirmação (excluir, banir...) e denúncia -->
  <ModalConfirmar />
  <ModalDenuncia />
</template>

<script setup>
import { nextTick, ref } from "vue";
import { useRouter } from "vue-router";
import Navbar from "./components/Navbar.vue";
import Footer from "./components/Footer.vue";
import ModalConfirmar from "./components/ModalConfirmar.vue";
import ModalDenuncia from "./components/ModalDenuncia.vue";

const router = useRouter();
const principal = ref(null);

const irParaConteudo = () => principal.value?.focus();

// Ao trocar de página, leva o foco para o conteúdo (leitores de tela anunciam a página nova).
// Na primeira abertura não: assim o primeiro Tab mostra o "Pular para o conteúdo".
router.afterEach((para, de) => {
  if (!de.matched.length) return;
  nextTick(() => principal.value?.focus({ preventScroll: true }));
});
</script>

<style>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
}
.main-content:focus { outline: none; }

/* Transição entre páginas (curta, para o site parecer rápido) */
.pagina-enter-active,
.pagina-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.pagina-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.pagina-leave-to {
  opacity: 0;
}
</style>
