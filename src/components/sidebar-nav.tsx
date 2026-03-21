import Link from 'next/link'
import { Activity, CalendarRange, CreditCard, LayoutDashboard, Mail, ReceiptText } from 'lucide-react'

import { cn } from '@/lib/utils'

const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
    { label: 'Email Sync', icon: Mail, href: '/' },
    { label: 'Transactions', icon: ReceiptText, href: '/transactions' },
    { label: 'Insights', icon: Activity, href: '/' },
]

export function SidebarNav({ currentPath = '/' }: { currentPath?: string }) {
    return (
        <div className="flex h-full flex-col">
            <div className="px-3 pb-8 pt-2">
                <p className="text-[0.72rem] font-medium uppercase tracking-[0.28em] text-muted-foreground">Lexicon Finance</p>
                <h1 className="mt-3 text-2xl font-semibold text-primary">Executive Ledger</h1>
                <p className="mt-3 text-sm text-muted-foreground">
                    A calm command center for intelligent spending, inbox ingestion, and financial rhythm.
                </p>
            </div>
            <nav className="space-y-1.5">
                {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = item.href === currentPath
                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-primary text-primary-foreground shadow-[0_24px_50px_rgba(1,27,62,0.2)]"
                                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                        </Link>
                    )
                })}
            </nav>
            <div className="mt-auto space-y-3 rounded-[1.5rem] bg-card/85 p-4 shadow-[0_18px_40px_rgba(1,27,62,0.06)]">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground">
                        ET
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-foreground">Expense Tracker</p>
                        <p className="text-xs text-muted-foreground">Premium executive mode</p>
                    </div>
                </div>
                <div className="grid gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <CalendarRange className="h-3.5 w-3.5" />
                        <span>Daily intelligence, quiet by design</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>Structured transaction analytics</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
