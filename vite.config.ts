import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
  
export default defineConfig({
plugins: [
react(),
VitePWA({
registerType: 'autoUpdate',
includeAssets: ['favicon.ico'],
manifest: {
           name: 'CSMS Construction Integrated',
           short_name: 'CSMS',
           description: 'Contractor Safety Management System - Work Permit & Patrol',
           theme_color: '#1e293b',
           background_color: '#ffffff',
           display: 'standalone',
           icons: [
           { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
           { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }
           ]
         }
       })
     ],
       server: { // <-- Ln 25 - Pasang di sini - FIX 192.168.137.1 tidak running
       host: '0.0.0.0', // <-- Ln 26 - Penting agar bisa diakses dari 192.168.137.1
       port: 5173
     },
     preview: {
       host: '0.0.0.0',
       port: 4173
     }
    })