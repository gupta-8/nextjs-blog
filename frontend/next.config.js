/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Standalone output for Docker/Railway deployment
  // Uncomment for production deployment:
  // output: 'standalone',
  
  // Enable compression
  compress: true,
  
  // Optimize production builds
  swcMinify: true,
  
  // Remove powered by header
  poweredByHeader: false,
  
  // Optimize images for Core Web Vitals
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // Modern formats for better compression
    formats: ['image/avif', 'image/webp'],
    // Optimized device sizes
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Minimize layout shift
    minimumCacheTTL: 31536000,
  },
  
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
  },
  
  // Experimental optimizations
  experimental: {
    // Optimize package imports to reduce bundle size
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@radix-ui/react-icons',
      'recharts',
      'react-syntax-highlighter',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
    ],
  },
  
  // Compiler optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Rewrites to proxy /api requests to backend (for single domain setup)
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },

  // Headers for caching and performance
  async headers() {
    return [
      // Cache static assets for 1 year
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif|woff|woff2|ttf|eot)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache Next.js static files
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Security and performance headers for all pages
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
  
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        // Improved code splitting for smaller initial bundles
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 100000, // Reduced from 200000 for smaller chunks
          cacheGroups: {
            // Framework chunk - React core
            framework: {
              name: 'framework',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 50,
              chunks: 'all',
              enforce: true,
            },
            // UI components - loaded on demand
            ui: {
              name: 'ui-components',
              test: /[\\/]node_modules[\\/](@radix-ui|lucide-react)[\\/]/,
              priority: 40,
              chunks: 'async', // Load async - not needed for initial render
            },
            // Rich text editor - lazy loaded
            editor: {
              name: 'editor',
              test: /[\\/]node_modules[\\/](@tiptap|prosemirror|lowlight|highlight\.js)[\\/]/,
              priority: 35,
              chunks: 'async',
            },
            // Commons chunk
            commons: {
              name: 'commons',
              minChunks: 2,
              priority: 20,
            },
            // Default vendor chunk
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendor',
              priority: 10,
              chunks: 'async', // Make vendors async to not block initial render
            },
          },
        },
      };
    }
    
    return config;
  },
}

module.exports = nextConfig