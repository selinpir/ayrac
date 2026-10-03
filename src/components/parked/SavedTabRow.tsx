import type { Category, SavedTab } from "../../types";
import { categoryName, statusName } from "../../utils/presentation";
import { Icon } from "../Icon";
import { Monogram } from "../Shared";
export function SavedTabRow({
  item,
  category,
  busy,
  onOpen,
  onEdit,
  compact = false,
  selecting = false,
  selected = false,
  onSelect,
  isOpen = false,
}: {
  item: SavedTab;
  category?: Category;
  busy: boolean;
  onOpen: () => void;
  onEdit: () => void;
  compact?: boolean;
  selecting?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  isOpen?: boolean;
}) {
  return (
    <article
      className={`saved-row ${selected ? "selected" : ""}`}
      data-testid={`saved-${item.id}`}
    >
      {selecting && (
        <input
          type="checkbox"
          aria-label={`${item.title} kaydını seç`}
          checked={selected}
          onChange={onSelect}
          disabled={busy}
        />
      )}
      <Monogram domain={item.domain} />
      <div className="row-copy">
        <button
          className="page-title"
          disabled={busy}
          title={item.title}
          onClick={onOpen}
        >
          {item.title}
        </button>
        <p className="domain-line">
          {item.domain}
          {item.favorite ? " · ★" : ""}
          {!compact ? ` · ${categoryName(category)}` : ""}
          {item.status ? ` · ${statusName[item.status]}` : ""}
        </p>
        {item.note && <p className="progress-note">{item.note}</p>}
        <button
          className="text-button note-edit"
          disabled={busy}
          onClick={onEdit}
          aria-label={`${item.title} kaydını düzenle`}
        >
          {item.note ? "Notu düzenle" : "Not ekle"}
        </button>
      </div>
      <button
        className="row-open"
        disabled={busy}
        onClick={onOpen}
        aria-label={`${isOpen ? "Sekmeye git" : "Aç"}: ${item.title}`}
      >
        {isOpen ? "Git" : "Aç"}
        <Icon name="arrow" />
      </button>
    </article>
  );
}
