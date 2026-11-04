import { useRouter } from 'next/router'
import { FolderOpen } from 'lucide-react'
import NekoArchive from '@/components/NekoArchive'
import NekoPageShell from '@/components/NekoPageShell'
import { fetchNekoByCategory, prettyNekoSlug } from '@/lib/neko'
import { useSettings } from '@/contexts/SettingsContext'
import { translate } from '@/lib/i18n'

/** Nama kategori yang sudah diketahui; sisanya pakai slug yang dirapikan. */
const CATEGORY_LABEL_KEYS: Record<string, string> = {
  '3d-hentai': 'neko.category.3d-hentai',
  'jav-cosplay': 'neko.category.jav-cosplay',
}

function NekoCategoryContent() {
  const router = useRouter()
  const slug = typeof router.query.slug === 'string' ? router.query.slug : ''
  const { language } = useSettings()
  const t = (key: string) => translate(language, key)

  if (!slug) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-44" />
        <div className="anime-grid">
          {[...Array(12)].map((_, i) => <div key={i} className="skeleton aspect-[3/4]" />)}
        </div>
      </div>
    )
  }

  const labelKey = CATEGORY_LABEL_KEYS[slug]
  const label = labelKey ? t(labelKey) : prettyNekoSlug(slug)

  return (
    <NekoArchive
      key={slug}
      title={label}
      subtitle={t('neko.category.sub').replace('{name}', label)}
      icon={FolderOpen}
      fetcher={(page) => fetchNekoByCategory(slug, page)}
    />
  )
}

export default function NekoCategoryPage() {
  return (
    <NekoPageShell title="Category">
      <NekoCategoryContent />
    </NekoPageShell>
  )
}
