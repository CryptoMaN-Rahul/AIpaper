/** @type {import('next').NextConfig} */
const { PHASE_PRODUCTION_BUILD, PHASE_EXPORT } = require('next/constants')

const apiKey = process.env.GEMINI_API_KEY || ''
const uploadProxyUrl = process.env.GEMINI_UPLOAD_BASE_URL || 'https://generativelanguage.googleapis.com'

/** @type {(phase: string, defaultConfig: import("next").NextConfig) => Promise<import("next").NextConfig>} */
module.exports = async (phase) => {
  const nextConfig = {
    images: {
      unoptimized: true,
    },
    reactStrictMode: false,
  }

  if (phase === PHASE_PRODUCTION_BUILD || phase === PHASE_EXPORT) {
    const withSerwist = (await import('@serwist/next')).default({
      // Note: This is only an example. If you use Pages Router,
      // use something else that works, such as "service-worker/index.ts".
      swSrc: 'app/sw.ts',
      swDest: 'public/sw.js',
    })
    return withSerwist(nextConfig)
  }

  return nextConfig
}
