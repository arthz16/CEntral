// Banco de dados: o arquivo db/db.json é lido uma vez e fica em memória (consultas instantâneas).
// Cada usuário guarda os próprios projetos dentro dele, então uma conta nunca enxerga os de outra
// (só a Comunidade junta os projetos públicos de todo mundo).
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { ARQ_DB, ARQ_VITRINE, PRIORIDADES } from './config.js'

const lerJson = arquivo => JSON.parse(readFileSync(arquivo, 'utf8').replace(/^\uFEFF/, ''))

if (!existsSync(ARQ_DB)) {
  console.error(`Não encontrei o banco de dados em ${ARQ_DB}.\nCopie o arquivo db/db.json do projeto para essa pasta e rode de novo.`)
  process.exit(1)
}

// Deixa um item de projeto no formato novo: { nome, quantidade, valorUnitario, comprado }.
// Projetos antigos guardavam só o nome (texto); aqui eles são convertidos sem perder nada.
function normalizarItemGuardado(i) {
  if (typeof i === 'string') return { nome: i, quantidade: 1, valorUnitario: 0, comprado: false }
  return {
    nome: String(i?.nome || ''),
    quantidade: Number(i?.quantidade) || 0,
    valorUnitario: Number(i?.valorUnitario) || 0,
    comprado: i?.comprado === true
  }
}

export const db = lerJson(ARQ_DB)
db.categorias ??= []
db.usuarios ??= []
if (Array.isArray(db.projetos) && db.projetos.length === 0) delete db.projetos // lista antiga, sem dono

// ---- Migração automática: deixa dados antigos e novos no mesmo formato ----
// Nome de usuário (@) único: contas antigas ganham um automático, feito a partir do nome.
const semAcento = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const usados = new Set(db.usuarios.map(u => u.usuario).filter(Boolean))
for (const u of db.usuarios) {
  if (u.usuario) continue
  const base = (semAcento(u.nome).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 20) || 'usuario').padEnd(3, '0')
  let candidato = base
  for (let n = 2; usados.has(candidato); n++) candidato = base.slice(0, 20 - String(n).length) + n
  usados.add(candidato)
  u.usuario = candidato
}
for (const u of db.usuarios) {
  u.projetos ??= []
  u.sessoes = Array.isArray(u.sessoes) ? u.sessoes.filter(s => s && typeof s.jti === 'string') : []
  u.papel = u.papel === 'admin' ? 'admin' : 'usuario'
  u.bio = typeof u.bio === 'string' ? u.bio.slice(0, 200) : ''
  u.seguindo = Array.isArray(u.seguindo) ? [...new Set(u.seguindo.filter(Number.isInteger))] : []
  u.notificacoes = Array.isArray(u.notificacoes) ? u.notificacoes.filter(n => n && Number.isInteger(n.id) && typeof n.tipo === 'string').slice(-100) : []
  u.bloqueados = Array.isArray(u.bloqueados) ? [...new Set(u.bloqueados.filter(Number.isInteger))] : []
  u.avisos = Array.isArray(u.avisos) ? u.avisos.filter(a => a && typeof a.texto === 'string').slice(-20) : []
  if (!u.banido || typeof u.banido !== 'object') delete u.banido
  delete u.senhaAlteradaEm // substituído pela lista de sessões
  for (const p of u.projetos) {
    p.publico = p.publico !== false
    if (!p.oculto || typeof p.oculto !== 'object') delete p.oculto // ocultado pela moderação
    p.curtidas = Array.isArray(p.curtidas) ? [...new Set(p.curtidas.filter(Number.isInteger))] : []
    p.comentarios = Array.isArray(p.comentarios) ? p.comentarios.filter(c => c && Number.isInteger(c.id) && Number.isInteger(c.usuarioId) && typeof c.texto === 'string') : []
    p.itens = Array.isArray(p.itens) ? p.itens.map(normalizarItemGuardado).filter(i => i.nome) : []
    delete p.progresso // a barra de progresso foi removida do site
    p.prioridade = PRIORIDADES.includes(p.prioridade) ? p.prioridade : 'Média'
    p.favorito = p.favorito === true
  }
}

db.denuncias = Array.isArray(db.denuncias) ? db.denuncias : []
db.auditoria = Array.isArray(db.auditoria) ? db.auditoria : []

const maiorId = lista => lista.reduce((maior, x) => Math.max(maior, Number(x.id) || 0), 0)
db.contadores ??= {}
db.contadores.usuarios = Math.max(db.contadores.usuarios || 0, maiorId(db.usuarios))
db.contadores.projetos = Math.max(db.contadores.projetos || 0, ...db.usuarios.map(u => maiorId(u.projetos)))
db.contadores.notificacoes = Math.max(db.contadores.notificacoes || 0, ...db.usuarios.flatMap(u => u.notificacoes.map(n => n.id)))
db.contadores.denuncias = Math.max(db.contadores.denuncias || 0, maiorId(db.denuncias))
db.contadores.auditoria = Math.max(db.contadores.auditoria || 0, maiorId(db.auditoria))
db.contadores.avisos = Math.max(db.contadores.avisos || 0, ...db.usuarios.flatMap(u => u.avisos.map(a => Number(a.id) || 0)))
db.contadores.comentarios = Math.max(db.contadores.comentarios || 0, ...db.usuarios.flatMap(u => u.projetos.map(p => maiorId(p.comentarios))))

// Projetos prontos (exemplos que qualquer visitante pode ver). Só leitura.
export const vitrine = existsSync(ARQ_VITRINE) ? lerJson(ARQ_VITRINE) : []

// Salva no disco depois de uma pequena espera, juntando várias alterações seguidas em uma gravação
// só. Grava num arquivo temporário e troca, para nunca deixar o db.json pela metade.
let temporizador = null
export function salvar() {
  clearTimeout(temporizador)
  temporizador = setTimeout(gravar, 200)
}
export function gravar() {
  clearTimeout(temporizador)
  temporizador = null
  writeFileSync(ARQ_DB + '.tmp', JSON.stringify(db, null, 2))
  renameSync(ARQ_DB + '.tmp', ARQ_DB)
}
// Chamado ao desligar o servidor: não deixa nenhuma alteração pendente para trás
export const gravarSePendente = () => { if (temporizador) gravar() }
