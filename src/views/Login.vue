<template>
  <div>
    <Banner :title="criando ? 'Criar conta' : 'Entrar'"
            :subtitle="criando ? 'Crie sua conta para cadastrar e guardar seus projetos' : 'Entre na sua conta para cadastrar e gerenciar seus projetos'"
            imagem="/img/fundoCadastro.jpg" variante="escuro" />

    <div class="main-container">
      <Message :msg="aviso" />

      <div class="auth anim-subir" v-if="!recuperando">
        <div class="abas" role="tablist">
          <button type="button" role="tab" :aria-selected="!criando" :class="{ ativa: !criando }" @click="trocar(false)">Entrar</button>
          <button type="button" role="tab" :aria-selected="criando" :class="{ ativa: criando }" @click="trocar(true)">Criar conta</button>
        </div>

        <form @submit.prevent="enviar">
          <div class="campo" v-if="criando">
            <label for="nome">Nome</label>
            <input id="nome" v-model.trim="nome" type="text" autocomplete="name" maxlength="60"
                   placeholder="Como devemos te chamar?" required>
          </div>

          <div class="campo" v-if="criando">
            <label for="usuario">Nome de usuário</label>
            <div class="arroba">
              <span aria-hidden="true">@</span>
              <input id="usuario" v-model.trim="usuario" type="text" autocomplete="username" maxlength="20"
                     pattern="[A-Za-z0-9_]{3,20}" placeholder="seu_usuario" required>
            </div>
            <p class="dica">De 3 a 20 letras sem acento, números ou _. É único e aparece nos seus projetos.</p>
          </div>

          <div class="campo">
            <label for="email">E-mail</label>
            <input id="email" v-model.trim="email" type="email" autocomplete="email" maxlength="120"
                   placeholder="voce@email.com" required>
          </div>

          <div class="campo">
            <label for="senha">Senha</label>
            <div class="senha">
              <input id="senha" v-model="senha" :type="ver ? 'text' : 'password'"
                     :autocomplete="criando ? 'new-password' : 'current-password'"
                     minlength="6" maxlength="128" placeholder="Digite sua senha" required>
              <button type="button" class="ver" @click="ver = !ver">{{ ver ? 'Esconder' : 'Mostrar' }}</button>
            </div>
            <p class="dica" v-if="criando">Mínimo de 6 caracteres.</p>
          </div>

          <div class="campo" v-if="criando">
            <label for="confirmar">Confirmar senha</label>
            <input id="confirmar" v-model="confirmar" :type="ver ? 'text' : 'password'"
                   autocomplete="new-password" placeholder="Repita a senha" required>
          </div>

          <p class="erro" v-if="erro" role="alert">{{ erro }}</p>

          <button class="btn enviar" type="submit" :disabled="carregando">
            {{ carregando ? 'Aguarde...' : criando ? 'Criar conta' : 'Entrar' }}
          </button>
        </form>

        <p class="troca">
          <template v-if="criando">Já tem conta? <a href="#" @click.prevent="trocar(false)">Entrar</a></template>
          <template v-else>Ainda não tem conta? <a href="#" @click.prevent="trocar(true)">Criar conta</a></template>
        </p>
        <p class="troca" v-if="!criando">
          <a href="#" @click.prevent="abrirRecuperar">Esqueci minha senha</a>
        </p>
      </div>

      <!-- Recuperação de senha: o código de 6 dígitos chega por e-mail -->
      <div class="auth anim-subir" v-else>
        <h2 class="reset-titulo">Recuperar senha</h2>

        <form v-if="etapaReset === 'pedir'" @submit.prevent="pedirCodigo">
          <div class="campo">
            <label for="email-reset">E-mail da conta</label>
            <input id="email-reset" v-model.trim="emailReset" type="email" autocomplete="email"
                   maxlength="120" placeholder="voce@email.com" required>
            <p class="dica">Vamos enviar um código de 6 dígitos para esse e-mail.</p>
          </div>
          <p class="erro" v-if="erro" role="alert">{{ erro }}</p>
          <button class="btn enviar" type="submit" :disabled="carregando">{{ carregando ? 'Enviando...' : 'Enviar código' }}</button>
        </form>

        <form v-else @submit.prevent="redefinir">
          <p class="info-envio">
            Se existir uma conta com <strong>{{ emailReset }}</strong>, enviamos um código de 6 dígitos para ele.
            Ele vale por 15 minutos. Olhe também o spam.
          </p>
          <p class="codigo-demo" v-if="semEmail">
            Este servidor ainda não tem e-mail configurado (veja o arquivo <strong>.env.example</strong>).
            Enquanto isso, o código aparece no terminal onde o <strong>npm run server</strong> está rodando.
          </p>
          <div class="campo">
            <label for="codigo">Código de 6 dígitos</label>
            <input id="codigo" v-model.trim="codigo" type="text" inputmode="numeric" autocomplete="one-time-code"
                   maxlength="6" pattern="[0-9]{6}" placeholder="000000" required>
          </div>
          <div class="campo">
            <label for="nova-senha">Nova senha</label>
            <div class="senha">
              <input id="nova-senha" v-model="novaSenha" :type="ver ? 'text' : 'password'"
                     autocomplete="new-password" minlength="6" maxlength="128" placeholder="Nova senha" required>
              <button type="button" class="ver" @click="ver = !ver">{{ ver ? 'Esconder' : 'Mostrar' }}</button>
            </div>
            <p class="dica">Mínimo de 6 caracteres.</p>
          </div>
          <div class="campo">
            <label for="confirmar-reset">Confirmar nova senha</label>
            <input id="confirmar-reset" v-model="confirmarReset" :type="ver ? 'text' : 'password'"
                   autocomplete="new-password" placeholder="Repita a nova senha" required>
          </div>
          <p class="erro" v-if="erro" role="alert">{{ erro }}</p>
          <button class="btn enviar" type="submit" :disabled="carregando">{{ carregando ? 'Aguarde...' : 'Redefinir e entrar' }}</button>
          <p class="troca"><a href="#" @click.prevent="etapaReset = 'pedir'">Não chegou? Pedir outro código</a></p>
        </form>

        <p class="troca"><a href="#" @click.prevent="fecharRecuperar">Voltar para o login</a></p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Banner from '../components/Banner.vue'
import Message from '../components/Message.vue'
import { entrar, registrar, esqueciSenha, redefinirSenha } from '../stores/auth'

const route = useRoute()
const router = useRouter()

const criando = ref(route.query.modo === 'criar')
const nome = ref('')
const usuario = ref('')
const email = ref('')
const senha = ref('')
const confirmar = ref('')
const ver = ref(false)
const erro = ref('')
const carregando = ref(false)

// Aviso quando o login venceu enquanto a pessoa usava o site
const aviso = ref(route.query.expirou ? 'Sua sessão expirou. Entre novamente.' : null)
if (aviso.value) setTimeout(() => (aviso.value = null), 4000)

function trocar(modoCriar) {
  criando.value = modoCriar
  erro.value = ''
}

// ---- Recuperação de senha ----
const recuperando = ref(false)
const etapaReset = ref('pedir') // 'pedir' | 'redefinir'
const emailReset = ref('')
const codigo = ref('')
const semEmail = ref(false)
const novaSenha = ref('')
const confirmarReset = ref('')

function abrirRecuperar() {
  recuperando.value = true
  etapaReset.value = 'pedir'
  emailReset.value = email.value
  codigo.value = novaSenha.value = confirmarReset.value = ''
  semEmail.value = false
  erro.value = ''
}

function fecharRecuperar() {
  recuperando.value = false
  erro.value = ''
}

async function pedirCodigo() {
  erro.value = ''
  carregando.value = true
  try {
    const resposta = await esqueciSenha(emailReset.value)
    // O código nunca vem na resposta: só chega por e-mail (ou aparece no terminal se o servidor não tiver e-mail)
    semEmail.value = resposta?.emailAtivo === false
    etapaReset.value = 'redefinir'
  } catch (e) {
    erro.value = e.message
  } finally {
    carregando.value = false
  }
}

async function redefinir() {
  erro.value = ''
  if (novaSenha.value !== confirmarReset.value) {
    erro.value = 'As senhas não são iguais.'
    return
  }
  carregando.value = true
  try {
    await redefinirSenha(emailReset.value, codigo.value, novaSenha.value)
    router.push(destino())
  } catch (e) {
    erro.value = e.message
  } finally {
    carregando.value = false
  }
}

// Volta para a página que a pessoa queria abrir (só caminhos internos do site)
function destino() {
  const d = String(route.query.voltar || '')
  return d.startsWith('/') && !d.startsWith('//') ? d : '/Projetos'
}

async function enviar() {
  erro.value = ''
  if (criando.value && senha.value !== confirmar.value) {
    erro.value = 'As senhas não são iguais.'
    return
  }

  carregando.value = true
  try {
    if (criando.value) await registrar(nome.value, usuario.value, email.value, senha.value)
    else await entrar(email.value, senha.value)
    router.push(destino())
  } catch (e) {
    erro.value = e.message
  } finally {
    carregando.value = false
  }
}
</script>

<style scoped>
.auth {
  max-width: 440px;
  margin: 0 auto;
  padding: 30px;
  background: var(--superficie);
  border: 1px solid var(--borda);
  border-top: 5px solid var(--azul);
  border-radius: 16px;
  box-shadow: var(--sombra);
}

.abas {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-bottom: 24px;
  padding: 5px;
  background: var(--fundo);
  border-radius: 10px;
}

.abas button {
  padding: 10px;
  background: none;
  border: 0;
  border-radius: 8px;
  color: var(--texto-suave);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transicao);
}

.abas button.ativa {
  background: var(--azul-botao);
  color: var(--branco);
}

.campo {
  display: flex;
  flex-direction: column;
  margin-bottom: 18px;
}

label {
  margin-bottom: 6px;
  color: var(--texto);
  font-size: 14px;
  font-weight: 600;
}

input {
  width: 100%;
  padding: 12px;
  background: var(--superficie);
  border: 2px solid var(--borda);
  border-radius: 8px;
  font-family: inherit;
  font-size: 15px;
  outline: none;
  transition: var(--transicao);
}

input:focus {
  border-color: var(--azul);
  box-shadow: 0 0 0 3px rgba(124, 200, 255, 0.35);
}

.senha { position: relative; }
.senha input { padding-right: 90px; }

.ver {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  padding: 6px 10px;
  background: none;
  border: 0;
  color: var(--azul);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.dica {
  margin-top: 6px;
  color: var(--texto-suave);
  font-size: 13px;
}

.erro {
  margin-bottom: 16px;
  padding: 10px 12px;
  background: var(--b-vermelho-bg);
  border: 1px solid var(--b-vermelho-borda);
  border-radius: 8px;
  color: var(--b-vermelho-fg);
  font-size: 14px;
}

.enviar {
  width: 100%;
  padding: 14px;
}

.enviar:disabled {
  opacity: 0.6;
  cursor: wait;
  transform: none;
}

.troca {
  margin-top: 20px;
  text-align: center;
  color: var(--texto-suave);
  font-size: 14px;
}

.troca a { font-weight: 700; }

.reset-titulo { margin-bottom: 20px; }
.codigo-demo {
  margin-bottom: 16px;
  padding: 10px 12px;
  background: var(--b-azul-bg);
  border: 1px solid var(--azul-claro);
  border-radius: 8px;
  color: var(--b-azul-fg);
  font-size: 13px;
}
.codigo-demo strong { font-size: 13px; }
.info-envio { margin-bottom: 16px; color: var(--texto-suave); font-size: 14px; overflow-wrap: anywhere; }
.info-envio strong { color: var(--tinta); }
/* "@" fixo à esquerda do campo de nome de usuário */
.arroba { position: relative; }
.arroba span { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: var(--texto-suave); font-weight: 700; pointer-events: none; }
.arroba input { padding-left: 32px; }

@media (max-width: 500px) {
  .auth { padding: 22px; }
}
</style>
