import Head from 'next/head'
import type { ReactNode } from 'react'
import AnimeMenuAside from './AnimeMenuAside'
import NekoAgeGate from './NekoAgeGate'

/**
 * Kerangka halaman Neko: age gate 18+, layout dengan menu anime, dan
 * meta noindex supaya halaman dewasa tidak diindeks mesin pencari.
 */
export default function NekoPageShell({ title, children }: { title?: string; children: ReactNode }) {
  const pageTitle = title ? `${title} - Neko (18+) - KiraStream` : 'Neko (18+) - KiraStream'
  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="flex items-start gap-6">
        <div className="min-w-0 flex-1">
          <NekoAgeGate>{children}</NekoAgeGate>
        </div>
        <AnimeMenuAside />
      </div>
    </>
  )
}
