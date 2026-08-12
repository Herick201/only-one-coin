import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

// Wrappers que respeitam o prefixo de locale (Link, redirect, etc.).
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
