import { Package } from 'lucide-react'
import CategoryPage from '@/components/CategoryPage'
import { fetchCategory } from '@/lib/api'

export default function Page() {
  return <CategoryPage titleKey="ak.batch" subtitleKey="ak.batch.sub" icon={Package} fetcher={(p) => fetchCategory('batch', p)} />
}
