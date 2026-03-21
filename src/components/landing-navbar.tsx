import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'

export async function LandingNavbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center text-sm font-bold text-white shadow-[0_10px_20px_rgba(1,27,62,0.2)] transition-transform group-hover:scale-105">
            LX
          </div>
          <span className="text-2xl font-bold tracking-tight text-primary">Lexicon Finance</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Features</Link>
          <Link href="#" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">About</Link>
          <Link href="#" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Pricing</Link>
        </nav>

        <div className="flex items-center gap-4">
          {user ? (
            <Link 
              href="/dashboard" 
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-medium text-sm transition-all hover:shadow-[0_10px_20px_rgba(1,27,62,0.15)] hover:-translate-y-0.5"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors px-4">
                Sign In
              </Link>
              <Link 
                href="/login" 
                className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-medium text-sm transition-all hover:shadow-[0_10px_20px_rgba(1,27,62,0.15)] hover:-translate-y-0.5"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
