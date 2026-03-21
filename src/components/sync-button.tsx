'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCcw } from 'lucide-react'
import { syncExpenses } from '@/app/actions/expenses'

export function SyncButton() {
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<string | null>(null)

    const handleSync = async () => {
        setLoading(true)
        setStatus(null)
        try {
            const result = await syncExpenses()
            setStatus(result.message)
            // refresh page to show new data
            if (result.count > 0) {
                window.location.reload()
            } else {
                setTimeout(() => setStatus(null), 3000)
            }
        } catch (err: any) {
            console.error(err)
            const message = err.message || 'Error syncing emails.'
            if (message.includes('missing_service_key')) {
                setStatus('Configuration Error: SUPABASE_SERVICE_ROLE_KEY is missing.')
            } else {
                setStatus(message)
            }
            setTimeout(() => setStatus(null), 5000)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col items-end">
            <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex gap-2"
                onClick={handleSync}
                disabled={loading}
            >
                <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Syncing...' : 'Sync Emails'}
            </Button>
            <Button
                size="icon"
                variant="outline"
                className="sm:hidden border-slate-200"
                onClick={handleSync}
                disabled={loading}
            >
                <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {status && (
                <span className="absolute top-20 right-6 max-w-xs rounded-2xl bg-card/95 px-3 py-2 text-xs font-medium text-muted-foreground shadow-[0_18px_40px_rgba(1,27,62,0.08)] ring-1 ring-border animate-in fade-in slide-in-from-top-2">
                    {status}
                </span>
            )}
        </div>
    )
}
