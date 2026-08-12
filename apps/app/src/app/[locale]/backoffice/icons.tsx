import type { SVGProps } from 'react'

/**
 * Minimal inline icons scoped to the backoffice — stroke-based, currentColor, so
 * the parent's text color drives them. Kept local (not a shared icon set) to
 * avoid coupling the backoffice to other frontend work.
 */
function Svg({ size = 20, children, ...props }: { size?: number } & SVGProps<SVGSVGElement>) {
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
      {children}
    </svg>
  )
}

export function ShieldIcon(props: { size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6zM9 12l2 2 4-4" />
    </Svg>
  )
}

export function ArrowLeftIcon(props: { size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M19 12H5m0 0 6-6m-6 6 6 6" />
    </Svg>
  )
}
