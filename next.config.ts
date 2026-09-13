import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Every request (including file uploads like AI Assistant photos) passes
    // through proxy.ts for the login-session check, and Next.js buffers that
    // body up to a 10MB default — silently truncating anything bigger rather
    // than erroring, which broke full-resolution phone camera photos before
    // they ever reached the resize step in app/api/agent/chat/route.ts.
    // The AI Assistant now compresses photos in the browser before upload
    // (see compressImageFile in components/AgentChat.tsx), so this is a
    // safety margin for formats the browser can't decode client-side
    // (some Android HEIC cases), not the primary defense against big
    // uploads anymore.
    proxyClientMaxBodySize: "35mb",
  },
};

export default nextConfig;
