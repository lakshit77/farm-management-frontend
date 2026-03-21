import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            // injectManifest lets us write a custom service worker (src/sw.ts)
            // while still getting Workbox precaching injected automatically.
            // The push and notificationclick handlers live in src/sw.ts.
            strategies: "injectManifest",
            srcDir: "src",
            filename: "sw.ts",
            injectRegister: "auto",
            includeAssets: ["favicon.svg", "logo.svg"],
            manifest: {
                name: "ShowGroundsLive — Horse Farm Management",
                short_name: "ShowGroundsLive",
                description: "Monitor show schedules, track horses and entries, and get real-time alerts for your equestrian farm.",
                theme_color: "#4F6D4F",
                background_color: "#F7F7F7",
                display: "standalone",
                orientation: "portrait",
                scope: "/",
                start_url: "/",
                icons: [
                    {
                        src: "pwa-192x192.png",
                        sizes: "192x192",
                        type: "image/png",
                    },
                    {
                        src: "pwa-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                    },
                    {
                        src: "pwa-maskable-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "maskable",
                    },
                ],
            },
            injectManifest: {
                globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
                // Raise the precache limit to 5 MB to accommodate vendor chunks
                maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
            },
            // Enable service worker in Vite dev mode so push notifications can be
            // tested on localhost without needing a production build.
            // Points at a plain-JS file in /public so Vite serves it as-is —
            // avoids the TypeScript/Rollup compilation that injectManifest requires
            // and which fails silently in dev mode.
            devOptions: {
                enabled: true,
                type: "classic",
                navigateFallback: "/",
                suppressWarnings: true,
            },
        }),
    ],
    preview: {
        // Allow ngrok and any other tunnel/proxy hosts used for mobile testing
        allowedHosts: true,
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    // React core — changes rarely, long cache life
                    "vendor-react": ["react", "react-dom"],
                    // Stream Chat SDK — largest dependency, isolated into its own chunk
                    "vendor-stream": ["stream-chat", "stream-chat-react"],
                    // Supabase auth
                    "vendor-supabase": ["@supabase/supabase-js"],
                    // Emoji picker
                    "vendor-emoji": ["@emoji-mart/react", "@emoji-mart/data"],
                    // Lucide icons
                    "vendor-lucide": ["lucide-react"],
                },
            },
        },
    },
});
