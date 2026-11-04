import { Flame } from 'lucide-react'
import NekoArchive from '@/components/NekoArchive'
import NekoPageShell from '@/components/NekoPageShell'
import { fetchNekoLatestHentai } from '@/lib/neko'
import { useSettings } from '@/contexts/SettingsContext'
import { translate } from '@/lib/i18n'

export default function NekoLatestHentaiPage() {
  const { language } = useSettings()
  const t = (key: string) => translate(language, key)

  return (
    <NekoPageShell title={t('neko.latestHentai')}>
      <NekoArchive
        title={t('neko.latestHentai')}
        subtitle={t('neko.latestHentai.sub')}
        icon={Flame}
        fetcher={(page) => fetchNekoLatestHentai(page)}
      />
    </NekoPageShell>
  )
}
