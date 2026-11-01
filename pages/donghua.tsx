import { Sparkles } from 'lucide-react'
import CategoryPage from '@/components/CategoryPage'
import { fetchCategory } from '@/lib/api'

export default function Page() {
  return <CategoryPage titleKey="ak.donghua" subtitleKey="ak.donghua.sub" icon={Sparkles} fetcher={(p) => fetchCategory('donghua', p)} />
}
