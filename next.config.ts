import path from 'path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // ponytail: parent dirs have extra lockfiles; pin tracing root so Tailwind/PostCSS resolve here
  outputFileTracingRoot: path.join(__dirname),
}

export default nextConfig
