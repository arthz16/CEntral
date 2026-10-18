<template>
  <footer id="footer">
    <div class="conteudo">
      <div class="marca">
        <strong>Central Projetos</strong>
        <p>Organize, acompanhe e gerencie seus projetos em um único lugar.</p>
      </div>

      <div class="links">
        <RouterLink to="/Ajuda">Ajuda</RouterLink>
        <RouterLink to="/Suporte">Suporte / Fale conosco</RouterLink>
        <button class="topo" @click="voltarAoTopo">Voltar ao topo</button>
      </div>
    </div>

    <p class="copy">&copy; 2026 Central Projetos. Todos os direitos reservados.</p>
  </footer>
</template>

<script>
export default {
  name: 'Footer',

  methods: {
    // Rola a página até o topo
    voltarAoTopo() {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
}
</script>

<style scoped>
#footer {
  background: var(--preto);
  border-top: 4px solid var(--azul);
  color: var(--branco);
  padding: 40px 20px 20px;
}


.conteudo {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 30px;
  flex-wrap: wrap;
}

.marca strong {
  color: var(--azul-claro);
  font-size: 20px;
}

.marca p {
  margin-top: 6px;
  max-width: 320px;
  color: #9aa7b5;
  font-size: 14px;
}

.links {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.links a {
  color: #aeb8c6;
  font-size: 14px;

  transition: var(--transicao);
}

.links a:hover {
  color: var(--azul-claro);
  transform: translateX(4px);
}

.topo {
  align-self: flex-start;
  margin-top: 6px;
  padding: 8px 16px;
  background: var(--azul-botao);
  color: var(--branco);
  border: 2px solid var(--azul-claro);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: var(--transicao);
}

.topo:hover {
  background: var(--azul-claro);
  color: var(--tinta);
  transform: translateY(-3px);
}

.copy {
  max-width: 1200px;
  margin: 30px auto 0;
  padding-top: 16px;
  border-top: 1px solid #1f2937;
  text-align: center;
  color: #96a2b3;
  font-size: 13px;
}
</style>