// Conferência dos dados que chegam do navegador. Nada que vem de fora é confiável: tudo passa por aqui.
import { db } from './banco.js'
import { ErroHttp } from './erro.js'
import { PRIORIDADES, STATUS } from './config.js'

export const publico = ({ id, nome, usuario, email, criadoEm, papel, bio }) => ({ id, nome, usuario, email, criadoEm, papel, bio })
export const normalizarEmail = v => (typeof v === 'string' ? v.trim().toLowerCase() : '')

export function validarEmail(email) {
  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ErroHttp(400, 'Digite um e-mail válido.')
}

// Nome de usuário (@): 3 a 20 letras minúsculas sem acento, números ou _. Único no site.
const RESERVADOS = ['admin', 'administrador', 'administracao', 'moderacao', 'moderador', 'suporte', 'central', 'sistema']
export function validarUsuario(valor, dono = null) {
  const u = typeof valor === 'string' ? valor.trim().toLowerCase().replace(/^@/, '') : ''
  if (!/^[a-z0-9_]{3,20}$/.test(u)) throw new ErroHttp(400, 'O nome de usuário precisa ter de 3 a 20 caracteres: letras minúsculas sem acento, números ou _.')
  // Nomes que fingiriam ser a administração só ficam com quem é administrador
  if (RESERVADOS.includes(u) && dono?.papel !== 'admin') throw new ErroHttp(400, 'Este nome de usuário é reservado. Escolha outro.')
  if (db.usuarios.some(x => x.usuario === u && x.id !== dono?.id)) throw new ErroHttp(409, 'Este nome de usuário já está em uso. Escolha outro.')
  return u
}

export function validarSenha(senha, campo = 'A senha') {
  if (senha.length < 6 || senha.length > 128) throw new ErroHttp(400, `${campo} precisa ter de 6 a 128 caracteres.`)
}

export function texto(valor, campo, max, obrigatorio = false) {
  const s = typeof valor === 'string' ? valor.trim() : ''
  if (obrigatorio && !s) throw new ErroHttp(400, `Preencha o campo ${campo}.`)
  if (s.length > max) throw new ErroHttp(400, `O campo ${campo} aceita no máximo ${max} caracteres.`)
  return s
}

// Dia de hoje no horário de Brasília (AAAA-MM-DD), para não errar a data à noite por causa do UTC.
export const hoje = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())

function dia(valor, campo, obrigatorio) {
  const s = typeof valor === 'string' ? valor : ''
  if (!s && !obrigatorio) return ''
  const [a, m, d] = s.split('-').map(Number)
  const data = new Date(Date.UTC(a, m - 1, d))
  const valida = /^\d{4}-\d{2}-\d{2}$/.test(s) && data.getUTCFullYear() === a && data.getUTCMonth() === m - 1 && data.getUTCDate() === d
  if (!valida) throw new ErroHttp(400, `Data inválida em ${campo}.`)
  return s
}

function dinheiro(valor) {
  if (valor === '' || valor == null) return 0
  const n = Number(valor)
  if (!Number.isFinite(n) || n < 0 || n > 1e12) throw new ErroHttp(400, 'Valor inválido.')
  return Math.round(n * 100) / 100
}

function inteiro(valor, campo, max = 1_000_000) {
  if (valor === '' || valor == null) return 0
  const n = Number(valor)
  if (!Number.isInteger(n) || n < 0 || n > max) throw new ErroHttp(400, `${campo} inválido.`)
  return n
}

// Cada item do projeto: nome + quantidade + valor unitário + se já foi comprado.
// Aceita o formato antigo (só o nome em texto) para não quebrar projetos existentes.
function item(valor) {
  if (typeof valor === 'string') return { nome: texto(valor, 'item', 80, true), quantidade: 1, valorUnitario: 0, comprado: false }
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) throw new ErroHttp(400, 'Item inválido.')
  return {
    nome: texto(valor.nome, 'item', 80, true),
    quantidade: inteiro(valor.quantidade, 'Quantidade'),
    valorUnitario: dinheiro(valor.valorUnitario),
    comprado: valor.comprado === true
  }
}

function listaDeItens(valor) {
  if (!Array.isArray(valor) || valor.length > 60) throw new ErroHttp(400, 'Lista de itens inválida.')
  return valor.map(item).filter(i => i.nome)
}

// A categoria pode ser uma da lista ou digitada pela pessoa (opção "Outros"). Para não criar
// "jardinagem", "Jardinagem" e "JARDINAGEM" como se fossem três, usa a grafia da lista quando existe,
// depois a grafia que outro projeto já usa e, se não existir nenhuma, deixa a primeira letra maiúscula.
export function normalizarCategoria(valor) {
  const s = texto(valor, 'Categoria', 40, true).replace(/\s+/g, ' ')
  const conhecida = db.categorias.find(c => c.nome.toLowerCase() === s.toLowerCase())
  if (conhecida) return conhecida.nome
  // Se outro projeto já usa esse nome (em qualquer maiúscula/minúscula), repete a grafia dele: "horta" e "HORTA" viram uma só
  for (const u of db.usuarios) for (const p of u.projetos) if (p.categoria.toLowerCase() === s.toLowerCase()) return p.categoria
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Pega só os campos permitidos (o cliente nunca consegue mexer em id ou dono).
// Com "exigir" os campos principais são obrigatórios (criar e PUT).
// "anterior" é o projeto já salvo (na edição): serve para aceitar um prazo antigo que não foi mexido.
// A data de criação NUNCA vem do cliente: o servidor define ao criar e ninguém muda depois.
export function limparProjeto(c, exigir, anterior) {
  const d = {}
  const veio = k => k in c
  if (veio('nome') || exigir) d.nome = texto(c.nome, 'Nome', 120, true)
  if (veio('descricao')) d.descricao = texto(c.descricao, 'Descrição', 2000)
  if (veio('categoria') || exigir) d.categoria = normalizarCategoria(c.categoria)
  if (veio('subcategoria')) d.subcategoria = texto(c.subcategoria, 'Subcategoria', 80)
  if (veio('itens')) d.itens = listaDeItens(c.itens)
  if (veio('orcamento')) d.orcamento = dinheiro(c.orcamento)
  if (veio('responsavel') || exigir) d.responsavel = texto(c.responsavel, 'Responsável', 80, true)
  if (veio('prazo')) {
    d.prazo = dia(c.prazo, 'Prazo', false)
    // Prazo novo ou alterado precisa ser de amanhã em diante (nem hoje, nem datas passadas)
    if (d.prazo && d.prazo <= hoje() && d.prazo !== anterior?.prazo) {
      throw new ErroHttp(400, 'O prazo precisa ser uma data futura, a partir de amanhã.')
    }
  }
  if (veio('status')) {
    if (!STATUS.includes(c.status)) throw new ErroHttp(400, 'Status inválido.')
    d.status = c.status
  }
  if (veio('prioridade')) {
    if (!PRIORIDADES.includes(c.prioridade)) throw new ErroHttp(400, 'Prioridade inválida.')
    d.prioridade = c.prioridade
  }
  if (veio('favorito')) d.favorito = c.favorito === true
  if (veio('publico')) d.publico = c.publico !== false
  return d
}
