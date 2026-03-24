import { NextResponse } from 'next/server'

import { syncExpenses } from '@/app/actions/expenses'

export async function POST() {
    try {
        const result = await syncExpenses({ source: 'auto' })
        return NextResponse.json(result)
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || 'Auto sync failed.' },
            { status: 500 }
        )
    }
}
