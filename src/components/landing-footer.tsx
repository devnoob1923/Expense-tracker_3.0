import Link from 'next/link'

export function LandingFooter() {
  return (
    <footer className="py-12 border-t border-border mt-auto">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center text-xs font-bold text-white">
                LX
              </div>
              <span className="text-xl font-bold tracking-tight text-primary">Lexicon Finance</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              Quietly premium financial visibility. Automate your ledger directly from your inbox.
            </p>
          </div>
          
          <div className="flex gap-12">
            <div className="flex flex-col gap-3">
              <span className="text-sm font-bold text-foreground uppercase tracking-wider">Product</span>
              <Link href="#features" className="text-sm text-muted-foreground hover:text-primary transition-colors">Features</Link>
              <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">Dashboard</Link>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-sm font-bold text-foreground uppercase tracking-wider">Legal</span>
              <Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy</Link>
              <Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Terms</Link>
            </div>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Lexicon Finance. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors">Twitter</Link>
            <Link href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors">GitHub</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
