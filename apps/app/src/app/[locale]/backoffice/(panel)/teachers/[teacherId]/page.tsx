import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import {
  getStaffSession,
  getTeacher,
  listCourses,
} from '@/lib/backoffice/mock-data'
import {
  canManageTeachers,
  isRestrictedToOwnClassGroups,
} from '@/lib/backoffice/permissions'
import { countryName, flagEmoji } from '@/lib/geo'
import { initials } from '@/lib/format'
import { Card, MockNotice, StatusBadge } from '@/components/backoffice/ui'
import { teacherTone } from '@/components/backoffice/status-tone'
import { BoIcon } from '@/components/backoffice/icons'
import { TeacherFile } from './teacher-file'

/**
 * One teacher's file: contact, what they are cleared to teach, when they are
 * free, and the class groups already on them.
 *
 * A teacher may open their own and nobody else's. Answering with `notFound` for
 * somebody else's id, rather than hiding a link, is the point: the id in the
 * URL is guessable, and a hidden button stops nobody (anti-IDOR, CLAUDE.md §8).
 */
export default async function TeacherDetailPage({
  params,
}: {
  params: Promise<{ locale: string; teacherId: string }>
}) {
  const { locale, teacherId } = await params
  setRequestLocale(locale)
  const t = await getTranslations('bo')

  const staff = getStaffSession()
  const restricted = isRestrictedToOwnClassGroups(staff.role)

  if (restricted && staff.teacherId !== teacherId) notFound()
  if (!restricted && !canManageTeachers(staff.role)) notFound()

  const teacher = getTeacher(teacherId)
  if (!teacher) notFound()

  const fullName = `${teacher.firstName} ${teacher.lastName}`

  /* Clearing a teacher for a language means picking from the catalog — a new
     language is a course row, never a code branch (CLAUDE.md §1). */
  const catalogue = [
    ...new Map(
      listCourses().map((course) => [course.language.id, course.language]),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="flex flex-col gap-5">
      {/* A teacher has no roster to go back to — the link would land on their
          own ficha again. */}
      {!restricted && (
        <Link
          href="/backoffice/teachers"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-muted-foreground transition hover:text-ink"
        >
          <BoIcon name="arrow-left" size={16} />
          {t('teacher_file.back_to_list')}
        </Link>
      )}

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sky text-base font-semibold text-brand-blue-deep">
              {initials(teacher.firstName, teacher.lastName)}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-tight text-ink">
                {fullName}
              </h1>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {`${flagEmoji(teacher.nationality)} ${countryName(teacher.nationality, locale)} · ${teacher.languages
                  .map((language) => language.name)
                  .join(' · ')}`}
              </p>
            </div>
          </div>
          <StatusBadge
            tone={teacherTone[teacher.status]}
            label={t(`teacher_status.${teacher.status}`)}
          />
        </div>
      </Card>

      <MockNotice label={t('common.mock_notice')} />

      <TeacherFile
        teacher={teacher}
        catalogue={catalogue}
        canEdit={canManageTeachers(staff.role)}
      />
    </div>
  )
}
