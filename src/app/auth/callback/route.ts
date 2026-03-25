import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { decryptSecret, encryptSecret, isEncryptedSecret } from '@/lib/token-crypto'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')

    if (code) {
        const supabase = await createClient()
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error && data.session) {
            const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

            if (!serviceRoleKey) {
                console.error('CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing in .env.local')
                return NextResponse.redirect(`${origin}/?error=missing_service_key`)
            }

            // We must store the Google provider token using the service role key to bypass RLS!
            const adminAuthClient = createAdminClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                serviceRoleKey
            )

            const { provider_token, provider_refresh_token } = data.session

            if (provider_token) {
                const encryptedProviderToken = encryptSecret(provider_token)
                const encryptedRefreshToken = provider_refresh_token ? encryptSecret(provider_refresh_token) : null

                if (isEncryptedSecret(encryptedProviderToken)) {
                    try {
                        decryptSecret(encryptedProviderToken)
                    } catch (tokenEncryptionError) {
                        console.error('Failed to validate encrypted provider token:', tokenEncryptionError)
                        return NextResponse.redirect(`${origin}/login?error=token_store_failed`)
                    }
                }

                const { error: upsertError } = await adminAuthClient.from('user_tokens').upsert({
                    user_id: data.session.user.id,
                    provider_token: encryptedProviderToken,
                    provider_refresh_token: encryptedRefreshToken,
                }, { onConflict: 'user_id' })

                if (upsertError) {
                    console.error('Failed to persist Google provider token:', upsertError.message)
                    return NextResponse.redirect(`${origin}/login?error=token_store_failed`)
                }
            } else {
                console.error('Google OAuth completed but no provider_token was returned in the session.')
                return NextResponse.redirect(`${origin}/login?error=missing_provider_token`)
            }

            return NextResponse.redirect(`${origin}/dashboard`)
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login?error=true`)
}
