import { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function SectionPanel({
    title,
    description,
    action,
    children,
    className,
}: {
    title: string
    description?: string
    action?: ReactNode
    children: ReactNode
    className?: string
}) {
    return (
        <section className={cn("rounded-[1.75rem] bg-card/92 shadow-[0_24px_50px_rgba(1,27,62,0.06)] ring-1 ring-border", className)}>
            <div className="flex flex-col gap-3 border-b border-border/50 px-6 py-5 md:flex-row md:items-end md:justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-foreground">{title}</h2>
                    {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
                </div>
                {action ? <div>{action}</div> : null}
            </div>
            <div className="px-6 py-5">{children}</div>
        </section>
    )
}
