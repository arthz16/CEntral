<template>
  <div>
    <Banner title="Ajuda" subtitle="Aprenda a usar cada parte do site" />

    <div class="main-container">
      <h1 class="titulo-pagina">Como usar a Central Projetos</h1>
      <p class="intro anim-subir">
        Esta página explica o que cada parte do site faz, com o passo a passo para usar.
        Leia na ordem ou vá direto ao assunto que você precisa.
      </p>

      <!-- Guias: uma caixa para cada parte do site -->
      <section class="guias">
        <article class="guia anim-subir" v-for="(g, i) in guias" :key="g.titulo"
                 :style="{ animationDelay: (i * 0.1) + 's' }">
          <span class="num">{{ String(i + 1).padStart(2, '0') }}</span>
          <h2>{{ g.titulo }}</h2>
          <p>{{ g.texto }}</p>
          <ol>
            <li v-for="passo in g.passos" :key="passo">{{ passo }}</li>
          </ol>
          <RouterLink v-if="g.link" :to="g.link" class="ir">{{ g.botao }}</RouterLink>
        </article>
      </section>

      <!-- Perguntas frequentes -->
      <h2 class="sub-titulo">Perguntas frequentes</h2>
      <section class="faq">
        <details v-for="f in perguntas" :key="f.p" class="anim-subir">
          <summary>{{ f.p }}</summary>
          <p>{{ f.r }}</p>
        </details>
      </section>

      <div class="ajuda-final anim-subir">
        <strong>Ainda com dúvida?</strong>
        <span>Fale com a nossa equipe.</span>
        <RouterLink to="/Suporte" class="btn">Ir para o suporte</RouterLink>
      </div>
    </div>
  </div>
</template>

<script>
import Banner from '../components/Banner.vue';

export default {
  name: 'Ajuda',
  components: { Banner },

  data() {
    return {
      guias: [
        {
          titulo: "Início",
          texto: "É a primeira tela do site. Mostra o resumo da plataforma e a animação de construção.",
          passos: [
            "Veja a animação: o foguete mostra o andamento enquanto muros, sites, casas e carros são construídos.",
            "Confira os números: total de projetos, em andamento e concluídos.",
            "Use os botões Criar Projeto e Ver Projetos para ir direto ao que precisa."
          ],
          link: "/", botao: "Ir para o início"
        },
        {
          titulo: "Conta e login",
          texto: "Cada pessoa tem a sua conta, e os projetos criados ficam ligados a ela.",
          passos: [
            "Clique em Login no menu e escolha Criar conta: nome, nome de usuário (@, único, de 3 a 20 letras sem acento, números ou _), e-mail e senha de pelo menos 6 caracteres.",
            "Depois de entrar, o botão Login some e aparecem Cadastrar Projeto e Conta no menu.",
            "Em Conta você vê os dados da sua conta e o resumo dos seus projetos. Lá também dá para editar o perfil, trocar a senha, sair ou excluir a conta.",
            "Esqueceu a senha? Na tela de Login use Esqueci minha senha: enviamos um código de 6 dígitos para o seu e-mail. Ele vale por 15 minutos e só funciona uma vez.",
            "Em Conta você também troca o seu @ e abre o seu perfil público.",
            "O botão de sol/lua no menu liga o modo escuro (ele lembra da sua escolha). Ao sair da conta, o login é encerrado de verdade no servidor.",
            "Sem login você só vê os Projetos Prontos, que são exemplos. Para cadastrar, é preciso entrar."
          ],
          link: "/Login", botao: "Entrar ou criar conta"
        },
        {
          titulo: "Cadastrar projeto",
          texto: "Aqui você cria um projeto novo e ele fica salvo no banco de dados, na sua conta.",
          passos: [
            "Entre na sua conta (o cadastro só funciona com login).",
            "Escreva o nome e a descrição do projeto.",
            "Escolha a categoria, por exemplo Construção, Sites ou Manutenção de carros. Não achou a sua? Escolha Outros e digite o nome da categoria.",
            "Escolha a subcategoria (a lista muda conforme a categoria). Em Outros a subcategoria é um campo livre e opcional.",
            "Clique nos itens sugeridos (tijolo, HTML, porta e outros) ou adicione os seus. As sugestões mudam conforme a subcategoria.",
            "Informe a quantidade e o valor de cada item e marque os que já foram comprados. O total previsto aparece em reais.",
            "Se quiser, digite o orçamento planejado. O site avisa quando o previsto passar dele.",
            "Informe o responsável, o prazo, o status e a prioridade. O prazo precisa ser a partir de amanhã e a data de criação é automática, sem como alterar.",
            "Dois interruptores no fim: Projeto público (ligado, aparece na Comunidade; desligado, só você vê) e Favoritar projeto (favoritos ficam no topo de Meus Projetos). Depois clique em Cadastrar Projeto."
          ],
          link: "/CadastrosProjetos", botao: "Cadastrar agora"
        },
        {
          titulo: "Meus projetos",
          texto: "Mostra os projetos da sua conta em cards. Sem login, mostra projetos prontos de exemplo.",
          passos: [
            "Cada card mostra status, prioridade, prazo, categoria, responsável e quanto já foi comprado. Projetos privados têm a etiqueta Privado.",
            "Pesquise por nome, descrição, responsável ou categoria e filtre por categoria, status, prioridade ou favoritos. Também dá para ordenar por mais recentes, nome ou prazo mais próximo.",
            "A lista mostra 12 projetos por vez: use Anterior, Próxima ou os números lá embaixo.",
            "Troque o status no seletor do card: Planejamento, Em andamento ou Concluído.",
            "Clique no nome do projeto para ver todos os detalhes, ou em Editar para mudar qualquer informação.",
            "Clique em Excluir para apagar. O site abre uma janela de confirmação (Esc cancela).",
            "Use Exportar CSV para baixar a lista em planilha."
          ],
          link: "/Projetos", botao: "Ver meus projetos"
        },
        {
          titulo: "Comunidade",
          texto: "Mostra os projetos públicos de todo mundo, inclusive os seus. Só aparece para quem está logado.",
          passos: [
            "Todo projeto que você cadastra vai automaticamente para a Comunidade, a não ser que você marque Projeto privado.",
            "Cada card mostra o nome e o @ de quem criou. Clique no nome para abrir o perfil público da pessoa.",
            "Use as abas Todos, Em alta (curtidas e comentários pesam mais nos projetos novos) e Seguindo (só quem você segue).",
            "Pesquise por projeto, criador (@), responsável ou categoria: enquanto você digita aparecem sugestões, e a palavra encontrada fica em destaque nos cards. A busca não liga para acentos nem maiúsculas. Filtre por categoria e status, ordene ou marque Só os meus.",
            "A lista tem páginas: use Anterior, Próxima ou os números lá embaixo.",
            "Clique no coração para curtir e no balão para ver os comentários. Dentro do projeto você pode comentar.",
            "Quem escreveu o comentário e o dono do projeto podem apagá-lo.",
            "Só quem criou o projeto pode editá-lo ou excluí-lo. Nos projetos dos outros você só olha; nos seus aparece o botão Editar."
          ],
          link: "/Comunidade", botao: "Ver a comunidade"
        },
        {
          titulo: "Seguir e notificações",
          texto: "Acompanhe quem você gosta e saiba quando mexem nos seus projetos.",
          passos: [
            "No perfil de alguém, clique em Seguir. Clicando em seguidores ou seguindo você vê as listas. Os projetos de quem você segue aparecem na aba Seguindo da Comunidade.",
            "O sino no menu mostra quantas notificações novas você tem: curtidas, comentários nos seus projetos e novos seguidores. Ele se atualiza sozinho.",
            "Na página de notificações as novas ficam destacadas e passam a lidas depois de alguns segundos. Dá para limpar tudo.",
            "Em Conta você escreve uma bio (até 200 caracteres) que aparece no seu perfil público."
          ],
          link: "/Notificacoes", botao: "Ver notificações"
        },
        {
          titulo: "Denunciar e bloquear",
          texto: "Ferramentas para manter a comunidade saudável.",
          passos: [
            "Viu um projeto, comentário ou perfil com spam, ofensa ou assédio? Use Denunciar projeto, o botão Denunciar do comentário ou Denunciar no perfil. Escolha o motivo e, se quiser, conte o que aconteceu. Quem foi denunciado não sabe quem denunciou.",
            "Bloquear (no perfil da pessoa): vocês dois deixam de ver os projetos, o perfil e os comentários um do outro, e ela não consegue curtir nem comentar nos seus projetos.",
            "Para desbloquear, abra Conta e use Desbloquear em Pessoas bloqueadas.",
            "Se a moderação ocultar ou excluir algo seu, aparece um aviso com o motivo em Conta (e um pontinho no menu)."
          ]
        },
        {
          titulo: "Categorias e itens",
          texto: "Organizam os projetos por tipo de trabalho.",
          passos: [
            "Construção: casa, muro e reforma, com materiais como tijolo e cimento.",
            "Sites: institucional, loja virtual e outros, com tecnologias como HTML e Python.",
            "Manutenção de carros: lataria, motor, freios e elétrica, com as peças.",
            "Outros: qualquer categoria que você digitar. Ela passa a aparecer no filtro da Comunidade para todo mundo.",
            "Tudo vem do banco de dados (arquivo db/db.json)."
          ]
        },
        {
          titulo: "Servidor e banco de dados",
          texto: "Para salvar e carregar projetos, o servidor precisa estar ligado.",
          passos: [
            "Abra um terminal na pasta do projeto e rode npm run server.",
            "Abra outro terminal e rode npm run dev para ligar o site.",
            "Se aparecer aviso de erro ao carregar, confira se o servidor está rodando."
          ]
        },
        {
          titulo: "Menu e rodapé",
          texto: "Ajudam a navegar por todo o site.",
          passos: [
            "O menu do topo leva para Início, Projetos e Login. Depois de entrar, aparecem Meus Projetos (com a aba Painel de controle), Comunidade, Cadastrar Projeto e Conta. Administradores também veem Administração, em roxo.",
            "No rodapé ficam os atalhos de Ajuda, Suporte e Voltar ao topo."
          ]
        }
      ],

      perguntas: [
        { p: "Meus projetos sumiram. O que fazer?", r: "Confira se o servidor está ligado com npm run server. Os projetos ficam no arquivo db/db.json e não são apagados ao reiniciar. Confira também se você entrou na conta certa." },
        { p: "O que é o selo roxo com ✓ ao lado de um nome?", r: "É o selo de conta verificada da administração: só aparece em quem é administrador do site. Administradores veem o site inteiro em roxo." },
        { p: "Digitei uma categoria em Outros. Ela aparece para os outros?", r: "Os projetos aparecem normalmente com essa categoria (e ela entra no filtro da Comunidade). A administração pode renomear, juntar com outra parecida ou adicionar à lista do formulário." },
        { p: "Seguir alguém avisa a pessoa?", r: "Sim, ela recebe uma notificação de novo seguidor. Quem você bloqueia deixa de ser seguido e some das suas listas." },
        { p: "Meu projeto aparece como \"Oculto pela moderação\". O que significa?", r: "A administração tirou o projeto da Comunidade, mas não o apagou: só você e os administradores o veem. O motivo aparece em Conta e na página do projeto. Se achar que foi engano, fale com o suporte." },
        { p: "Minha conta foi suspensa. E agora?", r: "Ao tentar entrar você vê o motivo e até quando vale a suspensão. Durante ela seus projetos não aparecem para os outros. Quando o prazo termina, tudo volta sozinho. Para contestar, use a página de Suporte de outro aparelho ou pessoa." },
        { p: "Posso mudar a categoria de um projeto depois?", r: "Pode. Em Meus Projetos clique em Editar no card do projeto e altere a categoria, os itens ou qualquer outra informação." },
        { p: "Outras pessoas podem editar ou apagar o meu projeto?", r: "Não. Na Comunidade elas só veem o projeto, com o seu nome como criador, e podem curtir e comentar. Só você pode editar ou excluir o que criou." },
        { p: "Como faço para um projeto não aparecer na Comunidade?", r: "Marque Projeto privado ao cadastrar ou ao editar. Ele continua em Meus Projetos, mas só você vê. Para voltar a mostrar, desmarque a opção." },
        { p: "O código de recuperação de senha não chegou. E agora?", r: "Olhe a caixa de spam e espere um minuto: só dá para pedir um código novo por minuto. Confira se digitou o e-mail da conta. Se você é quem roda o servidor, veja se o arquivo .env está configurado (modelo em .env.example); sem ele o código aparece só no terminal do npm run server." },
        { p: "Posso trocar o meu nome de usuário (@)?", r: "Pode, em Conta, na parte Editar perfil. Ele é único: se alguém já usa o nome, o site avisa e você escolhe outro. O link do seu perfil muda junto." },
        { p: "Posso escolher mais de um item?", r: "Sim. Marque quantos itens quiser. Clique de novo para desmarcar." },
        { p: "Por que a lista de itens mudou?", r: "Os itens dependem da subcategoria. Ao trocar a subcategoria, aparecem os itens daquele tipo de trabalho." },
        { p: "Como ver o texto completo de uma descrição?", r: "Descrições grandes ficam resumidas no card. Clique no nome do projeto para abrir a página com todas as informações." }
      ]
    }
  }
}
</script>

<style scoped>
.intro {
  max-width: 720px;
  margin: 0 auto 30px;
  text-align: center;
  color: var(--texto-suave);
}

.guias {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

/* Cartões suaves, iguais aos do resto do site */
.guia {
  position: relative;
  min-width: 0;
  padding: 26px 24px 24px;
  background: var(--superficie);
  border: 1px solid var(--borda);
  border-radius: var(--raio);
  box-shadow: 0 2px 10px rgba(47, 127, 193, 0.08);
  transition: var(--transicao);
}

.guia:hover {
  transform: translateY(-4px);
  box-shadow: var(--sombra);
}

.num {
  display: inline-block;
  margin-bottom: 12px;
  padding: 4px 14px;
  background: var(--b-azul-bg);
  color: var(--b-azul-fg);
  font-size: 18px;
  font-weight: 800;
  border-radius: 999px;
}

.guia h2 {
  margin-bottom: 6px;
  color: var(--tinta);
  font-size: 22px;
}

.guia > p { color: var(--texto-suave); margin-bottom: 14px; overflow-wrap: anywhere; }

.guia ol { padding-left: 22px; }

.guia li {
  margin-bottom: 8px;
  font-size: 15px;
  overflow-wrap: anywhere;
}

.guia li::marker { color: var(--azul); font-weight: 700; }

.ir {
  display: inline-block;
  margin-top: 10px;
  padding: 8px 18px;
  background: var(--azul-botao);
  color: var(--branco);
  font-weight: 700;
  border-radius: 8px;
  transition: var(--transicao);
}

.ir:hover { background: var(--azul-escuro); transform: translateX(4px); }

/* ---- Perguntas frequentes ---- */
.sub-titulo {
  margin: 50px 0 20px;
  padding-left: 14px;
  color: var(--tinta);
  border-left: 5px solid var(--azul);
}

.faq { display: grid; gap: 12px; }

details {
  background: var(--superficie);
  border: 1px solid var(--borda);
  border-radius: var(--raio);
  overflow: hidden;
}

summary {
  padding: 14px 18px;
  font-weight: 700;
  cursor: pointer;
  list-style: none;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  transition: var(--transicao);
}

summary::-webkit-details-marker { display: none; }
summary::after { content: "+"; font-size: 22px; line-height: 1; color: var(--azul); transition: transform 0.25s ease; }
summary:hover { background: var(--b-azul-bg); }
details[open] summary { background: var(--b-azul-bg); color: var(--b-azul-fg); }
details[open] summary::after { transform: rotate(45deg); color: var(--b-azul-fg); }

details p {
  padding: 14px 18px;
  color: var(--texto-suave);
  overflow-wrap: anywhere;
  animation: aparecer 0.4s ease both;
}

/* ---- Final ---- */
.ajuda-final {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  margin-top: 50px;
  padding: 24px 28px;
  background: var(--b-azul-bg);
  color: var(--b-azul-fg);
  border: 1px solid var(--azul-claro);
  border-radius: var(--raio);
}

.ajuda-final strong { color: var(--b-azul-fg); font-size: 20px; }
.ajuda-final .btn { margin-left: auto; }

@media (max-width: 700px) {
  .guias { grid-template-columns: 1fr; }
  .ajuda-final .btn { margin-left: 0; }
}
</style>
