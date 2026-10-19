export function pageHead(title: string, description: string, privatePage = false) {
 return { meta: [
  { title: `${title} — thriftsbyalisha` }, { name: 'description', content: description },
  { property: 'og:title', content: `${title} — thriftsbyalisha` }, { property: 'og:description', content: description },
  { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ...(privatePage ? [{ name: 'robots', content: 'noindex' }] : []),
 ] };
}
