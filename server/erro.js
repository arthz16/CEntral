// Erro com código HTTP: o servidor responde com ele e a mensagem (em português) para a tela.
export class ErroHttp extends Error {
  constructor(status, mensagem) {
    super(mensagem)
    this.status = status
  }
}
