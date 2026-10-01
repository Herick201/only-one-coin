import { apiFetch } from './api-client'
import type { CourseDetail, CourseRow } from './types'

/** The API's course item; `language` is a plain name there (no languages table). */
interface ApiCourse extends Omit<CourseRow, 'language'> {
  language: string
}

/**
 * `courses.language` is catalog text ("Inglés"), not a code — so it is its own
 * id. The screen groups by it and the form offers the ones already in use.
 */
function toCourseRow(course: ApiCourse): CourseRow {
  return { ...course, language: { id: course.language, name: course.language } }
}

/**
 * `null` means the API failed — the page shows an error state, because a
 * silent empty catalog reads as data loss (same contract as listStudents).
 */
export async function listCatalogCourses(): Promise<CourseRow[] | null> {
  try {
    const response = await apiFetch('/api/v1/catalog/courses')
    if (!response.ok) return null
    const body = (await response.json()) as { items: ApiCourse[] }
    return body.items.map(toCourseRow)
  } catch {
    return null
  }
}

export async function getCatalogCourse(id: string): Promise<CourseDetail | null> {
  try {
    const response = await apiFetch(`/api/v1/catalog/courses/${encodeURIComponent(id)}`)
    if (!response.ok) return null
    const body = (await response.json()) as { course: ApiCourse; plans: CourseDetail['plans'] }
    return { course: toCourseRow(body.course), plans: body.plans }
  } catch {
    return null
  }
}
