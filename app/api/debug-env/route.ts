import { NextResponse } from 'next/server'

export async function GET() {
  // IMPORTANTE: Solo usar en desarrollo/staging - NUNCA en producción real
  const isDev = process.env.NODE_ENV === 'development'
  
  if (!isDev) {
    // En producción, solo mostrar si las variables existen sin revelar los valores
    return NextResponse.json({
      status: 'production-check',
      environment: process.env.NODE_ENV,
      variables: {
        NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
        // URLs de desarrollo y producción
        NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL: !!process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ? 'SET' : 'MISSING',
        NEXT_PUBLIC_PROD_SUPABASE_REDIRECT_URL: !!process.env.NEXT_PUBLIC_PROD_SUPABASE_REDIRECT_URL ? 'SET' : 'MISSING',
      },
      host: process.env.VERCEL_URL || 'unknown',
      timestamp: new Date().toISOString()
    })
  }

  return NextResponse.json({
    status: 'development-check',
    environment: process.env.NODE_ENV,
    variables: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 30) + '...',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
    },
    timestamp: new Date().toISOString()
  })
}
