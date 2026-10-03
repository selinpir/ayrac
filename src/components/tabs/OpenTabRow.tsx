import type { Category, OpenTab } from "../../types";
import { categoryName } from "../../utils/presentation";
import { Icon } from "../Icon";
import { Monogram } from "../Shared";

export function OpenTabRow({
  tab,
  category,
  busy,
  selecting,
  selected,
  onSelect,
  onFocus,
  onCategory,
  onPark,
  onSave,
  onDetails,
}: {
  tab: OpenTab;
  category?: Category;
  busy: boolean;
  selecting: boolean;
  selected: boolean;
  onSelect: () => void;
  onFocus: () => void;
  onCategory: () => void;
  onPark: () => void;
  onSave: () => void;
  onDetails: () => void;
}) {
  return (
    <article
      className={`open-tab-row ${selected ? "selected" : ""}`}
      data-testid={`open-${tab.id}`}
    >
      <div className="row-top">
        {selecting && (
          <input
            type="checkbox"
            aria-label={`${tab.title} sekmesini seç`}
            checked={selected}
            disabled={busy || !tab.supported}
            onChange={onSelect}
          />
        )}
        <Monogram domain={tab.domain} />
        <div className="row-copy">
          <button
            className="page-title"
            title={tab.title}
            disabled={busy}
            onClick={onFocus}
          >
            {tab.title}
          </button>
          <p className="domain-line">
            {tab.domain || "Chrome sayfası"}
            {tab.pinned ? " · Sabit" : ""}
            {tab.saved ? " · Kaydedildi" : ""}
          </p>
        </div>
        <button
          className="icon-button"
          aria-label={`Diğer işlemler: ${tab.title}`}
          title="Not ekle, kaydet veya kapat"
          disabled={busy}
          onClick={onDetails}
        >
          <Icon name="more" />
        </button>
      </div>
      <div className="row-bottom">
        <button
          className="category-chip"
          title={
            tab.manual
              ? "Seçtiğin klasör. Değiştirmek için tıkla."
              : "Önerilen klasör. Değiştirmek için tıkla."
          }
          disabled={busy || !tab.supported}
          aria-label={`${tab.title} klasörünü değiştir`}
          onClick={onCategory}
        >
          {categoryName(category)}
          <span aria-hidden="true">⌄</span>
        </button>
        <button
          className="save-button"
          disabled={busy || !tab.supported}
          onClick={onSave}
        >
          Kaydet
        </button>
        <button
          className="save-close-button"
          disabled={busy || !tab.supported}
          onClick={onPark}
        >
          Kaydet ve kapat
        </button>
      </div>
      {!tab.supported && (
        <p className="hint unsupported">Bu özel sayfa kaydedilemiyor.</p>
      )}
    </article>
  );
}
