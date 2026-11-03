import { Film } from 'lucide-react'
import CategoryPage from '@/components/CategoryPage'
import { fetchCategory } from '@/lib/api'

export default function Page() {
  return <CategoryPage titleKey="ak.liveaction" subtitleKey="ak.liveaction.sub" icon={Film} fetcher={(p) => fetchCategory('live-action', p)} />
}
