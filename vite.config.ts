import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
  base: mode === 'production' ? '/thats-beatify/' : '/',
>>>>>>> parent of 0719522 (custom domain)
=======
  base: mode === 'production' ? '/thats-beatify/' : '/',
>>>>>>> parent of 0719522 (custom domain)
=======
  base: mode === 'production' ? '/thats-beatify/' : '/',
>>>>>>> parent of 0719522 (custom domain)
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
