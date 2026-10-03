import { useState } from "react";
import type {
  Category,
  Command,
  OpenTab,
  SavedTab,
  TabStatus,
} from "../../types";
import { statuses } from "../../utils/model";
import { statusName } from "../../utils/presentation";
import { CategorySelect, Modal } from "../Shared";

export function PageDialog({
  item,
  previous,
  openTab,
  categories,
  busy,
  act,
  onClose,
  onRemove,
}: {
  item?: SavedTab;
  previous?: SavedTab;
  openTab?: OpenTab;
  categories: Category[];
  busy: boolean;
  act: (command: Command) => Promise<boolean>;
  onClose: () => void;
  onRemove: () => void;
}) {
  const [categoryId, setCategoryId] = useState(
    item?.categoryId ?? openTab?.categoryId ?? null,
  );
  const [note, setNote] = useState(item?.note ?? previous?.note ?? "");
  const [favorite, setFavorite] = useState(
    item?.favorite ?? previous?.favorite ?? false,
  );
  const [status, setStatus] = useState<TabStatus>(item?.status ?? "");
  const options =
    statuses[categories.find((c) => c.id === categoryId)?.kind ?? "general"];
  return (
    <Modal
      title={item ? "Kaydı düzenle" : "Sekmeyi kaydet"}
      onClose={onClose}
      busy={busy}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const close =
            (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") ===
            "park";
          const command: Command = item
            ? {
                type: "saved.update",
                id: item.id,
                categoryId,
                note,
                favorite,
                status: options.includes(status) ? status : "",
              }
            : {
                type: "tab.save",
                tabId: openTab!.id,
                url: openTab!.url,
                categoryId,
                note,
                close,
                favorite,
              };
          if (await act(command)) onClose();
        }}
      >
        <fieldset disabled={busy}>
          <p className="dialog-page-title">{item?.title ?? openTab?.title}</p>
          <p className="url-text">{item?.url ?? openTab?.url}</p>
          <label>
            Klasör
            <CategorySelect
              categories={categories}
              value={categoryId}
              onChange={(id) => {
                setCategoryId(id);
                setStatus("");
              }}
            />
          </label>
          <label>
            Nerede kaldın? <span className="optional">isteğe bağlı</span>
            <textarea
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={4000}
              rows={3}
              placeholder="4. ünite, 6. ders. Kelimeleri tekrar edeceğim."
            />
          </label>
          {item && options.length > 1 && (
            <label>
              Durum
              <select
                value={options.includes(status) ? status : ""}
                onChange={(e) => setStatus(e.target.value as TabStatus)}
              >
                {options.map((s) => (
                  <option key={s} value={s}>
                    {statusName[s]}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="check-line">
            <input
              type="checkbox"
              checked={favorite}
              onChange={(e) => setFavorite(e.target.checked)}
            />
            Favorilerime ekle
          </label>
          {!item && (
            <p className="hint save-explanation">
              Bağlantın ve notun saklanır. Sayfada yazdıkların veya video
              saniyesi otomatik kaydedilmez.
            </p>
          )}
          <div className={`dialog-actions ${!item ? "stacked-actions" : ""}`}>
            {item ? (
              <>
                <button type="button" onClick={onClose}>
                  Vazgeç
                </button>
                <button className="primary" type="submit">
                  Değişiklikleri kaydet
                </button>
              </>
            ) : (
              <>
                <button
                  className="primary"
                  type="submit"
                  value="park"
                  disabled={!openTab?.supported}
                >
                  Kaydet ve kapat
                </button>
                <button
                  type="submit"
                  value="save"
                  disabled={!openTab?.supported}
                >
                  Kaydet, sekme açık kalsın
                </button>
              </>
            )}
          </div>
          <button
            type="button"
            className="text-button danger-text remove-link"
            onClick={onRemove}
          >
            {item ? "Bu kaydı sil" : "Kaydetmeden kapat…"}
          </button>
        </fieldset>
      </form>
    </Modal>
  );
}
