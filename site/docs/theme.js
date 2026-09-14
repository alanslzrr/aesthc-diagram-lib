// Apply the saved theme before body content paints; docs remain readable without JS.
try {
  const saved = localStorage.getItem('adl-theme')
  document.documentElement.dataset.theme =
    saved === 'dark' || saved === 'light'
      ? saved
      : matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
} catch {
  document.documentElement.dataset.theme = 'light'
}
