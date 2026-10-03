import type { Category } from "../types";
export const palette = [
  { value: "#0A3323", name: "Koyu yeşil" },
  { value: "#839958", name: "Yosun yeşili" },
  { value: "#F7F4D5", name: "Bej" },
  { value: "#D3968C", name: "Gül kurusu" },
  { value: "#105666", name: "Gece yeşili" },
];
export function folderColor(category?: Category) {
  return (
    category?.color ?? palette[(category?.order ?? 0) % palette.length].value
  );
}
