import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { fetchDashboardStats, fetchExpenses, fetchSyncDiagnostics, type ExpenseRecord } from '@/app/actions/expenses'
import { AppShell } from '@/components/app-shell'
import { AutoSync } from '@/components/auto-sync'
import { DailySpendingChart } from '@/components/daily-spending-chart'
import { MetricCard } from '@/components/metric-card'
import { SectionPanel } from '@/components/section-panel'
import { SidebarNav } from '@/components/sidebar-nav'
import { StatusPill } from '@/components/status-pill'
import { SyncButton } from '@/components/sync-button'
import { SignOutButton } from '@/components/sign-out-button'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Wallet, CreditCard, Mail, CalendarRange, LineChart as LineChartIcon, Sparkles, ArrowUpRight } from "lucide-react"
import { buildDailySpendingSeries } from '@/lib/expense-series'

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

  let expenses: ExpenseRecord[] = []
  let dailySpending: { date: string; amount: number; transactions: number }[] = []
  let stats = {
    totalSpent: 0,
    todaySpent: 0,
    transactionCount: 0,
    processedEmailCount: 0,
    topCategory: 'None',
  }
  let syncDiagnostics = {
    processedLast24h: 0,
    insertedLast24h: 0,
    errorCounts: {} as Record<string, number>,
    lastErrorAt: null as string | null,
  }

  try {
    const [fetchedExpenses, fetchedStats, fetchedSyncDiagnostics] = await Promise.all([
      fetchExpenses(days),
      fetchDashboardStats(days),
      fetchSyncDiagnostics(),
    ])
    expenses = fetchedExpenses
    stats = fetchedStats
    dailySpending = buildDailySpendingSeries(fetchedExpenses)
    syncDiagnostics = fetchedSyncDiagnostics
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
    <AppShell
      sidebar={<SidebarNav currentPath="/dashboard" />}
      header={
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[0.72rem] font-medium uppercase tracking-[0.28em] text-muted-foreground">Digital Curator Mode</p>
            <div className="mt-2 flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground md:text-3xl">Spending command center</h1>
              <StatusPill tone="success">Live inbox intelligence</StatusPill>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Review recent movement, daily rhythm, and ingestion health without leaving the executive overview.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start lg:self-auto">
            <SyncButton />
            <SignOutButton />
          </div>
        </div>
      }
    >
      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="rounded-[1.75rem] bg-primary px-6 py-6 text-primary-foreground shadow-[0_26px_55px_rgba(1,27,62,0.22)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.72rem] font-medium uppercase tracking-[0.26em] text-white/70">Overview</p>
              <h2 className="mt-3 text-3xl font-semibold">Quietly premium financial visibility.</h2>
              <p className="mt-3 max-w-xl text-sm text-white/72">
                Dashboard data is filtered to the last {days === 'all' ? 'all available' : `${days} days`}, while Gmail sync continues using the latest inbox window.
              </p>
            </div>
            <div className="hidden rounded-[1.5rem] bg-white/10 p-3 text-white/80 md:block">
              <Sparkles className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {dateFilterOptions.map((option) => {
              const isActive = option.value === days
              const href = option.value === 'all' ? '/dashboard' : `/dashboard?days=${option.value}`

              return (
                <Link
                  key={option.label}
                  href={href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white text-primary'
                      : 'bg-white/10 text-white/78 hover:bg-white/16'
                  }`}
                >
                  {option.label}
                </Link>
              )
            })}
          </div>
        </div>
        <AutoSync />
      </section>

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Today's Spend"
          value={`Rs.${stats.todaySpent.toFixed(2)}`}
          icon={<CalendarRange className="h-4 w-4" />}
          note="Transactions dated today"
          tone="attention"
        />
        <MetricCard
          label="Total Spent"
          value={`Rs.${stats.totalSpent.toFixed(2)}`}
          icon={<Wallet className="h-4 w-4" />}
          note="Within selected range"
          tone="success"
        />
        <MetricCard
          label="Parsed Transactions"
          value={stats.transactionCount}
          icon={<Mail className="h-4 w-4" />}
          note="Saved to Supabase"
        />
        <MetricCard
          label="Emails Used"
          value={stats.processedEmailCount}
          icon={<CalendarRange className="h-4 w-4" />}
          note="Ingestion history"
        />
        <MetricCard
          label="Top Category"
          value={stats.topCategory}
          icon={<CreditCard className="h-4 w-4" />}
          note="Highest frequency"
          tone="attention"
        />
      </section>

      <SectionPanel
        className="scroll-mt-24"
        title="Daily View"
        description="A clean read on how spending accumulates across the selected range."
        action={
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LineChartIcon className="h-4 w-4" />
            <span>Daily spend</span>
          </div>
        }
      >
        <div id="daily-view" className="grid gap-6 lg:grid-cols-[1.8fr_0.95fr]">
          <div>
            {dailySpending.length === 0 ? (
              <div className="flex h-72 items-center justify-center rounded-[1.5rem] bg-muted text-sm text-muted-foreground">
                No daily spending data yet for this range.
              </div>
            ) : (
              <DailySpendingChart data={dailySpending} />
            )}
          </div>
          <div className="grid gap-4 content-start">
            <div className="rounded-[1.5rem] bg-muted p-5">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Average Per Day</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">Rs.{dailyAverage.toFixed(2)}</p>
            </div>
            <div className="rounded-[1.5rem] bg-muted p-5">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Highest Spend Day</p>
              <p className="mt-3 text-lg font-semibold text-foreground">{busiestDay?.date ?? 'No data'}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {busiestDay ? `Rs.${busiestDay.amount.toFixed(2)} across ${busiestDay.transactions} transaction(s)` : 'Add more synced data to see trends.'}
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-muted p-5">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Active Days</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">{dailySpending.length}</p>
            </div>
          </div>
        </div>
      </SectionPanel>

      <section className="grid gap-5 xl:grid-cols-[1.45fr_0.95fr]">
        <SectionPanel
          title="Recent Transactions"
          description="Latest parsed transactions, structured from your Gmail-linked receipts and bank alerts."
          className="min-w-0 scroll-mt-24"
        >
          {expenses.length === 0 ? (
            <div className="flex min-h-72 items-center justify-center rounded-[1.5rem] bg-muted text-sm text-muted-foreground">
              No expenses found yet. Use Sync Emails to populate the ledger.
            </div>
          ) : (
            <>
            <div className="grid gap-3 md:hidden">
              {expenses.map((expense) => (
                <article key={expense.id} className="rounded-[1.25rem] bg-muted p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{expense.merchant}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{expense.date}</p>
                    </div>
                    <p className="text-right font-medium text-foreground">Rs.{expense.amount.toFixed(2)}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="bg-accent px-2.5 py-1 text-[0.72rem] text-primary hover:bg-accent">
                      {expense.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{expense.payment_method ?? 'Other'}</span>
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Merchant</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium text-foreground">{expense.merchant}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-accent px-2.5 py-1 text-[0.72rem] text-primary hover:bg-accent">
                          {expense.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{expense.payment_method ?? 'Other'}</TableCell>
                      <TableCell className="text-muted-foreground">{expense.date}</TableCell>
                      <TableCell className="text-right font-medium text-foreground">Rs.{expense.amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            </>
          )}
        </SectionPanel>

        <SectionPanel
          className="scroll-mt-24"
          title="System Health"
          description="Operational readout for inbox ingestion and the quality of the parsed transaction stream."
        >
          <div id="auto-sync" className="space-y-5">
            <div className="rounded-[1.5rem] bg-muted p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Parsed vs consumed</p>
                  <p className="text-xs text-muted-foreground">How much of the processed email stream made it into transactions.</p>
                </div>
                <StatusPill tone="success">
                  {stats.processedEmailCount > 0 ? `${Math.min(100, Math.round((stats.transactionCount / stats.processedEmailCount) * 100))}%` : '0%'}
                </StatusPill>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full bg-linear-to-r from-primary to-[color:var(--chart-3)]"
                  style={{
                    width: stats.processedEmailCount > 0
                      ? `${Math.min(100, (stats.transactionCount / stats.processedEmailCount) * 100)}%`
                      : '0%'
                  }}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[1.5rem] bg-muted p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Last 24h ingestion</p>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-3 text-2xl font-semibold text-foreground">
                  {syncDiagnostics.insertedLast24h} / {syncDiagnostics.processedLast24h}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Inserted transactions vs processed emails over the last 24 hours.</p>
              </div>
              <div className="rounded-[1.5rem] bg-muted p-5">
                <p className="text-sm font-medium text-foreground">Latest errors</p>
                {Object.keys(syncDiagnostics.errorCounts).length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">No ingestion errors recorded in the last 24 hours.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {Object.entries(syncDiagnostics.errorCounts).map(([stage, count]) => (
                      <div key={stage} className="flex items-center justify-between rounded-xl bg-card px-3 py-2 text-sm">
                        <span className="text-foreground">{stage}</span>
                        <StatusPill tone="attention">{count}</StatusPill>
                      </div>
                    ))}
                    {syncDiagnostics.lastErrorAt ? (
                      <p className="pt-1 text-xs text-muted-foreground">Last error at {new Date(syncDiagnostics.lastErrorAt).toLocaleString()}</p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        </SectionPanel>
      </section>
    </AppShell>
  )
}
