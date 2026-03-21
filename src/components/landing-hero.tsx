import Link from 'next/link'
import { ArrowRight, Sparkles, Shield, Inbox } from 'lucide-react'

export function LandingHero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-secondary/5 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-6 relative">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-primary text-xs font-medium mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Quietly premium financial visibility</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
            Command your spending with <span className="text-primary">executive clarity.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            Automate your expense tracking directly from your inbox. Lexicon Finance parses your receipts and bank alerts into a structured, premium ledger—zero manual entry required.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-400">
            <Link 
              href="/login" 
              className="group inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-2xl font-semibold text-lg transition-all hover:shadow-[0_20px_40px_rgba(1,27,62,0.15)] hover:-translate-y-0.5"
            >
              Get Started
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link 
              href="#features" 
              className="inline-flex items-center justify-center px-8 py-4 rounded-2xl font-semibold text-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              Learn more
            </Link>
          </div>
        </div>

        {/* Feature badges */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
          <div className="flex items-start gap-4 p-6 rounded-3xl bg-card/50 border border-border/50 backdrop-blur-sm">
            <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center shrink-0">
              <Inbox className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Gmail Automation</h3>
              <p className="text-sm text-muted-foreground">Smart ingestion from your linked inbox receipts.</p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-6 rounded-3xl bg-card/50 border border-border/50 backdrop-blur-sm">
            <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center shrink-0">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">AI-Powered Parsing</h3>
              <p className="text-sm text-muted-foreground">Highly accurate classification of every charge.</p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-6 rounded-3xl bg-card/50 border border-border/50 backdrop-blur-sm">
            <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center shrink-0">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Bank-Grade Privacy</h3>
              <p className="text-sm text-muted-foreground">Secure processing with zero data sharing.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
