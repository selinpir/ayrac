import type { Category } from "../../types";
import { categoryName, categoryTone } from "../../utils/presentation";
import { Icon, type IconName } from "../Icon";

export function CategoryCard({
  category,
  savedCount,
  openCount,
  onOpen,
}: {
  category: Category;
  savedCount: number;
  openCount: number;
  onOpen: () => void;
}) {
  const icon: IconName =
    category.id === "ai"
      ? "spark"
      : category.id === "english"
        ? "globe"
        : category.id === "things-to-read"
          ? "book"
          : ["watching", "youtube-playlists"].includes(category.id)
            ? "play"
            : "folder";
  return (
    <button
      type="button"
      className={`category-card ${categoryTone(category.id)}`}
      onClick={onOpen}
      aria-label={`${categoryName(category)} klasörünü aç`}
    >
      <span className="category-card-top">
        <span className="category-symbol">
          {category.icon || <Icon name={icon} />}
        </span>
        <Icon name="arrow" />
      </span>
      <strong>{categoryName(category)}</strong>
      <span className="category-counts">
        {savedCount} kayıt<span aria-hidden="true"> · </span>
        {openCount} açık
      </span>
    </button>
  );
}
