import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Filter, ReceiptText, Search, Wallet } from 'lucide-react'

import { fetchExpenses, type ExpenseRecord } from '@/app/actions/expenses'
import { AppShell } from '@/components/app-shell'
import { SectionPanel } from '@/components/section-panel'
import { SidebarNav } from '@/components/sidebar-nav'
import { SignOutButton } from '@/components/sign-out-button'
import { StatusPill } from '@/components/status-pill'
import { SyncButton } from '@/components/sync-button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const dateFilterOptions = [
  { label: '7D', value: 7 },
  { label: '14D', value: 14 },
  { label: '30D', value: 30 },
  { label: 'All', value: 'all' as const },
]

export default async function TransactionsPage({
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
      : 30

  let expenses: ExpenseRecord[] = []
  try {
    expenses = await fetchExpenses(days)
  } catch (err) {
    console.warn('Could not fetch transactions yet.', err)
  }
  const summary = expenses.reduce(
    (acc, expense) => {
      acc.totalValue += Number(expense.amount) || 0
      if (expense.status === 'confirmed') acc.confirmedCount += 1
      if (expense.status === 'needs_review') acc.reviewCount += 1
      return acc
    },
    { totalValue: 0, confirmedCount: 0, reviewCount: 0 }
  )

  return (
    <AppShell
      sidebar={<SidebarNav currentPath="/transactions" />}
      header={
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[0.72rem] font-medium uppercase tracking-[0.28em] text-muted-foreground">Transaction Log</p>
            <h1 className="mt-2 text-2xl font-semibold text-foreground md:text-3xl">Structured transaction ledger</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              A dedicated view for parsed email transactions, payment modes, categories, and posting dates.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start lg:self-auto">
            <SyncButton />
            <SignOutButton />
          </div>
        </div>
      }
    >
      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.75rem] bg-primary px-6 py-6 text-primary-foreground shadow-[0_26px_55px_rgba(1,27,62,0.22)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.72rem] font-medium uppercase tracking-[0.26em] text-white/70">Transactions</p>
              <h2 className="mt-3 text-3xl font-semibold">Every parsed charge, in one place.</h2>
              <p className="mt-3 max-w-xl text-sm text-white/72">
                Filter the ledger by recent windows and review how payment modes and merchant activity are accumulating over time.
              </p>
            </div>
            <ReceiptText className="hidden h-6 w-6 text-white/75 md:block" />
          </div>
        </div>
        <div className="rounded-[1.75rem] bg-card/92 p-5 shadow-[0_24px_50px_rgba(1,27,62,0.06)] ring-1 ring-border">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Filter className="h-4 w-4" />
            <span>Date filter</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {dateFilterOptions.map((option) => {
              const isActive = option.value === days
              const href = option.value === 'all' ? '/transactions' : `/transactions?days=${option.value}`

              return (
                <Link
                  key={option.label}
                  href={href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-accent text-primary hover:bg-accent/80'
                  }`}
                >
                  {option.label}
                </Link>
              )
            })}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Showing {expenses.length} transaction{expenses.length === 1 ? '' : 's'} for the last {days === 'all' ? 'all available time' : `${days} days`}.
          </p>
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-3">
        <div className="rounded-[1.5rem] bg-card/92 p-5 shadow-[0_24px_50px_rgba(1,27,62,0.06)] ring-1 ring-border">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Transactions</p>
          <p className="mt-4 text-3xl font-semibold text-foreground">{expenses.length}</p>
        </div>
        <div className="rounded-[1.5rem] bg-card/92 p-5 shadow-[0_24px_50px_rgba(1,27,62,0.06)] ring-1 ring-border">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Total Value</p>
          <p className="mt-4 text-3xl font-semibold text-foreground">
            Rs.{summary.totalValue.toFixed(2)}
          </p>
        </div>
        <div className="rounded-[1.5rem] bg-card/92 p-5 shadow-[0_24px_50px_rgba(1,27,62,0.06)] ring-1 ring-border">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Review Status</p>
          <div className="mt-4 flex items-center gap-2">
            <StatusPill tone="success">
              {summary.confirmedCount} confirmed
            </StatusPill>
            <StatusPill tone="attention">
              {summary.reviewCount} review
            </StatusPill>
          </div>
        </div>
      </section>

      <SectionPanel
        title="Transactions"
        description="A premium ledger view for parsed email activity."
        action={
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Search className="h-4 w-4" />
            <span>Browse by merchant, mode, and date</span>
          </div>
        }
      >
        {expenses.length === 0 ? (
          <div className="flex min-h-72 items-center justify-center rounded-[1.5rem] bg-muted text-sm text-muted-foreground">
            No transactions available for this range yet.
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
                  <StatusPill tone={expense.status === 'needs_review' ? 'attention' : 'success'}>
                    {expense.status ?? 'confirmed'}
                  </StatusPill>
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
                  <TableHead>Status</TableHead>
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
                    <TableCell>
                      <StatusPill tone={expense.status === 'needs_review' ? 'attention' : 'success'}>
                        {expense.status ?? 'confirmed'}
                      </StatusPill>
                    </TableCell>
                    <TableCell className="text-right font-medium text-foreground">Rs.{expense.amount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          </>
        )}
      </SectionPanel>
    </AppShell>
  )
}
