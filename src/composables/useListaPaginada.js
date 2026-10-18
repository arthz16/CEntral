// Lógica comum das listas de projetos (Meus Projetos, Comunidade e Perfil): filtros, página, busca com
// espera, carregamento sem "piscar", resposta velha descartada e filtros guardados no endereço.
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../services/api'

// caminho: texto ou função que devolve o caminho da API (ex.: '/comunidade')
// padroes: { nomeDoFiltro: valorPadrao }. Boolean = caixinha; texto = campo. O nome é o mesmo da API.
export function useListaPaginada(caminho, padroes = {}, { limite = 12, rolarPara = '.filtros' } = {}) {
  const route = useRoute()
  const chaves = Object.keys(padroes)

  // Começa pelo que está no endereço (?pagina=2&categoria=...), para o botão Voltar do navegador funcionar
  const filtros = reactive({})
  for (const [k, padrao] of Object.entries(padroes)) {
    const v = route.query[k]
    filtros[k] = typeof padrao === 'boolean' ? v === '1' : (v != null ? String(v) : padrao)
  }
  const pagina = ref(Math.max(1, Number(route.query.pagina) || 1))
  const dados = ref(null)
  const carregando = ref(false)
  const erro = ref('')

  const valor = k => (k === 'busca' ? filtros.busca.trim() : filtros[k])
  const temFiltro = computed(() => chaves.some(k => valor(k) !== padroes[k]))

  function parametros(numero = pagina.value) {
    const p = new URLSearchParams({ pagina: numero, limite })
    for (const k of chaves) {
      const v = valor(k)
      if (v !== padroes[k]) p.set(k, typeof padroes[k] === 'boolean' ? '1' : v)
    }
    return p
  }

  let pedido = 0
  let ultimaChave = null
  const chave = () => parametros().toString()

  // silencioso = atualiza sem escurecer a lista (ex.: depois de favoritar)
  async function carregar(silencioso = false) {
    const meuPedido = ++pedido // se a pessoa mexer de novo antes da resposta chegar, a resposta velha é descartada
    ultimaChave = chave()
    if (!silencioso) carregando.value = true
    erro.value = ''
    try {
      const url = typeof caminho === 'function' ? caminho() : caminho
      const r = await api(`${url}?${parametros()}`)
      if (meuPedido !== pedido) return
      dados.value = r
      pagina.value = r.pagina // se a página pedida não existe mais, o servidor devolve a última
      guardarNoEndereco()
    } catch (e) {
      if (meuPedido === pedido) erro.value = e.message
    } finally {
      if (meuPedido === pedido) carregando.value = false
    }
  }

  // replaceState (e não router.replace) para a página não pular para o topo enquanto a pessoa digita
  function guardarNoEndereco() {
    const url = new URL(window.location.href)
    for (const k of ['pagina', ...chaves]) url.searchParams.delete(k) // mexe só nos próprios (o resto, como ?aba=, fica)
    const p = parametros()
    p.delete('limite')
    if (p.get('pagina') === '1') p.delete('pagina')
    p.forEach((v, k) => url.searchParams.set(k, v))
    window.history.replaceState(window.history.state, '', url)
  }

  function irParaPagina(n) {
    pagina.value = n
    carregar()
    if (rolarPara) document.querySelector(rolarPara)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Só consulta o servidor se a pesquisa de fato mudou (vários filtros mudando juntos = uma consulta só)
  function mudouFiltro() {
    pagina.value = 1
    if (chave() === ultimaChave) return
    carregar()
  }

  // Na busca espera a pessoa parar de digitar (não consulta o servidor a cada letra)
  let espera = null
  if (chaves.includes('busca')) {
    watch(() => filtros.busca, () => { clearTimeout(espera); espera = setTimeout(mudouFiltro, 350) })
  }
  const outros = chaves.filter(k => k !== 'busca')
  if (outros.length) watch(() => outros.map(k => filtros[k]), mudouFiltro)
  onBeforeUnmount(() => clearTimeout(espera))

  function limpar() {
    clearTimeout(espera)
    for (const k of chaves) filtros[k] = padroes[k] // os watchers recarregam a lista
    mudouFiltro()
  }

  return { filtros, pagina, dados, carregando, erro, temFiltro, carregar, irParaPagina, limpar, parametros }
}
