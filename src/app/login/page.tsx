'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowRight, Shield, Sparkles, Wallet } from 'lucide-react'

export default function LoginPage() {
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const checkSession = async () => {
            const { data } = await supabase.auth.getUser()
            if (data.user) {
                router.replace('/dashboard')
            }
        }

        void checkSession()
    }, [router, supabase])

    const handleLogin = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                scopes: 'https://www.googleapis.com/auth/gmail.readonly',
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        })
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-transparent px-4 py-10">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-[-8%] top-[-12%] h-[34rem] w-[34rem] rounded-full bg-primary/8 blur-[140px]" />
                <div className="absolute bottom-[-14%] right-[-6%] h-[28rem] w-[28rem] rounded-full bg-secondary/10 blur-[120px]" />
            </div>

            <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center">
                <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                    <div className="hidden lg:block">
                        <div className="max-w-xl">
                            <p className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                                <Sparkles className="h-3.5 w-3.5" />
                                Executive access
                            </p>
                            <h1 className="mt-6 text-5xl font-semibold tracking-tight text-foreground">
                                Sign in to your quietly premium finance workspace.
                            </h1>
                            <p className="mt-5 text-lg text-muted-foreground">
                                Connect Google once and let Lexicon Finance convert receipts, invoices, and bank alerts into a structured executive ledger.
                            </p>

                            <div className="mt-10 grid gap-4">
                                <div className="rounded-[1.5rem] bg-card/80 p-5 shadow-[0_20px_50px_rgba(1,27,62,0.06)] ring-1 ring-border">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/8 text-primary">
                                            <Wallet className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">Inbox to ledger</p>
                                            <p className="text-sm text-muted-foreground">Automated parsing for receipts, UPI alerts, and card transactions.</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-[1.5rem] bg-card/80 p-5 shadow-[0_20px_50px_rgba(1,27,62,0.06)] ring-1 ring-border">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
                                            <Shield className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">Read-only Gmail scope</p>
                                            <p className="text-sm text-muted-foreground">Designed to pull transaction emails without turning your inbox into an editing surface.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Card className="w-full max-w-xl justify-self-center rounded-[2rem] bg-card/90 shadow-[0_24px_60px_rgba(1,27,62,0.08)] ring-1 ring-border backdrop-blur-xl">
                        <CardHeader className="border-b border-border/50 bg-muted/40 pb-8 text-center">
                            <div className="mb-4 flex justify-center">
                                <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-primary text-white shadow-[0_16px_30px_rgba(1,27,62,0.18)]">
                                    <Wallet className="h-6 w-6" />
                                </div>
                            </div>
                            <CardTitle className="text-3xl font-semibold tracking-tight">Lexicon Finance</CardTitle>
                            <CardDescription className="mt-2 text-sm text-muted-foreground">
                                AI-powered transaction intelligence, directly from your inbox
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-5 p-8">
                            <Button
                                onClick={handleLogin}
                                className="h-14 w-full text-base font-medium"
                                size="lg"
                            >
                                <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 24c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 21.53 7.7 24 12 24z" />
                                    <path fill="#FBBC05" d="M5.84 15.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V8.06H2.18C1.43 9.55 1 11.22 1 13s.43 3.45 1.18 4.94l3.66-2.84z" />
                                    <path fill="#EA4335" d="M12 4.62c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.43 14.97 0 12 0 7.7 0 3.99 2.47 2.18 6.06l3.66 2.84c.87-2.6 3.3-4.28 6.16-4.28z" />
                                </svg>
                                Sign in with Google
                            </Button>

                            <div className="rounded-[1.5rem] bg-muted p-4 text-center">
                                <p className="text-xs leading-relaxed text-muted-foreground">
                                    By continuing, you grant read-only Gmail access so Lexicon Finance can scan receipts and transaction alerts automatically.
                                </p>
                            </div>

                            <div className="flex items-center justify-between gap-4 text-sm">
                                <Link href="/" className="text-muted-foreground transition-colors hover:text-primary">
                                    Back to landing page
                                </Link>
                                <span className="inline-flex items-center gap-1 text-primary">
                                    Secure OAuth
                                    <ArrowRight className="h-4 w-4" />
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
