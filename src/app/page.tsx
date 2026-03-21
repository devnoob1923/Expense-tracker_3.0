import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { LandingHero } from '@/components/landing-hero'
import { LandingFeatures } from '@/components/landing-features'
import { LandingFooter } from '@/components/landing-footer'
import { LandingNavbar } from '@/components/landing-navbar'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If user is logged in, they can still view the landing page, 
  // but we might want to redirect them to the dashboard if they hit the root.
  // For now, let's keep it accessible but provide a Dashboard link in the Navbar.
  // Actually, standard behavior for an app like this is to redirect to dashboard if logged in.
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/10 selection:text-primary">
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingFeatures />
      </main>
      <LandingFooter />
    </div>
  )
}
