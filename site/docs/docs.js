// Progressive enhancements only: every documentation page and link works
// without this module. Diagram data is never evaluated as code.
document.documentElement.dataset.enhanced = 'true'
const themeButton = document.querySelector('[data-theme-toggle]')
function setTheme(theme) {
  document.documentElement.dataset.theme = theme
  if (themeButton) {
    themeButton.textContent = theme === 'dark' ? 'Dark' : 'Light'
    themeButton.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`)
  }
}
try {
  setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
} catch {
  setTheme('light')
}
themeButton?.addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
  setTheme(theme)
  try {
    localStorage.setItem('adl-theme', theme)
  } catch {
    /* Private browsing can disable storage. */
  }
})

async function copy(button, text) {
  const label = button.textContent
  try {
    await navigator.clipboard.writeText(text)
    button.textContent = 'Copied'
    document.querySelector('[data-copy-status]').textContent = 'Copied to clipboard'
  } catch {
    button.textContent = 'Copy failed'
    document.querySelector('[data-copy-status]').textContent =
      'Copy failed. Select the code and copy it manually.'
  }
  setTimeout(() => {
    button.textContent = label
  }, 1800)
}
document.querySelectorAll('[data-copy-code]').forEach((button) => {
  button.addEventListener('click', () =>
    copy(button, button.closest('.code-block').querySelector('code').textContent),
  )
})
document.querySelector('[data-copy-agent]')?.addEventListener('click', (event) => {
  const button = event.currentTarget
  void copy(button, button.closest('.agent-request').querySelector('blockquote').textContent.trim())
})
let manager = 'npm'
try {
  manager = localStorage.getItem('adl-package-manager') ?? 'npm'
} catch {
  /* Keep the default. */
}
if (!['npm', 'pnpm', 'yarn', 'bun'].includes(manager)) manager = 'npm'
function selectManager(value) {
  manager = value
  document.querySelectorAll('[data-package-command]').forEach((block) => {
    block.querySelector('code').textContent = block.dataset[value]
    block.querySelectorAll('[data-manager]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.manager === value))
    })
  })
}
selectManager(manager)
document.querySelectorAll('[data-manager]').forEach((button) =>
  button.addEventListener('click', () => {
    selectManager(button.dataset.manager)
    try {
      localStorage.setItem('adl-package-manager', manager)
    } catch {
      /* Non-persistent preference still works. */
    }
  }),
)

const dialog = document.querySelector('.search-dialog')
const searchInput = dialog.querySelector('input')
const results = dialog.querySelector('.search-results')
const status = dialog.querySelector('.search-status')
let pages
async function search() {
  if (!pages) {
    try {
      const response = await fetch(
        document.querySelector('[data-search-index]').dataset.searchIndex,
      )
      if (!response.ok) throw Error('Search index unavailable')
      pages = await response.json()
    } catch {
      status.textContent = 'Search is unavailable. Use the navigation to browse documentation.'
      return
    }
  }
  const query = searchInput.value.toLocaleLowerCase().trim()
  const terms = query.split(/\s+/).filter(Boolean)
  const found = pages
    .filter((page) =>
      terms.every((term) => `${page.title} ${page.text}`.toLocaleLowerCase().includes(term)),
    )
    .sort((a, b) => {
      const score = (page) =>
        terms.reduce((sum, term) => sum + Number(page.title.toLocaleLowerCase().includes(term)), 0)
      return score(b) - score(a)
    })
    .slice(0, 12)
  results.replaceChildren()
  for (const page of found) {
    const link = document.createElement('a')
    const versionPath = location.pathname.match(/^(.*\/versions\/[^/]+\/)/)?.[1]
    const base = document
      .querySelector('[data-search-index]')
      .dataset.searchIndex.replace('docs-assets/search.json', '')
    link.href = versionPath ? versionPath + page.url.slice(base.length) : page.url
    const title = document.createElement('span')
    title.textContent = page.title
    const description = document.createElement('small')
    description.textContent = page.description
    link.append(title, description)
    results.append(link)
  }
  status.textContent = query ? `${found.length} results` : 'Browse documentation or type to search'
}
function openSearch() {
  if (!dialog.open) dialog.showModal()
  searchInput.focus()
  void search()
}
document.querySelector('[data-open-search]')?.addEventListener('click', openSearch)
dialog.querySelector('[data-close-search]').addEventListener('click', () => dialog.close())
dialog.querySelector('form').addEventListener('submit', (event) => {
  event.preventDefault()
  results.querySelector('a')?.click()
})
searchInput.addEventListener('input', () => {
  void search()
})
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    openSearch()
  }
  if (dialog.open && event.key === 'Escape') {
    event.preventDefault()
    dialog.close()
  }
  if (dialog.open && event.key === 'ArrowDown') {
    event.preventDefault()
    const links = Array.from(results.querySelectorAll('a'))
    const current = links.indexOf(document.activeElement)
    links[(current + 1) % links.length]?.focus()
  }
  if (dialog.open && event.key === 'ArrowUp') {
    event.preventDefault()
    const links = Array.from(results.querySelectorAll('a'))
    const current = links.indexOf(document.activeElement)
    if (current <= 0) searchInput.focus()
    else links[current - 1].focus()
  }
})
// Inline mobile disclosure, not a modal/menu: keep native details semantics.
const mobileNav = document.querySelector('.mobile-nav')
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !event.defaultPrevented && mobileNav.open && !dialog.open) {
    event.preventDefault()
    mobileNav.open = false
    mobileNav.querySelector('summary').focus()
  }
})
mobileNav.querySelector('nav').addEventListener('click', (event) => {
  if (event.target.closest('a')) mobileNav.open = false
})

// Highlight the current section without hijacking native hash navigation.
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        document.querySelectorAll('.toc a[href^="#"]').forEach((link) => {
          if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location')
          else link.removeAttribute('aria-current')
        })
      }
    },
    { rootMargin: '-100px 0px -65% 0px' },
  )
  document
    .querySelectorAll('.article h2[id], .article h3[id]')
    .forEach((heading) => observer.observe(heading))
}
