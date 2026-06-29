import createMDX from "@next/mdx";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow .mdx files (case studies) to be imported as components.
  pageExtensions: ["ts", "tsx", "js", "jsx", "mdx"],
  // @react-pdf/renderer is heavy and Node-only — keep it out of the bundle and
  // load it from node_modules at request time in the report route.
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
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

const withMDX = createMDX({
  extension: /\.mdx?$/,
});

export default withMDX(nextConfig);
