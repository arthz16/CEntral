<template>
  <div>
    <Message :msg="aviso" />
    <Banner :title="vitrine ? 'Projeto Pronto' : comunidade ? 'Projeto da Comunidade' : 'Detalhes do Projeto'" subtitle="Todas as informações em um só lugar" imagem="/img/fundoVariado.png" compacto />
    <div class="main-container">
      <div v-if="carregando" class="detalhe card detalhe-esqueleto" role="status">
        <span class="sr-only">Carregando projeto...</span>
        <span class="esqueleto" style="width: 30%; height: 14px"></span>
        <span class="esqueleto" style="width: 70%; height: 36px"></span>
        <span class="esqueleto" style="width: 100%; height: 16px"></span>
        <span class="esqueleto" style="width: 90%; height: 16px"></span>
        <div class="dados-esqueleto"><span v-for="n in 6" :key="n" class="esqueleto" style="height: 72px"></span></div>
      </div>
      <div v-else-if="erro" class="vazio erro-box" role="alert">
        Projeto não encontrado.
        <p><RouterLink :to="comunidade ? '/Comunidade' : '/Projetos'">Voltar</RouterLink></p>
      </div>

      <article v-else class="detalhe card">
        <div class="cabecalho">
          <div>
            <span class="numero">{{ vitrine ? 'PROJETO PRONTO' : 'PROJETO' }} #{{ projeto.id }}</span>
            <h1>{{ projeto.nome }}</h1>
            <p v-if="autor" class="autor">
              <span class="avatar">{{ autor.nome.charAt(0).toUpperCase() }}</span>
              <span>
                Criado por
                <RouterLink class="link-autor" :to="`/Perfil/${autor.usuario}`"><strong>{{ autor.nome }}</strong></RouterLink>
                <small v-if="autor.usuario">@{{ autor.usuario }}</small><em v-if="dono"> (você)</em>
                <SeloAdmin v-if="projeto.autorAdmin" />
                <span v-if="projeto.autorSuspenso" class="selo-suspenso">Suspenso</span>
              </span>
            </p>
          </div>
          <div class="etiquetas">
            <button v-if="dono" type="button" class="estrela no-print" :class="{ ativa: projeto.favorito }"
                    @click="alternarFavorito" :aria-pressed="projeto.favorito" title="Favorito">★</button>
            <span v-if="projeto.publico === false" class="badge privado" title="Só você vê este projeto">Privado</span>
            <span v-if="projeto.oculto" class="badge oculto" title="A moderação tirou este projeto da Comunidade">Oculto pela moderação</span>
            <span class="badge" :class="classePrioridade(projeto.prioridade)">Prioridade {{ projeto.prioridade || 'Média' }}</span>
            <span class="badge" :class="classeStatus(projeto.status)">{{ projeto.status }}</span>
            <span v-if="alerta" class="badge" :class="alerta.tipo === 'atrasado' ? 'atrasado' : 'vence'">{{ alerta.texto }}</span>
          </div>
        </div>

        <p class="descricao">{{ projeto.descricao || 'Sem descrição cadastrada.' }}</p>

        <div v-if="projeto.oculto" class="aviso-moderacao" role="note">
          <strong>{{ dono ? 'A moderação ocultou este projeto da Comunidade.' : 'Este projeto está oculto da Comunidade.' }}</strong>
          Motivo: {{ projeto.oculto.motivo }}
          <span v-if="dono">Só você e a administração conseguem vê-lo. Se você acha que foi um engano, fale com o suporte.</span>
        </div>

        <!-- Só para a administração -->
        <section v-if="projeto.admin && comunidade" class="moderacao no-print" aria-label="Ferramentas da moderação">
          <h2>Moderação</h2>
          <div class="acoes-linha">
            <button v-if="projeto.oculto" type="button" class="btn-mini principal" @click="mostrarProjeto">Mostrar de novo</button>
            <button v-else type="button" class="btn-mini" @click="ocultarProjeto">Ocultar da Comunidade</button>
            <button type="button" class="btn-mini perigo" @click="excluirComoAdmin">Excluir projeto</button>
            <button v-if="!dono && !projeto.autorAdmin && !projeto.autorSuspenso" type="button" class="btn-mini perigo" @click="suspenderAutor">Suspender @{{ autor.usuario }}</button>
          </div>
        </section>

        <!-- Nos meus projetos: como ele está na comunidade -->
        <p v-if="!comunidade && !vitrine" class="social-resumo no-print">
          <template v-if="projeto.publico === false">Projeto privado: só você vê. Para mostrar na Comunidade, edite e desmarque "Projeto privado".</template>
          <template v-else>
            {{ projeto.totalCurtidas || 0 }} {{ projeto.totalCurtidas === 1 ? 'curtida' : 'curtidas' }}
            · {{ projeto.totalComentarios || 0 }} {{ projeto.totalComentarios === 1 ? 'comentário' : 'comentários' }}
            · <RouterLink :to="`/Comunidade/${projeto.id}#comentarios`">Ver na Comunidade</RouterLink>
          </template>
        </p>

        <div class="dados">
          <div><span>Categoria</span><strong>{{ projeto.categoria }}</strong></div>
          <div><span>Subcategoria</span><strong>{{ projeto.subcategoria || 'Não informada' }}</strong></div>
          <div><span>Responsável</span><strong>{{ projeto.responsavel }}</strong></div>
          <div><span>Data de criação</span><strong>{{ formatarData(projeto.dataCriacao) }}</strong></div>
          <div><span>Prazo</span><strong>{{ formatarData(projeto.prazo, 'Sem prazo definido') }}</strong></div>
          <div><span>Orçamento planejado</span><strong>{{ orcamento ? dinheiro(orcamento) : 'Não informado' }}</strong></div>
        </div>

        <!-- Itens com quantidade e preço -->
        <div v-if="itens.length" class="secao">
          <h2>Materiais / tecnologias / peças</h2>

          <template v-if="temPrecos">
            <div class="tabela">
              <div class="th"><span>Item</span><span>Qtd.</span><span>Valor unit.</span><span>Subtotal</span><span>Comprado</span></div>
              <div class="tr" v-for="(item, idx) in itens" :key="idx" :class="{ feito: item.comprado }">
                <span class="c-nome">{{ item.nome }}</span>
                <span>{{ item.quantidade }}</span>
                <span>{{ dinheiro(item.valorUnitario) }}</span>
                <span>{{ dinheiro(custoItem(item)) }}</span>
                <span class="c-check">{{ item.comprado ? '✓' : '—' }}</span>
              </div>
            </div>

            <!-- Gasto x orçamento -->
            <div class="gasto">
              <div class="gasto-numeros">
                <div><span>Total previsto</span><strong>{{ dinheiro(previsto) }}</strong></div>
                <div><span>Já comprado</span><strong class="comprado">{{ dinheiro(comprado) }}</strong></div>
                <div><span>Falta comprar</span><strong>{{ dinheiro(Math.max(0, previsto - comprado)) }}</strong></div>
              </div>
              <div class="gasto-barra">
                <div class="linha"><span>Gasto x {{ orcamento ? 'orçamento' : 'previsto' }}</span><strong>{{ dinheiro(comprado) }} de {{ dinheiro(tetoRef) }}</strong></div>
                <div class="barra-fundo"><div class="barra-preenchida verde" :style="{ width: percentComprado + '%' }"></div></div>
              </div>
              <p v-if="estourou" class="alerta-estouro">O previsto ({{ dinheiro(previsto) }}) passou do orçamento planejado ({{ dinheiro(orcamento) }}).</p>
            </div>
          </template>

          <div v-else class="chips"><span v-for="(item, idx) in itens" :key="idx">{{ item.nome }}</span></div>
        </div>

        <!-- Curtidas e comentários (só na Comunidade) -->
        <section v-if="comunidade" id="comentarios" class="social no-print">
          <div class="social-topo">
            <button type="button" class="curtir" :class="{ ativo: projeto.curtiu }" :aria-pressed="projeto.curtiu"
                    :disabled="curtindo" @click="curtir">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.500s-8-5-8-10.500a4.500 4.500 0 0 1 8-2.800A4.500 4.500 0 0 1 20 10c0 5.500-8 10.500-8 10.500z" /></svg>
              {{ projeto.curtiu ? 'Curtido' : 'Curtir' }} · {{ projeto.totalCurtidas }}
            </button>
            <h2>{{ projeto.comentarios.length }} {{ projeto.comentarios.length === 1 ? 'comentário' : 'comentários' }}</h2>
          </div>

          <form class="novo-comentario" @submit.prevent="comentar">
            <textarea v-model="novoComentario" maxlength="500" rows="3" placeholder="Escreva um comentário..." required></textarea>
            <div class="linha-comentario">
              <small>{{ novoComentario.length }}/500</small>
              <button type="submit" class="btn" :disabled="enviandoComentario || !novoComentario.trim()">
                {{ enviandoComentario ? 'Enviando...' : 'Comentar' }}
              </button>
            </div>
            <p v-if="erroComentario" class="erro-comentario" role="alert">{{ erroComentario }}</p>
          </form>

          <p v-if="!projeto.comentarios.length" class="sem-comentarios">Ninguém comentou ainda. Seja a primeira pessoa!</p>
          <ul v-else class="lista-comentarios">
            <li v-for="c in comentariosRecentes" :key="c.id">
              <span class="avatar">{{ c.autor.nome.charAt(0).toUpperCase() }}</span>
              <div class="corpo-comentario">
                <p class="quem-comentou">
                  <RouterLink v-if="c.autor.usuario" class="link-autor" :to="`/Perfil/${c.autor.usuario}`"><strong>{{ c.autor.nome }}</strong></RouterLink>
                  <strong v-else>{{ c.autor.nome }}</strong>
                  <small v-if="c.autor.usuario">@{{ c.autor.usuario }}</small>
                  <SeloAdmin v-if="c.autorAdmin" />
                  <small>· {{ quando(c.criadoEm) }}</small>
                </p>
                <p class="texto-comentario">{{ c.texto }}</p>
              </div>
              <div class="acoes-comentario">
                <button v-if="c.autor.id !== auth.usuario.id && c.autor.usuario" type="button" class="apagar denunciar" @click="denunciarComentario(c)">Denunciar</button>
                <button v-if="c.podeApagar" type="button" class="apagar" @click="apagarComentario(c)">Apagar</button>
              </div>
            </li>
          </ul>
        </section>

        <div class="acoes no-print">
          <p v-if="comunidade && !dono" class="aviso-dono">Só {{ autor.nome }}, quem criou este projeto, pode editá-lo.</p>
          <button v-if="comunidade && !dono" type="button" class="btn-mini denunciar-projeto" @click="denunciarProjeto">Denunciar projeto</button>
          <RouterLink class="btn btn-outline" :to="comunidade ? '/Comunidade' : '/Projetos'">Voltar</RouterLink>
          <button v-if="!vitrine" type="button" class="btn btn-outline" @click="imprimir">Imprimir / PDF</button>
          <RouterLink v-if="dono" class="btn" :to="`/EditarProjeto/${projeto.id}`">Editar projeto</RouterLink>
          <RouterLink v-else-if="vitrine && !auth.usuario" class="btn" to="/Login">Entrar para criar o meu</RouterLink>
        </div>
      </article>
    </div>
  </div>
</template>

<script>
import Banner from '../components/Banner.vue'
import Message from '../components/Message.vue'
import SeloAdmin from '../components/SeloAdmin.vue'
import { api } from '../services/api'
import { auth } from '../stores/auth'
import { confirmar } from '../services/confirmar'
import { denunciar } from '../services/denunciar'
import {
  dinheiro, formatarData, custoItem, somaItens, somaComprado,
  normalizarItens, temPrecos, classeStatus, classePrioridade, alertaPrazo
} from '../services/utils'

export default {
  name: 'DetalhesProjeto',
  components: { Banner, Message, SeloAdmin },

  data() {
    return {
      projeto: null, carregando: true, erro: false, auth,
      aviso: null, curtindo: false, novoComentario: '', enviandoComentario: false, erroComentario: ''
    }
  },

  computed: {
    vitrine() { return !!this.$route.meta.vitrine },
    comunidade() { return !!this.$route.meta.comunidade },
    // Quem criou: na Comunidade vem do servidor; nos meus projetos é a própria conta; nos prontos não há criador
    autor() {
      if (!this.projeto || this.vitrine) return null
      return this.comunidade ? this.projeto.autor : this.auth.usuario
    },
    // Só o dono edita e favorita. Nos meus projetos é sempre a própria pessoa; na Comunidade o servidor diz
    dono() { return !this.vitrine && !!this.projeto && (!this.comunidade || this.projeto.dono === true) },
    comentariosRecentes() { return this.projeto ? [...this.projeto.comentarios].reverse() : [] },
    itens() { return this.projeto ? normalizarItens(this.projeto.itens) : [] },
    temPrecos() { return temPrecos(this.itens) },
    previsto() { return somaItens(this.itens) },
    comprado() { return somaComprado(this.itens) },
    orcamento() { return Number(this.projeto?.orcamento) || 0 },
    tetoRef() { return this.orcamento > 0 ? this.orcamento : this.previsto },
    percentComprado() { return this.tetoRef > 0 ? Math.min(100, this.comprado / this.tetoRef * 100) : 0 },
    estourou() { return this.orcamento > 0 && this.previsto > this.orcamento },
    alerta() { return this.projeto ? alertaPrazo(this.projeto.prazo, this.projeto.status) : null }
  },

  methods: {
    dinheiro,
    formatarData,
    custoItem,
    classeStatus,
    classePrioridade,

    async carregar() {
      try {
        const base = this.vitrine ? '/vitrine' : this.comunidade ? '/comunidade' : '/projetos'
        this.projeto = await api(`${base}/${this.$route.params.id}`)
        // vindo do botão de comentários de um card, já abre na parte dos comentários
        if (this.comunidade && this.$route.hash === '#comentarios') {
          this.$nextTick(() => document.getElementById('comentarios')?.scrollIntoView({ behavior: 'smooth' }))
        }
      } catch {
        this.erro = true
      } finally {
        this.carregando = false
      }
    },

    quando(iso) {
      return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    },

    async curtir() {
      if (this.curtindo) return
      this.curtindo = true
      const p = this.projeto
      const antes = { curtiu: p.curtiu, total: p.totalCurtidas }
      p.curtiu = !p.curtiu
      p.totalCurtidas += p.curtiu ? 1 : -1
      try {
        const r = await api(`/comunidade/${p.id}/curtir`, { metodo: 'POST' })
        p.curtiu = r.curtiu
        p.totalCurtidas = r.totalCurtidas
      } catch {
        p.curtiu = antes.curtiu
        p.totalCurtidas = antes.total
      } finally {
        this.curtindo = false
      }
    },

    async comentar() {
      this.erroComentario = ''
      this.enviandoComentario = true
      try {
        const c = await api(`/comunidade/${this.projeto.id}/comentarios`, { metodo: 'POST', corpo: { texto: this.novoComentario } })
        this.projeto.comentarios.push(c)
        this.novoComentario = ''
      } catch (e) {
        this.erroComentario = e.message
      } finally {
        this.enviandoComentario = false
      }
    },

    avisar(texto, tipo = 'sucesso') {
      this.aviso = { texto, tipo }
      clearTimeout(this._esperaAviso)
      this._esperaAviso = setTimeout(() => { this.aviso = null }, tipo === 'erro' ? 6000 : 4000)
    },

    async apagarComentario(c) {
      // A administração apagando o comentário de outra pessoa precisa dizer o motivo (a pessoa é avisada)
      const comoAdmin = this.projeto.admin && c.autor.id !== auth.usuario.id
      const r = await confirmar({
        titulo: 'Apagar este comentário?', botao: 'Apagar', perigo: true,
        texto: comoAdmin ? 'A pessoa que escreveu é avisada do motivo.' : '', motivo: comoAdmin
      })
      if (!r) return
      try {
        await api(`/comunidade/${this.projeto.id}/comentarios/${c.id}`, { metodo: 'DELETE', corpo: comoAdmin ? { motivo: r.motivo } : undefined })
        this.projeto.comentarios = this.projeto.comentarios.filter(x => x.id !== c.id)
      } catch (e) {
        this.erroComentario = e.message
      }
    },

    // ---- Denúncias ----
    async denunciarProjeto() {
      if (await denunciar({ tipo: 'projeto', projetoId: this.projeto.id, titulo: 'Denunciar este projeto' })) {
        this.avisar('Denúncia enviada. A administração vai analisar.')
      }
    },
    async denunciarComentario(c) {
      if (await denunciar({ tipo: 'comentario', projetoId: this.projeto.id, comentarioId: c.id, titulo: 'Denunciar este comentário' })) {
        this.avisar('Denúncia enviada. A administração vai analisar.')
      }
    },

    // ---- Moderação (só aparece para administradores) ----
    async ocultarProjeto() {
      const r = await confirmar({ titulo: 'Ocultar este projeto?', texto: 'Sai da Comunidade, mas não é apagado. O dono vê o motivo.', botao: 'Ocultar', motivo: true })
      if (!r) return
      try {
        await api(`/admin/projetos/${this.projeto.id}/ocultar`, { metodo: 'POST', corpo: { motivo: r.motivo } })
        this.projeto.oculto = { motivo: r.motivo }
        this.avisar('Projeto ocultado.')
      } catch (e) { this.avisar(e.message, 'erro') }
    },
    async mostrarProjeto() {
      try {
        await api(`/admin/projetos/${this.projeto.id}/mostrar`, { metodo: 'POST' })
        this.projeto.oculto = undefined
        this.avisar('Projeto visível de novo.')
      } catch (e) { this.avisar(e.message, 'erro') }
    },
    async excluirComoAdmin() {
      const r = await confirmar({ titulo: 'Excluir este projeto?', texto: 'Apaga para sempre. O dono vê o motivo.', botao: 'Excluir', perigo: true, motivo: true })
      if (!r) return
      try {
        await api(`/admin/projetos/${this.projeto.id}`, { metodo: 'DELETE', corpo: { motivo: r.motivo } })
        this.$router.push('/Admin/projetos')
      } catch (e) { this.avisar(e.message, 'erro') }
    },
    async suspenderAutor() {
      const r = await confirmar({ titulo: `Suspender @${this.autor.usuario}?`, texto: 'A pessoa perde o login na hora e some da Comunidade.', botao: 'Suspender', perigo: true, motivo: true, duracao: true })
      if (!r) return
      try {
        await api(`/admin/usuarios/${this.autor.id}/banir`, { metodo: 'POST', corpo: r })
        this.$router.push('/Admin/pessoas')
      } catch (e) { this.avisar(e.message, 'erro') }
    },

    async alternarFavorito() {
      const novo = !this.projeto.favorito
      try {
        await api(`/projetos/${this.projeto.id}`, { metodo: 'PATCH', corpo: { favorito: novo } })
        this.projeto.favorito = novo
      } catch { /* mantém o valor anterior se falhar */ }
    },

    imprimir() { window.print() }
  },

  mounted() { this.carregar() }
}
</script>

<style scoped>
.detalhe { max-width: 900px; margin: 0 auto; }
.cabecalho { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; border-bottom: 1px solid var(--borda); padding-bottom: 22px; }
.numero { font-size: 12px; font-weight: 800; color: var(--azul); letter-spacing: .1em; }
.cabecalho h1 { margin-top: 5px; font-size: 34px; }
.autor { display: flex; align-items: center; gap: 8px; margin-top: 10px; color: var(--texto-suave); font-size: 14px; }
.autor strong { color: var(--tinta); }
.autor em { font-style: normal; }
.avatar { flex-shrink: 0; width: 28px; height: 28px; display: grid; place-items: center; border-radius: 50%; background: var(--preto); color: var(--azul-claro); font-size: 13px; font-weight: 800; }
.aviso-dono { margin-right: auto; align-self: center; color: var(--texto-suave); font-size: 14px; }
.selo-admin { margin-left: 6px; padding: 1px 7px; background: var(--b-azul-bg); color: var(--b-azul-fg); border: 1px solid var(--azul-claro); border-radius: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
.selo-suspenso { margin-left: 6px; padding: 1px 7px; background: var(--b-vermelho-bg); color: var(--b-vermelho-fg); border-radius: 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; }
.badge.oculto { background: var(--b-vermelho-bg); color: var(--b-vermelho-fg); border: 1px dashed var(--b-vermelho-fg); }
.aviso-moderacao { margin: 0 0 20px; padding: 14px 16px; background: var(--b-vermelho-bg); border: 1px solid var(--b-vermelho-borda); border-radius: 10px; color: var(--b-vermelho-fg); font-size: 14px; }
.aviso-moderacao strong { display: block; }
.aviso-moderacao span { display: block; margin-top: 4px; }
.moderacao { margin: 0 0 22px; padding: 16px 18px; background: var(--b-azul-bg); border: 1px solid var(--azul-claro); border-radius: 10px; }
.moderacao h2 { margin: 0 0 10px; color: var(--b-azul-fg); font-size: 15px; letter-spacing: 0.05em; text-transform: uppercase; }
.acoes-linha { display: flex; flex-wrap: wrap; gap: 8px; }
.acoes-comentario { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.apagar.denunciar { color: var(--texto-suave); font-weight: 600; }
.denunciar-projeto { margin-right: auto; }
.link-autor { color: var(--tinta); }
.detalhe-esqueleto { display: grid; gap: 14px; }
.detalhe-esqueleto:hover { transform: none; box-shadow: none; }
.dados-esqueleto { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-top: 10px; }
.link-autor:hover { color: var(--azul); }
.autor small { margin-left: 6px; color: var(--texto-suave); }
.autor em { margin-left: 2px; }
.badge.privado { background: var(--chip); color: var(--b-cinza-fg); border: 1px dashed var(--borda-forte); }
.social-resumo { margin: -8px 0 22px; color: var(--texto-suave); font-size: 14px; }

.social { margin-top: 34px; padding-top: 24px; border-top: 1px solid var(--borda); }
.social-topo { display: flex; align-items: center; flex-wrap: wrap; gap: 14px 20px; margin-bottom: 16px; }
.social-topo h2 { margin: 0; font-size: 18px; }
.curtir { display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 18px; border: 1px solid var(--borda); border-radius: 999px; background: var(--superficie); color: var(--b-cinza-fg); font: inherit; font-weight: 700; cursor: pointer; }
.curtir svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linejoin: round; }
.curtir:hover { border-color: var(--azul); color: var(--azul); }
.curtir.ativo { border-color: var(--b-rosa-fg); background: var(--b-rosa-bg); color: var(--b-rosa-fg); }
.curtir.ativo svg { fill: var(--b-rosa-fg); }
.novo-comentario textarea { width: 100%; padding: 12px; border: 1px solid var(--borda); border-radius: 10px; font: inherit; resize: vertical; }
.linha-comentario { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 8px; }
.linha-comentario small { color: var(--texto-suave); }
.erro-comentario { margin-top: 8px; color: var(--b-vermelho-fg); font-size: 14px; }
.sem-comentarios { margin-top: 18px; color: var(--texto-suave); }
.lista-comentarios { list-style: none; margin: 20px 0 0; padding: 0; display: grid; gap: 14px; }
.lista-comentarios li { display: flex; gap: 12px; align-items: flex-start; }
.corpo-comentario { flex: 1; min-width: 0; padding: 10px 14px; background: var(--chip); border-radius: 10px; }
.quem-comentou { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px; font-size: 14px; }
.quem-comentou small { color: var(--texto-suave); }
.texto-comentario { margin-top: 4px; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 15px; }
.apagar { border: 0; background: none; color: var(--b-vermelho-fg); font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
.apagar:hover { text-decoration: underline; }
.etiquetas { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; align-items: center; }

.estrela {
  width: 38px; height: 38px;
  background: var(--chip); border: 1px solid var(--borda); border-radius: 10px;
  color: var(--texto-suave); font-size: 20px; line-height: 1; cursor: pointer;
  transition: var(--transicao);
}
.estrela:hover { border-color: #e5b800; color: var(--b-amarelo-fg); }
.estrela.ativa { background: var(--b-amarelo-bg); border-color: #e5b800; color: var(--b-amarelo-fg); }

.descricao { margin: 24px 0; color: var(--texto-suave); font-size: 16px; }

.secao { margin-top: 25px; }
.secao h2 { font-size: 18px; margin-bottom: 12px; }

.barra-fundo { height: 12px; border-radius: 20px; background: var(--chip); overflow: hidden; }
.barra-preenchida { height: 100%; border-radius: 20px; background: var(--azul-botao); transition: width .5s ease; }
.barra-preenchida.verde { background: #2e9e68; }

.dados { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 25px; }
.dados div { padding: 15px; background: var(--superficie-suave); border: 1px solid var(--borda); border-radius: 10px; }
.dados span { display: block; color: var(--texto-suave); font-size: 12px; }
.dados strong { display: block; margin-top: 4px; }

.tabela { border: 1px solid var(--borda); border-radius: 10px; overflow: hidden; }
.th, .tr { display: grid; grid-template-columns: 2fr 60px 1fr 1fr 90px; gap: 8px; align-items: center; padding: 10px 14px; }
.th { background: var(--superficie-suave); font-size: 12px; font-weight: 700; color: var(--texto-suave); text-transform: uppercase; letter-spacing: .04em; }
.tr { border-top: 1px solid var(--borda); }
.tr.feito { background: var(--b-verde-bg); }
.c-nome { font-weight: 600; overflow-wrap: anywhere; }
.c-check { text-align: center; font-weight: 800; color: var(--b-verde-fg); }

.gasto { margin-top: 16px; }
.gasto-numeros { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
.gasto-numeros div { padding: 12px; background: var(--superficie-suave); border: 1px solid var(--borda); border-radius: 10px; }
.gasto-numeros span { display: block; font-size: 12px; color: var(--texto-suave); }
.gasto-numeros strong { display: block; margin-top: 3px; font-size: 18px; }
.gasto-numeros strong.comprado { color: var(--b-verde-fg); }
.gasto-barra .linha { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 7px; font-size: 14px; }
.alerta-estouro { margin-top: 10px; padding: 8px 12px; background: var(--b-laranja-bg); border: 1px solid var(--b-amarelo-borda); border-radius: 8px; color: var(--b-laranja-fg); font-size: 13px; font-weight: 600; }

.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chips span { background: var(--preto); color: var(--azul-claro); padding: 6px 10px; border-radius: 7px; font-size: 13px; }

.badge { padding: 7px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; }
.planejamento { background: var(--b-amarelo-bg); color: var(--b-amarelo-fg); }
.andamento { background: var(--b-azul-bg); color: var(--b-azul-fg); }
.concluido { background: var(--b-verde-bg); color: var(--b-verde-fg); }
.prio-alta { background: var(--b-vermelho-bg); color: var(--b-vermelho-fg); }
.prio-media { background: var(--chip); color: var(--b-cinza-fg); }
.prio-baixa { background: var(--b-azul-bg); color: var(--b-azul-fg); }
.atrasado { background: var(--b-vermelho-bg); color: var(--b-vermelho-fg); }
.vence { background: var(--b-laranja-bg); color: var(--b-laranja-fg); }

.acoes { display: flex; justify-content: flex-end; align-items: center; gap: 10px; margin-top: 28px; flex-wrap: wrap; }

@media (max-width: 700px) {
  .cabecalho { flex-direction: column; }
  .etiquetas { justify-content: flex-start; }
  .dados { grid-template-columns: 1fr; }
  .gasto-numeros { grid-template-columns: 1fr; }
  .th, .tr { grid-template-columns: 1.6fr 44px 1fr 70px; }
  .th span:nth-child(4), .tr span:nth-child(4) { display: none; }
  .acoes { justify-content: stretch; align-items: stretch; flex-direction: column; }
  .aviso-dono { margin-right: 0; text-align: center; }
  .acoes .btn { text-align: center; }
}
</style>
