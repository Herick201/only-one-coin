'use client'

import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import type {
  StaffMemberRow,
  StaffRole,
  StaffRoleChange,
} from '@/lib/backoffice/types'
import { requiresMfa } from '@/lib/backoffice/permissions'
import { formatDate, formatDateTime, initials, type Locale } from '@/lib/format'
import {
  Card,
  EmptyState,
  Pager,
  rowActionClass,
  StatusBadge,
  TableShell,
  tdClass,
  thClass,
  Toolbar,
  toolbarSearchClass,
} from '@/components/backoffice/ui'
import { Toast } from '@/components/backoffice/controls'
import { BoIcon } from '@/components/backoffice/icons'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { NewStaffForm, type TeacherOption } from './new-staff-form'
import { RoleChangeDialog } from './role-change-dialog'

/**
 * Accounts that still open the panel, and accounts that used to. Two tabs
 * rather than a status filter, for the same reason the teacher roster has
 * them: "who can sign in tomorrow" and "who used to" are two different
 * questions, and one of them is asked far more often than the other.
 */
type Tab = 'active' | 'inactive'

const ALL = 'all'

const PAGE_SIZE = 15

/** Every cargo an account can carry (CLAUDE.md §8). */
const ROLES: StaffRole[] = [
  'admin',
  'coordinator',
  'treasury',
  'mass_approver',
  'teacher',
]

const selectClass =
  'rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15'

/** A cargo that requires the second factor and does not have it yet. */
function mfaPending(row: StaffMemberRow): boolean {
  return requiresMfa(row.role) && !row.mfaEnrolled
}

/**
 * Team directory. Search, filters and paging run in the browser because the
 * dataset is mocked; against the real API this becomes a server query.
 *
 * Every write here is component state. The real ones are usecases in
 * `apps/api`: opening an account, and the dedicated promotion usecase that is
 * the only way a `role` ever moves — admin-only, behind fresh
 * re-authentication, and written to the append-only audit log in the same
 * transaction (CLAUDE.md §8). The browser never writes a cargo.
 */
export function TeamView({
  rows,
  roleChanges,
  teachers,
  currentUserId,
  currentUserName,
}: {
  rows: StaffMemberRow[]
  roleChanges: StaffRoleChange[]
  /** Teachers still on the roster — who an account may be opened over. */
  teachers: TeacherOption[]
  /** The signed-in admin: nobody moves their own cargo or their own door. */
  currentUserId: string
  currentUserName: string
}) {
  const t = useTranslations('bo')
  const locale = useLocale() as Locale

  const [members, setMembers] = useState<StaffMemberRow[]>(rows)
  const [ledger, setLedger] = useState<StaffRoleChange[]>(roleChanges)
  const [tab, setTab] = useState<Tab>('active')
  const [query, setQuery] = useState('')
  const [role, setRole] = useState(ALL)
  const [mfaOnly, setMfaOnly] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [creating, setCreating] = useState(false)
  const [changing, setChanging] = useState<StaffMemberRow | null>(null)
  const [removing, setRemoving] = useState<StaffMemberRow | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  /** The tab is the first cut; every filter and count below reads this list. */
  const scoped = useMemo(
    () => members.filter((row) => row.status === tab),
    [members, tab],
  )

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return scoped.filter((row) => {
      if (role !== ALL && row.role !== role) return false
      if (mfaOnly && !mfaPending(row)) return false
      if (!needle) return true
      return [`${row.firstName} ${row.lastName}`, row.email, t(`role.${row.role}`)]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
  }, [scoped, query, role, mfaOnly, t])

  const counts = useMemo(
    () => ({
      active: members.filter((row) => row.status === 'active').length,
      inactive: members.filter((row) => row.status === 'inactive').length,
    }),
    [members],
  )

  const mfaCount = useMemo(() => scoped.filter(mfaPending).length, [scoped])

  /* Only teachers who do not already hold an account: two doors for one person
     is two sessions to remember to close. Computed here rather than on the
     server so an account opened a second ago already counts. */
  const availableTeachers = useMemo(
    () =>
      teachers.filter(
        (teacher) => !members.some((row) => row.teacherId === teacher.id),
      ),
    [teachers, members],
  )

  /* Chasing a missing second factor is a question about somebody who still
     signs in. Off the tab it would filter a list on a fact that changes
     nothing — the door is already closed. */
  const onActive = tab === 'active'

  const activeFilters = (role !== ALL ? 1 : 0) + (onActive && mfaOnly ? 1 : 0)

  /** A filter that shrinks the list can leave the page behind it. */
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const pageRows = filtered.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE,
  )

  function openTab(next: Tab) {
    setTab(next)
    setPage(0)
    if (next !== 'active') setMfaOnly(false)
  }

  /**
   * The cargo moved. Locally it is one row and one ledger line; in production
   * it is one transaction — the `role` column and the `audit_log` entry
   * together, or neither (CLAUDE.md §8).
   */
  function applyRoleChange(member: StaffMemberRow, next: StaffRole) {
    setMembers((current) =>
      current.map((row) => (row.id === member.id ? { ...row, role: next } : row)),
    )
    setLedger((current) => [
      {
        id: `rol_local_${member.id}_${current.length}`,
        at: new Date().toISOString(),
        memberId: member.id,
        memberName: `${member.firstName} ${member.lastName}`,
        fromRole: member.role,
        toRole: next,
        actorName: currentUserName,
        actorRole: 'admin',
      },
      ...current,
    ])
    setChanging(null)
    setToast(t('team.changed_toast'))
  }

  function applyAccess(member: StaffMemberRow, status: StaffMemberRow['status']) {
    setMembers((current) =>
      current.map((row) => (row.id === member.id ? { ...row, status } : row)),
    )
    setRemoving(null)
    setToast(t(status === 'active' ? 'team.restored_toast' : 'team.removed_toast'))
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Not `SectionTabs`: those are real routes, and these two are one list
          cut two ways — the same page, the same filters, no URL to bookmark. */}
      <nav className="-mt-2 flex items-center gap-1 border-b border-line">
        {(['active', 'inactive'] as Tab[]).map((value) => {
          const active = tab === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => openTab(value)}
              aria-current={active ? 'page' : undefined}
              className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-semibold transition ${
                active
                  ? 'border-brand-blue text-brand-blue'
                  : 'border-transparent text-muted-foreground hover:border-line hover:text-ink'
              }`}
            >
              {t(value === 'active' ? 'team.tab_active' : 'team.tab_inactive')}
              <span className={active ? 'text-brand-blue/60' : 'text-slate-400'}>
                {counts[value]}
              </span>
            </button>
          )
        })}
      </nav>

      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <Toolbar>
          <label className={toolbarSearchClass}>
            <span className="sr-only">{t('team.search_label')}</span>
            <BoIcon
              name="search"
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(0)
              }}
              placeholder={t('team.search_placeholder')}
              className="w-full rounded-lg border border-line bg-white py-2 pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-muted-foreground focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
            />
          </label>

          <button
            type="button"
            onClick={() => setFiltersOpen(!filtersOpen)}
            aria-expanded={filtersOpen}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              activeFilters > 0 || filtersOpen
                ? 'border-brand-blue bg-sky text-brand-blue'
                : 'border-line bg-white text-muted-foreground hover:text-ink'
            }`}
          >
            <BoIcon name="filter" size={16} />
            {t('team.filters')}
            {activeFilters > 0 && (
              <span className="rounded-full bg-brand-blue px-1.5 text-xs text-white">
                {activeFilters}
              </span>
            )}
          </button>

          {!creating && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-blue-deep lg:ml-auto"
            >
              <BoIcon name="plus" size={16} />
              {t('team.new')}
            </button>
          )}
        </Toolbar>

        {filtersOpen && (
          <Card className="flex flex-wrap items-center gap-1.5 p-3">
            {onActive && (
              <button
                type="button"
                onClick={() => {
                  setMfaOnly(!mfaOnly)
                  setPage(0)
                }}
                aria-pressed={mfaOnly}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  mfaOnly
                    ? 'bg-brand-blue text-white'
                    : 'border border-line bg-white text-muted-foreground hover:bg-cream hover:text-ink'
                }`}
              >
                {t('team.filter_mfa')}
                <span className={mfaOnly ? 'text-white/70' : 'text-slate-400'}>
                  {mfaCount}
                </span>
              </button>
            )}

            {onActive && <span aria-hidden="true" className="mx-1 h-5 w-px bg-line" />}

            <label className="flex items-center gap-2">
              <span className="sr-only">{t('team.filter_role')}</span>
              <select
                value={role}
                onChange={(event) => {
                  setRole(event.target.value)
                  setPage(0)
                }}
                className={selectClass}
              >
                <option value={ALL}>{t('team.filter_role')}</option>
                {ROLES.map((item) => (
                  <option key={item} value={item}>
                    {t(`role.${item}`)}
                  </option>
                ))}
              </select>
            </label>
          </Card>
        )}
      </div>

      {creating && (
        <NewStaffForm
          teachers={availableTeachers}
          onCancel={() => setCreating(false)}
          onCreate={(member) => {
            setMembers((current) => [member, ...current])
            setLedger((current) => [
              {
                id: `rol_local_${member.id}`,
                at: new Date().toISOString(),
                memberId: member.id,
                memberName: `${member.firstName} ${member.lastName}`,
                fromRole: null,
                toRole: member.role,
                actorName: currentUserName,
                actorRole: 'admin',
              },
              ...current,
            ])
            setCreating(false)
            setTab('active')
            setPage(0)
            setToast(t('team.created_toast'))
          }}
        />
      )}

      <Card>
        {pageRows.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={scoped.length === 0 ? 'staff' : 'search'}
              title={t(
                scoped.length === 0 && !onActive
                  ? 'team.empty_inactive_title'
                  : 'team.empty_title',
              )}
              body={t(
                scoped.length === 0 && !onActive
                  ? 'team.empty_inactive_body'
                  : 'team.empty_body',
              )}
            />
          </div>
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <th className={thClass}>{t('team.col_member')}</th>
                  <th className={thClass}>{t('team.col_role')}</th>
                  <th className={thClass}>{t('team.col_access')}</th>
                  <th className={thClass}>{t('team.col_last_access')}</th>
                  {/* Off the active tab the row still ends in an action: giving
                      a door back is done from the same line it was taken. */}
                  <th className={`${thClass} text-right`}>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => {
                  const self = row.id === currentUserId
                  /* The docente cargo travels with the roster file: an account
                     is opened over a teacher record, so moving somebody into or
                     out of it here would leave the link pointing nowhere. */
                  const lockedByRoster = row.role === 'teacher'
                  return (
                    <tr key={row.id}>
                      <td className={`${tdClass} whitespace-nowrap`}>
                        <span className="flex items-center gap-2.5">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sky text-xs font-semibold text-brand-blue-deep">
                            {initials(row.firstName, row.lastName)}
                          </span>
                          <span className="flex min-w-0 flex-col leading-tight">
                            <span className="flex items-center gap-1.5">
                              <span className="font-semibold text-ink">
                                {`${row.firstName} ${row.lastName}`}
                              </span>
                              {self && (
                                <span className="rounded-full bg-cream px-1.5 py-0.5 text-[11px] font-semibold text-brand-yellow-deep">
                                  {t('team.you')}
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {row.email}
                            </span>
                            {/* The account of a docente is the roster file seen
                                from the door side — the two are one person, and
                                the panel says so instead of making somebody
                                search the other section for them. */}
                            {row.teacherId && (
                              <Link
                                href={`/backoffice/teachers/${row.teacherId}`}
                                className="mt-0.5 inline-flex w-fit items-center gap-1 text-xs font-semibold text-brand-blue transition hover:text-brand-blue-deep"
                              >
                                <BoIcon name="chevron-right" size={12} />
                                {t('team.teacher_file')}
                              </Link>
                            )}
                          </span>
                        </span>
                      </td>

                      {/* The cargo, and only the cargo: the tab above already
                          said whether the door is open, and a badge that reads
                          the same on every row of a list says nothing. */}
                      <td className={`${tdClass} whitespace-nowrap`}>
                        <span className="rounded-full bg-sky px-2 py-0.5 text-[11px] font-semibold text-brand-blue-deep">
                          {t(`role.${row.role}`)}
                        </span>
                      </td>

                      {/* The second factor is on the row, not in a file: an
                          admin without one is one password away from the whole
                          panel, and nobody opens nine accounts to find out. */}
                      <td className={`${tdClass} whitespace-nowrap`}>
                        {row.status !== 'active' ? (
                          /* A pending second factor on an account that cannot
                             sign in is not an errand — chasing it would be
                             chasing a door that is already shut. */
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : !requiresMfa(row.role) ? (
                          <span className="text-xs text-muted-foreground">
                            {t('team.mfa_optional')}
                          </span>
                        ) : row.mfaEnrolled ? (
                          <StatusBadge tone="success" label={t('team.mfa_on')} />
                        ) : (
                          <StatusBadge
                            tone="warning"
                            label={t('team.mfa_pending')}
                            title={t('team.mfa_pending_title')}
                          />
                        )}
                      </td>

                      <td className={`${tdClass} whitespace-nowrap text-xs`}>
                        {row.lastAccessAt ? (
                          <span className="text-muted-foreground">
                            {formatDateTime(row.lastAccessAt, locale)}
                          </span>
                        ) : (
                          <span className="font-semibold text-amber-700">
                            {t('team.never_accessed')}
                          </span>
                        )}
                      </td>

                      <td className={`${tdClass} whitespace-nowrap text-right`}>
                        {self ? (
                          <span
                            className="text-xs text-muted-foreground"
                            title={t('team.self_title')}
                          >
                            {t('team.self_note')}
                          </span>
                        ) : (
                          <span className="inline-flex flex-wrap items-center justify-end gap-2">
                            {!lockedByRoster && row.status === 'active' && (
                              <button
                                type="button"
                                onClick={() => setChanging(row)}
                                className={rowActionClass}
                              >
                                <BoIcon name="edit" size={14} />
                                {t('team.change_role')}
                              </button>
                            )}

                            {row.status === 'active' ? (
                              <button
                                type="button"
                                onClick={() => setRemoving(row)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-sm font-semibold text-muted-foreground transition hover:border-red-300 hover:text-red-600"
                              >
                                <BoIcon name="close" size={14} />
                                {t('team.remove_access')}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => applyAccess(row, 'active')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-sm font-semibold text-brand-blue transition hover:border-brand-blue"
                              >
                                <BoIcon name="check" size={14} />
                                {t('team.restore_access')}
                              </button>
                            )}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </TableShell>

            {/* Why the docente rows have no cargo button. Once under the
                table, not once per row: it is one rule, not eight findings. */}
            {pageRows.some((row) => row.role === 'teacher') && (
              <p className="flex items-start gap-2 border-t border-line px-4 py-3 text-xs text-muted-foreground">
                <BoIcon name="alert" size={14} className="mt-0.5 shrink-0" />
                {t('team.teacher_locked')}
              </p>
            )}

            {pageCount > 1 && (
              <Pager
                page={currentPage}
                pageCount={pageCount}
                status={t('team.page_status', {
                  from: currentPage * PAGE_SIZE + 1,
                  to: currentPage * PAGE_SIZE + pageRows.length,
                  total: filtered.length,
                })}
                prevLabel={t('team.page_prev')}
                nextLabel={t('team.page_next')}
                onChange={setPage}
              />
            )}
          </>
        )}
      </Card>

      {/* The cargo ledger. It sits under the directory because it is the answer
          to the question the directory raises — "since when does this person
          open this?" — and because a change nobody can read afterwards is a
          change nobody can question (CLAUDE.md §8). */}
      <Card className="p-5">
        <p className="text-sm font-semibold text-ink">{t('team.ledger_title')}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('team.ledger_subtitle')}
        </p>

        {ledger.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{t('team.ledger_empty')}</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {ledger.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line/70 pb-3 last:border-0 last:pb-0"
              >
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-sm font-semibold text-ink">
                    {entry.memberName}
                  </span>
                  {entry.fromRole === null ? (
                    <span className="text-xs text-muted-foreground">
                      {t('team.ledger_created', { role: t(`role.${entry.toRole}`) })}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                        {t(`role.${entry.fromRole}`)}
                      </span>
                      <BoIcon
                        name="chevron-right"
                        size={12}
                        className="text-muted-foreground"
                      />
                      <span className="rounded-full bg-sky px-2 py-0.5 font-semibold text-brand-blue-deep">
                        {t(`role.${entry.toRole}`)}
                      </span>
                    </span>
                  )}
                </span>
                <span className="flex flex-col text-right text-xs text-muted-foreground">
                  {/* With the year: this ledger runs back over ciclos, and
                      "10 de junio" three years ago reads as last week. */}
                  <span>{formatDate(entry.at, locale)}</span>
                  <span>{t('team.ledger_by', { actor: entry.actorName })}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <RoleChangeDialog
        member={changing}
        onClose={() => setChanging(null)}
        onConfirm={applyRoleChange}
      />

      {/* Taking a door away is a confirmation, not a re-authentication: it
          removes power instead of granting it, and the account survives it. */}
      <RemoveAccessDialog
        member={removing}
        onClose={() => setRemoving(null)}
        onConfirm={(member) => applyAccess(member, 'inactive')}
      />

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}

function RemoveAccessDialog({
  member,
  onClose,
  onConfirm,
}: {
  member: StaffMemberRow | null
  onClose: () => void
  onConfirm: (member: StaffMemberRow) => void
}) {
  const t = useTranslations('bo')

  return (
    <ConfirmDialog
      open={member !== null}
      title={t('team.remove_title')}
      body={
        member
          ? t('team.remove_body', { name: `${member.firstName} ${member.lastName}` })
          : ''
      }
      confirmLabel={t('team.remove_confirm')}
      cancelLabel={t('team.cancel')}
      closeLabel={t('team.change_close')}
      onClose={onClose}
      onConfirm={() => member && onConfirm(member)}
    />
  )
}

/** Local to this screen: one question, one destructive answer, one way out. */
function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  closeLabel,
  onClose,
  onConfirm,
}: {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  cancelLabel: string
  closeLabel: string
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent closeLabel={closeLabel} className="bg-white">
        <DialogHeader className="gap-2 border-b border-line p-5 pr-14">
          <DialogTitle className="text-base font-semibold text-ink">{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center justify-end gap-2 p-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-muted-foreground transition hover:text-ink"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            <BoIcon name="close" size={16} />
            {confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
