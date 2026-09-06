/**
 * Bandeira do seletor de idioma — desenho decorativo, `aria-hidden`: quem lê
 * a tela ouve o nome do idioma ao lado, que é o rótulo de verdade.
 *
 * Simplificadas de propósito: a ~20px, detalhe vira ruído. Espanhol veste a
 * Espanha, inglês veste os Estados Unidos.
 *
 * Fica em arquivo próprio porque o idioma é escolhido em dois lugares — o menu
 * do topo no desktop e a folha da barra de abas no celular — e duas cópias do
 * mesmo desenho divergem no primeiro ajuste.
 */
export function Flag({ locale }: { locale: string }) {
  const ring = { className: 'h-5 w-5 shrink-0 rounded-full border border-ink/15' }
  if (locale === 'es') {
    // Spain
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" {...ring}>
        <rect width="24" height="24" fill="#AA151B" />
        <rect y="7" width="24" height="10" fill="#F1BF00" />
      </svg>
    )
  }
  if (locale === 'pt') {
    // Brazil
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" {...ring}>
        <rect width="24" height="24" fill="#009739" />
        <path d="M12 3.5 21 12l-9 8.5L3 12Z" fill="#FEDD00" />
        <circle cx="12" cy="12" r="4.2" fill="#012169" />
      </svg>
    )
  }
  // English — United States
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...ring}>
      <rect width="24" height="24" fill="#fff" />
      <path
        d="M0 1.5h24M0 5h24M0 8.5h24M0 12h24M0 15.5h24M0 19h24M0 22.5h24"
        stroke="#B22234"
        strokeWidth="2.5"
      />
      <rect width="11" height="10" fill="#3C3B6E" />
    </svg>
  )
}
