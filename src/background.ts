import type { Command, Response } from "./types";
import { execute } from "./services/commands";
import { readState, writeAssignment } from "./services/chromeStorage";

// A single writer prevents lost updates when several windows have panels open.
// The queue is transient; all user data is persisted before an action completes.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(action: () => Promise<T>): Promise<T> {
  const next = queue.then(action);
  queue = next.catch(() => undefined);
  return next;
}
async function setup() {
  await chrome.storage.local.setAccessLevel({
    accessLevel: "TRUSTED_CONTEXTS",
  });
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  await readState();
}
chrome.runtime.onInstalled.addListener(() => {
  void serial(setup).catch(console.error);
});
chrome.runtime.onStartup.addListener(() => {
  void serial(setup).catch(console.error);
});
chrome.tabs.onRemoved.addListener((tabId) => {
  void serial(() => writeAssignment(tabId)).catch(console.error);
});
chrome.runtime.onMessage.addListener(
  (
    message: { channel?: string; command?: Command },
    sender,
    sendResponse: (response: Response) => void,
  ) => {
    if (
      sender.id !== chrome.runtime.id ||
      sender.url !== chrome.runtime.getURL("sidepanel.html") ||
      message?.channel !== "tabshelf" ||
      !message.command
    )
      return false;
    serial(() => execute(message.command!)).then(
      (result) => sendResponse({ ok: true, result }),
      (error) =>
        sendResponse({
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Action failed. Please try again.",
        }),
    );
    return true;
  },
);
