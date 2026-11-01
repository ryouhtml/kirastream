import { Shield } from 'lucide-react'
import CategoryPage from '@/components/CategoryPage'
import { fetchCategory } from '@/lib/api'

export default function Page() {
  return <CategoryPage titleKey="ak.tokusatsu" subtitleKey="ak.tokusatsu.sub" icon={Shield} fetcher={(p) => fetchCategory('tokusatsu', p)} />
}
