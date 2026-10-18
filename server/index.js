// Servidor da Central Projetos: contas, login e projetos de cada usuário.
// Usa só módulos que já vêm com o Node (nada novo para instalar).
// Rode com: npm run server
//
// Onde fica cada coisa:
//   config.js      pastas, limites e variáveis do .env
//   banco.js       o db.json em memória (+ migração dos dados antigos)
//   seguranca.js   senha, cookie de login e sessões
//   limite.js      limite de tentativas (salvo em disco)
//   email.js       envio do código de recuperação por SMTP
//   validacao.js   conferência de tudo que vem do navegador
//   listagem.js    contas, filtros, paginação e o "card" do projeto
//   http.js        rotas, respostas, CORS e conferência de origem
//   visibilidade.js  quem enxerga o quê (suspensão, bloqueio, projeto oculto)
//   contas.js      excluir conta, avisos, registro de ações e o administrador
//   rotas/         auth, publico, projetos, comunidade, social (seguir, notificações, busca), moderacao e admin
import { PORTA } from './config.js'
import { gravarSePendente } from './banco.js'
import { gravarLimites } from './limite.js'
import { criarServidor } from './http.js'
import './rotas/auth.js'
import './rotas/publico.js'
import './rotas/projetos.js'
import './rotas/comunidade.js'
import './rotas/moderacao.js'
import './rotas/social.js'
import './rotas/admin.js'
import { garantirAdmin } from './contas.js'

// Ao desligar (Ctrl+C), grava o que ainda estava pendente
for (const sinal of ['SIGINT', 'SIGTERM']) {
  process.on(sinal, () => {
    gravarSePendente()
    gravarLimites()
    process.exit(0)
  })
}

await garantirAdmin() // cria/promove a conta de administrador definida no .env
criarServidor().listen(PORTA, () => console.log(`Servidor rodando em http://localhost:${PORTA}`))
