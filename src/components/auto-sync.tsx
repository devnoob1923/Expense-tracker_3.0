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
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Auto Sync</p>
                    <p className="text-xs text-slate-500">
                        While this page is open, Gmail sync runs every 2 minutes.
                    </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    Active
                </span>
            </div>
            <p className="mt-3 text-xs text-slate-500">
                Last background check: {lastSyncedAt ?? 'Waiting for first run'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
                Status: {lastStatus}
            </p>
        </div>
    )
}
