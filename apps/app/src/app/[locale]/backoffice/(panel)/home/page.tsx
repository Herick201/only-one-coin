import {
  AlertTriangle,
  Armchair,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  ClipboardList,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  Mail,
  Settings,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import {
  getDashboardMetrics,
  getReviewQueue,
  getSeatWatch,
  getStaffSession,
} from '@/lib/backoffice/mock-data'
import { formatDate, formatDateTime, formatMoney, type Locale } from '@/lib/format'
import { reviewFlagTone, seatPressureTone } from '@/components/backoffice/status-tone'
import { StatusPill, toneBar } from '@/components/backoffice/status-pill'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

/**
 * Backoffice home. Two jobs: surface what needs a human right now (the receipt
 * review queue and seat pressure — CLAUDE.md §5) and give one door per module.
 * Every number comes from the mock source; no backend is wired yet.
 */
export default async function BackofficeHomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const locale = raw as Locale
  setRequestLocale(raw)
  const t = await getTranslations('bo')

  const staff = getStaffSession()
  const metrics = getDashboardMetrics()
  const queue = getReviewQueue()
  const seats = getSeatWatch()

  const seatPct = Math.round((metrics.seatsTaken / metrics.seatsCapacity) * 100)

  const stats: {
    label: string
    value: string
    hint: string
    icon: LucideIcon
    accent: string
  }[] = [
    {
      label: t('dashboard.metric_enrollments_today'),
      value: String(metrics.enrollmentsToday),
      hint: t('dashboard.metric_delta', { value: metrics.enrollmentsTodayDelta }),
      icon: ClipboardList,
      accent: 'bg-sky text-brand-blue',
    },
    {
      label: t('dashboard.metric_pending_review'),
      value: String(metrics.pendingReview),
      hint: t('dashboard.metric_oldest', { hours: metrics.oldestPendingHours }),
      icon: AlertTriangle,
      accent: 'bg-amber-50 text-amber-600',
    },
    {
      label: t('dashboard.metric_active_students'),
      value: String(metrics.activeStudents),
      hint: t('dashboard.metric_delta', { value: metrics.activeStudentsDelta }),
      icon: Users,
      accent: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: t('dashboard.metric_seats'),
      value: `${seatPct}%`,
      hint: t('dashboard.metric_seats_hint', {
        taken: metrics.seatsTaken,
        capacity: metrics.seatsCapacity,
      }),
      icon: Armchair,
      accent: 'bg-cream text-brand-yellow-deep',
    },
  ]

  const modules: {
    href: string
    label: string
    body: string
    icon: LucideIcon
    ready?: boolean
  }[] = [
    {
      href: '/backoffice/students',
      label: t('nav.students'),
      body: t('modules.students'),
      icon: Users,
      ready: true,
    },
    {
      href: '/backoffice/enrollments',
      label: t('nav.enrollments'),
      body: t('modules.enrollments'),
      icon: ClipboardList,
    },
    {
      href: '/backoffice/payments',
      label: t('nav.payments'),
      body: t('modules.payments'),
      icon: CreditCard,
      ready: true,
    },
    {
      href: '/backoffice/courses',
      label: t('nav.courses'),
      body: t('modules.courses'),
      icon: BookOpen,
    },
    {
      href: '/backoffice/teachers',
      label: t('nav.teachers'),
      body: t('modules.teachers'),
      icon: GraduationCap,
    },
    {
      href: '/backoffice/emails',
      label: t('nav.email'),
      body: t('modules.email'),
      icon: Mail,
    },
    {
      href: '/backoffice/reports',
      label: t('nav.reports'),
      body: t('modules.reports'),
      icon: BarChart3,
    },
    {
      href: '/backoffice/team',
      label: t('nav.staff'),
      body: t('modules.staff'),
      icon: UserCog,
    },
    {
      href: '/backoffice/settings',
      label: t('nav.settings'),
      body: t('modules.settings'),
      icon: Settings,
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {t('dashboard.greeting', { name: staff.firstName })}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
      </header>

      <p className="flex items-start gap-2 rounded-lg border border-dashed border-border bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
        {t('common.mock_notice')}
      </p>

      {/* Headline numbers */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, hint, icon: Icon, accent }) => (
          <Card key={label} className="gap-0 py-4">
            <CardContent className="flex items-start justify-between gap-3 px-4">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1.5 text-3xl font-semibold tracking-tight text-foreground">
                  {value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
              </div>
              <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${accent}`}>
                <Icon className="size-4.5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Human review queue — the core of the backoffice (CLAUDE.md §5). */}
      <section>
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <AlertTriangle className="size-4 text-amber-500" />
                {t('review.title')}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('review.subtitle')}
              </p>
            </div>
            {/* Contador e porta são a mesma coisa: o número é o que chama, a
                seta diz que dá pra ir. */}
            <Button asChild size="lg" className="shrink-0 font-semibold">
              <Link href="/backoffice/payments/review" aria-label={t('review.see_all')}>
                {t('review.pending_count', { count: metrics.pendingReview })}
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </CardHeader>

          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">{t('review.col_student')}</TableHead>
                    <TableHead>{t('review.col_course')}</TableHead>
                    <TableHead>{t('review.col_amount')}</TableHead>
                    <TableHead>{t('review.col_flag')}</TableHead>
                    <TableHead>{t('review.col_extraction')}</TableHead>
                    <TableHead>{t('review.col_submitted')}</TableHead>
                    <TableHead className="pr-5 text-right">
                      <span className="sr-only">{t('common.actions')}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue.map((item) => {
                    const mismatch = item.amountCents !== item.expectedAmountCents
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="whitespace-nowrap pl-5 font-medium">
                          {item.studentName}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {item.courseName}
                        </TableCell>
                        <TableCell>
                          <span className="flex flex-col leading-tight">
                            <span
                              className={`font-semibold tabular-nums ${
                                mismatch ? 'text-destructive' : ''
                              }`}
                            >
                              {formatMoney(item.amountCents, 'PEN', locale)}
                            </span>
                            {mismatch && (
                              <span className="text-xs text-muted-foreground">
                                {t('review.expected', {
                                  amount: formatMoney(
                                    item.expectedAmountCents,
                                    'PEN',
                                    locale,
                                  ),
                                })}
                              </span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusPill
                            tone={reviewFlagTone[item.flag]}
                            label={t(`review_flag.${item.flag}`)}
                          />
                        </TableCell>
                        <TableCell>
                          <span className="flex flex-col leading-tight text-xs text-muted-foreground">
                            <span>{t('review.tier', { tier: item.tier })}</span>
                            <span>
                              {t('review.confidence', {
                                value: Math.round(item.confidence * 100),
                              })}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatDateTime(item.submittedAt, locale)}
                        </TableCell>
                        <TableCell className="pr-5 text-right">
                          <Button asChild variant="outline" size="sm">
                            <Link
                              href={`/backoffice/students/${item.studentId}`}
                              className="font-semibold text-primary"
                            >
                              {t('review.open_file')}
                              <ArrowUpRight data-icon="inline-end" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* The door to the queue is the counter in the header — one per
                card, or the eye stops trusting either. */}
            <div className="border-t border-border px-5 py-3">
              <p className="text-xs text-muted-foreground">
                {t('review.showing', {
                  shown: queue.length,
                  total: metrics.pendingReview,
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Seat pressure per class group. */}
      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Armchair className="size-4 text-brand-blue" />
              {t('seats.title')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('seats.subtitle')}</p>
          </div>
          {/* A lista mostra só as aulas mais cheias; a porta pro resto fica aqui. */}
          <Link
            href="/backoffice/courses"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition hover:underline"
          >
            {t('seats.see_all')}
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {seats.map((group) => {
            const tone = seatPressureTone(group.seatsTaken, group.capacity)
            const full = group.seatsTaken >= group.capacity
            const pct = Math.round((group.seatsTaken / group.capacity) * 100)
            return (
              <Card key={group.id} className="gap-0 py-4">
                <CardContent className="px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{group.courseName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {group.classGroupName}
                      </p>
                    </div>
                    <StatusPill
                      tone={tone}
                      dot={false}
                      label={
                        full
                          ? t('seats.full')
                          : t('seats.available', {
                              count: group.capacity - group.seatsTaken,
                            })
                      }
                    />
                  </div>
                  <Progress
                    value={pct}
                    className="mt-3 h-1.5 bg-secondary"
                    indicatorClassName={toneBar[tone]}
                  />
                  <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {t('seats.taken', {
                        taken: group.seatsTaken,
                        capacity: group.capacity,
                      })}
                    </span>
                    <span>
                      {t('seats.starts', { date: formatDate(group.startDate, locale) })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Module doors — everything the backoffice will manage. */}
      <section>
        <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-foreground">
          <LayoutDashboard className="size-4 text-brand-blue" />
          {t('modules.title')}
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">{t('modules.subtitle')}</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map(({ href, label, body, icon: Icon, ready }) => {
            const inner = (
              <>
                <div className="flex items-center gap-2.5">
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-lg ${
                      ready ? 'bg-sky text-brand-blue' : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    <Icon className="size-4.5" />
                  </span>
                  <span className="flex-1 text-sm font-semibold">{label}</span>
                  {ready ? (
                    <ArrowUpRight className="size-4 text-muted-foreground" />
                  ) : (
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-semibold uppercase tracking-wide"
                    >
                      {t('nav.soon')}
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </>
            )
            return ready ? (
              <Link
                key={href}
                href={href}
                className="rounded-xl border border-border bg-card p-4 shadow-card transition hover:border-primary/40"
              >
                {inner}
              </Link>
            ) : (
              <div
                key={href}
                className="rounded-xl border border-dashed border-border bg-card/60 p-4"
              >
                {inner}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
