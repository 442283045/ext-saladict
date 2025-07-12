export async function injectDictPanel(tab: browser.tabs.Tab | undefined) {
  if (tab && tab.id) {
    const tabId = tab.id
    const manifest = browser.runtime.getManifest()
    if (manifest.content_scripts) {
      for (const scriptConfig of manifest.content_scripts) {
        if (scriptConfig.js) {
          const files = scriptConfig.js.map(js => js[0] === '/' ? js : `/${js}`)
          if (files.length > 0) {
            await chrome.scripting.executeScript({
              target: { tabId: tabId, allFrames: scriptConfig.all_frames },
              files: files,
              // matchAboutBlank isn't directly available, behavior might differ or need explicit checks.
              // runAt isn't directly available in executeScript's top-level options for multiple files.
              // Injection happens as soon as possible by default.
              // If specific runAt is critical, it's more complex with scripting.executeScript for dynamic injection.
              // For manifest-defined content scripts, run_at is handled. Here, we are mimicking it.
            })
          }
        }
        if (scriptConfig.css) {
          const files = scriptConfig.css.map(css => css[0] === '/' ? css : `/${css}`)
          if (files.length > 0) {
            await chrome.scripting.insertCSS({
              target: { tabId: tabId, allFrames: scriptConfig.all_frames },
              files: files,
              // matchAboutBlank isn't directly available.
              // runAt isn't directly available in insertCSS. CSS is applied once files are loaded.
            })
          }
        }
      }
    }
  }
}
