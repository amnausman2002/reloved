/** @type {import('next').NextConfig} */
const nextConfig = {
  // Testing on a real phone means opening the dev server over the local
  // network, e.g. http://192.168.1.64:3000. Next's dev server rejects requests
  // whose Host is not localhost unless the origin is listed here, so add your
  // laptop's LAN address. Development only: this has no effect on a build.
  // The tunnel hostnames are here so a quick tunnel works without editing this
  // file every time, since the subdomain changes on each run.
  //
  // WARNING: a tunnel makes this dev server public, which includes
  // /api/ai/prefill and /api/ai/photo-quality. Those have no sign-in check and
  // no spending cap yet (see the AI routes section of CLAUDE.md), so anyone who
  // finds the URL can spend our Gemini quota. Prefer the LAN address, and stop
  // the tunnel as soon as you are done testing.
  allowedDevOrigins: [
    "192.168.1.64",
    "*.local",
    "*.trycloudflare.com",
    "*.ngrok-free.app",
    "*.ngrok.io",
  ],

  // Listing photos live in Cloud Storage, and getDownloadURL hands back a
  // firebasestorage.googleapis.com link. next/image refuses to optimise a
  // remote image whose host is not listed here, so without this every real
  // listing photo is a broken image. Local files under /public are unaffected,
  // which is why the sample listings never needed it.
  //
  // The path is narrowed to this project's bucket, so this cannot be used to
  // proxy images out of anyone else's.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/v0/b/reloved-app-2026.firebasestorage.app/**",
      },
    ],
  },
};

export default nextConfig;
