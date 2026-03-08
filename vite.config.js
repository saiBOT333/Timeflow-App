import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        port: 5500,
        open: '/index.html',
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    },
    test: {
        environment: 'node',
    },
});
