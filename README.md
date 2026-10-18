# Central Projetos

Projeto Vue.js para cadastro e gerenciamento de projetos, com contas de usuário e login. Os dados ficam em `db/db.json`.

## Contas e login

- Cada pessoa cria a própria conta (nome, **nome de usuário @ único**, e-mail e senha) e entra com ela.
- Sem login: o site mostra **Projetos Prontos** (exemplos em `db/vitrine.json`) e o botão **Login** aparece no lugar de *Cadastrar Projeto*.
- Com login: o botão *Login* some e aparecem **Cadastrar Projeto** e **Conta** (dados da conta e resumo dos projetos).
- Os projetos de cada pessoa ficam salvos dentro do próprio usuário no `db/db.json` e só ela enxerga.
- A senha nunca é guardada: só um hash (scrypt). O login dura 7 dias.
- O servidor (pasta `server/`, começa em `server/index.js`) só usa módulos do Node. O `json-server` não é mais usado e pode ser removido com `npm uninstall json-server`.
- Pare o servidor antes de editar o `db/db.json` na mão (ele mantém o arquivo em memória). A chave dos logins fica em `db/.segredo` (criada sozinha, já está no `.gitignore`).

## Comunidade

- Com login, o menu mostra **Comunidade**: todo projeto **público** vai para lá automaticamente (inclusive os seus), com todas as informações e o **nome e o @ de quem criou**.
- **Projeto privado:** ao cadastrar ou editar, marque "Projeto privado" e ele fica só em Meus Projetos (nem a Comunidade nem o perfil mostram; para outras pessoas ele "não existe").
- **Curtidas e comentários:** qualquer pessoa logada curte (coração, alterna) e comenta (até 500 caracteres) projetos públicos. Quem escreveu o comentário e o dono do projeto podem apagá-lo. Ao excluir a conta, as curtidas e os comentários dela somem.
- **Perfil público** em `/Perfil/:usuario`: nome, @, total de projetos públicos e de curtidas, e a lista dos projetos (nunca mostra e-mail nem projetos privados).
- **Paginação no servidor:** a Comunidade e o perfil baixam 12 projetos por vez. Busca, categoria, status, ordem (recentes, mais curtidos, nome) e "só os meus" são filtrados no servidor e ficam no endereço (`?pagina=2&categoria=...`), então o botão Voltar do navegador devolve a pessoa ao mesmo ponto.
- Só o dono edita ou exclui o próprio projeto. A regra vale no servidor: `PUT`, `PATCH` e `DELETE` em `/projetos/:id` só enxergam os projetos da conta logada, então mexer no projeto de outra pessoa dá "não encontrado".
- A Comunidade mostra só o nome (nunca o e-mail) e não mostra a marcação de favorito, que é pessoal.
- Rotas do servidor (todas exigem login): `GET /comunidade?pagina=&limite=&busca=&categoria=&status=&ordem=&meus=1`, `GET /comunidade/:id`, `POST /comunidade/:id/curtir`, `POST /comunidade/:id/comentarios`, `DELETE /comunidade/:id/comentarios/:cid` e `GET /perfil/:usuario`. Cada projeto vem com `dono: true/false` e só o dono vê o botão Editar.
- A **data de criação** é definida pelo servidor ao criar e não pode ser alterada. O **prazo** só aceita datas a partir de amanhã (o servidor também confere). Um prazo antigo já salvo continua válido se não for mexido.
- A barra de progresso foi removida; o campo antigo é apagado dos projetos já salvos quando o servidor inicia.

## O que foi melhorado

- Dashboard com total, status e categorias.
- Pesquisa por nome, descrição, responsável e categoria.
- Filtro por categoria e status.
- Página de detalhes de cada projeto.
- Edição completa de projetos.
- Status pode ser alterado diretamente nos cards.
- Confirmação antes de excluir.
- Data de criação e prazo.
- Orçamento e informações organizadas.
- Layout responsivo para telas menores.

## Novidades desta versão

- **Itens com quantidade e valor:** cada item do projeto tem quantidade, valor unitário e a marcação “já comprado”. O detalhe e o Dashboard mostram o total previsto, o quanto já foi comprado e a comparação com o orçamento planejado. (Projetos e exemplos antigos, que tinham só o nome do item, continuam funcionando e aparecem como etiquetas.)
- **Prazos:** cada projeto pode ter um prazo, com alertas nos cards e no detalhe (atrasado ou vence em até 7 dias).
- **Conta mais completa:** recuperar senha esquecida, trocar a senha, editar o perfil (nome, @ e e-mail) e excluir a conta.
- **Prioridade e favoritos:** cada projeto tem prioridade (Alta, Média ou Baixa) e pode ser marcado como favorito; dá para filtrar só os favoritos e a lista já ordena favoritos e prioridade alta primeiro.
- **Exportar e imprimir:** botão para exportar os projetos em CSV e opção de imprimir / salvar o detalhe em PDF.

## Rede social

- **Seguir pessoas:** botão no perfil, com contadores de seguidores e de quem a pessoa segue (clicáveis, abrem a lista). Bloquear desfaz o "seguir" dos dois lados, e quem está suspenso some das listas e dos contadores. `POST/DELETE /usuarios/:id/seguir` e `GET /perfil/:id/rede?tipo=seguidores|seguindo`.
- **Abas da Comunidade:** *Todos*, *Em alta* e *Seguindo* (`?ordem=emalta` e `?seguindo=1`). "Em alta" pontua curtidas e comentários (comentário vale 2) e vai esfriando com os dias.
- **Notificações:** curtida, comentário e novo seguidor (nunca de si mesmo; a mesma curtida ou seguidor não repete). Sino no menu com contador que se atualiza sozinho (a cada minuto, só com a aba aberta), página `/Notificacoes`, "limpar tudo". Notificações de quem está bloqueado ou suspenso não aparecem; se o projeto foi apagado, a notificação fica sem link.
- **Bio** de até 200 caracteres, editada em Conta e mostrada no perfil público.
- **Busca melhor:** sugestões enquanto digita (projetos, pessoas e categorias, só do que a pessoa pode ver; teclado com setas, Enter e Esc), trecho encontrado em **destaque** nos cards e busca que **ignora acentos e maiúsculas** ("construcao" acha "Construção"). `GET /busca/sugestoes?q=&escopo=comunidade|meus`.
- **Telas vazias com desenho e botão** (sem projetos, busca sem resultado, aba Seguindo vazia, sem notificações, fila de denúncias em dia) e um **guia de 3 passos** para quem acabou de chegar (cadastrar, deixar público, conhecer a Comunidade), que some sozinho ao terminar ou ao clicar em "Já entendi".
- **Avisos com ícone:** sucesso (verde, ✓), erro (vermelho, anunciado por leitores de tela) e informação (azul), no mesmo componente (`useAviso`).

## Moderação e administração

**Quem é administrador:** coloque `ADMIN_EMAIL` (e `ADMIN_SENHA`) no `.env` (veja `.env.example`). Ao ligar, o servidor cria essa conta, ou promove a que já existe se a senha bater. O e-mail fica reservado: ninguém consegue se cadastrar com ele, e nomes como `admin` e `moderacao` também. Depois, administradores podem promover outros em Administração, Pessoas.

**O que a administração faz** (tudo pede um **motivo**, que a pessoa lê e que fica no registro):
- **Suspender** uma pessoa (de 1 a 365 dias ou por tempo indeterminado): ela perde o login na hora, não consegue entrar (vê o motivo e até quando) e os projetos e comentários dela somem. A suspensão com prazo termina sozinha. Dá para encerrar antes.
- **Ocultar** um projeto da Comunidade sem apagar (o dono vê o motivo e é avisado) ou **excluí-lo**.
- **Apagar comentários** de qualquer pessoa.
- **Excluir uma conta** inteira, **promover** a administrador e **rebaixar**. Não dá para suspender ou excluir outro administrador (rebaixe antes) nem a própria conta.
- **Fila de denúncias:** quem denunciou, o alvo, o motivo e os detalhes. Agir (ocultar, excluir, suspender) encerra as denúncias do alvo; também dá para ignorar ou marcar como resolvida com uma anotação.
- **Registro de ações:** quem fez o quê, em quem e por quê. Não dá para editar nem apagar.
- **Categorias** (aba própria): lista as oficiais e as que as pessoas digitaram em "Outros", com quantos projetos e pessoas usam. Dá para **renomear ou juntar** as digitadas (se o novo nome já existe, viram uma só; juntar numa oficial usa a grafia oficial) e **adicionar à lista** do formulário. As oficiais não mudam de nome.
- **Resumo geral na Home:** ao entrar como administrador, a página inicial mostra denúncias abertas, projetos e pessoas novos (7 dias), totais, públicos/privados/ocultos, suspensas, comentários e curtidas, com atalhos para cada área.
- **Selo de administrador verificado** (escudo roxo com ✓) ao lado do nome em cards, comentários, perfil, Conta, notificações e listas. Além do site roxo, a animação da Home e o logo também ficam roxos para o administrador.
- Vê tudo, inclusive projetos privados e perfis de bloqueados. O **site inteiro fica roxo** para o administrador (variável `data-papel="admin"` em `base.css`).

**O que qualquer pessoa faz:**
- **Denunciar** projeto, comentário ou pessoa (spam, ofensivo, assédio, inadequado ou outro). Máximo de 10 por hora; a mesma denúncia não se repete; ninguém denuncia o próprio conteúdo.
- **Bloquear** (no perfil): os dois deixam de se ver (projetos, perfil, comentários) e quem foi bloqueado não curte nem comenta. Desbloqueia em Conta. Não dá para bloquear a administração.
- Receber **avisos da moderação** em Conta quando algo seu é ocultado, excluído ou removido.

A segurança é conferida no servidor em toda rota (`/admin/*` responde 403 para quem não é administrador); esconder o botão no site é só conforto.

## Programação e organização

- **Servidor dividido em arquivos** (`server/`): `config.js` (pastas e variáveis), `banco.js` (o `db.json` em memória e a migração), `seguranca.js` (senha, cookie e sessões), `limite.js` (limite de tentativas), `email.js` (SMTP), `validacao.js` (conferência dos dados), `listagem.js` (filtros, paginação e o card), `http.js` (rotas, CORS) e `rotas/` (`auth`, `publico`, `projetos`, `comunidade`). O `index.js` só liga tudo.
- **Componentes compartilhados no site:** `ProjetoCard.vue` (o mesmo card em Meus Projetos, Comunidade e Perfil), `FormularioProjeto.vue` (cadastro e edição usam o mesmo formulário) e `useListaPaginada.js` (filtros, busca com espera e página das listas). Antes eram cópias.
- **Meus Projetos também é paginado no servidor** (12 por vez), com filtros, ordem e "Exportar CSV" de tudo que passou nos filtros. Parâmetros: `GET /projetos?pagina=&busca=&categoria=&status=&prioridade=&favoritos=1&ordem=padrao|recentes|nome|prazo`.
- **Categoria "Outros":** na lista de categorias existe a opção Outros, que abre um campo para digitar a categoria. O servidor arruma a grafia ("jardinagem" vira "Jardinagem") e não duplica uma que já existe na lista.
- **Interruptores no formulário:** Projeto público (padrão ligado) e Favoritar projeto.

## Testes automáticos

Rode `npm test`. São 84 testes que sobem o servidor de verdade numa **pasta temporária** (os seus dados em `db/` nunca são tocados) e conferem as regras que não podem quebrar: só o dono edita, projeto privado some para os outros, prazo só de amanhã em diante, a data de criação nunca muda, @ único, curtidas e comentários, paginação, login por cookie, sair de verdade, recuperação de senha por e-mail (com um servidor de e-mail falso), o limite de tentativas depois de reiniciar o servidor **toda a moderação** (administrador, suspensão com prazo, ocultar/excluir, denúncias, bloqueio e registro de ações) e a **rede social** (seguir, "em alta", notificações, bio, busca sem acento e categorias do admin). Ficam em `tests/`. Não precisam instalar nada (usam o `node --test` que já vem com o Node).

## Segurança do login

- O login fica num **cookie `httpOnly`**: o JavaScript da página não consegue ler (um script malicioso não rouba mais o token, que antes ficava no `localStorage`). Em site com HTTPS use `COOKIE_SEGURO=1` no `.env`; se o site e o servidor ficarem em domínios diferentes, `COOKIE_ENTRE_SITES=1` e `ORIGENS_PERMITIDAS=https://seusite.com`.
- Cada login é uma **sessão guardada no servidor**: ao clicar em **Sair** o login é encerrado de verdade (copiar o cookie antes não adianta). Trocar a senha desconecta os outros aparelhos e redefinir a senha desconecta todos.
- Pedidos que alteram dados e vêm de um site desconhecido (cabeçalho `Origin`) são recusados (proteção contra CSRF).
- O **limite de tentativas** (login, cadastro, comentários...) agora é salvo em `db/limites.json`: reiniciar o servidor não zera mais a contagem.

## Visual e acessibilidade

- **Depois de cadastrar um projeto** aparece um painel com "Ver projeto", "Ver na Comunidade" e "Cadastrar outro".
- **Formulário em 4 seções** (informações básicas, itens e orçamento, prazos e situação, visibilidade).
- **Aviso ao sair sem salvar** (cadastro e edição): trocar de página, voltar ou fechar a aba com alterações pergunta antes.
- **Cor e ícone por categoria** (`src/services/categorias.js`): as da lista têm os seus e as digitadas em "Outros" ganham uma cor calculada do nome. Há uma barra colorida no topo de cada card.
- **Menu mais simples:** o Painel de controle virou uma aba dentro de Meus Projetos. Ajuda e Suporte agora seguem o mesmo estilo suave do resto do site.

- **Modo escuro:** botão de sol/lua no menu. Segue o tema do sistema na primeira visita e lembra da escolha. Todas as cores do site são variáveis em `src/assets/base.css` (o escuro redefine as mesmas variáveis). A impressão sempre sai no tema claro.
- **Carregamento com esqueleto** (cartões cinza que "respiram") em vez do texto "Carregando...".
- **Janela de confirmação do próprio site** ao excluir projeto, comentário ou conta (Esc cancela, o Tab não escapa da janela, o foco volta para onde estava).
- **Animações mais curtas** (o conteúdo aparece mais rápido).
- **Acessibilidade:** contorno de foco visível no teclado, link "Pular para o conteúdo", botões com nome para leitores de tela, interruptores navegáveis por teclado e cores conferidas por um teste automático de contraste (mínimo 4,5:1 no texto normal) nos dois temas, em 11 telas.
- **Fonte:** o site usa a fonte do próprio sistema (carrega na hora e funciona sem internet; antes dependia do Google Fonts). Para usar a **Inter**, rode `npm install @fontsource-variable/inter` e coloque `import '@fontsource-variable/inter'` no `src/main.js`: ela passa a ser usada primeiro.

## Recuperação de senha por e-mail

- Em "Esqueci minha senha" o servidor manda um **código de 6 dígitos** para o e-mail da conta. Vale 15 minutos, só funciona uma vez e some depois de 5 tentativas erradas. Só dá para pedir um código por minuto por conta.
- A resposta do site é a mesma exista a conta ou não, e o código **nunca** volta na resposta (antes ele aparecia na tela, o que deixava qualquer pessoa trocar a senha de outra).
- Ao redefinir, os logins antigos da conta deixam de valer.
- **Para o e-mail sair de verdade**, copie `.env.example` para `.env` (na pasta do `package.json`), preencha o SMTP (o exemplo é com Gmail e "senha de app") e reinicie o `npm run server`. O `.env` tem senha e já está no `.gitignore`.
- Sem o `.env`, o site funciona, mas o código aparece **só no terminal do servidor** (útil para testar no seu computador).
- O envio fala SMTP direto (portas 465 ou 587), sem instalar nada. Foi testado com um servidor SMTP de teste; não foi testado contra o Gmail de verdade.

## Como executar

Abra o projeto no terminal e rode:

```bash
npm install
```

Depois abra dois terminais.

Terminal 1:

```bash
npm run server
```

Terminal 2:

```bash
npm run dev
```

Acesse o endereço mostrado pelo Vite, normalmente `http://localhost:5173`.

## Rotas principais

- `/` - Início
- `/Login` - Entrar / criar conta
- `/Conta` - Dados da conta (exige login)
- `/Projetos?aba=painel` - Painel de controle (aba dentro de Meus Projetos; `/Dashboard` redireciona para lá)
- `/Admin`, `/Admin/denuncias`, `/Admin/pessoas`, `/Admin/projetos`, `/Admin/registro` - Administração (só administradores)
- `/Projetos` - Meus projetos (logado) ou Projetos Prontos (visitante)
- `/Comunidade` - Todos os projetos criados no site (inclusive os seus), com o nome de quem criou (exige login)
- `/Comunidade/:id` - Detalhes de um projeto da comunidade, com curtidas e comentários (o botão Editar só aparece para o dono)
- `/Perfil/:usuario` - Perfil público de uma pessoa (exige login)
- `/ProjetosProntos/:id` - Detalhes de um projeto pronto
- `/CadastrosProjetos` - Cadastro (exige login)
- `/Projetos/:id` - Detalhes (exige login)
- `/EditarProjeto/:id` - Edição (exige login)
