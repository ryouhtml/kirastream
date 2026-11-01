import { CalendarClock } from 'lucide-react'
import CategoryPage from '@/components/CategoryPage'
import { fetchCategory } from '@/lib/api'

export default function Page() {
  return <CategoryPage titleKey="ak.upcoming" subtitleKey="ak.upcoming.sub" icon={CalendarClock} fetcher={(p) => fetchCategory('upcoming', p)} />
}
