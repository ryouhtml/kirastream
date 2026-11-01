import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query

  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'URL missing' })

  let referer = 'https://myanimelist.net/'
  try { referer = new URL(url).origin + '/' } catch { /* keep default */ }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': referer,
      }
    })

    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`)

    const buffer = Buffer.from(await response.arrayBuffer())
    res.setHeader('Content-Type', response.headers.get('content-type') || 'image/jpeg')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    return res.status(200).send(buffer)
  } catch (error) {
    console.error('Proxy Error:', error)
    return res.status(500).json({ error: 'Proxy failed' })
  }
}
