import type { NextApiRequest, NextApiResponse } from 'next'
import * as cheerio from 'cheerio'
import { fetchRemote, RemoteFetchError } from '@/lib/server-proxy'

const BASE = 'https://www.webtoons.com'
const WEBTOON_HOSTS = ['webtoons.com']

async function fetchHtml(path: string) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`
  const { data } = await fetchRemote(url, {
    allowHosts: WEBTOON_HOSTS,
    protocols: ['https:'],
    timeoutMs: 10_000,
    maxBytes: 5 * 1024 * 1024,
    // Redirect tetap diizinkan, tapi setiap hop divalidasi ulang terhadap
    // allowHosts + https oleh fetchRemote.
    maxRedirects: 2,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Referer: 'https://www.webtoons.com/',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    },
  })
  return data.toString('utf8')
}

function uniqueByUrl(items: Array<Record<string, unknown>>) {
  return items.filter((item, index, arr) => arr.findIndex((x) => x.url === item.url) === index)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { action, query, url, day } = req.query

  try {
    if (action === 'trending') {
      const d = String(day || 'trending').toLowerCase()
      const path = d === 'completed' ? '/id/originals/completed' : d === 'daily' || d === 'trending' ? '/id/dailySchedule' : `/id/originals/${d}`
      const html = await fetchHtml(path)
      const $ = cheerio.load(html)
      const items: Array<Record<string, unknown>> = []

      $("a[href*='/list?title_no=']").each((_, el) => {
        const $a = $(el)
        const href = $a.attr('href') || ''
        if (!href) return
        const absUrl = href.startsWith('http') ? href : `${BASE}${href}`
        const title = $a.find('.subj, p.subj, strong.title').first().text().trim() || $a.attr('title')?.trim() || 'Untitled'
        const thumbnail = $a.find('img').first().attr('data-url') || $a.find('img').first().attr('src') || ''
        items.push({ title, thumbnail, url: absUrl.split('&webtoon-platform-redirect')[0] })
      })

      return res.status(200).json({ items: uniqueByUrl(items) })
    }

    if (action === 'search') {
      const html = await fetchHtml(`/id/search?keyword=${encodeURIComponent(String(query || ''))}`)
      const $ = cheerio.load(html)
      const items: Array<Record<string, unknown>> = []

      $("a[href*='/list?title_no=']").each((_, el) => {
        const $a = $(el)
        const href = $a.attr('href') || ''
        if (!href) return
        const absUrl = href.startsWith('http') ? href : `${BASE}${href}`
        const title = $a.find('strong.title, p.subj, .subj').first().text().trim() || 'Untitled'
        const thumbnail = $a.find('img').first().attr('data-url') || $a.find('img').first().attr('src') || ''
        items.push({ title, thumbnail, url: absUrl.split('&')[0] })
      })

      return res.status(200).json({ items: uniqueByUrl(items) })
    }

    if (action === 'detail') {
      const html = await fetchHtml(String(url || ''))
      const $ = cheerio.load(html)
      const title = $('h1.subj, h3.subj, .info .subj').first().text().trim() ||
        $('meta[property="og:title"]').attr('content') || ''
      const thumbnail = $('.detail_header .thmb img, .detail_bg img').first().attr('src') ||
        $('meta[property="og:image"]').attr('content') || ''
      const synopsis = $('p.summary, .detail_body .summary').first().text().trim() ||
        $('meta[property="og:description"]').attr('content') || ''
      const episodes: Array<Record<string, unknown>> = []

      $('#_listUl > li, ul#_listUl > li').each((_, el) => {
        const $li = $(el)
        const $a = $li.find('a').first()
        const href = $a.attr('href') || ''
        if (!href) return
        const epNo = Number($li.attr('data-episode-no')) || Number(href.match(/episode_no=(\d+)/)?.[1]) || null
        episodes.push({
          episodeNo: epNo,
          title: $a.find('.subj span, .subj').first().text().trim() || $a.attr('title')?.trim() || $a.text().trim(),
          thumbnail: $a.find('.thmb img, img').first().attr('src') || '',
          url: href.startsWith('http') ? href : `${BASE}${href}`,
        })
      })

      return res.status(200).json({ title, thumbnail, synopsis, url, episodes })
    }

    if (action === 'pages') {
      const html = await fetchHtml(String(url || ''))
      const $ = cheerio.load(html)
      const images: string[] = []

      $('#_imageList img').each((_, el) => {
        const src = $(el).attr('data-url') || $(el).attr('src')
        if (src) images.push(src)
      })

      return res.status(200).json({ images })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (error) {
    console.error('Novel API error:', error instanceof Error ? error.message : error)
    const status = error instanceof RemoteFetchError ? error.status : 502
    return res.status(status).json({ error: 'Gagal mengambil data dari sumber' })
  }
}
