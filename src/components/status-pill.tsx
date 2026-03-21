import { cn } from '@/lib/utils'

export function StatusPill({
    children,
    tone = 'default',
}: {
    children: React.ReactNode
    tone?: 'default' | 'success' | 'attention'
}) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                tone === 'default' && "bg-accent text-primary",
                tone === 'success' && "bg-secondary/12 text-secondary",
                tone === 'attention' && "bg-[#3a0a0d]/10 text-[#7a3538]"
            )}
        >
            {children}
        </span>
    )
}
