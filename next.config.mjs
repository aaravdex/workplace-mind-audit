/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // MDX (case studies, Phase 7) and @react-pdf/renderer (Phase 6) config will be
  // layered in during their respective phases to keep each phase's diff legible.
};

export default nextConfig;
