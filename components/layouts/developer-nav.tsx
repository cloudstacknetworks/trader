'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Bug, FileText, ListChecks } from 'lucide-react'

interface DeveloperNavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description?: string
}

const defaultNavItems: DeveloperNavItem[] = [
  {
    name: 'Feature Notes',
    href: '/dashboard/developer/features',
    icon: FileText,
    description: 'View release notes and feature updates'
  },
  {
    name: 'Report Bug',
    href: '/dashboard/bugs/new',
    icon: Bug,
    description: 'Submit a new bug report'
  },
  {
    name: 'Bug Reports',
    href: '/dashboard/bugs',
    icon: ListChecks,
    description: 'View all bug reports'
  }
]

interface DeveloperNavProps {
  /**
   * Custom navigation items. If not provided, uses default items.
   */
  items?: DeveloperNavItem[]
  /**
   * Custom class name for the container
   */
  className?: string
  /**
   * Render as a dropdown menu (for mobile) or list (for sidebar)
   */
  variant?: 'list' | 'dropdown'
}

/**
 * DeveloperNav - Shared navigation component for developer-related features
 * 
 * This component provides standardized navigation for:
 * - Feature Notes
 * - Report Bug
 * - Bug Reports
 * 
 * @example
 * // Use in a sidebar
 * <DeveloperNav variant="list" />
 * 
 * @example
 * // Use with custom items
 * <DeveloperNav items={customItems} />
 */
export function DeveloperNav({ 
  items = defaultNavItems, 
  className,
  variant = 'list'
}: DeveloperNavProps) {
  const pathname = usePathname()

  if (variant === 'list') {
    return (
      <div className={cn('space-y-1', className)}>
        {items.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href)
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent',
                isActive
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title={item.description}
            >
              <Icon className="h-4 w-4" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </div>
    )
  }

  // Dropdown variant (future enhancement for mobile)
  return null
}

export type { DeveloperNavItem, DeveloperNavProps }
