/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimizaciones críticas:
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000,
  },
  compress: true,
  poweredByHeader: false,
  
  // Optimizaciones experimentales
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-*'],
    viewTransition: true, // Transiciones nativas del navegador
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
  
  // Headers para caché
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=300' },
        ],
      },
    ];
  },
}

export default nextConfig
