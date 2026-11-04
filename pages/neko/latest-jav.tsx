import { Film } from 'lucide-react'
import NekoArchive from '@/components/NekoArchive'
import NekoPageShell from '@/components/NekoPageShell'
import { fetchNekoLatestJav } from '@/lib/neko'
import { useSettings } from '@/contexts/SettingsContext'
import { translate } from '@/lib/i18n'

export default function NekoLatestJavPage() {
  const { language } = useSettings()
  const t = (key: string) => translate(language, key)

  return (
    <NekoPageShell title={t('neko.latestJav')}>
      <NekoArchive
        title={t('neko.latestJav')}
        subtitle={t('neko.latestJav.sub')}
        icon={Film}
        fetcher={(page) => fetchNekoLatestJav(page)}
      />
    </NekoPageShell>
  )
}
