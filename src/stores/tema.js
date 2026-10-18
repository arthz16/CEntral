// Tema claro/escuro. A escolha fica salva no navegador; na primeira visita segue o do sistema.
import { reactive } from 'vue'
import { guardarLocal, lerLocal } from '../services/api'

export const tema = reactive({ atual: 'claro' })

const aplicar = valor => {
  tema.atual = valor
  document.documentElement.dataset.tema = valor
}

export function iniciarTema() {
  const salvo = lerLocal('cp_tema')
  const doSistema = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'
  aplicar(salvo === 'claro' || salvo === 'escuro' ? salvo : doSistema)

  // Enquanto a pessoa não escolheu, acompanha o sistema (ex.: modo escuro automático à noite)
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!lerLocal('cp_tema')) aplicar(e.matches ? 'escuro' : 'claro')
  })
}

export function alternarTema() {
  const novo = tema.atual === 'escuro' ? 'claro' : 'escuro'
  guardarLocal('cp_tema', novo)
  aplicar(novo)
}
