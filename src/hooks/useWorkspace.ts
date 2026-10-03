import { useCallback, useEffect, useRef, useState } from "react";
import type { Command, Snapshot } from "../types";
import { localizeMessage } from "../utils/presentation";
import {
  currentWindowId,
  isExtension,
  request,
  subscribe,
} from "../services/client";

export function useWorkspace() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [windowId, setWindowId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [undoToken, setUndoToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const refresh = useCallback(async () => {
    if (windowId === null) return;
    const result = await request({ type: "snapshot", windowId });
    if (result.snapshot) setSnapshot(result.snapshot);
  }, [windowId]);
  useEffect(() => {
    if (!isExtension()) {
      setError(
        "Chrome’da chrome://extensions sayfasından dist klasörünü yükle, ardından Ayraç simgesine tıkla.",
      );
      return;
    }
    currentWindowId()
      .then(setWindowId)
      .catch((e) => setError(localizeMessage(String(e))));
  }, []);
  useEffect(() => {
    if (windowId === null) return;
    let timer: ReturnType<typeof setTimeout>;
    const load = () => {
      void refresh().catch((e) => setError(localizeMessage(e.message)));
    };
    load();
    const unsubscribe = subscribe(() => {
      clearTimeout(timer);
      timer = setTimeout(load, 80);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [windowId, refresh]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5500);
    return () => clearTimeout(timer);
  }, [notice]);
  const act = async (command: Command | Command[]): Promise<boolean> => {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    let completed = 0;
    try {
      const commands = Array.isArray(command) ? command : [command];
      for (const action of commands) {
        const result = await request(action);
        completed++;
        setUndoToken(result.undoToken ?? null);
        if (result.notice) setNotice(localizeMessage(result.notice));
      }
      if (commands.length > 1) setNotice(`${completed} sekme güncellendi.`);
      await refresh();
      return true;
    } catch (e) {
      setError(
        `${completed ? `${completed} işlem tamamlandı. ` : ""}${e instanceof Error ? localizeMessage(e.message) : "İşlem tamamlanamadı."}`,
      );
      await refresh().catch(() => undefined);
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return {
    snapshot,
    undoToken,
    windowId,
    error,
    notice,
    busy,
    act,
    dismissError: () => setError(""),
    refresh,
  };
}
