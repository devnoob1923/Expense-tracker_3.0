'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const AUTO_SYNC_INTERVAL_MS = 120000

export function AutoSync() {
    const router = useRouter()
    const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
    const [lastStatus, setLastStatus] = useState<string>('Initializing auto sync...')
    const syncInFlightRef = useRef(false)

    useEffect(() => {
        let cancelled = false

        const runSync = async () => {
            if (cancelled || syncInFlightRef.current || document.visibilityState !== 'visible') {
                if (!cancelled && document.visibilityState !== 'visible') {
                    setLastStatus('Paused while tab is not visible')
                }
                return
            }

            syncInFlightRef.current = true
            setLastStatus('Checking Gmail for new transactions...')

            try {
                const response = await fetch('/api/auto-sync', {
                    method: 'POST',
                    cache: 'no-store',
                })
                const result = await response.json()
                if (cancelled) return

                if (!response.ok) {
                    throw new Error(result.error || 'Auto sync failed')
                }

                setLastSyncedAt(new Date().toLocaleTimeString())
                setLastStatus(result.message)

                router.refresh()
            } catch (error: any) {
                if (cancelled) return
                setLastStatus(error?.message || 'Auto sync failed')
            } finally {
                syncInFlightRef.current = false
            }
        }

        setLastStatus(document.visibilityState === 'visible' ? 'Auto sync ready' : 'Paused while tab is not visible')
        void runSync()

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                void runSync()
            } else {
                setLastStatus('Paused while tab is not visible')
            }
        }

        const intervalId = window.setInterval(runSync, AUTO_SYNC_INTERVAL_MS)
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            cancelled = true
            window.clearInterval(intervalId)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [router])

    return (
        <div className="rounded-[1.75rem] bg-card/92 p-5 shadow-[0_24px_50px_rgba(1,27,62,0.06)] ring-1 ring-border">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-medium text-foreground">Auto Sync</p>
                    <p className="text-xs text-muted-foreground">
                        While this page is open, Gmail sync runs every 2 minutes.
                    </p>
                </div>
                <span className="rounded-full bg-secondary/12 px-2.5 py-1 text-xs font-medium text-secondary">
                    Active
                </span>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
                Last background check: {lastSyncedAt ?? 'Waiting for first run'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
                Status: {lastStatus}
            </p>
        </div>
    )
}
