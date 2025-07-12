import { message } from '@/_helpers/browser-api'
import { Subject, combineLatest } from 'rxjs'
import { switchMapBy } from '@/_helpers/observables'
import { timer } from '@/_helpers/promise-more'
import { getConfig, createConfigStream, AppConfig } from '@/_helpers/config-manager'

interface UpdateBadgeOptions {
  active: boolean
  tempDisable: boolean
  unsupported: boolean
}

const onUpdated$ = new Subject<{
  delay?: boolean
  tabId: number
  options?: UpdateBadgeOptions
}>()

// Cache the latest config for synchronous access in title setters
let currentAppConfig: AppConfig | undefined

createConfigStream().subscribe(config => {
  currentAppConfig = config
  // Potentially re-render all visible badges if langCode or active status changed globally
  // This could be done by querying all tabs and re-triggering onUpdated$ for them,
  // or more simply, let them update upon next natural event (tab update, etc.)
  // For now, we'll rely on natural updates or specific calls to update badges.
})

onUpdated$
  .pipe(
    switchMapBy('tabId', async o => {
      if (o.options) {
        return { ...o, options: o.options } as Required<typeof o>
      }

      if (o.delay) {
        await timer(1000)
      }

      const config = currentAppConfig || await getConfig() // ensure config is available

      return {
        tabId: o.tabId,
        options: (await message
          .send<'GET_TAB_BADGE_INFO'>(o.tabId, {
            type: 'GET_TAB_BADGE_INFO'
          })
          .catch(() => {})) || {
          active: config.active, // Use fetched/current config
          tempDisable: false,
          unsupported: true
        }
      }
    })
  )
  .subscribe(({ tabId, options }) => {
    if (!options.active) {
      return setOff(tabId)
    }

    if (options.tempDisable) {
      return setTempOff(tabId)
    }

    if (options.unsupported) {
      return setUnsupported(tabId)
    }

    return setDefault(tabId)
  })

export async function initBadge() {
  currentAppConfig = await getConfig() // Initial fetch

  /** Sent when content script loaded */
  message.addListener('SEND_TAB_BADGE_INFO', ({ payload }, sender) => {
    if (sender.tab && sender.tab.id) {
      onUpdated$.next({ tabId: sender.tab.id, options: payload })
    }
  })

  browser.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
    if (changeInfo.status === 'complete') {
      onUpdated$.next({ tabId, delay: true })
    }
  })

  // Listen for global config changes that affect all badges (like app active state or lang code)
  // This is implicitly handled by `createConfigStream().subscribe` above, which updates currentAppConfig.
  // If a more immediate update of all badges is needed upon such a change, that logic would go into the subscription.
}

function setOff(tabId: number) {
  setIcon(true, tabId)
  const langCode = currentAppConfig ? currentAppConfig.langCode : 'en' // Fallback lang
  chrome.action.setTitle({ // Updated API
    title: require(`@/_locales/${langCode}/background`)
      .locale.app.off,
    tabId
  })
}

function setTempOff(tabId: number) {
  setIcon(true, tabId)
  const langCode = currentAppConfig ? currentAppConfig.langCode : 'en'
  chrome.action.setTitle({ // Updated API
    title: require(`@/_locales/${langCode}/background`)
      .locale.app.tempOff,
    tabId
  })
}

function setUnsupported(tabId: number) {
  setIcon(true, tabId)
  const langCode = currentAppConfig ? currentAppConfig.langCode : 'en'
  chrome.action.setTitle({ // Updated API
    title: require(`@/_locales/${langCode}/background`)
      .locale.app.unsupported,
    tabId
  })
}

function setDefault(tabId: number) {
  setIcon(false, tabId)
  // chrome.action.setBadgeText({ text: '', tabId }); // If badges are used
  chrome.action.setTitle({ title: '', tabId }) // Updated API
}

function setIcon(gray: boolean, tabId: number) {
  chrome.action.setIcon({ // Updated API
    tabId,
    path: gray
      ? {
          16: 'assets/icon-gray-16.png',
          19: 'assets/icon-gray-19.png',
          24: 'assets/icon-gray-24.png',
          38: 'assets/icon-gray-38.png',
          48: 'assets/icon-gray-48.png',
          128: 'assets/icon-gray-128.png'
        }
      : {
          16: 'assets/icon-16.png',
          19: 'assets/icon-19.png',
          24: 'assets/icon-24.png',
          38: 'assets/icon-38.png',
          48: 'assets/icon-48.png',
          128: 'assets/icon-128.png'
        }
  })
}
