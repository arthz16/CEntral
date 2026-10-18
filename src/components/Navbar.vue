<template>
  <nav class="navbar" aria-label="Principal">
    <!-- Logo -->
    <RouterLink to="/" class="logo">
      <img src="/img/LogoProjetos.png" alt="Logo Central Projetos" />
      <span>Central Projetos</span>
    </RouterLink>

    <!-- Menu -->
    <button class="menu-btn" :aria-expanded="aberto" aria-controls="menu-principal" :aria-label="aberto ? 'Fechar menu' : 'Abrir menu'" @click="aberto = !aberto">
      <span></span><span></span><span></span>
    </button>

    <div id="menu-principal" class="menu" :class="{ aberto }">
      <RouterLink to="/">Início</RouterLink>
      <RouterLink to="/Projetos">{{ auth.usuario ? "Meus Projetos" : "Projetos" }}</RouterLink>
      <RouterLink v-if="auth.usuario" to="/Comunidade">Comunidade</RouterLink>
      <RouterLink v-if="admin" to="/Admin" class="link-admin">Administração</RouterLink>

      <!-- Logado: Cadastrar Projeto + Conta. Visitante: só o botão Login -->
      <template v-if="auth.usuario">
        <RouterLink to="/CadastrosProjetos" class="botao">Cadastrar Projeto</RouterLink>
        <RouterLink to="/Conta" class="conta">
          <span class="avatar">{{ inicial }}</span>Conta
          <span v-if="auth.avisos.length" class="ponto-aviso" :title="`${auth.avisos.length} aviso(s) da moderação`"
                role="status"><span class="sr-only">{{ auth.avisos.length }} aviso(s) da moderação</span></span>
        </RouterLink>
      </template>
      <RouterLink v-else to="/Login" class="botao">Login</RouterLink>

      <!-- Notificações -->
      <RouterLink v-if="auth.usuario" to="/Notificacoes" class="sino" :title="auth.naoLidas ? `${auth.naoLidas} notificação(ões) nova(s)` : 'Notificações'"
                  :aria-label="auth.naoLidas ? `Notificações: ${auth.naoLidas} nova(s)` : 'Notificações'">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 17V11a6 6 0 0 1 12 0v6l1.500 2h-15zM10 21a2 2 0 0 0 4 0" /></svg>
        <span v-if="auth.naoLidas" class="contagem" aria-hidden="true">{{ auth.naoLidas > 99 ? '99+' : auth.naoLidas }}</span>
      </RouterLink>

      <!-- Tema claro/escuro -->
      <button type="button" class="tema-btn" :aria-label="escuro ? 'Mudar para o modo claro' : 'Mudar para o modo escuro'"
              :title="escuro ? 'Modo claro' : 'Modo escuro'" @click="alternarTema">
        <svg v-if="escuro" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.500" /><path d="M12 2.500v2.500M12 19v2.500M2.500 12H5M19 12h2.500M5.300 5.300l1.800 1.800M16.900 16.900l1.800 1.800M5.300 18.700l1.800-1.800M16.900 7.100l1.800-1.800" /></svg>
        <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M20.500 14.500A8.500 8.500 0 1 1 9.500 3.500a7 7 0 0 0 11 11z" /></svg>
      </button>
    </div>

    <!-- Rastro de luz: corre pela borda de baixo a cada troca de página -->
    <span class="rastro" :key="chave"></span>
  </nav>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { auth } from "../stores/auth";
import { alternarTema, tema } from "../stores/tema";

const route = useRoute();
const escuro = computed(() => tema.atual === "escuro");
const admin = computed(() => auth.usuario?.papel === "admin");

// Mudar a "chave" recria o rastro e a animação começa de novo
const chave = ref(0);
const aberto = ref(false);
const inicial = computed(() => (auth.usuario?.nome || "?").charAt(0).toUpperCase());
watch(() => route.path, () => { chave.value++; aberto.value = false; });
</script>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 10;
  height: 70px;
  padding: 0 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--preto);

  border-bottom: 3px solid var(--azul);
  animation: aparecer 0.6s ease both;
}

/* ---- Rastro de luz na borda ---- */
.rastro {
  position: absolute;
  left: 0;
  bottom: -3px;
  width: 100%;
  height: 3px;
  background: linear-gradient(90deg, transparent, var(--azul-claro) 75%, var(--branco));
  box-shadow: 0 0 12px var(--azul-claro);
  transform-origin: left;
  transform: scaleX(0);
  pointer-events: none;
  animation: rastro 1s cubic-bezier(0.3, 0.7, 0.2, 1) both;
}

@keyframes rastro {
  0%   { transform: scaleX(0); opacity: 1; }
  65%  { transform: scaleX(1); opacity: 1; }
  100% { transform: scaleX(1); opacity: 0; }
}

/* ---- Logo ---- */
.logo {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  white-space: nowrap;
  gap: 10px;
  color: var(--branco);
  font-size: 22px;
  font-weight: 700;
}

/* Administração: o logo (azul) vira roxo */
:root[data-papel="admin"] .logo img { filter: hue-rotate(62deg) saturate(1.1); }

.logo img {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 10px;
}

/* ---- Menu ---- */
.menu {
  display: flex;
  align-items: center;
  gap: 22px;
}
.menu a { white-space: nowrap; }

/* Administração tem um item a mais no menu: o nome ao lado do logo também some em telas um pouco maiores */
@media (min-width: 1151px) and (max-width: 1360px) {
  :root[data-papel="admin"] .logo span { display: none; }
}

/* Telas médias: o nome ao lado do logo some para o menu caber em uma linha (principalmente com o item de admin) */
@media (min-width: 981px) and (max-width: 1150px) {
  .logo span { display: none; }
  .menu { gap: 16px; }
}

.menu a {
  position: relative;
  color: var(--branco);
  padding: 6px 0;

  transition: var(--transicao);
}

/* Linha animada embaixo do link */
.menu a::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: 0;
  width: 0;
  height: 2px;
  background: var(--azul-claro);
  transition: var(--transicao);
}

.menu a:hover,
.menu a.router-link-active:not([href="/"]),
.menu a.router-link-exact-active {
  color: var(--azul-claro);
}

.menu a:hover::after,
.menu a.router-link-active:not([href="/"])::after,
.menu a.router-link-exact-active::after {
  width: 100%;
}

/* ---- Botão de cadastro ---- */
.menu a.botao {
  background: var(--azul-botao);
  padding: 8px 18px;
  border-radius: 8px;
  font-weight: 600;
}


.menu a.botao::after {
  display: none;
}

.menu a.botao.router-link-active { color: var(--branco); }

.menu a.botao:hover {
  background: var(--azul-claro);
  color: var(--preto);
}

/* ---- Botão da conta ---- */
.menu a.conta {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 14px 4px 5px;
  border: 2px solid var(--azul-claro);
  border-radius: 999px;
  font-weight: 600;
}

.menu a.conta::after { display: none; }

.menu a.conta:hover {
  background: var(--azul-claro);
  color: var(--preto);
}

.avatar {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--azul-claro);
  color: var(--preto);
  font-size: 13px;
  font-weight: 800;
}

/* ---- Sino de notificações ---- */
.menu a.sino {
  position: relative;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-radius: 50%;
  color: var(--branco);
}
.menu a.sino::after { display: none; }
.menu a.sino svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.menu a.sino:hover, .menu a.sino.router-link-active { border-color: var(--azul-claro); color: var(--azul-claro); }
.sino .contagem {
  position: absolute;
  top: -7px;
  right: -7px;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  display: grid;
  place-items: center;
  background: #d92d20;
  color: #fff;
  border: 2px solid var(--preto);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
}

/* ---- Administração ---- */
.menu a.link-admin::before {
  content: "ADMIN";
  margin-right: 8px;
  padding: 2px 7px;
  background: var(--azul-claro);
  color: #1a1030;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
}
.ponto-aviso { width: 9px; height: 9px; margin-left: 2px; background: #ff7a59; border-radius: 50%; }

/* ---- Botão de tema ---- */
.tema-btn {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  background: transparent;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-radius: 50%;
  color: var(--branco);
  cursor: pointer;
  transition: var(--transicao);
}
.tema-btn svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.tema-btn:hover { border-color: var(--azul-claro); color: var(--azul-claro); }

/* ---- Botão do menu (só no celular) ---- */
.menu-btn {
  display: none;
  flex-direction: column;
  gap: 5px;
  padding: 8px;
  background: none;
  border: 0;
  cursor: pointer;
}

.menu-btn span {
  width: 24px;
  height: 2px;
  background: var(--branco);
}

/* ---- Celular ---- */
@media (max-width: 980px) {
  .navbar { padding: 0 16px; }
  .logo span { display: none; }
  .menu-btn { display: flex; }

  .menu {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    padding: 12px 16px 18px;
    background: var(--preto);
    border-bottom: 3px solid var(--azul);
  }

  .menu.aberto { display: flex; }
  .menu a { padding: 10px 0; }
  .menu a.botao { text-align: center; }
  .menu a.conta { justify-content: center; }
  .tema-btn { align-self: center; }
  .menu a.sino { align-self: center; }
}
</style>
