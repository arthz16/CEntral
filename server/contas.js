// Operações sobre contas usadas em mais de um lugar: excluir, avisar, registrar na auditoria e o administrador.
import { randomBytes } from 'node:crypto'
import { ADMIN_EMAIL, ADMIN_SENHA, ADMIN_USUARIO } from './config.js'
import { db, salvar } from './banco.js'
import { conferirSenha, gerarHash } from './seguranca.js'

// Mensagem que a pessoa lê em Conta (ex.: "seu projeto foi ocultado pela moderação")
export function avisar(usuario, texto) {
  usuario.avisos.push({ id: ++db.contadores.avisos, texto, em: new Date().toISOString() })
  usuario.avisos = usuario.avisos.slice(-20)
}

// Notificação ("fulano curtiu o seu projeto"). Não notifica a própria pessoa e não repete a mesma curtida/seguidor.
export function notificar(destino, { tipo, de, projetoId = null, trecho = '' }) {
  if (de.id === destino.id) return
  const repetida = tipo !== 'comentario' && destino.notificacoes.some(n => n.tipo === tipo && n.deId === de.id && n.projetoId === projetoId)
  if (repetida) return
  destino.notificacoes.push({ id: ++db.contadores.notificacoes, tipo, deId: de.id, projetoId, trecho, em: new Date().toISOString(), lida: false })
  destino.notificacoes = destino.notificacoes.slice(-100)
}

// Cada ação de administração fica registrada: quem fez, o quê, em quem e por quê
export function auditar(admin, acao, alvo, motivo = '') {
  db.auditoria.push({ id: ++db.contadores.auditoria, adminId: admin.id, admin: admin.usuario, acao, alvo, motivo, em: new Date().toISOString() })
  if (db.auditoria.length > 2000) db.auditoria.splice(0, db.auditoria.length - 2000)
}

// Encerra as denúncias abertas sobre algo que deixou de existir
export function encerrarDenuncias(corresponde, nota) {
  for (const d of db.denuncias) {
    if (d.status === 'aberta' && corresponde(d)) Object.assign(d, { status: 'resolvida', nota, resolvidoEm: new Date().toISOString(), resolvidoPor: 'sistema' })
  }
}

// Apaga a conta, os projetos dela e tudo que ela deixou nos projetos dos outros
export function removerUsuario(id) {
  const i = db.usuarios.findIndex(u => u.id === id)
  if (i < 0) return
  const meusProjetos = new Set(db.usuarios[i].projetos.map(p => p.id))
  db.usuarios.splice(i, 1)
  for (const u of db.usuarios) {
    u.bloqueados = u.bloqueados.filter(x => x !== id)
    u.seguindo = u.seguindo.filter(x => x !== id)
    u.notificacoes = u.notificacoes.filter(n => n.deId !== id)
    for (const p of u.projetos) {
      p.curtidas = p.curtidas.filter(x => x !== id)
      p.comentarios = p.comentarios.filter(c => c.usuarioId !== id)
    }
  }
  encerrarDenuncias(d => d.usuarioId === id || meusProjetos.has(d.projetoId), 'O alvo da denúncia foi removido.')
  salvar()
}

// Ao ligar o servidor: cria a conta de administrador definida no .env (ou promove a que já existe).
export async function garantirAdmin() {
  if (!ADMIN_EMAIL) return
  let conta = db.usuarios.find(u => u.email === ADMIN_EMAIL)
  if (!conta) {
    const senha = ADMIN_SENHA || randomBytes(9).toString('base64url')
    let usuario = ADMIN_USUARIO
    for (let n = 2; db.usuarios.some(u => u.usuario === usuario); n++) usuario = `${ADMIN_USUARIO}${n}`
    conta = {
      id: ++db.contadores.usuarios, nome: 'Administração', usuario, email: ADMIN_EMAIL, senhaHash: await gerarHash(senha),
      criadoEm: new Date().toISOString(), projetos: [], sessoes: [], papel: 'admin', bloqueados: [], avisos: [], bio: '', seguindo: [], notificacoes: []
    }
    db.usuarios.push(conta)
    salvar()
    console.log(`[admin] Conta de administrador criada: ${ADMIN_EMAIL} (@${usuario}).`)
    if (!ADMIN_SENHA) console.log(`[admin] Senha gerada (anote agora, ela não aparece de novo): ${senha}`)
  } else if (conta.papel !== 'admin') {
    // Só promove uma conta que já existe se a senha do .env for a senha dessa conta (prova que é o dono)
    if (ADMIN_SENHA && (await conferirSenha(ADMIN_SENHA, conta.senhaHash))) {
      conta.papel = 'admin'
      salvar()
      console.log(`[admin] A conta ${ADMIN_EMAIL} agora é administradora.`)
    } else {
      console.warn(`[admin] Já existe uma conta com ${ADMIN_EMAIL}. Para promovê-la, coloque a senha dela em ADMIN_SENHA no .env.`)
    }
  }
}
