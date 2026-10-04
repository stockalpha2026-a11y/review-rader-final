// Turns whatever the person pastes (long Google Maps link or a Place ID) into
// something ReviewRadar can scrape. Short share links are rejected on purpose:
// the review scraper cannot open them.
export interface GoogleTarget { placeId: string; mapsUrl?: string }

const SHORT = /(^|\/\/)(share\.google|maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs)/i

export function parseGoogleTarget(input: string): GoogleTarget | { error: string } {
  const v = input.trim()
  if (!v) return { error: 'Paste the Google Maps link or the Place ID.' }

  if (/^ChIJ[\w-]{10,}$/.test(v)) return { placeId: v }

  if (SHORT.test(v)) {
    return { error: 'That is a short share link, which cannot be used. Open it in your browser, wait for Google Maps to load, then copy the link from the address bar (it starts with https://www.google.com/maps/place/).' }
  }

  let url: URL
  try { url = new URL(v) } catch { return { error: 'This is not a valid link. It should start with https://www.google.com/maps/place/' } }
  if (!/(^|\.)google\.[a-z.]+$/i.test(url.hostname) || !url.pathname.startsWith('/maps')) {
    return { error: 'This is not a Google Maps place link. It should start with https://www.google.com/maps/place/' }
  }
  if (!url.pathname.startsWith('/maps/place')) {
    return { error: 'Open the business itself on Google Maps (click its name), then copy the link again. It should contain /maps/place/.' }
  }

  const embedded = v.match(/ChIJ[\w-]{10,}/)
  if (embedded) return { placeId: embedded[0], mapsUrl: v }

  // No Place ID inside the link: derive a stable id from the place part of the path.
  const key = decodeURIComponent(url.pathname)
  let h = 5381
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h + key.charCodeAt(i)) >>> 0
  return { placeId: 'gm_' + h.toString(16), mapsUrl: v }
}
