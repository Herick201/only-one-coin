import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getTeacher, listCourses } from '@/lib/backoffice/mock-data'
import { getTeacherSession } from '@/lib/backoffice/session'
import { EmptyState, PageHeader } from '@/components/backoffice/ui'
import { TeacherFile } from '../../../backoffice/(panel)/(gated)/teachers/[teacherId]/teacher-file'

/**
 * The teacher's own ficha, read-only: contact, languages, availability and the
 * class groups on them. The id comes from the session, never from the URL —
 * there is no id in this address to guess (anti-IDOR, CLAUDE.md §8). Editing
 * the ficha is coordination's, in the backoffice.
 */
export default async function TeacherProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const staff = await getTeacherSession()
  const teacher = getTeacher(staff.teacherId)

  /* An account with the teacher role but no ficha behind it yet — the roster
     is filled by coordination. Saying so beats a 404 on the reader's own page. */
  if (!teacher) {
    const t = await getTranslations('bo')
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title={t('nav.my_profile')} />
        <EmptyState
          icon="teachers"
          title={t('teacher_portal.no_file_title')}
          body={t('teacher_portal.no_file_body')}
        />
      </div>
    )
  }

  const catalogue = [
    ...new Map(
      listCourses().map((course) => [course.language.id, course.language]),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="flex flex-col gap-5">
      <TeacherFile
        teacher={teacher}
        catalogue={catalogue}
        canEdit={false}
        classGroupBase="/docente/class-groups"
      />
    </div>
  )
}
