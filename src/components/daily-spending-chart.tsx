'use client'

import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'

type DailySpendingPoint = {
    date: string
    amount: number
    transactions: number
}

export function DailySpendingChart({
    data,
}: {
    data: DailySpendingPoint[]
}) {
    return (
        <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                        dataKey="date"
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickFormatter={(value) => `Rs.${value}`}
                        tickLine={false}
                        axisLine={false}
                        width={72}
                    />
                    <Tooltip
                        formatter={(value, name) => [
                            name === 'amount' && typeof value === 'number' ? `Rs.${value.toFixed(2)}` : value,
                            name === 'amount' ? 'Spent' : 'Transactions',
                        ]}
                        labelFormatter={(label) => `Date: ${label}`}
                        contentStyle={{
                            borderRadius: '12px',
                            borderColor: '#cbd5e1',
                            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
                        }}
                    />
                    <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#4f46e5"
                        strokeWidth={3}
                        dot={{ r: 4, strokeWidth: 0, fill: '#4f46e5' }}
                        activeDot={{ r: 6 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
