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
  | 'lock'
  | 'bell'
  | 'card'
  | 'clipboard'
  | 'upload'
  | 'trash'
  | 'alert'
  | 'check'
  | 'freeze'
  | 'star'

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
  lock: (
    <path d="M8 11V8a4 4 0 0 1 8 0v3M6 11h12v9H6zM12 14.5v2" />
  ),
  bell: (
    <path d="M6 9.5a6 6 0 0 1 12 0c0 4.5 1.5 5.5 2 6H4c.5-.5 2-1.5 2-6ZM10 19.5a2 2 0 0 0 4 0" />
  ),
  card: (
    <path d="M3 6h18v12H3zM3 10h18M6 14.5h5" />
  ),
  clipboard: (
    <path d="M9 4h6v3H9zM9 4H7a1 1 0 0 0-1 1v15h12V5a1 1 0 0 0-1-1h-2M9.5 11.5h5M9.5 15.5h3.5" />
  ),
  upload: (
    <path d="M12 15V4m0 0 4 4m-4-4L8 8M5 19h14" />
  ),
  trash: (
    <path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13M10 11v5M14 11v5" />
  ),
  alert: (
    <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 8v5m0 3v.01" />
  ),
  check: <path d="m5 13 4 4L19 7" />,
  freeze: (
    <path d="M12 3v18M12 3l-2 2m2-2 2 2M12 21l-2-2m2 2 2-2M4.2 7.5l15.6 9M4.2 16.5l15.6-9" />
  ),
  star: (
    <path d="m12 4 2.35 4.76 5.25.76-3.8 3.7.9 5.23L12 16l-4.7 2.45.9-5.23-3.8-3.7 5.25-.76z" />
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
