
'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Home,
  Eye,
  BarChart3,
  History,
  Settings,
  Menu,
  X,
  LogOut,
  User,
  Filter,
  TrendingUp,
  Search,
  Beaker,
  Calendar,
  BookOpen,
  ChevronDown,
  Hash,
  Copy,
  Check
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { NotificationCenter } from '@/components/notification-center'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BUILD_INFO } from '@/lib/build-info'
import { DeveloperNav } from '@/components/layouts/developer-nav'

interface DashboardLayoutProps {
  children: React.ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Market', href: '/dashboard/market', icon: Search },
  { name: 'Screens', href: '/dashboard/screens', icon: Filter },
  { name: 'Watchlist', href: '/dashboard/watchlist', icon: Eye },
  { name: 'Earnings Calendar', href: '/dashboard/earnings', icon: Calendar },
  { name: 'Positions', href: '/dashboard/positions', icon: BarChart3 },
  { name: 'Trade History', href: '/dashboard/trades', icon: History },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Backtesting', href: '/dashboard/backtesting', icon: TrendingUp },
  { name: 'Paper Trading Lab', href: '/dashboard/paper-trading', icon: Beaker },
  { name: 'User Guide', href: '/dashboard/user-guide', icon: BookOpen },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [buildCopied, setBuildCopied] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession() || {}

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' })
  }

  const handleCopyBuildNumber = async () => {
    try {
      await navigator.clipboard.writeText(`Build ${BUILD_INFO.version}`)
      setBuildCopied(true)
      setTimeout(() => setBuildCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy build number:', err)
    }
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Mobile sidebar */}
      <div className={cn(
        'fixed inset-0 flex z-40 md:hidden',
        sidebarOpen ? 'block' : 'hidden'
      )}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full pt-5 pb-4 bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="flex-shrink-0 flex items-center px-4">
            <div className="flex flex-col items-center w-full">
              <Image 
                src="/cloudstack-logo.png" 
                alt="CloudStack" 
                width={48} 
                height={48}
                className="mb-1"
              />
              <span className="text-xl font-bold text-gray-900">News Trader</span>
            </div>
          </div>
          <div className="mt-5 flex-1 h-0 overflow-y-auto">
            <nav className="px-2 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      pathname === item.href
                        ? 'bg-blue-100 text-blue-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                      'group flex items-center px-2 py-2 text-base font-medium rounded-md'
                    )}
                  >
                    <Icon className="mr-4 flex-shrink-0 h-6 w-6" />
                    {item.name}
                  </Link>
                )
              })}
              
              {/* Developer Section */}
              <div className="pt-4 mt-4 border-t border-gray-200">
                <DeveloperNav variant="list" className="space-y-1" />
              </div>
            </nav>
          </div>
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col flex-grow pt-5 bg-white overflow-y-auto border-r border-gray-200">
            <div className="flex flex-col items-center flex-shrink-0 px-4 w-full">
              <Image 
                src="/cloudstack-logo.png" 
                alt="CloudStack" 
                width={48} 
                height={48}
                className="mb-1"
              />
              <span className="text-xl font-bold text-gray-900">News Trader</span>
            </div>
            <div className="mt-5 flex-grow flex flex-col">
              <nav className="flex-1 px-2 pb-4 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        pathname === item.href
                          ? 'bg-blue-100 text-blue-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                        'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                      )}
                    >
                      <Icon className="mr-3 flex-shrink-0 h-5 w-5" />
                      {item.name}
                    </Link>
                  )
                })}
                
                {/* Developer Section */}
                <div className="pt-4 mt-4 border-t border-gray-200">
                  <DeveloperNav variant="list" className="space-y-1" />
                </div>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Top nav */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow border-b border-gray-200">
          <button
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex">
              <div className="w-full flex md:ml-0">
                <div className="relative w-full text-gray-400 focus-within:text-gray-600 flex items-center">
                  <h1 className="text-2xl font-semibold text-gray-900">
                    Automated Trading Dashboard
                  </h1>
                </div>
              </div>
            </div>
            <div className="ml-4 flex items-center md:ml-6">
              <div className="flex items-center space-x-4">
                <NotificationCenter />
                <ThemeToggle />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-2"
                    >
                      <User className="h-4 w-4" />
                      <span className="max-w-[150px] truncate">
                        {session?.user?.name || session?.user?.email}
                      </span>
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {session?.user?.name || 'User'}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {session?.user?.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleCopyBuildNumber} className="cursor-pointer">
                      <Hash className="mr-2 h-4 w-4" />
                      <span className="text-xs flex-1">
                        Build {BUILD_INFO.version}
                      </span>
                      {buildCopied ? (
                        <Check className="ml-2 h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="ml-2 h-3 w-3 opacity-50" />
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
