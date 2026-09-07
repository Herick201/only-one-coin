'use client'

import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import type { StaffMemberRow, StaffRole } from '@/lib/backoffice/types'
import { formatDate, formatDateTime, initials, type Locale } from '@/lib/format'
import {
  Card,
  EmptyState,
  Field,
  Pager,
  rowActionClass,
  StatusBadge,
  Toolbar,
  toolbarSearchClass,
} from '@/components/backoffice/ui'
import { Toast } from '@/components/backoffice/controls'
import { BoIcon } from '@/components/backoffice/icons'
import { tabClass, tabStripClass } from '@/components/backoffice/tab-strip'
import { FiltersDropdown } from '@/components/backoffice/filters-dropdown'
import { AutoGrid } from '@/components/layout/auto-grid'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { NewStaffDialog, type TeacherOption } from './new-staff-dialog'
import { EditStaffDialog, type StaffEdit } from './edit-staff-dialog'

/**
 * Accounts that still open the panel, and accounts that used to. Two tabs
 * rather than a status filter, for the same reason the teacher roster has
 * them: "who can sign in tomorrow" and "who used to" are two different
 * questions, and one of them is asked far more often than the other.
 */
type Tab = 'active' | 'inactive'

const ALL = 'all'

const PAGE_SIZE = 15

/** Every cargo an account can carry (owner's map — `lib/backoffice/permissions.ts`). */
const ROLES: StaffRole[] = [
  'master',
  'admin',
  'analyst',
  'enrollment_supervisor',
  'academic_supervisor',
  'teacher',
  'sales',
  'support',
  'billing',
]

const selectClass =
  'rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15'

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
  teachers,
  currentUserId,
  currentUserName,
}: {
  rows: StaffMemberRow[]
  /** Teachers still on the roster — who an account may be opened over. */
  teachers: TeacherOption[]
  /** The signed-in admin: nobody moves their own cargo or their own door. */
  currentUserId: string
  currentUserName: string
}) {
  const t = useTranslations('bo')
  const locale = useLocale() as Locale

  const [members, setMembers] = useState<StaffMemberRow[]>(rows)
  const [tab, setTab] = useState<Tab>('active')
  const [query, setQuery] = useState('')
  const [role, setRole] = useState(ALL)
  const [page, setPage] = useState(0)
  const [creating, setCreating] = useState(false)
  /** The one person folded open in the list — an accordion, one at a time. */
  const [openId, setOpenId] = useState<string | null>(null)
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
      if (!needle) return true
      return [`${row.firstName} ${row.lastName}`, row.email, t(`role.${row.role}`)]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
  }, [scoped, query, role, t])

  const counts = useMemo(
    () => ({
      active: members.filter((row) => row.status === 'active').length,
      inactive: members.filter((row) => row.status === 'inactive').length,
    }),
    [members],
  )

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

  const onActive = tab === 'active'

  const activeFilters = role !== ALL ? 1 : 0

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
  }

  /**
   * The account changed. Locally it is one row; in production it is one
   * transaction — the row and the `audit_log` entry together, or neither, and
   * the `role` column only ever moves through the dedicated promotion usecase
   * (CLAUDE.md §8).
   */
  function applyEdit(member: StaffMemberRow, edit: StaffEdit) {
    setMembers((current) =>
      current.map((row) => (row.id === member.id ? { ...row, ...edit } : row)),
    )
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
      <nav className={tabStripClass}>
        {(['active', 'inactive'] as Tab[]).map((value) => {
          const active = tab === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => openTab(value)}
              aria-current={active ? 'page' : undefined}
              className={tabClass(active)}
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

          <FiltersDropdown
            label={t('team.filters')}
            count={activeFilters}
            panelClassName="flex-wrap items-center gap-1.5"
          >
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
          </FiltersDropdown>

          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-blue-deep lg:ml-auto"
          >
            <BoIcon name="plus" size={16} />
            {t('team.new')}
          </button>
        </Toolbar>

      </div>

      <NewStaffDialog
        open={creating}
        teachers={availableTeachers}
        onClose={() => setCreating(false)}
        onCreate={(member) => {
          setMembers((current) => [member, ...current])
          setCreating(false)
          setTab('active')
          setPage(0)
          setToast(t('team.created_toast'))
        }}
      />

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
            {/* One row per person, and the row is the control: everything the
                table used to spread over columns lives inside the person's own
                dropdown — the facts on top, the actions under them. */}
            <ul className="divide-y divide-line">
              {pageRows.map((row) => {
                  const self = row.id === currentUserId
                  /* The docente cargo travels with the roster file: an account
                     is opened over a teacher record, so moving somebody into or
                     out of it here would leave the link pointing nowhere. */
                  const lockedByRoster = row.role === 'teacher'
                  const open = openId === row.id
                  return (
                    <li key={row.id}>
                      {/* The row is the handle: it folds the person open in
                          place, pushing the list down — never a floating menu
                          covering the neighbours. */}
                      <button
                        type="button"
                        onClick={() => setOpenId(open ? null : row.id)}
                        aria-expanded={open}
                        className="flex min-h-tap w-full items-center gap-2.5 px-4 py-3 text-left transition hover:bg-sky-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue/40 aria-expanded:bg-sky-soft"
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sky text-xs font-semibold text-brand-blue-deep">
                          {initials(row.firstName, row.lastName)}
                        </span>
                        <span className="flex min-w-0 flex-1 items-center gap-1.5">
                          <span className="truncate font-semibold text-ink">
                            {`${row.firstName} ${row.lastName}`}
                          </span>
                          {self && (
                            <span className="rounded-full bg-cream px-1.5 py-0.5 text-[11px] font-semibold text-brand-yellow-deep">
                              {t('team.you')}
                            </span>
                          )}
                        </span>
                        <BoIcon
                          name="chevron-down"
                          size={14}
                          className={`shrink-0 text-muted-foreground transition-transform ${
                            open ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {open && (
                        <div className="border-t border-line/70 px-4 py-4">
                          {/* The person's facts first, read-only … */}
                          <AutoGrid as="dl" min="13rem">
                            <Field label={t('team.full_name')}>
                              {`${row.firstName} ${row.lastName}`}
                            </Field>
                            <Field label={t('team.field_email')} wrap>
                              {row.email}
                            </Field>
                            <Field label={t('team.field_phone')}>
                              {row.phone}
                            </Field>
                            <Field label={t('team.col_role')}>
                              {t(`role.${row.role}`)}
                            </Field>
                            <Field label={t('team.joined_at')}>
                              {formatDate(row.joinedAt, locale)}
                            </Field>
                            <Field label={t('team.col_last_access')}>
                              {row.lastAccessAt ? (
                                formatDateTime(row.lastAccessAt, locale)
                              ) : (
                                <span className="text-amber-700">
                                  {t('team.never_accessed')}
                                </span>
                              )}
                            </Field>
                          </AutoGrid>

                          {/* The account of a docente is the roster file seen
                              from the door side — the two are one person, and
                              the panel says so instead of making somebody
                              search the other section for them. */}
                          {row.teacherId && (
                            <Link
                              href={`/backoffice/teachers/${row.teacherId}`}
                              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-blue transition hover:text-brand-blue-deep"
                            >
                              <BoIcon name="chevron-right" size={12} />
                              {t('team.teacher_file')}
                            </Link>
                          )}

                          {/* … then what can be done to them. Never to oneself:
                              nobody moves their own cargo or their own door. */}
                          {self ? (
                            <p
                              className="mt-4 text-xs text-muted-foreground"
                              title={t('team.self_title')}
                            >
                              {t('team.self_note')}
                            </p>
                          ) : (
                            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
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
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-sm font-semibold text-red-600 transition hover:border-red-400 hover:bg-red-50"
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
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
            </ul>

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

      <EditStaffDialog
        member={changing}
        onClose={() => setChanging(null)}
        onConfirm={applyEdit}
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
