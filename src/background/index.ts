import './env'
import './initialization'
// Import getters directly if needed by other modules, but background itself shouldn't cache them globally.
// import { getConfig, addConfigListener } from '@/_helpers/config-manager'
// import {
//   createActiveProfileStream,
//   createProfileIDListStream
// } from '@/_helpers/profile-manager'
import { message } from '@/_helpers/browser-api'
import { startSyncServiceInterval } from './sync-manager'
import { init as initPdf } from './pdf-sniffer'
import { ContextMenus } from './context-menus'
import { BackgroundServer } from './server'
import { initBadge } from './badge'
import { setupCaiyunTrsBackend } from './page-translate/caiyun'
import { setupRequestGAListener } from '@/_helpers/analytics'
import './types'

// init first to recevice self messaging
message.self.initServer()

startSyncServiceInterval()

ContextMenus.init() // Registers context menu listeners
BackgroundServer.init() // Registers message listeners

setupCaiyunTrsBackend()
setupRequestGAListener()

// Initialize modules that might need config.
// They will fetch the config themselves using getConfig() or listen to changes.
initPdf()
initBadge()

// No longer caching config, activeProfile, or profileIDList on a global `window` object.
// Modules that need these values should:
// 1. Call `getConfig()` from `@/_helpers/config-manager`
// 2. Call `getActiveProfile()` or `getProfileIDList()` from `@/_helpers/profile-manager`
// 3. Use `addConfigListener`, `createActiveProfileStream`, or `createProfileIDListStream`
//    to react to changes if necessary, directly within those modules.

console.log('Saladict Manifest V3 Service Worker Activated')
