import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { fetchDailySpending, fetchDashboardStats, fetchExpenses } from '@/app/actions/expenses'
import { AutoSync } from '@/components/auto-sync'
import { DailySpendingChart } from '@/components/daily-spending-chart'
import { SyncButton } from '@/components/sync-button'
import { SignOutButton } from '@/components/sign-out-button'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Wallet, CreditCard, Mail, CalendarRange, LineChart as LineChartIcon } from "lucide-react"

const dateFilterOptions = [
  { label: '7D', value: 7 },
  { label: '14D', value: 14 },
  { label: '30D', value: 30 },
  { label: 'All', value: 'all' as const },
]

export default async function Dashboard({
  searchParams,
}: {
  searchParams?: Promise<{ days?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const resolvedSearchParams = await searchParams
  const requestedDays = resolvedSearchParams?.days
  const days = requestedDays === '7' || requestedDays === '14' || requestedDays === '30'
    ? Number(requestedDays)
    : requestedDays === 'all'
      ? 'all'
      : 14

  let expenses: any[] = []
  let dailySpending: { date: string; amount: number; transactions: number }[] = []
  let stats = {
    totalSpent: 0,
    transactionCount: 0,
    processedEmailCount: 0,
    topCategory: 'None',
  }
  try {
    const [fetchedExpenses, fetchedStats, fetchedDailySpending] = await Promise.all([
      fetchExpenses(days),
      fetchDashboardStats(days),
      fetchDailySpending(days),
    ])
    expenses = fetchedExpenses
    stats = fetchedStats
    dailySpending = fetchedDailySpending
  } catch (err) {
    console.warn("Could not fetch expenses yet.", err)
  }

  const dailyAverage = dailySpending.length > 0
    ? dailySpending.reduce((sum, day) => sum + day.amount, 0) / dailySpending.length
    : 0
  const busiestDay = dailySpending.reduce<{ date: string; amount: number; transactions: number } | null>((max, day) => {
    if (!max || day.amount > max.amount) return day
    return max
  }, null)

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white/80 dark:bg-slate-950/80 px-4 backdrop-blur sm:px-6">
        <div className="flex flex-1 items-center gap-2 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <Wallet className="h-4 w-4" />
          </div>
          <span className="text-xl tracking-tight text-slate-900 dark:text-white">ExpenseTracker</span>
        </div>
        <div className="flex items-center gap-4">
          <SyncButton />
          <SignOutButton />
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Date Range</p>
            <p className="text-xs text-slate-500">
              Dashboard data is currently filtered to the last {days === 'all' ? 'all available' : `${days} days`}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {dateFilterOptions.map((option) => {
              const isActive = option.value === days
              const href = option.value === 'all' ? '/' : `/?days=${option.value}`

              return (
                <Link
                  key={option.label}
                  href={href}
                  className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                >
                  {option.label}
                </Link>
              )
            })}
          </div>
        </div>

        <AutoSync />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-white text-slate-950 shadow-sm dark:bg-slate-900 dark:border-slate-800 transition-all hover:shadow-md">
            <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
              <h3 className="tracking-tight text-sm font-medium">Total Spent</h3>
              <Wallet className="h-4 w-4 text-muted-foreground opacity-70" />
            </div>
            <div className="p-6 pt-0">
              <div className="text-3xl font-bold tracking-tight">Rs.{stats.totalSpent.toFixed(2)}</div>
              <p className="text-xs text-emerald-600 mt-1 font-medium bg-emerald-50 w-fit px-2 py-0.5 rounded-full">
                Within selected range
              </p>
            </div>
          </div>

          <div className="rounded-xl border bg-white text-slate-950 shadow-sm dark:bg-slate-900 dark:border-slate-800 transition-all hover:shadow-md">
            <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
              <h3 className="tracking-tight text-sm font-medium">Parsed Transactions</h3>
              <Mail className="h-4 w-4 text-muted-foreground opacity-70" />
            </div>
            <div className="p-6 pt-0">
              <div className="text-3xl font-bold tracking-tight">{stats.transactionCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Saved to Supabase
              </p>
            </div>
          </div>

          <div className="rounded-xl border bg-white text-slate-950 shadow-sm dark:bg-slate-900 dark:border-slate-800 transition-all hover:shadow-md">
            <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
              <h3 className="tracking-tight text-sm font-medium">Emails Used</h3>
              <CalendarRange className="h-4 w-4 text-muted-foreground opacity-70" />
            </div>
            <div className="p-6 pt-0">
              <div className="text-3xl font-bold tracking-tight">{stats.processedEmailCount}</div>
              <p className="text-xs text-sky-600 mt-1 font-medium bg-sky-50 w-fit px-2 py-0.5 rounded-full">
                Based on `processed_emails`
              </p>
            </div>
          </div>

          <div className="rounded-xl border bg-white text-slate-950 shadow-sm dark:bg-slate-900 dark:border-slate-800 transition-all hover:shadow-md">
            <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
              <h3 className="tracking-tight text-sm font-medium">Top Category</h3>
              <CreditCard className="h-4 w-4 text-muted-foreground opacity-70" />
            </div>
            <div className="p-6 pt-0">
              <div className="text-3xl font-bold tracking-tight capitalize truncate max-w-full">{stats.topCategory}</div>
              <p className="text-xs text-rose-600 mt-1 font-medium bg-rose-50 w-fit px-2 py-0.5 rounded-full">
                Highest frequency
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-7 border-slate-200 shadow-sm dark:border-slate-800">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center justify-between gap-4">
                <div className="grid gap-1">
                  <CardTitle className="text-lg">Daily View</CardTitle>
                  <CardDescription>
                    Spending trend for the selected date range.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <LineChartIcon className="h-4 w-4" />
                  <span className="text-xs font-medium">Daily spend</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6 p-6 lg:grid-cols-[2fr_1fr]">
              <div>
                {dailySpending.length === 0 ? (
                  <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40">
                    No daily spending data yet for this range.
                  </div>
                ) : (
                  <DailySpendingChart data={dailySpending} />
                )}
              </div>
              <div className="grid gap-4 content-start">
                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Average Per Day</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    Rs.{dailyAverage.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Highest Spend Day</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {busiestDay?.date ?? 'No data'}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {busiestDay ? `Rs.${busiestDay.amount.toFixed(2)} across ${busiestDay.transactions} transaction(s)` : 'Add more synced data to see trends.'}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Active Days</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    {dailySpending.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-4 shadow-sm border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden pointer-events-auto max-h-[600px] overflow-y-auto">
            <CardHeader className="flex flex-row items-center border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-6 py-4">
              <div className="grid gap-1">
                <CardTitle className="text-lg">Recent Expenses</CardTitle>
                <CardDescription>
                  Automatically synced from your Gmail account.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {expenses.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No expenses found yet. Hit 'Sync Emails' to parse them!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                    <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800">
                      <TableHead className="pl-6 h-10 text-xs font-semibold text-slate-500">Merchant</TableHead>
                      <TableHead className="h-10 text-xs font-semibold text-slate-500">Category</TableHead>
                      <TableHead className="h-10 text-xs font-semibold text-slate-500">Mode</TableHead>
                      <TableHead className="h-10 text-xs font-semibold text-slate-500">Date</TableHead>
                      <TableHead className="text-right pr-6 h-10 text-xs font-semibold text-slate-500">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id} className="border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <TableCell className="pl-6 font-medium text-sm capitalize">{expense.merchant}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-50">
                            {expense.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{expense.payment_method ?? 'Other'}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{expense.date}</TableCell>
                        <TableCell className="text-right pr-6 font-medium text-slate-900 dark:text-slate-100">Rs.{expense.amount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-3 shadow-sm border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-lg">AI Categorization</CardTitle>
              <CardDescription>
                LLM confidence scores on extracted entities
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span className="font-medium">Amount Extracted</span>
                    </div>
                    <span className="text-muted-foreground">{expenses.length > 0 ? 'Live' : '0%'}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: expenses.length > 0 ? "100%" : "0%" }}></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                      <span className="font-medium">Emails Consumed</span>
                    </div>
                    <span className="text-muted-foreground">{stats.processedEmailCount}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{
                        width: stats.processedEmailCount > 0
                          ? `${Math.min(100, (stats.transactionCount / stats.processedEmailCount) * 100)}%`
                          : "0%"
                      }}
                    ></div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Sync uses up to 14 days of Gmail search data by default. The date filter above changes the dashboard view, not the Gmail sync window.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
