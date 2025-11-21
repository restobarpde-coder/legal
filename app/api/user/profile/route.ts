import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const user = await requireAuth()

        const { data: profile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single()

        if (error) {
            console.error('Error fetching user profile:', error)

            // If user profile doesn't exist, try to create it from auth user data
            if (error.code === 'PGRST116') {
                // Row not found
                console.log('User profile not found, attempting to create from auth data...')

                const { data: newProfile, error: createError } = await supabase
                    .from('users')
                    .insert({
                        id: user.id,
                        email: user.email || '',
                        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
                        role: user.user_metadata?.role || 'assistant',
                        phone: user.user_metadata?.phone || null,
                    })
                    .select()
                    .single()

                if (createError) {
                    console.error('Error creating user profile:', createError)
                    return NextResponse.json({ error: 'Error creating user profile' }, { status: 500 })
                }

                console.log('User profile created successfully:', newProfile)
                return NextResponse.json(newProfile)
            }

            return NextResponse.json({ error: 'Error fetching user profile' }, { status: 500 })
        }

        return NextResponse.json(profile)
    } catch (error) {
        console.error('Error in user profile API:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
