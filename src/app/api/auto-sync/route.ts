import { NextResponse } from 'next/server'

import { syncExpenses } from '@/app/actions/expenses'

export async function POST() {
    try {
        const result = await syncExpenses({ source: 'auto' })
        return NextResponse.json(result)
    } catch (error) {
        console.error('Auto sync failed.', error)
        return NextResponse.json(
            { error: 'Auto sync is temporarily unavailable.' },
            { status: 500 }
        )
    }
}
