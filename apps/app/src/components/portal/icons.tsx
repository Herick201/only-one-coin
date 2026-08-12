import type { ReactElement, SVGProps } from 'react'

/**
 * Small inline icon set (no icon library). Stroke-based, currentColor, so a
 * parent's text color drives them. Names map to portal nav + content sections.
 */

export type IconName =
  | 'home'
  | 'courses'
  | 'enrollment'
  | 'documents'
  | 'profile'
  | 'logout'
  | 'video'
  | 'calendar'
  | 'clock'
  | 'arrow-right'
  | 'arrow-left'
  | 'external'
  | 'download'
  | 'doc'
  | 'audio'
  | 'shield'
  | 'chevron-right'
  | 'seat'

const paths: Record<IconName, ReactElement> = {
  home: (
    <path d="M3 10.5 12 4l9 6.5M5 9.5V20h14V9.5" />
  ),
  courses: (
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v14H5.5A1.5 1.5 0 0 0 4 19.5zM19 18v2H6" />
  ),
  enrollment: (
    <path d="M4 5h16v6a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4zM9 9h6M9 13h4" />
  ),
  documents: (
    <path d="M7 3h7l4 4v14H7zM14 3v4h4M10 13h5M10 17h5" />
  ),
  profile: (
    <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 20a7 7 0 0 1 14 0" />
  ),
  logout: (
    <path d="M15 12H4m0 0 3.5-3.5M4 12l3.5 3.5M10 5h9v14h-9" />
  ),
  video: (
    <path d="M3 7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM15 10l6-3v10l-6-3z" />
  ),
  calendar: (
    <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14H4zM4 9h16M8 3v4M16 3v4" />
  ),
  clock: (
    <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2" />
  ),
  'arrow-right': <path d="M5 12h14m0 0-6-6m6 6-6 6" />,
  'arrow-left': <path d="M19 12H5m0 0 6-6m-6 6 6 6" />,
  external: (
    <path d="M14 5h5v5M19 5l-8 8M12 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6" />
  ),
  download: (
    <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" />
  ),
  doc: (
    <path d="M7 3h7l4 4v14H7zM14 3v4h4" />
  ),
  audio: (
    <path d="M11 5 6 9H3v6h3l5 4zM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12" />
  ),
  shield: (
    <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6zM9 12l2 2 4-4" />
  ),
  'chevron-right': <path d="m9 6 6 6-6 6" />,
  seat: (
    <path d="M6 10V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4M5 10h14v6H5zM7 16v3M17 16v3" />
  ),
}

export function Icon({
  name,
  size = 20,
  ...props
}: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  )
}
