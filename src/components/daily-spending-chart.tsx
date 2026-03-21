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
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(196, 198, 207, 0.3)" />
                    <XAxis
                        dataKey="date"
                        tick={{ fill: '#5f6672', fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        tick={{ fill: '#5f6672', fontSize: 12 }}
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
                            borderColor: 'rgba(196, 198, 207, 0.35)',
                            boxShadow: '0 16px 40px rgba(1, 27, 62, 0.12)',
                            backgroundColor: 'rgba(255, 255, 255, 0.96)',
                        }}
                    />
                    <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#011b3e"
                        strokeWidth={3}
                        dot={{ r: 4, strokeWidth: 0, fill: '#46645a' }}
                        activeDot={{ r: 6 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
