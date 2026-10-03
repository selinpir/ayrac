import { useState } from "react";
import type { Category, CategoryKind, Command } from "../../types";
import { categoryName } from "../../utils/presentation";
import { palette, folderColor } from "../../utils/palette";
import { Modal } from "../Shared";

export function CategoryDialog({
  category,
  busy,
  act,
  onClose,
}: {
  category?: Category;
  busy: boolean;
  act: (command: Command) => Promise<boolean>;
  onClose: () => void;
}) {
  const [color, setColor] = useState(folderColor(category));
  const [name, setName] = useState(category ? categoryName(category) : "");
  const [icon, setIcon] = useState(category?.icon ?? "");
  const [kind, setKind] = useState<CategoryKind>(category?.kind ?? "general");
  const [group, setGroup] = useState(category?.groupOnOpen ?? false);
  return (
    <Modal
      title={category ? "Klasörü düzenle" : "Yeni klasör"}
      onClose={onClose}
      busy={busy}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await act({
              type: "category.upsert",
              id: category?.id,
              name,
              color,
              icon,
              kind,
              groupOnOpen: group,
            })
          )
            onClose();
        }}
      >
        <fieldset disabled={busy}>
          <label>
            Klasör adı
            <input
              autoFocus
              required
              maxLength={48}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örneğin SAP, Tez, Müzik"
            />
          </label>
          <fieldset className="color-picker">
            <legend>
              Klasör rengi <span className="optional">isteğe bağlı</span>
            </legend>
            <div className="swatches">
              {palette.map((c) => (
                <label
                  key={c.value}
                  title={c.name}
                  style={{ background: c.value }}
                >
                  <input
                    type="radio"
                    name="folder-color"
                    value={c.value}
                    aria-label={c.name}
                    checked={color === c.value}
                    onChange={() => setColor(c.value)}
                  />
                  <span aria-hidden="true">{color === c.value ? "✓" : ""}</span>
                </label>
              ))}
            </div>
            <p className="hint">
              {palette.find((c) => c.value === color)?.name}
            </p>
          </fieldset>
          <details className="advanced-options">
            <summary>Diğer seçenekler</summary>
            <label>
              Simge <span className="optional">isteğe bağlı</span>
              <input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                maxLength={8}
                placeholder="Örneğin 📚"
              />
            </label>
            <label>
              Kayıtlarda durum takibi
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as CategoryKind)}
              >
                <option value="general">Kullanma</option>
                <option value="reading">
                  Okuma: okunacak / okunuyor / okundu
                </option>
                <option value="jobs">
                  İş ilanı: incelenecek / başvurulacak / başvuruldu
                </option>
              </select>
            </label>
            <label className="check-line">
              <input
                type="checkbox"
                checked={group}
                onChange={(e) => setGroup(e.target.checked)}
              />
              Birlikte açarken Chrome sekme grubu oluştur
            </label>
            <p className="hint">
              Bu klasörde “Tümünü aç” dediğinde uygulanır. Sabit sekmeler
              yerinde kalır.
            </p>
          </details>
          <div className="dialog-actions">
            <button type="button" onClick={onClose}>
              Vazgeç
            </button>
            <button className="primary" type="submit">
              {category ? "Değişiklikleri kaydet" : "Klasör oluştur"}
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
