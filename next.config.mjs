/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // MDX (case studies, Phase 7) and @react-pdf/renderer (Phase 6) config will be
  // layered in during their respective phases to keep each phase's diff legible.
  webpack: (config) => {
    // Silence known-harmless warnings from @supabase/* in the Edge middleware:
    //  - realtime-js's dynamic require ("Critical dependency …")
    //  - supabase-js referencing process.version (a guarded, unused-on-edge path)
    // These match Supabase's own Next.js middleware example and have no runtime
    // impact here.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      {
        message:
          /Critical dependency: the request of a dependency is an expression/,
      },
      { message: /A Node\.js API is used \(process\.version/ },
    ];
    return config;
  },
};

export default nextConfig;
