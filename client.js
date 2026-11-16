// SPDX-License-Identifier: MIT
window.__ModuleLoader__.load({
  id: 'dsh-system-notifications',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const PKG = 'dsh-system-notifications'
    const STORAGE_KEY = 'dsh-system-notifications.settings.v1'
    const DEFAULTS = { completion: true, approval: true, question: true, sound: false }

    function isZh() {
      try { return String(navigator.language || '').toLowerCase().startsWith('zh') } catch { return false }
    }

    function loadSettings() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        const parsed = raw === null ? {} : JSON.parse(raw)
        return { ...DEFAULTS, ...(parsed !== null && typeof parsed === 'object' ? parsed : {}) }
      } catch { return { ...DEFAULTS } }
    }

    function saveSettings(settings) {
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)) } catch { /* private mode */ }
    }

    function permission() {
      try {
        if (typeof Notification === 'undefined') return 'unsupported'
        return Notification.permission
      } catch { return 'unsupported' }
    }

    function notify(kind, sessionId, extra) {
      const settings = loadSettings()
      if (settings[kind] !== true) return
      if (permission() !== 'granted') return
      const zh = isZh()
      const session = titleFor(sessionId)
      let body
      if (kind === 'completion') body = zh ? `「${session}」已完成` : `"${session}" finished`
      else if (kind === 'approval') body = zh ? `「${session}」等待审批` : `"${session}" is waiting for approval`
      else body = extra === 'plan-review'
        ? (zh ? `「${session}」的计划待审阅` : `"${session}" has a plan to review`)
        : (zh ? `「${session}」等待你的回答` : `"${session}" is waiting for your answer`)
      try {
        const notice = new Notification('DeepSeek Harness', {
          body,
          tag: `${kind}:${String(sessionId)}`,
          silent: settings.sound !== true,
          renotify: true,
          timestamp: Date.now(),
        })
        notice.onclick = () => {
          try { window.focus() } catch { /* ignored */ }
          try { notice.close() } catch { /* ignored */ }
        }
      } catch { /* the OS or browser refused the notice */ }
    }

    let sessionsService
    function titleFor(sessionId) {
      const fallback = isZh() ? '会话' : 'Session'
      try {
        const snapshot = sessionsService?.list?.getSnapshot?.()
        const row = snapshot?.byId?.[sessionId] ?? snapshot?.byId?.[String(sessionId)]
        const title = row?.title ?? row?.name ?? row?.summary
        return typeof title === 'string' && title.trim() !== '' ? title.trim() : fallback
      } catch { return fallback }
    }

    function Settings() {
      const [settings, setSettings] = React.useState(loadSettings)
      const [perm, setPerm] = React.useState(permission)
      const zh = isZh()

      const update = (patch) => {
        const next = { ...settings, ...patch }
        saveSettings(next)
        setSettings(next)
      }

      const requestPermission = async () => {
        try {
          if (typeof Notification === 'undefined' || typeof Notification.requestPermission !== 'function') return
          const result = await Notification.requestPermission()
          setPerm(result)
        } catch { setPerm(permission()) }
      }

      const test = async () => {
        if (permission() === 'default') await requestPermission()
        if (permission() !== 'granted') return
        try {
          const notice = new Notification('DeepSeek Harness', {
            body: zh ? '通知已接通，后台任务完成、审批与提问会在这里提醒你。' : 'Notifications are working. Completion, approval, and question alerts appear here.',
          })
          notice.onclick = () => { try { window.focus() } catch { /* ignored */ } }
        } catch { /* ignored */ }
      }

      const row = (title, description, control) => h('div', {
        style: {
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24,
          padding: '14px 0', borderBottom: '.5px solid var(--dsw-alias-border-l1, rgba(127,127,127,.25))',
        },
      },
        h('div', { style: { minWidth: 0 } },
          h('div', { style: { fontSize: 13, color: 'var(--dsw-alias-label-primary, inherit)' } }, title),
          h('div', { style: { fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary, rgba(127,127,127,.9))', marginTop: 2 } }, description)),
        control)

      const toggle = (key, label) => h('input', {
        type: 'checkbox', checked: settings[key] === true, 'aria-label': label,
        style: { width: 16, height: 16, cursor: 'pointer' },
        onChange: (event) => update({ [key]: event.target.checked }),
      })

      const permText = perm === 'granted'
        ? (zh ? '已允许' : 'Allowed')
        : perm === 'denied'
          ? (zh ? '已被系统拒绝，请在系统设置中允许 DSH 通知' : 'Denied by the system; allow DSH notifications in system settings')
          : perm === 'unsupported'
            ? (zh ? '当前客户端不支持系统通知' : 'This client does not support system notifications')
            : (zh ? '尚未授权' : 'Not granted yet')

      return h('div', { 'data-dsh-system-notifications-settings': '' },
        h('div', { style: { paddingBottom: 6, fontSize: 14, fontWeight: 600 } }, zh ? '系统通知' : 'System notifications'),
        h('div', { style: { fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary, rgba(127,127,127,.9))', paddingBottom: 8 } },
          zh
            ? '在后台任务完成、需要你审批或需要你回答时弹出系统通知。通知跟随系统权限，DSH 关闭时不会发送。'
            : 'Show a system notification when a background turn finishes, an approval is requested, or an answer is needed. Notifications follow OS permission and are not sent while DSH is closed.'),
        row(zh ? '通知权限' : 'Notification permission', permText,
          h('button', {
            type: 'button',
            onClick: requestPermission,
            disabled: perm === 'unsupported' || perm === 'granted',
            style: {
              padding: '5px 12px', borderRadius: 6, cursor: perm === 'unsupported' || perm === 'granted' ? 'default' : 'pointer',
              border: '.5px solid var(--dsw-alias-border-l1, rgba(127,127,127,.4))',
              background: 'var(--dsw-alias-bg-l2, transparent)', color: 'var(--dsw-alias-label-primary, inherit)',
              opacity: perm === 'unsupported' || perm === 'granted' ? .55 : 1,
            },
          }, zh ? '请求授权' : 'Allow')),
        row(zh ? '回合完成' : 'Turn completed',
          zh ? '后台会话的一轮回答结束时提醒，标题带上会话名。' : 'Notify when a turn in a background session finishes, with the session title.',
          toggle('completion', zh ? '回合完成通知' : 'Turn completion notification')),
        row(zh ? '等待审批' : 'Approval requested',
          zh ? 'Agent 请求你批准一次敏感操作时提醒。' : 'Notify when an agent asks you to approve a sensitive action.',
          toggle('approval', zh ? '审批通知' : 'Approval notification')),
        row(zh ? '等待回答' : 'Answer needed',
          zh ? 'Agent 向你提问或提交计划等待审阅时提醒。' : 'Notify when an agent asks you a question or submits a plan for review.',
          toggle('question', zh ? '提问通知' : 'Question notification')),
        row(zh ? '提示音' : 'Sound',
          zh ? '跟随系统通知声音；关闭后静默弹出。' : 'Use the system notification sound; when off, notices appear silently.',
          toggle('sound', zh ? '通知提示音' : 'Notification sound')),
        h('div', { style: { display: 'flex', justifyContent: 'flex-end', paddingTop: 14 } },
          h('button', {
            type: 'button',
            onClick: test,
            style: {
              padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
              border: '.5px solid var(--dsw-alias-border-l1, rgba(127,127,127,.4))',
              background: 'var(--dsw-alias-bg-l2, transparent)', color: 'var(--dsw-alias-label-primary, inherit)',
            },
          }, zh ? '发送测试通知' : 'Send test notification')))
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        sessionsService = ctx.get('sessions')
        const ui = ctx.get('uiSession')
        if (ui?.sessionStatus?.subscribe !== undefined) {
          let previous = new Map()
          ctx.effect(() => ui.sessionStatus.subscribe(() => {
            const snapshot = ui.sessionStatus.getSnapshot()
            const next = new Map()
            for (const [id, status] of snapshot) {
              const running = status?.running === true
              const kind = status?.pendingInteraction?.kind ?? null
              const before = previous.get(id)
              if (before !== undefined) {
                if (before.running && !running) notify('completion', id)
                if (kind !== null && kind !== before.kind) {
                  if (kind === 'approval') notify('approval', id)
                  else if (kind === 'question' || kind === 'plan-review') notify('question', id, kind)
                }
              }
              next.set(id, { running, kind })
            }
            previous = next
          }), 'dsh-system-notifications: session status watcher')
        }

        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: PKG,
          order: 96,
          label: () => (isZh() ? '系统通知' : 'Notifications'),
        }, Settings))
      },
    }
  },
})
