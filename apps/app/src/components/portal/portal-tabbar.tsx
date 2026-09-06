'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Icon } from './icons'
import type { NavItem } from './portal-nav'

/**
 * Barra de abas do celular — o menu do portal ao alcance do polegar.
 *
 * A tira de pílulas que rolava de lado no topo tinha dois problemas de
 * telefone, não de desenho: o que não coube fica invisível (ninguém arrasta
 * uma tira que não parece arrastável), e o topo de um celular grande é o canto
 * mais longe do polegar. Aqui ficam fixas embaixo só as seções que o aluno abre
 * sem motivo, e a última aba abre uma folha com o resto.
 *
 * A folha não é só o excedente do menu: ela é também o canto da pessoa — o
 * perfil e a saída, que no desktop moram no avatar do topo, colocados onde a
 * mão está. O idioma não: é escolha que se faz uma vez, e mora com o resto do
 * que a pessoa define sobre si, em `/portal/profile`.
 *
 * `pb-safe-b` em toda a barra: com `viewportFit: 'cover'` (layout raiz) a
 * página pinta sob a barra de gestos do sistema, e sem a safe area a última
 * aba fica debaixo dela.
 */

export function PortalTabBar({
  items,
  studentName,
  monogram,
  logoutAction,
}: {
  items: NavItem[]
  studentName: string
  monogram: string
  logoutAction: () => Promise<void>
}) {
  const t = useTranslations('portal')
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  /* Quem fica fixo embaixo é declarado item a item no layout do portal, não
     recortado por posição: a ordem da sidebar responde outra pergunta, e um
     `slice` faz a barra mudar sozinha assim que alguém insere uma seção no
     meio da lista. */
  const tabs = items.filter((item) => item.tabBar)
  const overflow = items.filter((item) => !item.tabBar)

  function isActive(href: string) {
    if (href === '/portal') return pathname === '/portal'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  /* A aba "mais" acende quando a tela aberta é uma das que ela guarda —
     senão a barra diz que a pessoa não está em lugar nenhum. */
  const overflowActive = overflow.some((item) => isActive(item.href))

  const tabClass =
    'flex min-h-tap flex-1 flex-col items-center justify-center gap-1 px-1 py-1.5 text-[11px] font-semibold leading-tight transition'

  const sheetRowClass =
    'flex min-h-tap items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-semibold text-ink transition active:bg-sky'

  return (
    <>
      <nav
        aria-label={t('nav.menu')}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-safe-b backdrop-blur lg:hidden"
      >
        <div className="mx-auto flex w-full max-w-lg items-stretch">
          {tabs.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`${tabClass} ${
                  active ? 'text-brand-blue' : 'text-muted-foreground'
                }`}
              >
                <Icon name={item.icon} size={21} />
                {/* O rótulo curto existe só aqui: "Mis cursos" não cabe numa
                    coluna de 72px em nenhum dos três idiomas. */}
                <span className="w-full truncate text-center">
                  {item.shortLabel ?? item.label}
                </span>
              </Link>
            )
          })}

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={open}
            className={`${tabClass} ${
              overflowActive || open ? 'text-brand-blue' : 'text-muted-foreground'
            }`}
          >
            <Icon name="menu" size={21} />
            <span className="w-full truncate text-center">{t('nav.more')}</span>
          </button>
        </div>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          closeLabel={t('nav.close_menu')}
          className="max-h-[85dvh] gap-0 overflow-y-auto rounded-t-2xl px-3"
        >
          <SheetHeader className="flex-row items-center gap-3 px-3 pb-2 pr-12">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sky text-base font-semibold text-brand-blue-deep">
              {monogram}
            </span>
            <span className="flex min-w-0 flex-col">
              <SheetTitle className="truncate text-[15px] font-semibold text-ink">
                {studentName}
              </SheetTitle>
              <SheetDescription className="text-xs">
                {t('nav.more_title')}
              </SheetDescription>
            </span>
          </SheetHeader>

          <div className="flex flex-col pb-2">
            {overflow.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={`${sheetRowClass} ${active ? 'bg-sky text-brand-blue-deep' : ''}`}
                >
                  <Icon name={item.icon} size={20} />
                  {item.label}
                </Link>
              )
            })}

            <Link
              href="/portal/profile"
              onClick={() => setOpen(false)}
              aria-current={isActive('/portal/profile') ? 'page' : undefined}
              className={`${sheetRowClass} ${
                isActive('/portal/profile') ? 'bg-sky text-brand-blue-deep' : ''
              }`}
            >
              <Icon name="profile" size={20} />
              {t('nav.profile')}
            </Link>
          </div>

          <form action={logoutAction} className="border-t border-line py-2">
            <button
              type="submit"
              className={`${sheetRowClass} w-full text-red-600 active:bg-red-50`}
            >
              <Icon name="logout" size={20} />
              {t('nav.logout')}
            </button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
