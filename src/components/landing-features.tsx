import { ReceiptText, LineChart, Mail, Sparkles, Layers, Fingerprint } from 'lucide-react'

const features = [
  {
    title: "Inbox Ingestion",
    description: "Connect your Gmail and let our engine scan for receipts, bank alerts, and invoices automatically.",
    icon: Mail,
    color: "text-blue-500",
  },
  {
    title: "Structured Ledger",
    description: "Every parsed transaction is organized into a searchable, premium ledger view for total visibility.",
    icon: ReceiptText,
    color: "text-emerald-500",
  },
  {
    title: "Executive Insights",
    description: "Visualize your spending habits with clean, minimalist charts that highlight what matters.",
    icon: LineChart,
    color: "text-indigo-500",
  },
  {
    title: "Automatic Sync",
    description: "Manual and assisted inbox sync keep your dashboard aligned with the latest parsed transaction activity.",
    icon: Sparkles,
    color: "text-amber-500",
  },
  {
    title: "Smart Categories",
    description: "AI-driven merchant recognition and categorization for accurate financial reporting.",
    icon: Layers,
    color: "text-purple-500",
  },
  {
    title: "Quietly Premium",
    description: "Designed for those who appreciate high-quality interfaces without the noise of typical apps.",
    icon: Fingerprint,
    color: "text-slate-500",
  }
]

export function LandingFeatures() {
  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mb-16">
          <p className="text-[0.72rem] font-medium uppercase tracking-[0.28em] text-primary mb-4">Core Capabilities</p>
          <h2 className="text-4xl font-bold tracking-tight text-foreground mb-6">Designed for financial intelligence.</h2>
          <p className="text-lg text-muted-foreground">
            Lexicon Finance goes beyond simple tracking. It's a dedicated system for capturing every minor movement in your financial world without lifting a finger.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <div 
              key={i}
              className="p-8 rounded-[2rem] bg-card border border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all hover:shadow-[0_20px_40px_rgba(1,27,62,0.06)] hover:-translate-y-1"
            >
              <div className={`h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-6`}>
                <feature.icon className={`h-6 w-6 ${feature.color}`} />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
