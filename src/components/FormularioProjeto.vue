<template>
  <div>
    <!-- Mensagem de sucesso ou erro -->
    <Message :msg="aviso" />

    <div v-if="carregando" class="form-esqueleto card" aria-busy="true" aria-label="Carregando formulário">
      <span class="esqueleto" style="height: 20px; width: 40%"></span>
      <span class="esqueleto" style="height: 44px"></span>
      <span class="esqueleto" style="height: 20px; width: 30%"></span>
      <span class="esqueleto" style="height: 110px"></span>
      <span class="esqueleto" style="height: 44px"></span>
    </div>

    <form v-else id="projeto-form" class="anim-subir" @submit.prevent="enviar">

      <!-- 1. Informações básicas -->
      <fieldset class="secao">
        <legend><span class="num-secao">1</span> Informações básicas</legend>

        <div class="input-container cheio">
          <label for="nome">Nome do Projeto</label>
          <input type="text" id="nome" v-model="f.nome" maxlength="120" placeholder="Digite o nome do projeto" required>
        </div>

        <div class="input-container cheio">
          <label for="descricao">Descrição</label>
          <textarea id="descricao" v-model="f.descricao" maxlength="2000" placeholder="Descreva o projeto"></textarea>
        </div>

        <div class="input-container">
          <label for="categoria">Categoria</label>
          <select id="categoria" v-model="f.categoria" @change="aoTrocarCategoria" required>
            <option value="">Selecione</option>
            <option v-for="c in categorias" :key="c.id" :value="c.nome">{{ c.nome }}</option>
            <option :value="OUTROS">Outros (digitar a categoria)</option>
          </select>
        </div>

        <!-- Subcategoria: muda conforme a categoria da lista -->
        <div class="input-container" v-if="subcategorias.length">
          <label for="subcategoria">Subcategoria</label>
          <select id="subcategoria" v-model="f.subcategoria" @change="aoTrocarSubcategoria">
            <option value="">Selecione</option>
            <option v-for="sc in subcategorias" :key="sc.nome" :value="sc.nome">{{ sc.nome }}</option>
          </select>
        </div>

        <!-- "Outros": a pessoa digita a categoria (e, se quiser, a subcategoria) -->
        <template v-if="usaOutros">
          <div class="input-container">
            <label for="categoriaOutra">Qual é a categoria?</label>
            <input type="text" id="categoriaOutra" v-model="f.categoriaOutra" maxlength="40"
                   placeholder="Ex.: Jardinagem, Eventos, Estudos..." required>
          </div>
          <div class="input-container cheio">
            <label for="subcategoriaLivre">Subcategoria (opcional)</label>
            <input type="text" id="subcategoriaLivre" v-model="f.subcategoria" maxlength="80" placeholder="Ex.: Horta, Casamento...">
            <p class="dica-campo">Com "Outros" não há sugestões de itens: adicione os seus na seção seguinte.</p>
          </div>
        </template>

        <div class="input-container cheio">
          <label for="responsavel">Responsável</label>
          <input type="text" id="responsavel" v-model="f.responsavel" maxlength="80" placeholder="Quem é o responsável?" required>
        </div>
      </fieldset>

      <!-- 2. Itens e orçamento -->
      <fieldset class="secao">
        <legend><span class="num-secao">2</span> Itens e orçamento</legend>

        <!-- Itens sugeridos: clique para adicionar à lista -->
        <div class="input-container cheio" v-if="itensDisponiveis.length">
          <label>Materiais / tecnologias / peças</label>
          <p class="dica-campo">Clique para adicionar. Depois informe a quantidade e o valor de cada um.</p>
          <div class="chips">
            <button type="button" class="chip" v-for="i in itensDisponiveis" :key="i"
                    :class="{ on: itemSelecionado(i) }" :aria-pressed="itemSelecionado(i)" @click="alternarItem(i)">{{ i }}</button>
          </div>
        </div>

        <!-- Lista de itens com quantidade, valor unitário e "já comprado" -->
        <div class="input-container cheio">
          <label for="novoItem">Itens do orçamento</label>
          <div class="add-item">
            <input type="text" id="novoItem" v-model="novoItem" maxlength="80" placeholder="Adicionar item (ex.: Prego)"
                   @keydown.enter.prevent="adicionarPersonalizado">
            <button type="button" class="btn-add" @click="adicionarPersonalizado">Adicionar</button>
          </div>

          <p v-if="!f.itens.length" class="vazio-itens">Nenhum item ainda. Adicione um item{{ itensDisponiveis.length ? ' ou clique nas sugestões acima' : '' }}.</p>

          <div v-else class="tabela-itens">
            <div class="linha-item cabecalho">
              <span>Item</span><span>Qtd.</span><span>Valor unit.</span><span>Subtotal</span><span>Comprado</span><span></span>
            </div>
            <div class="linha-item" v-for="(item, idx) in f.itens" :key="idx">
              <span class="nome-item" :title="item.nome">{{ item.nome }}</span>
              <input type="number" min="0" step="1" v-model.number="item.quantidade" aria-label="Quantidade">
              <input type="number" min="0" step="0.01" v-model.number="item.valorUnitario" aria-label="Valor unitário">
              <span class="subtotal">{{ dinheiro(custoItem(item)) }}</span>
              <label class="check"><input type="checkbox" v-model="item.comprado" :aria-label="`${item.nome} já comprado`"><span></span></label>
              <button type="button" class="remover" @click="removerItem(idx)" :aria-label="`Remover ${item.nome}`">×</button>
            </div>
          </div>

          <div class="resumo-itens" v-if="f.itens.length">
            <div><span>Total previsto</span><strong>{{ dinheiro(totalPrevisto) }}</strong></div>
            <div><span>Já comprado</span><strong class="comprado">{{ dinheiro(totalComprado) }}</strong></div>
            <div><span>Falta comprar</span><strong>{{ dinheiro(totalPrevisto - totalComprado) }}</strong></div>
          </div>
        </div>

        <!-- Orçamento planejado (teto) -->
        <div class="input-container cheio">
          <label for="orcamento">Orçamento planejado (opcional)</label>
          <div class="moeda">
            <span>R$</span>
            <input type="number" id="orcamento" v-model.number="f.orcamento" min="0" step="0.01" placeholder="0,00">
          </div>
          <p class="dica-campo">Quanto você planeja gastar no total. Comparamos com o previsto pelos itens.</p>
          <p v-if="f.orcamento && totalPrevisto > f.orcamento" class="alerta-estouro">
            Atenção: o previsto ({{ dinheiro(totalPrevisto) }}) passou do orçamento ({{ dinheiro(f.orcamento) }}).
          </p>
        </div>
      </fieldset>

      <!-- 3. Prazos e situação -->
      <fieldset class="secao">
        <legend><span class="num-secao">3</span> Prazos e situação</legend>

        <div class="duas-colunas">
          <div class="input-container">
            <label for="dataCriacao">Data de criação</label>
            <input type="text" id="dataCriacao" :value="dataCriacaoTexto" disabled title="A data de criação é automática e não pode ser alterada">
          </div>
          <div class="input-container">
            <label for="prazo">Prazo</label>
            <input type="date" id="prazo" v-model="f.prazo" :min="minPrazo" title="O prazo precisa ser a partir de amanhã">
          </div>
        </div>

        <div class="duas-colunas">
          <div class="input-container">
            <label for="status">Status</label>
            <select id="status" v-model="f.status">
              <option>Planejamento</option>
              <option>Em andamento</option>
              <option>Concluído</option>
            </select>
          </div>
          <div class="input-container">
            <label for="prioridade">Prioridade</label>
            <select id="prioridade" v-model="f.prioridade">
              <option>Alta</option>
              <option>Média</option>
              <option>Baixa</option>
            </select>
          </div>
        </div>
      </fieldset>

      <!-- 4. Visibilidade: interruptores de público e favorito -->
      <fieldset class="secao">
        <legend><span class="num-secao">4</span> Visibilidade</legend>

        <div class="opcoes">
          <label class="opcao" :class="{ ativa: f.publico }">
            <input type="checkbox" role="switch" v-model="f.publico" :aria-checked="f.publico">
            <span class="trilho"><span class="bolinha"></span></span>
            <span class="texto">
              <strong>Projeto público</strong>
              <small>{{ f.publico
                ? 'Aparece na Comunidade para quem está logado. Só você pode editar.'
                : 'Privado: só você vê. Não aparece na Comunidade nem no seu perfil.' }}</small>
            </span>
          </label>

          <label class="opcao favorita" :class="{ ativa: f.favorito }">
            <input type="checkbox" role="switch" v-model="f.favorito" :aria-checked="f.favorito">
            <span class="trilho"><span class="bolinha"></span></span>
            <span class="texto">
              <strong>★ Favoritar projeto</strong>
              <small>{{ f.favorito ? 'Fica no topo da lista em Meus Projetos.' : 'Favoritos aparecem primeiro em Meus Projetos.' }}</small>
            </span>
          </label>
        </div>
      </fieldset>

      <div class="rodape-form">
        <RouterLink v-if="cancelarPara" class="btn btn-outline" :to="cancelarPara">Cancelar</RouterLink>
        <button type="submit" class="submit-btn" :disabled="enviando">{{ enviando ? 'Salvando...' : textoBotao }}</button>
      </div>

    </form>
  </div>
</template>

<script setup>
// Formulário único de projeto: serve para cadastrar e para editar (antes eram dois, quase iguais).
import { computed, onMounted, reactive, ref, watch } from 'vue'
import Message from './Message.vue'
import { categorias as buscarCategorias } from '../services/api'
import { auth } from '../stores/auth'
import { useAviso } from '../composables/useAviso'
import { amanhaLocal, custoItem, dinheiro, formatarData, hojeLocal, normalizarItens, somaComprado, somaItens } from '../services/utils'

const props = defineProps({
  projeto: { type: Object, default: null }, // projeto existente (edição) ou null (cadastro)
  textoBotao: { type: String, default: 'Salvar' },
  cancelarPara: { type: String, default: '' },
  // Função que recebe os dados prontos e faz o envio (POST ou PUT). Pode devolver uma mensagem de sucesso.
  aoEnviar: { type: Function, required: true },
  limparDepois: { type: Boolean, default: false }
})
// Avisa a página quando há alterações não salvas (ela pergunta antes de sair)
const emit = defineEmits(['sujo'])

const OUTROS = '__outros__'
const carregando = ref(true)
const enviando = ref(false)
const { aviso, avisar } = useAviso()
const categorias = ref([])
const novoItem = ref('')
const prazoOriginal = ref('')
const amanha = ref(amanhaLocal())

const f = reactive({})
function valoresIniciais() {
  const p = props.projeto
  const lista = categorias.value
  // Categoria que não está na lista (digitada em "Outros" antes) volta como "Outros" com o texto preenchido
  const naLista = p && lista.find(c => c.nome.toLowerCase() === String(p.categoria).toLowerCase())
  Object.assign(f, {
    nome: p?.nome || '',
    descricao: p?.descricao || '',
    categoria: p ? (naLista ? naLista.nome : OUTROS) : '',
    categoriaOutra: p && !naLista ? p.categoria : '',
    subcategoria: p?.subcategoria || '',
    itens: p ? normalizarItens(p.itens).map(i => ({ ...i })) : [],
    orcamento: p?.orcamento || '',
    responsavel: p?.responsavel || auth.usuario?.nome || '',
    prazo: p?.prazo || '',
    status: p?.status || 'Planejamento',
    prioridade: p?.prioridade || 'Média',
    favorito: p?.favorito === true,
    publico: p ? p.publico !== false : true
  })
  prazoOriginal.value = p?.prazo || ''
  baseline = JSON.stringify(f)
  emit('sujo', false)
}

// "Sujo" = a pessoa mexeu em algo e ainda não salvou
let baseline = ''
watch(f, () => { if (!carregando.value) emit('sujo', JSON.stringify(f) !== baseline) }, { deep: true })

onMounted(async () => {
  try { categorias.value = await buscarCategorias() } catch (e) { avisar(e.message, 'erro') }
  valoresIniciais()
  carregando.value = false
})

const usaOutros = computed(() => f.categoria === OUTROS)
const subcategorias = computed(() => categorias.value.find(c => c.nome === f.categoria)?.subcategorias || [])
const itensDisponiveis = computed(() => subcategorias.value.find(s => s.nome === f.subcategoria)?.itens || [])
const totalPrevisto = computed(() => somaItens(f.itens))
const totalComprado = computed(() => somaComprado(f.itens))

// Prazo antigo que já venceu continua aceito se a pessoa não mexer nele; um prazo novo precisa ser de amanhã em diante
const minPrazo = computed(() => (prazoOriginal.value && prazoOriginal.value <= hojeLocal() ? undefined : amanha.value))
const dataCriacaoTexto = computed(() => formatarData(props.projeto?.dataCriacao || hojeLocal()))

// Só limpa itens e subcategoria quando a pessoa realmente troca o campo (não ao carregar)
function aoTrocarCategoria() { f.subcategoria = ''; f.itens = []; f.categoriaOutra = '' }
function aoTrocarSubcategoria() { f.itens = [] }

const itemSelecionado = nome => f.itens.some(i => i.nome === nome)
function alternarItem(nome) {
  const idx = f.itens.findIndex(i => i.nome === nome)
  if (idx >= 0) f.itens.splice(idx, 1)
  else f.itens.push({ nome, quantidade: 1, valorUnitario: 0, comprado: false })
}
function adicionarPersonalizado() {
  const nome = novoItem.value.trim()
  if (!nome) return
  if (!itemSelecionado(nome)) f.itens.push({ nome, quantidade: 1, valorUnitario: 0, comprado: false })
  novoItem.value = ''
}
const removerItem = idx => f.itens.splice(idx, 1)

async function enviar() {
  const categoria = usaOutros.value ? f.categoriaOutra.trim() : f.categoria
  if (!categoria) return avisar('Escolha a categoria (ou digite uma em "Outros").', 'erro')
  // O servidor confere de novo; aqui só avisamos antes de enviar
  if (f.prazo && f.prazo !== prazoOriginal.value && f.prazo <= hojeLocal()) {
    return avisar('O prazo precisa ser uma data futura, a partir de amanhã.', 'erro')
  }

  const dados = {
    nome: f.nome,
    descricao: f.descricao,
    categoria,
    subcategoria: (f.subcategoria || '').trim(),
    itens: f.itens.map(i => ({
      nome: i.nome,
      quantidade: Number(i.quantidade) || 0,
      valorUnitario: Number(i.valorUnitario) || 0,
      comprado: i.comprado === true
    })),
    orcamento: Number(f.orcamento) || 0,
    responsavel: f.responsavel,
    prazo: f.prazo,
    status: f.status,
    prioridade: f.prioridade,
    favorito: f.favorito,
    publico: f.publico
  }

  enviando.value = true
  // O que está na tela passa a ser "salvo" já (assim a troca de página depois de salvar não pergunta nada);
  // se o servidor recusar, volta a contar como alterado.
  const antes = baseline
  baseline = JSON.stringify(f)
  emit('sujo', false)
  try {
    const sucesso = await props.aoEnviar(dados)
    if (sucesso) avisar(sucesso)
    if (props.limparDepois) valoresIniciais()
  } catch (erro) {
    baseline = antes
    emit('sujo', JSON.stringify(f) !== baseline)
    avisar(erro.message, 'erro')
  } finally {
    enviando.value = false
  }
}
</script>

<style scoped>
#projeto-form,
.form-esqueleto {
  max-width: 760px;
  margin: 0 auto;
  padding: 30px;
  background: var(--superficie);
  border: 1px solid var(--borda);
  border-top: 5px solid var(--azul-botao);
  border-radius: 16px;
  box-shadow: var(--sombra);
}
#projeto-form { display: grid; gap: 22px; }

/* Seções do formulário */
.secao {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 20px;
  margin: 0;
  padding: 22px 22px 6px;
  min-width: 0;
  border: 1px solid var(--borda);
  border-radius: 14px;
  background: var(--superficie-suave);
}
.secao legend {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  color: var(--tinta);
  font-size: 16px;
  font-weight: 800;
}
.num-secao {
  display: inline-grid;
  place-items: center;
  width: 26px;
  height: 26px;
  background: var(--azul-botao);
  color: #fff;
  border-radius: 50%;
  font-size: 13px;
}
.form-esqueleto { display: grid; gap: 16px; }
.form-esqueleto:hover { transform: none; }

.input-container { display: flex; flex-direction: column; margin-bottom: 20px; }

label { margin-bottom: 6px; color: var(--texto); font-size: 14px; font-weight: 600; }

input,
select,
textarea {
  width: 100%;
  padding: 12px;
  background: var(--superficie);
  color: var(--texto);
  border: 2px solid var(--borda);
  border-radius: 8px;
  font-family: inherit;
  font-size: 15px;
  transition: var(--transicao);
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: var(--azul);
  box-shadow: 0 0 0 3px rgba(124, 200, 255, 0.35);
}

textarea { height: 120px; resize: vertical; }

input:disabled { background: var(--chip); color: var(--texto-suave); cursor: not-allowed; }

.chips { display: flex; flex-wrap: wrap; gap: 8px; }

.chip {
  margin: 0;
  padding: 6px 14px;
  background: var(--superficie);
  color: var(--texto);
  border: 2px solid var(--borda);
  border-radius: 999px;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transicao);
}
.chip:hover { border-color: var(--azul); }
.chip.on { background: var(--azul-botao); border-color: var(--azul-botao); color: var(--branco); animation: estalar 0.3s ease; }

/* ---- Itens com quantidade e preço ---- */
.add-item { display: flex; gap: 8px; margin-bottom: 12px; }
.add-item input { flex: 1; }
.btn-add {
  flex-shrink: 0;
  padding: 0 16px;
  background: var(--azul-botao);
  color: var(--branco);
  border: 0;
  border-radius: 8px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.btn-add:hover { background: var(--azul-escuro); }

.vazio-itens { color: var(--texto-suave); font-size: 14px; padding: 8px 0; }

.tabela-itens { border: 1px solid var(--borda); border-radius: 10px; overflow: hidden; }
.linha-item {
  display: grid;
  grid-template-columns: 1.6fr 70px 110px 100px 70px 36px;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  border-bottom: 1px solid var(--borda);
}
.linha-item:last-child { border-bottom: 0; }
.linha-item.cabecalho {
  background: var(--superficie-suave);
  font-size: 12px;
  font-weight: 700;
  color: var(--texto-suave);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.linha-item input { padding: 8px; font-size: 14px; }
.nome-item { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
.subtotal { font-weight: 700; font-size: 14px; }
.check { display: grid; place-items: center; margin: 0; }
.check input { width: 18px; height: 18px; cursor: pointer; }
.check span { display: none; }
.remover {
  width: 30px; height: 30px;
  background: var(--b-vermelho-bg); color: var(--b-vermelho-fg);
  border: 0; border-radius: 7px;
  font-size: 18px; line-height: 1; cursor: pointer;
}
.remover:hover { filter: brightness(0.95); }

.resumo-itens { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 12px; }
.resumo-itens div { padding: 12px; background: var(--superficie-suave); border: 1px solid var(--borda); border-radius: 10px; }
.resumo-itens span { display: block; font-size: 12px; color: var(--texto-suave); }
.resumo-itens strong { display: block; margin-top: 3px; font-size: 18px; }
.resumo-itens strong.comprado { color: var(--b-verde-fg); }

/* ---- Orçamento ---- */
.moeda { position: relative; }
.moeda span {
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  color: var(--texto-suave); font-weight: 700;
}
.moeda input { padding-left: 44px; }
.dica-campo { margin-top: 6px; color: var(--texto-suave); font-size: 13px; }
.alerta-estouro {
  margin-top: 8px; padding: 8px 12px;
  background: var(--b-laranja-bg); border: 1px solid var(--b-amarelo-borda); border-radius: 8px;
  color: var(--b-laranja-fg); font-size: 13px; font-weight: 600;
}

/* ---- Interruptores: público e favorito ---- */
.opcoes { grid-column: 1 / -1; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; }
.opcao {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin: 0;
  padding: 14px;
  background: var(--superficie-suave);
  border: 2px solid var(--borda);
  border-radius: 12px;
  cursor: pointer;
  transition: var(--transicao);
}
.opcao:hover { border-color: var(--borda-forte); }
.opcao input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.trilho {
  position: relative;
  flex-shrink: 0;
  width: 46px;
  height: 26px;
  margin-top: 1px;
  border-radius: 999px;
  background: var(--borda-forte);
  transition: var(--transicao);
}
.bolinha {
  position: absolute; top: 3px; left: 3px;
  width: 20px; height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s ease;
}
.opcao.ativa { border-color: var(--azul); }
.opcao.ativa .trilho { background: var(--azul-botao); }
.opcao.ativa .bolinha { transform: translateX(20px); }
.opcao.favorita.ativa { border-color: #e5b800; }
.opcao.favorita.ativa .trilho { background: #b8860b; }
.opcao input:focus-visible + .trilho { outline: 3px solid var(--foco); outline-offset: 2px; }
.texto strong { display: block; color: var(--tinta); font-size: 15px; }
.texto small { display: block; margin-top: 2px; color: var(--texto-suave); font-size: 13px; font-weight: 400; line-height: 1.4; }

/* ---- Rodapé do formulário ---- */
.rodape-form { grid-column: 1 / -1; display: flex; gap: 12px; }
.rodape-form .btn { padding: 14px 24px; }
.submit-btn {
  flex: 1;
  position: relative;
  overflow: hidden;
  padding: 14px;
  background: var(--azul-botao);
  color: var(--branco);
  border: none;
  border-radius: 8px;
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: var(--transicao);
}
.submit-btn:hover:not(:disabled) { background: var(--azul-escuro); transform: translateY(-2px); }
.submit-btn:disabled { opacity: 0.7; cursor: wait; }
.submit-btn::after {
  content: "";
  position: absolute; top: 0; left: -70%;
  width: 40%; height: 100%;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.5), transparent);
  transform: skewX(-20deg);
  pointer-events: none;
}
.submit-btn:hover::after { left: 130%; transition: left 0.7s ease; }

@keyframes estalar {
  0% { transform: scale(1); }
  50% { transform: scale(1.08); }
  100% { transform: scale(1); }
}

.cheio, .duas-colunas { grid-column: 1 / -1; }
.duas-colunas { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

@media (max-width: 650px) {
  .duas-colunas, .opcoes { grid-template-columns: 1fr; }
  #projeto-form { padding: 20px; }
  .secao { grid-template-columns: 1fr; padding: 18px 14px 4px; }
  .linha-item { grid-template-columns: 1.4fr 54px 90px 44px 32px; }
  .linha-item .subtotal { display: none; }
  .linha-item.cabecalho span:nth-child(4) { display: none; }
  .resumo-itens { grid-template-columns: 1fr; }
  .rodape-form { flex-direction: column-reverse; }
}
</style>
