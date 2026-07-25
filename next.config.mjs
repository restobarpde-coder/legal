/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimizaciones críticas:
  reactStrictMode: true,
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  compress: true,
  poweredByHeader: false,
  
  // Optimizaciones experimentales
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      'lucide-react', 
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      'recharts',
      'date-fns',
    ],
  },
  
  // External packages for server components
  serverExternalPackages: ['@supabase/supabase-js'],
  
  // Modularizar imports para reducir bundle size
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
    'date-fns': {
      transform: 'date-fns/{{member}}',
    },
  },
  
  // Configuración webpack para evitar chunk errors
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  
  // Headers para caché y seguridad
  async headers() {
    return [
      {
        // These responses are per-user and authenticated. `public, s-maxage=60`
        // let the CDN keep a shared copy of them: the inbox could answer a
        // Realtime-triggered refetch with a body up to a minute old (five with
        // stale-while-revalidate), which reads exactly like "the message only
        // shows up after a reload" — and a shared cache of authenticated JSON
        // can serve one user's data to another. Routes that genuinely want to
        // be cached should set their own header.
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
      // Preconnect a Supabase para reducir latencia
      {
        source: '/',
        headers: [
          { key: 'Link', value: '<https://supabase.co>; rel=preconnect' },
        ],
      },
    ];
  },
}

export default nextConfig
