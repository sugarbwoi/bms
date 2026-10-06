/* ============================================================
   KUDII — Document head / SEO
   Keeps the public marketing site indexable and keeps the
   signed-in application out of search engines.

   The public site is indexable; every authenticated screen and
   every auth screen is marked noindex, nofollow at runtime so
   private business data is never crawled or surfaced.
   ============================================================ */

export const SITE_URL = 'https://kudiiofficial.com'
export const SITE_NAME = 'KUDII'
export const DEFAULT_TITLE = 'KUDII — Know your money. Feel in control.'
export const DEFAULT_DESCRIPTION =
  'KUDII gives small businesses a calmer way to manage customers, products, sales and money — all in one place. Know what happened, what is owed, and what to do next.'

/** Public, indexable marketing routes and their unique metadata. */
export const PUBLIC_META: Record<string, { title: string; description: string }> = {
  '/': {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  '/how-it-works': {
    title: 'How KUDII works — customers, sales, invoices and money',
    description:
      'See how KUDII connects products, customers, sales, payments and money so every figure stays accurate — and only recorded payments count as income.',
  },
  '/pricing': {
    title: 'KUDII pricing — Free, Go and Plus plans',
    description:
      'KUDII Free is ₦0/month, Go is ₦5,000/month and Plus is ₦20,000/month. Compare product and business limits, then upgrade only when you need to.',
  },
  '/security': {
    title: 'KUDII security — how your business data is protected',
    description:
      'How KUDII protects your account and business data: secure email sign-in, session control, isolated business workspaces and honest data handling.',
  },
  '/faq': {
    title: 'KUDII FAQ — common questions answered',
    description:
      'Answers to common questions about KUDII: what counts as income, how invoices and payments work, plans, and managing more than one business.',
  },
  '/get-started': {
    title: 'Get started with KUDII — set up your business in minutes',
    description:
      'Create your KUDII account, add your business, products and customers, and start recording sales and payments in minutes.',
  },
}

/** Routes that must never be indexed (the signed-in app + auth). */
const PRIVATE_PREFIXES = [
  '/sign-in',
  '/sign-up',
  '/reset',
  '/verify',
  '/onboarding',
  '/customers',
  '/products',
  '/sales',
  '/transactions',
  '/money',
  '/invoices',
  '/activity',
  '/progress',
  '/settings',
  '/jobs', // legacy, retired
]

export function isPublicPath(path: string): boolean {
  return Object.prototype.hasOwnProperty.call(PUBLIC_META, path)
}

export function isPrivatePath(path: string): boolean {
  if (isPublicPath(path)) return false
  return PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(p + '/'))
}

/* ---------------- DOM helpers ---------------- */

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  if (typeof document === 'undefined') return
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href: string) {
  if (typeof document === 'undefined') return
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/**
 * Apply head metadata for the current route.
 * Public routes: indexable with unique title/description/canonical.
 * Private routes: noindex, nofollow and a generic app title.
 *
 * `signedIn` matters because "/" is the marketing homepage for visitors but
 * the dashboard for signed-in users — so it must not be indexed once signed in.
 */
export function applyHead(path: string, signedIn = false) {
  if (typeof document === 'undefined') return

  if (isPublicPath(path) && !signedIn) {
    const meta = PUBLIC_META[path]
    const url = path === '/' ? `${SITE_URL}/` : `${SITE_URL}/#${path}`
    document.title = meta.title
    setMeta('name', 'description', meta.description)
    setMeta('name', 'robots', 'index, follow')
    setCanonical(url)
    setMeta('property', 'og:title', meta.title)
    setMeta('property', 'og:description', meta.description)
    setMeta('property', 'og:url', url)
    setMeta('name', 'twitter:title', meta.title)
    setMeta('name', 'twitter:description', meta.description)
    return
  }

  // Everything else is the private application.
  document.title = `${SITE_NAME} — Business workspace`
  setMeta('name', 'robots', 'noindex, nofollow')
  setMeta('name', 'description', 'Signed-in KUDII business workspace. Private — not for search engines.')
  setCanonical(`${SITE_URL}/`)
}
