'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'

export function SignOutButton() {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(false)

    const handleSignOut = async () => {
        setLoading(true)
        try {
            await supabase.auth.signOut()
            router.replace('/login')
            router.refresh()
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-slate-600 hover:text-slate-900"
            onClick={handleSignOut}
            disabled={loading}
        >
            <LogOut className="h-4 w-4" />
            {loading ? 'Signing out...' : 'Sign out'}
        </Button>
    )
}
