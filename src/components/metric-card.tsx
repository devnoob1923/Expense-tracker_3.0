import { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function MetricCard({
    label,
    value,
    icon,
    note,
    tone = 'default',
}: {
    label: string
    value: ReactNode
    icon: ReactNode
    note?: string
    tone?: 'default' | 'success' | 'attention'
}) {
    return (
        <div className="rounded-[1.5rem] bg-card/92 p-5 shadow-[0_24px_50px_rgba(1,27,62,0.06)] ring-1 ring-border">
            <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-primary">
                    {icon}
                </div>
            </div>
            <div className="mt-5 text-3xl font-semibold tracking-tight text-foreground">{value}</div>
            {note ? (
                <p
                    className={cn(
                        "mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                        tone === 'success' && "bg-secondary/12 text-secondary",
                        tone === 'attention' && "bg-[#3a0a0d]/10 text-[#7a3538]",
                        tone === 'default' && "bg-accent text-muted-foreground"
                    )}
                >
                    {note}
                </p>
            ) : null}
        </div>
    )
}
