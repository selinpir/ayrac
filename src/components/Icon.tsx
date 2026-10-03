export type IconName =
  | "grid"
  | "tabs"
  | "bookmark"
  | "search"
  | "settings"
  | "arrow"
  | "back"
  | "more"
  | "plus"
  | "close"
  | "book"
  | "play"
  | "globe"
  | "spark"
  | "folder"
  | "check";
const paths: Record<IconName, string> = {
  grid: "M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h6v6h-6z",
  tabs: "M8 3h12v14M4 7h12v14H4z",
  bookmark: "M6 3h12v18l-6-4-6 4V3Z",
  search: "M21 21l-5.5-5.5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  settings: "M3 6h18M3 12h18M3 18h18M8 3v6M16 9v6M8 15v6",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  back: "M19 12H5m5-5-5 5 5 5",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  plus: "M12 5v14M5 12h14",
  close: "m6 6 12 12M6 18 18 6",
  book: "M12 5v16M12 5C8 2 4 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-2-1-6-2-10 1Z",
  play: "M8 5v14l11-7L8 5Z",
  globe:
    "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18",
  spark: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z",
  folder: "M3 7V4h6l3 3h9v13H3V7Z",
  check: "m5 12 4 4L19 6",
};
export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === "more" ? 4 : 1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
