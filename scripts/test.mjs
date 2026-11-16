// Minimal harness for the notification watcher: no DOM, no DSH host.
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const sent = []
class FakeNotification {
  static permission = 'granted'
  static requestPermission = async () => 'granted'
  constructor(title, options) {
    this.title = title
    this.options = options || {}
    sent.push(this)
  }
  close() {}
}

globalThis.Notification = FakeNotification
Object.defineProperty(globalThis, 'navigator', { value: { language: 'zh-CN' }, configurable: true })

const store = new Map()
globalThis.window = {
  localStorage: {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
  },
  focus() {},
  __ModuleLoader__: { load(config) { globalThis.__loaded = config } },
}

const subscribers = new Set()
const observable = {
  subscribe(listener) { subscribers.add(listener); return () => subscribers.delete(listener) },
  getSnapshot() { return current },
}
let current = new Map()
const emit = (map) => { current = new Map(map); for (const fn of [...subscribers]) fn() }

const cleanups = []
const ctx = {
  get(name) {
    if (name === 'sessions') return { list: { getSnapshot: () => ({ byId: { s1: { title: '演示会话' } } }) } }
    if (name === 'uiSession') return { sessionStatus: observable }
    return undefined
  },
  effect(fn) { const off = fn(); cleanups.push(off); return off },
  slots: { inject(_name, cb) { cb() }, register() { return () => {} } },
}

await import(pathToFileURL(resolve('client.js')).href)
const module = globalThis.__loaded.factory((id) => {
  if (id === 'react') return { createElement: (...args) => args, useState: (value) => [value, () => {}] }
  throw new Error('unexpected require: ' + id)
})
module.apply(ctx)

const step = (running, kind) => emit([['s1', { running, pendingInteraction: kind === null ? undefined : { kind } }]])
step(true, null)
step(false, null)
step(false, 'approval')
step(false, 'question')
if (sent.length !== 3) throw new Error('expected 3 notifications, got ' + sent.length)
if (!String(sent[0].options.body).includes('演示会话')) throw new Error('completion body missing title')
if (!String(sent[1].options.body).includes('审批')) throw new Error('approval body missing')
if (!String(sent[2].options.body).includes('回答')) throw new Error('question body missing')

store.set('dsh-system-notifications.settings.v1', JSON.stringify({ completion: false }))
step(true, 'question')
step(false, 'question')
if (sent.length !== 3) throw new Error('disabled completion still notified')

for (const off of cleanups) if (typeof off === 'function') off()
console.log('notification watcher: ok')
