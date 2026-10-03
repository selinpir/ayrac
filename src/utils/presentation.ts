import type { Category, TabStatus, WorkspaceState } from "../types";

// Translate only untouched seed names; custom names and saved data stay intact.
const seedNames: Record<string, [string, string]> = {
  ai: ["AI", "Yapay zekâ"],
  english: ["English", "Günlük İngilizce"],
  "things-to-read": ["Things to Read", "Daha sonra okunacaklar"],
  watching: ["Watching", "Daha sonra izlenecekler"],
  "youtube-playlists": ["YouTube Playlists", "YouTube listeleri"],
  jobs: ["Jobs", "İş ilanları"],
  mail: ["Mail", "E-posta"],
  dev: ["Dev", "Yazılım"],
  "cv-editing": ["CV Editing", "CV düzenleme"],
  "tech-study": ["Tech Study", "Teknik çalışma"],
  projects: ["Projects", "Projeler"],
  daily: ["Daily", "Günlük siteler"],
  other: ["Other", "Diğer"],
};
export function categoryName(category?: Category): string {
  if (!category) return "Klasörsüz";
  const seed = seedNames[category.id];
  return seed && category.name === seed[0] ? seed[1] : category.name;
}
export function featuredCategories(state: WorkspaceState): Category[] {
  const preferred = state.settings.homeCategoryIds ?? [
    "ai",
    "english",
    "things-to-read",
    "watching",
  ];
  const selected = preferred
    .map((id) => state.categories.find((c) => c.id === id))
    .filter((c): c is Category => !!c);
  if (state.settings.homeCategoryIds !== undefined) return selected.slice(0, 4);
  return [
    ...selected,
    ...state.categories.filter((c) => !preferred.includes(c.id)),
  ].slice(0, 4);
}
export const statusName: Record<TabStatus, string> = {
  "": "Durum yok",
  Unread: "Okunacak",
  Reading: "Okunuyor",
  Read: "Okundu",
  Review: "İncelenecek",
  Apply: "Başvurulacak",
  Applied: "Başvuruldu",
  Archived: "Arşivlendi",
};
export function categoryTone(id: string): string {
  if (id === "ai") return "sage";
  if (id === "english") return "blue";
  if (id === "things-to-read") return "sand";
  if (id === "watching" || id === "youtube-playlists") return "lilac";
  return ["sage", "blue", "sand", "lilac"][
    [...id].reduce((a, c) => a + c.charCodeAt(0), 0) % 4
  ];
}
const messages: Record<string, string> = {
  "Parked. Find it in Saved.":
    "Kaydedildi ve sekme kapatıldı. Klasöründen tekrar açabilirsin.",
  "Saved. The tab is still open.": "Kaydedildi. Sekme açık kalıyor.",
  "Workspace removed.": "Klasör kaldırıldı.",
  "Tab closed without saving.": "Sekme kaydedilmeden kapatıldı.",
  "Page saved. Chrome could not close the tab.":
    "Sayfa kaydedildi, ancak Chrome sekmeyi kapatamadı.",
  "Page saved. The tab changed or closed, so Ayraç did not close it.":
    "Sayfa kaydedildi. Sekme değiştiği için kapatılmadı.",
  "Could not verify this save. The tab was left open.":
    "Kayıt doğrulanamadı. Sekme açık bırakıldı.",
  "This tab changed. Refresh the list and try again.":
    "Sekmenin adresi değişti. Listeyi yenileyip tekrar dene.",
  "A workspace with this name already exists.":
    "Bu adda bir klasör zaten var. Farklı bir ad seç.",
  "Use a workspace name between 1 and 48 characters.":
    "Klasör adı 1–48 karakter olmalı.",
  "Choose a valid workspace type.": "Geçerli bir durum türü seç.",
  "Use one small icon or emoji.": "Tek bir simge veya emoji kullan.",
  "Workspace not found.": "Bu klasör artık bulunamıyor.",
  "That workspace no longer exists. Choose another one.":
    "Bu klasör artık yok. Başka bir klasör seç.",
  "This saved page no longer exists.": "Bu kayıt artık bulunamıyor.",
  "Keep notes under 4,000 characters.":
    "Notun en fazla 4.000 karakter olabilir.",
  "Choose a status for this workspace type.":
    "Bu klasör için geçerli bir durum seç.",
  "Choose a different workspace.": "Farklı bir hedef klasör seç.",
  "Choose what to do with saved pages.": "Kayıtların nereye taşınacağını seç.",
  "Only http and https pages can be saved.":
    "Yalnızca normal web sayfaları kaydedilebilir.",
  "This saved URL cannot be opened.": "Bu bağlantı açılamıyor.",
  "Private browsing tabs are not supported.":
    "Gizli pencere sekmeleri desteklenmiyor.",
  "Enter a valid rule (up to 500 characters).":
    "En fazla 500 karakterlik bir kural yaz.",
  "Enter a domain without https, a path or a port.":
    "Yalnızca alan adını yaz: örneğin medium.com.",
  "Use host/path text, for example linkedin.com/jobs (without https://).":
    "https:// olmadan bir adres bölümü yaz: linkedin.com/jobs.",
  "This rule already exists. Remove it first to change its workspace.":
    "Bu kural zaten var. Değiştirmek için önce mevcut kuralı kaldır.",
};
export function localizeMessage(value: string): string {
  if (messages[value]) return messages[value];
  if (/quota/i.test(value))
    return "Depolama alanı dolu. Sekme açık bırakıldı; yer açıp tekrar dene.";
  const ready = value.match(/^(\d+) pages? ready\./);
  if (ready) {
    const failed = value.match(/(\d+) could not open/);
    return `${ready[1]} sayfa hazır.${failed ? ` ${failed[1]} sayfa açılamadı; kayıtları duruyor.` : ""}${value.includes("could not create the group") ? " Chrome sekme grubu oluşturulamadı." : ""}`;
  }
  if (value.includes("Load the dist folder"))
    return "Chrome’da chrome://extensions sayfasından dist klasörünü yükle, ardından Ayraç simgesine tıkla.";
  if (value.includes("Saved data could not be read"))
    return "Kayıtlar okunamadı; verilerine dokunulmadı. Uzantıyı yenileyip tekrar dene.";
  if (value.includes("did not respond"))
    return "Uzantı yanıt vermedi. Paneli kapatıp yeniden aç.";
  return value;
}
