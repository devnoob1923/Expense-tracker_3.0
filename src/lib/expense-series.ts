import type { ExpenseRecord } from '@/app/actions/expenses'

export function buildDailySpendingSeries(expenses: ExpenseRecord[]) {
    const grouped = expenses.reduce((acc: Record<string, { amount: number; transactions: number }>, expense) => {
        if (!acc[expense.date]) {
            acc[expense.date] = { amount: 0, transactions: 0 }
        }

        acc[expense.date].amount += Number(expense.amount) || 0
        acc[expense.date].transactions += 1
        return acc
    }, {})

    return Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({
            date,
            amount: Number(value.amount.toFixed(2)),
            transactions: value.transactions,
        }))
}
