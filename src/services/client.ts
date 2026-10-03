import type { Command, Response, Result } from "../types";

export const isExtension = () =>
  typeof chrome !== "undefined" && !!chrome.runtime?.id;
export async function request(command: Command): Promise<Result> {
  if (!isExtension())
    throw new Error(
      "Load the dist folder at chrome://extensions, then open Ayraç from the toolbar.",
    );
  const response = (await chrome.runtime.sendMessage({
    channel: "tabshelf",
    command,
  })) as Response;
  if (!response)
    throw new Error(
      "Ayraç did not respond. Reload the extension and try again.",
    );
  if (!response.ok) throw new Error(response.error);
  return response.result;
}
export async function currentWindowId(): Promise<number> {
  const window = await chrome.windows.getCurrent();
  if (window.id === undefined)
    throw new Error("Could not find the current Chrome window.");
  return window.id;
}
export function subscribe(callback: () => void): () => void {
  const events = [
    chrome.tabs.onCreated,
    chrome.tabs.onUpdated,
    chrome.tabs.onRemoved,
    chrome.tabs.onActivated,
    chrome.tabs.onAttached,
    chrome.tabs.onDetached,
    chrome.tabs.onMoved,
    chrome.storage.onChanged,
  ];
  for (const event of events) event.addListener(callback);
  return () => {
    for (const event of events) event.removeListener(callback);
  };
}
