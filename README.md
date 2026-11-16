# dsh-system-notifications

System notifications for **DeepSeek Harness (DSH)** — turn completion, approval requests, and questions, each with its own switch.

DSH currently shows an in-app “completed” dot for background sessions, but it does not raise an OS notification. This plugin fills that gap: it watches `uiSession.sessionStatus` and raises a native notification when:

- a turn finishes (`running: true → false`)
- an approval is requested (`pendingInteraction.kind === 'approval'`)
- a question or plan review is waiting (`question` / `plan-review`)

## Features

- Three independent switches: **Turn completed**, **Approval requested**, **Answer needed**
- Optional system notification sound
- Permission status and a **Request permission** button
- **Send test notification** button
- Clicking a notification focuses the DSH window
- Settings persist in the browser profile
- No host process, no extra model calls, no polling

## Install

From GitHub:

```bash
dsh plugin --profile desktop add github:hexiao160705-dev/dsh-system-notifications
```

From a checkout:

```bash
dsh plugin --profile desktop add /absolute/path/to/dsh-system-notifications
```

Or in DSH: **Plugins → Add plugin** and enter the GitHub spec above, or pick the local directory. The package is not published to npm yet.

Then reload/restart DSH. Open **Settings → System notifications** to grant notification permission and choose which events should notify.

## Requirements

- DSH Desktop or `dsh web` (web client platform)
- OS permission to show notifications from DeepSeek Harness
- DSH must be running; notifications are not delivered while the app is closed

## Limitations

- Uses the browser/Electron `Notification` API, so it follows the OS notification center and Do Not Disturb settings.
- A browser tab that is fully backgrounded may throttle timers; this plugin is event-driven, so it does not depend on a timer.
- Session titles come from the host session list; a session without a title falls back to “会话 / Session”.

## Development

`client.js` is the whole UI half; `index.js` is an empty host half so the bundle can be enabled and removed like any other. Settings are stored under the `dsh-system-notifications.settings.v1` key.

## License

MIT
