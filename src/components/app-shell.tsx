import { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function AppShell({
    sidebar,
    header,
    children,
    className,
}: {
    sidebar: ReactNode
    header: ReactNode
    children: ReactNode
    className?: string
}) {
    return (
        <div className="min-h-screen bg-transparent text-foreground">
            <div className="mx-auto flex min-h-screen max-w-[1600px] gap-5 px-3 py-3 md:px-4 md:py-4">
                <aside className="hidden w-[284px] shrink-0 lg:block">
                    <div className="sticky top-0 h-[calc(100vh-2rem)] rounded-[1.75rem] bg-sidebar/90 p-4 shadow-[0_30px_60px_rgba(1,27,62,0.08)] backdrop-blur-xl">
                        {sidebar}
                    </div>
                </aside>
                <div className={cn("flex min-w-0 flex-1 flex-col gap-5", className)}>
                    <div className="sticky top-0 z-20">
                        <div className="rounded-[1.5rem] bg-popover px-4 py-4 shadow-[0_24px_60px_rgba(1,27,62,0.08)] backdrop-blur-2xl md:px-6">
                            {header}
                        </div>
                    </div>
                    <main className="flex min-w-0 flex-1 flex-col gap-5">{children}</main>
                </div>
            </div>
        </div>
    )
}
