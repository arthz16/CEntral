<template>
  <div>
    <div>
      <div v-if="erro" class="vazio erro-box">Não foi possível carregar os dados. Rode <strong>npm run server</strong>.</div>
      <template v-else>
        <section class="resumo">
          <div class="stat-card"><span>Total de projetos</span><strong>{{ resumo.total }}</strong><small>Projetos cadastrados</small></div>
          <div class="stat-card"><span>Planejamento</span><strong>{{ planejamento }}</strong><small>Esperando início</small></div>
          <div class="stat-card"><span>Em andamento</span><strong>{{ andamento }}</strong><small>Projetos ativos</small></div>
          <div class="stat-card"><span>Concluídos</span><strong>{{ concluidos }}</strong><small>Projetos finalizados</small></div>
        </section>

        <section class="financeiro-grid">
          <div class="fin-card card">
            <div class="painel-titulo"><div><span class="mini-titulo">ORÇAMENTO</span><h2>Gasto x planejado</h2></div></div>
            <div class="fin-numeros">
              <div><span>Já comprado</span><strong class="comprado">{{ dinheiro(resumo.compradoTotal) }}</strong></div>
              <div><span>Total previsto</span><strong>{{ dinheiro(resumo.previstoTotal) }}</strong></div>
              <div><span>Orçamento planejado</span><strong>{{ dinheiro(resumo.orcamentoTotal) }}</strong></div>
            </div>
            <div class="fin-barra">
              <div class="barra-label"><span>Comprado sobre o previsto</span><strong>{{ percentualComprado }}%</strong></div>
              <div class="barra-fundo"><div class="barra-preenchida" :style="{ width: percentualComprado + '%', background: '#2e9e68' }"></div></div>
            </div>
            <p v-if="resumo.orcamentoTotal && resumo.previstoTotal > resumo.orcamentoTotal" class="alerta-estouro">
              O total previsto passou do orçamento planejado em {{ dinheiro(resumo.previstoTotal - resumo.orcamentoTotal) }}.
            </p>
          </div>

          <div class="fin-card card">
            <div class="painel-titulo"><div><span class="mini-titulo">PRAZOS</span><h2>Atenção</h2></div></div>
            <div class="prazo-stats">
              <div class="prazo-stat atrasado"><strong>{{ resumo.atrasados }}</strong><span>Atrasados</span></div>
              <div class="prazo-stat vence"><strong>{{ resumo.aVencer }}</strong><span>Vencem em 7 dias</span></div>
              <div class="prazo-stat favorito"><strong>{{ resumo.favoritos }}</strong><span>Favoritos</span></div>
            </div>
            <div class="prioridades">
              <div class="prio-linha"><span class="badge prio-alta">Alta</span><strong>{{ resumo.prioridades.Alta }}</strong></div>
              <div class="prio-linha"><span class="badge prio-media">Média</span><strong>{{ resumo.prioridades['Média'] }}</strong></div>
              <div class="prio-linha"><span class="badge prio-baixa">Baixa</span><strong>{{ resumo.prioridades.Baixa }}</strong></div>
            </div>
          </div>
        </section>

        <section class="dashboard-grid">
          <div class="painel card">
            <div class="painel-titulo"><div><span class="mini-titulo">VISÃO GERAL</span><h2>Status dos projetos</h2></div><RouterLink class="btn btn-sm" to="/Projetos">Ver projetos</RouterLink></div>
            <div class="grafico">
              <div v-for="item in statusGrafico" :key="item.nome" class="barra-item">
                <div class="barra-label"><span>{{ item.nome }}</span><strong>{{ item.valor }}</strong></div>
                <div class="barra-fundo"><div class="barra-preenchida" :style="{ width: item.percentual + '%', background: item.cor }"></div></div>
              </div>
            </div>
          </div>

          <div class="painel card">
            <div class="painel-titulo"><div><span class="mini-titulo">CATEGORIAS</span><h2>Distribuição</h2></div></div>
            <div v-if="categoriasGrafico.length" class="categorias-grafico">
              <div v-for="item in categoriasGrafico" :key="item.nome" class="categoria-linha" :style="{ '--p': item.percentual + '%' }"><span>{{ item.nome }}</span><strong>{{ item.valor }}</strong></div>
            </div>
            <p v-else class="sem-dados">Ainda não existem projetos para mostrar.</p>
          </div>
        </section>

        <section class="ultimos card">
          <div class="painel-titulo"><div><span class="mini-titulo">RECENTES</span><h2>Últimos projetos</h2></div><RouterLink class="link" to="/CadastrosProjetos">+ Novo projeto</RouterLink></div>
          <div v-if="!ultimos.length" class="sem-dados">Nenhum projeto cadastrado ainda.</div>
          <div v-else class="lista-recente">
            <div v-for="projeto in ultimos" :key="projeto.id" class="recente-item">
              <div><strong>{{ projeto.nome }}</strong><span>{{ projeto.categoria }} · {{ projeto.responsavel }}</span></div>
              <span class="badge" :class="classeStatus(projeto.status)">{{ projeto.status }}</span>
            </div>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<script>
import { api } from '../services/api'
import { dinheiro } from '../services/utils'

export default {
  name: 'PainelResumo',
  data() {
    // O servidor já devolve os totais calculados, sem baixar todos os projetos
    return {
      resumo: {
        total: 0, planejamento: 0, andamento: 0, concluidos: 0, categorias: [], ultimos: [],
        orcamentoTotal: 0, previstoTotal: 0, compradoTotal: 0,
        atrasados: 0, aVencer: 0, favoritos: 0,
        prioridades: { Alta: 0, 'Média': 0, Baixa: 0 }
      },
      erro: false
    }
  },
  computed: {
    planejamento() { return this.resumo.planejamento },
    andamento() { return this.resumo.andamento },
    concluidos() { return this.resumo.concluidos },
    statusGrafico() {
      const total = this.resumo.total || 1
      return [
        { nome: 'Planejamento', valor: this.planejamento, percentual: this.planejamento / total * 100, cor: '#e0a100' },
        { nome: 'Em andamento', valor: this.andamento, percentual: this.andamento / total * 100, cor: 'var(--azul)' },
        { nome: 'Concluído', valor: this.concluidos, percentual: this.concluidos / total * 100, cor: '#2e9e68' }
      ]
    },
    categoriasGrafico() {
      const total = this.resumo.total || 1
      return this.resumo.categorias.map(c => ({ ...c, percentual: c.valor / total * 100 }))
    },
    ultimos() { return this.resumo.ultimos },
    percentualComprado() {
      if (!this.resumo.previstoTotal) return 0
      return Math.min(100, Math.round(this.resumo.compradoTotal / this.resumo.previstoTotal * 100))
    }
  },
  methods: {
    dinheiro,
    async carregar() {
      try { this.resumo = await api('/resumo') }
      catch { this.erro = true }
    },
    classeStatus(status) { return status === 'Concluído' ? 'concluido' : status === 'Em andamento' ? 'andamento' : 'planejamento' }
  },
  mounted() { this.carregar() }
}
</script>

<style scoped>
.resumo { display:grid; grid-template-columns:repeat(4,1fr); gap:18px; margin-bottom:24px; }
.stat-card { background:var(--superficie); border:1px solid var(--borda); border-top:4px solid var(--azul); border-radius:14px; padding:22px; box-shadow:var(--sombra); }
.stat-card span,.stat-card small { display:block; color:var(--texto-suave); }
.stat-card strong { display:block; margin:5px 0; font-size:36px; color: var(--tinta); }
.dashboard-grid { display:grid; grid-template-columns:1.2fr .8fr; gap:20px; margin-bottom:20px; }
.financeiro-grid { display:grid; grid-template-columns:1.2fr .8fr; gap:20px; margin-bottom:20px; }
.fin-card { padding:22px; }
.fin-numeros { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:18px; }
.fin-numeros div { padding:14px; background:var(--superficie-suave); border:1px solid var(--borda); border-radius:10px; }
.fin-numeros span { display:block; font-size:12px; color:var(--texto-suave); }
.fin-numeros strong { display:block; margin-top:4px; font-size:22px; color: var(--tinta); }
.fin-numeros strong.comprado { color:var(--b-verde-fg); }
.fin-barra .barra-label { display:flex; justify-content:space-between; margin-bottom:7px; font-size:14px; }
.alerta-estouro { margin-top:14px; padding:10px 14px; background:var(--b-laranja-bg); border:1px solid var(--b-amarelo-borda); border-radius:9px; color:var(--b-laranja-fg); font-size:13px; font-weight:600; }
.prazo-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:18px; }
.prazo-stat { padding:16px; border-radius:11px; text-align:center; border:1px solid var(--borda); }
.prazo-stat strong { display:block; font-size:30px; }
.prazo-stat span { font-size:12px; color:var(--texto-suave); }
.prazo-stat.atrasado { background:var(--b-vermelho-bg); border-color:var(--b-vermelho-borda); }
.prazo-stat.atrasado strong { color:var(--b-vermelho-fg); }
.prazo-stat.vence { background:var(--b-amarelo-bg); border-color:var(--b-amarelo-borda); }
.prazo-stat.vence strong { color:var(--b-laranja-fg); }
.prazo-stat.favorito { background:var(--b-amarelo-bg); border-color:var(--b-amarelo-borda); }
.prazo-stat.favorito strong { color:var(--b-amarelo-fg); }
.prioridades { display:flex; flex-direction:column; gap:8px; }
.prio-linha { display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:var(--superficie-suave); border:1px solid var(--borda); border-radius:9px; }
.badge.prio-alta { background:var(--b-vermelho-bg); color:var(--b-vermelho-fg); }
.badge.prio-media { background:var(--chip); color:var(--b-cinza-fg); }
.badge.prio-baixa { background:var(--b-azul-bg); color: var(--b-azul-fg); }
.painel { min-height:260px; }
.painel-titulo { display:flex; justify-content:space-between; align-items:center; gap:15px; margin-bottom:24px; }
.painel h2 { margin-top:3px; color: var(--tinta); }
.mini-titulo { font-size:11px; font-weight:800; color:var(--azul); letter-spacing:.12em; }
.btn-sm { padding:8px 14px; font-size:13px; }
.grafico { display:flex; flex-direction:column; gap:22px; padding-top:8px; }
.barra-label { display:flex; justify-content:space-between; margin-bottom:7px; font-size:14px; }
.barra-fundo { height:12px; border-radius:20px; background:var(--chip); overflow:hidden; }
.barra-preenchida { height:100%; border-radius:20px; background: var(--azul-botao); transition:width .6s ease; }
.categorias-grafico { display:flex; flex-direction:column; gap:12px; }
.categoria-linha { display:flex; justify-content:space-between; padding:12px 14px; background:linear-gradient(90deg,var(--b-azul-bg) var(--p),var(--superficie-suave) var(--p)); border:1px solid var(--borda); border-radius:9px; }
.sem-dados { color:var(--texto-suave); padding:20px 0; }
.ultimos { margin-bottom:30px; }
.link { font-weight:700; }
.lista-recente { display:flex; flex-direction:column; }
.recente-item { display:flex; justify-content:space-between; align-items:center; gap:15px; padding:15px 0; border-bottom:1px solid var(--borda); }
.recente-item:last-child { border-bottom:0; }
.recente-item strong,.recente-item span { display:block; }
.recente-item div span { color:var(--texto-suave); font-size:13px; margin-top:3px; }
.badge { display:inline-flex!important; padding:5px 10px; border-radius:999px; font-size:12px; font-weight:700; white-space:nowrap; }
.badge.planejamento { background:var(--b-amarelo-bg); color:var(--b-amarelo-fg); }
.badge.andamento { background:var(--b-azul-bg); color: var(--b-azul-fg); }
.badge.concluido { background:var(--b-verde-bg); color:var(--b-verde-fg); }
@media(max-width:900px){.resumo{grid-template-columns:repeat(2,1fr)}.dashboard-grid{grid-template-columns:1fr}.financeiro-grid{grid-template-columns:1fr}.fin-numeros{grid-template-columns:1fr}}
@media(max-width:560px){.resumo{grid-template-columns:1fr}.painel-titulo{align-items:flex-start;flex-direction:column}.recente-item{align-items:flex-start;flex-direction:column}}
</style>
