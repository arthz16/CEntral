// Quem enxerga o quê. Reúne as regras de banimento, bloqueio e projeto oculto num lugar só,
// para a Comunidade, o Perfil e os comentários nunca divergirem.
import { db, salvar } from './banco.js'

export const ehAdmin = u => u.papel === 'admin'

// Suspensão em vigor? Uma suspensão com prazo termina sozinha (e some do cadastro).
export function banidoAtivo(u) {
  const b = u.banido
  if (!b) return false
  if (b.ate && new Date(b.ate).getTime() <= Date.now()) {
    delete u.banido
    salvar()
    return false
  }
  return true
}

// O bloqueio vale nos dois sentidos: quem bloqueia e quem foi bloqueado não se enxergam
export const bloqueio = (a, b) => (a.bloqueados || []).includes(b.id) || (b.bloqueados || []).includes(a.id)

// "dono" está escondido de "eu"? A moderação enxerga tudo; ninguém se esconde de si mesmo.
export function escondidoPara(eu, dono) {
  if (ehAdmin(eu) || dono.id === eu.id) return false
  return banidoAtivo(dono) || (!ehAdmin(dono) && bloqueio(eu, dono))
}

// Entra nas listas (Comunidade e Perfil): público, não ocultado pela moderação e de alguém que eu posso ver
export const projetoNaLista = (p, dono, eu) => p.publico && !p.oculto && !escondidoPara(eu, dono)

// Pode abrir o projeto, curtir e comentar? O dono e a moderação sempre podem.
export function projetoAcessivel(p, dono, eu) {
  if (ehAdmin(eu) || dono.id === eu.id) return true
  return projetoNaLista(p, dono, eu)
}

export const acharUsuario = id => db.usuarios.find(u => String(u.id) === String(id))
