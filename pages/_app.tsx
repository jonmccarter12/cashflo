import '../styles/globals.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import React from 'react';
import PWAInstallPrompt from '../components/PWAInstallPrompt';
export default function MyApp({ Component, pageProps }: AppProps) {
  React.useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('🚀 Service Worker registered successfully:', registration);
        })
        .catch((error) => {
          console.error('❌ Service Worker registration failed:', error);
        });
    }

    // Handle shared content from other apps
    const urlParams = new URLSearchParams(window.location.search);
    const shared = urlParams.get('shared');
    if (shared) {
      try {
        const sharedData = JSON.parse(decodeURIComponent(shared));
        console.log('📤 Received shared data:', sharedData);
        // You can handle shared expense data here
        // For now, we'll just clean up the URL
        window.history.replaceState({}, '', window.location.pathname);
      } catch (error) {
        console.error('Failed to parse shared data:', error);
      }
    }
  }, []);

  return (
    <>
      <Head>
        {/* PWA Configuration */}
        <meta name="application-name" content="Cashflo" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Cashflo" />
        <meta name="description" content="Your personal AI-powered financial dashboard with credit monitoring, budgeting, smart insights, and bill tracking" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/icons/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#3b82f6" />

        {/* Viewport for mobile optimization */}
        <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, user-scalable=no, viewport-fit=cover" />

        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Favicon and Icons */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/svg+xml" sizes="32x32" href="/icons/icon-32x32.svg" />
        <link rel="icon" type="image/svg+xml" sizes="16x16" href="/icons/icon-16x16.svg" />

        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icons/icon-192x192.svg" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.svg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180x180.svg" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-167x167.svg" />

        {/* Startup Images for iOS */}
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-2048-2732.jpg" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-1668-2224.jpg" media="(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-1536-2048.jpg" media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />

        {/* Share Target for PWA */}
        <meta name="web_accessible_resources" content="share-target" />
      </Head>

      {/* PWA and Main App */}
      <PWAInstallPrompt />
      <Component {...pageProps} />
    </>
  );
}