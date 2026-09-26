// Shared pre-paint preference, before React hydration.
let preference = 'system'
try {
  const saved = localStorage.getItem('adl-theme')
  if (saved === 'dark' || saved === 'light') preference = saved
} catch {
  /* Use system when storage is blocked. */
}
document.documentElement.dataset.themePreference = preference
document.documentElement.dataset.theme =
  preference === 'system'
    ? matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    : preference
