import { useEffect, useState } from "react";
import type { Category, Command, OpenTab, SavedTab } from "./types";
import { useWorkspace } from "./hooks/useWorkspace";
import { matchesSearch, statuses } from "./utils/model";
import { categoryName } from "./utils/presentation";
import { folderColor } from "./utils/palette";
import {
  ActionErrorContext,
  CategorySelect,
  Modal,
  Mark,
} from "./components/Shared";
import { Icon } from "./components/Icon";
import { CategoryDialog } from "./components/categories/CategoryDialog";
import { PageDialog } from "./components/parked/PageDialog";
import { SavedTabRow } from "./components/parked/SavedTabRow";
import { OpenTabRow } from "./components/tabs/OpenTabRow";
import { Settings } from "./components/settings/Settings";

type Dialog =
  | { type: "folder"; category?: Category }
  | { type: "menu"; category: Category }
  | { type: "delete"; category: Category }
  | { type: "page"; item?: SavedTab; tab?: OpenTab }
  | {
      type: "confirm";
      title: string;
      body: string;
      command: Command;
      danger?: boolean;
    }
  | { type: "assign"; tab: OpenTab };

export default function App() {
  const {
    snapshot,
    windowId,
    error,
    notice,
    busy,
    act,
    dismissError,
    undoToken,
  } = useWorkspace();
  const [view, setView] = useState<"folders" | "open" | "saved" | "settings">(
    "folders",
  );
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string[]>([]);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedOpen, setSelectedOpen] = useState<number[]>([]);
  const [target, setTarget] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [favorites, setFavorites] = useState(false);
  const [disposition, setDisposition] = useState<
    "uncategorized" | "move" | "delete"
  >("uncategorized");
  const state = snapshot?.state;
  const categories = state?.categories ?? [];
  const saved = state?.savedTabs ?? [];
  const tabs = snapshot?.tabs ?? [];
  const searching = !!query.trim();
  const getCategory = (id: string | null) =>
    categories.find((c) => c.id === id);
  const matches = (item: SavedTab | OpenTab) =>
    matchesSearch(query, [
      item.title,
      item.url,
      "note" in item ? item.note : "",
      categoryName(getCategory(item.categoryId)),
    ]);
  const visibleSaved = saved.filter(
    (t) =>
      matches(t) &&
      (!favorites || t.favorite) &&
      (filter === "all" || (t.categoryId ?? "") === filter),
  );
  const visibleOpen = tabs.filter(
    (t) => matches(t) && (filter === "all" || (t.categoryId ?? "") === filter),
  );
  useEffect(() => {
    setSelected((ids) =>
      ids.filter((id) => snapshot?.state.savedTabs.some((t) => t.id === id)),
    );
    setSelectedOpen((ids) =>
      ids.filter((id) => snapshot?.tabs.some((t) => t.id === id)),
    );
  }, [snapshot]);
  function navigate(next: typeof view) {
    setView(next);
    setQuery("");
    setSelecting(false);
    setSelected([]);
    setSelectedOpen([]);
    setFilter("all");
    setFavorites(false);
  }
  function show(next: Dialog) {
    dismissError();
    setDialog(next);
  }
  function close() {
    setDialog(null);
    dismissError();
  }
  function changeQuery(value: string) {
    setQuery(value);
    setSelected([]);
    setSelectedOpen([]);
  }
  async function run(command: Command | Command[]) {
    if (await act(command)) close();
  }
  function openMany(ids: string[], categoryId?: string | null) {
    if (windowId === null || !ids.length) return;
    const command: Command =
      categoryId !== undefined
        ? { type: "workspace.open", categoryId, windowId }
        : { type: "saved.openMany", ids, windowId };
    if (ids.length > 15)
      show({
        type: "confirm",
        title: `${ids.length} bağlantı açılsın mı?`,
        body: "Bu pencerede açık olan bağlantılar tekrar açılmaz.",
        command,
      });
    else void act(command);
  }
  async function saveOpen(closeTabs: boolean) {
    const commands: Command[] = tabs
      .filter((t) => selectedOpen.includes(t.id) && t.supported)
      .map((t) => ({
        type: "tab.save",
        tabId: t.id,
        url: t.url,
        categoryId: target,
        close: closeTabs,
      }));
    if (commands.length && (await act(commands))) {
      setSelectedOpen([]);
      setSelecting(false);
    }
  }
  function savedRow(item: SavedTab, nested = false) {
    return (
      <SavedTabRow
        key={item.id}
        item={item}
        category={getCategory(item.categoryId)}
        busy={busy}
        compact={nested}
        selecting={selecting}
        selected={selected.includes(item.id)}
        isOpen={tabs.some((t) => t.url === item.url)}
        onSelect={() =>
          setSelected((ids) =>
            ids.includes(item.id)
              ? ids.filter((id) => id !== item.id)
              : [...ids, item.id],
          )
        }
        onOpen={() =>
          windowId !== null &&
          void act({ type: "saved.open", id: item.id, windowId })
        }
        onEdit={() => show({ type: "page", item })}
      />
    );
  }
  const openRow = (tab: OpenTab) => (
    <OpenTabRow
      key={tab.id}
      tab={tab}
      category={getCategory(tab.categoryId)}
      busy={busy}
      selecting={selecting}
      selected={selectedOpen.includes(tab.id)}
      onSelect={() =>
        setSelectedOpen((ids) =>
          ids.includes(tab.id)
            ? ids.filter((id) => id !== tab.id)
            : [...ids, tab.id],
        )
      }
      onFocus={() => void act({ type: "tab.focus", tabId: tab.id })}
      onCategory={() => {
        setTarget(tab.categoryId);
        show({ type: "assign", tab });
      }}
      onPark={() =>
        void act({
          type: "tab.save",
          tabId: tab.id,
          url: tab.url,
          categoryId: tab.categoryId,
          close: true,
        })
      }
      onSave={() =>
        void act({
          type: "tab.save",
          tabId: tab.id,
          url: tab.url,
          categoryId: tab.categoryId,
          close: false,
        })
      }
      onDetails={() => show({ type: "page", tab })}
    />
  );
  function folder(category?: Category) {
    const id = category?.id ?? "__none";
    const items = visibleSaved.filter(
      (t) => t.categoryId === (category?.id ?? null),
    );
    if (
      searching &&
      !items.length &&
      !matchesSearch(query, [categoryName(category)])
    )
      return null;
    const isExpanded = searching || selecting || expanded.includes(id);
    return (
      <section className="folder" key={id}>
        <div className="folder-heading">
          <button
            className="folder-toggle"
            aria-expanded={isExpanded}
            aria-controls={`folder-${id}`}
            onClick={() =>
              setExpanded((ids) =>
                ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
              )
            }
          >
            <span className={`chevron ${isExpanded ? "expanded" : ""}`}>
              <Icon name="arrow" />
            </span>
            <span
              className="folder-icon"
              style={{ color: folderColor(category) }}
            >
              <Icon name="folder" />
            </span>
            <span className="folder-name">{categoryName(category)}</span>
            <span className="folder-count">{items.length}</span>
          </button>
          {category && (
            <button
              className="icon-button"
              aria-label={`${categoryName(category)} klasör işlemleri`}
              disabled={busy}
              onClick={() => show({ type: "menu", category })}
            >
              <Icon name="more" />
            </button>
          )}
        </div>
        {isExpanded && (
          <div className="folder-content" id={`folder-${id}`}>
            {items.length ? (
              <>
                <div className="folder-tools">
                  <span>{items.length} bağlantı</span>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() =>
                      openMany(
                        items.map((t) => t.id),
                        searching || favorites
                          ? undefined
                          : (category?.id ?? null),
                      )
                    }
                  >
                    Tümünü aç
                  </button>
                </div>
                {items.map((t) => savedRow(t, true))}
              </>
            ) : (
              <div className="folder-empty">
                <p>Henüz bağlantı yok.</p>
                <button
                  className="text-button"
                  onClick={() => {
                    navigate("open");
                    setTarget(category?.id ?? null);
                    setSelecting(true);
                  }}
                >
                  Açık sekmelerden ekle
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    );
  }
  return (
    <ActionErrorContext.Provider value={error}>
      <div className="app" aria-busy={busy}>
        <header className="app-header">
          <button
            className="brand"
            aria-label="Ayraç ana sayfa"
            onClick={() => navigate("folders")}
          >
            <Mark />
            <span>
              ayraç<span className="brand-dot">.</span>
            </span>
          </button>
          <button
            className="settings-button"
            aria-label="Ayarlar"
            onClick={() => navigate("settings")}
          >
            <Icon name="settings" />
          </button>
        </header>
        {view !== "settings" && (
          <>
            <div className="search-wrap">
              <Icon name="search" />
              <input
                type="search"
                aria-label="Bağlantı, klasör veya not ara"
                placeholder="Bağlantı, klasör veya not ara…"
                value={query}
                onChange={(e) => changeQuery(e.target.value)}
              />
            </div>
            <nav className="top-nav" aria-label="Ana gezinme">
              <button
                aria-current={view === "folders" ? "page" : undefined}
                onClick={() => navigate("folders")}
              >
                <Icon name="folder" />
                Klasörler
              </button>
              <button
                aria-current={view === "open" ? "page" : undefined}
                onClick={() => navigate("open")}
              >
                <Icon name="tabs" />
                Açık sekmeler <span>{tabs.length}</span>
              </button>
            </nav>
          </>
        )}
        <main>
          {error && !dialog && (
            <p className="error" role="alert">
              {error}
              <button
                className="icon-button"
                aria-label="Hatayı kapat"
                onClick={dismissError}
              >
                ×
              </button>
            </p>
          )}
          {!state && (
            <p className="folder-empty">
              {error ? "Panel açılamadı." : "Bağlantıların yükleniyor…"}
            </p>
          )}
          {state && view === "settings" && (
            <>
              <button className="back-link" onClick={() => navigate("folders")}>
                <Icon name="back" />
                Klasörler
              </button>
              <h1>Ayarlar</h1>
              <Settings state={state} busy={busy} act={act} />
            </>
          )}
          {state && view !== "settings" && (
            <>
              <div className="section-heading">
                <h1>
                  {view === "open"
                    ? "Açık sekmeler"
                    : view === "saved"
                      ? "Tüm bağlantılar"
                      : "Klasörlerin"}
                </h1>
                {view === "folders" ? (
                  <button
                    className="text-button new-folder"
                    onClick={() => show({ type: "folder" })}
                  >
                    <Icon name="plus" />
                    Yeni klasör
                  </button>
                ) : (
                  <button
                    className="text-button"
                    onClick={() => {
                      setSelecting(!selecting);
                      setSelected([]);
                      setSelectedOpen([]);
                    }}
                  >
                    {selecting ? "Seçimi kapat" : "Seç"}
                  </button>
                )}
              </div>
              {view === "open" ? (
                <p className="section-description">
                  Bu Chrome penceresindeki sekmeler.
                </p>
              ) : (
                <div className="view-tools">
                  <button
                    className="text-button"
                    onClick={() =>
                      navigate(view === "saved" ? "folders" : "saved")
                    }
                  >
                    {view === "saved"
                      ? "Klasörlere dön"
                      : `Tüm bağlantılar · ${saved.length}`}
                  </button>
                  <div>
                    <button
                      className="text-button"
                      aria-pressed={favorites}
                      onClick={() => {
                        setFavorites(!favorites);
                        setSelected([]);
                      }}
                    >
                      {favorites ? "Tümünü göster" : "Favoriler"}
                    </button>
                    {view === "folders" && (
                      <button
                        className="text-button"
                        onClick={() => {
                          setSelecting(!selecting);
                          setSelected([]);
                        }}
                      >
                        {selecting ? "Seçimi kapat" : "Seç"}
                      </button>
                    )}
                  </div>
                </div>
              )}
              {view === "open" && (
                <select
                  className="filter-select"
                  aria-label="Klasöre göre filtrele"
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value);
                    setSelectedOpen([]);
                  }}
                >
                  <option value="all">Tüm klasörler</option>
                  <option value="">Klasörsüz</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {categoryName(c)}
                    </option>
                  ))}
                </select>
              )}
              {selecting && (
                <div className="selection-toolbar">
                  <label className="check-line">
                    <input
                      type="checkbox"
                      aria-label="Görünen bağlantıların tümünü seç"
                      checked={
                        view === "open"
                          ? visibleOpen.some((t) => t.supported) &&
                            visibleOpen
                              .filter((t) => t.supported)
                              .every((t) => selectedOpen.includes(t.id))
                          : visibleSaved.length > 0 &&
                            visibleSaved.every((t) => selected.includes(t.id))
                      }
                      onChange={(e) =>
                        view === "open"
                          ? setSelectedOpen(
                              e.target.checked
                                ? visibleOpen
                                    .filter((t) => t.supported)
                                    .map((t) => t.id)
                                : [],
                            )
                          : setSelected(
                              e.target.checked
                                ? visibleSaved.map((t) => t.id)
                                : [],
                            )
                      }
                    />
                    Tümünü seç
                  </label>
                  <span>
                    {view === "open" ? selectedOpen.length : selected.length}{" "}
                    seçili
                  </span>
                  {view === "open" ? (
                    <>
                      <CategorySelect
                        label="Kaydedilecek klasör"
                        categories={categories}
                        value={target}
                        onChange={setTarget}
                        disabled={busy}
                      />
                      <div className="bulk-actions">
                        <button
                          disabled={busy || !selectedOpen.length}
                          onClick={() => void saveOpen(false)}
                        >
                          Kaydet
                        </button>
                        <button
                          className="primary"
                          disabled={busy || !selectedOpen.length}
                          onClick={() => void saveOpen(true)}
                        >
                          Kaydet ve kapat
                        </button>
                      </div>
                    </>
                  ) : (
                    selected.length > 0 && (
                      <>
                        <div className="bulk-actions">
                          <button
                            className="primary"
                            disabled={busy}
                            onClick={() => openMany(selected)}
                          >
                            Seçilenleri aç
                          </button>
                          <button
                            disabled={busy}
                            onClick={() =>
                              show({
                                type: "confirm",
                                title: `${selected.length} kayıt kaldırılsın mı?`,
                                body: "Açık sekmeler etkilenmez. İşlemden hemen sonra Geri al seçeneğini kullanabilirsin.",
                                command: {
                                  type: "saved.deleteMany",
                                  ids: selected,
                                },
                                danger: true,
                              })
                            }
                          >
                            Kaldır
                          </button>
                        </div>
                        <select
                          aria-label="Seçilenleri taşı"
                          value="__choose"
                          disabled={busy}
                          onChange={async (e) => {
                            const categoryId = e.target.value || null;
                            const kind =
                              getCategory(categoryId)?.kind ?? "general";
                            if (
                              await act(
                                saved
                                  .filter((t) => selected.includes(t.id))
                                  .map((t) => ({
                                    type: "saved.update",
                                    id: t.id,
                                    categoryId,
                                    note: t.note,
                                    favorite: t.favorite,
                                    status: statuses[kind].includes(t.status)
                                      ? t.status
                                      : "",
                                  })),
                              )
                            )
                              setSelected([]);
                          }}
                        >
                          <option value="__choose" disabled>
                            Klasöre taşı…
                          </option>
                          <option value="">Klasörsüz</option>
                          {categories.map((c) => (
                            <option value={c.id} key={c.id}>
                              {categoryName(c)}
                            </option>
                          ))}
                        </select>
                      </>
                    )
                  )}
                </div>
              )}
              {view === "folders" ? (
                <div className="folder-list">
                  {categories.map((c) => folder(c))}
                  {saved.some((t) => t.categoryId === null) && folder()}
                  {!categories.length && !saved.length && (
                    <p className="folder-empty">
                      Yeni bir klasör oluştur veya açık sekmelerden bağlantı
                      kaydet.
                    </p>
                  )}
                  {searching &&
                    !visibleSaved.length &&
                    !categories.some((c) =>
                      matchesSearch(query, [categoryName(c)]),
                    ) && <p className="folder-empty">Sonuç bulunamadı.</p>}
                </div>
              ) : view === "saved" ? (
                <div className="saved-list">
                  {visibleSaved.map((t) => savedRow(t))}
                  {!visibleSaved.length && (
                    <p className="folder-empty">
                      {searching
                        ? "Sonuç bulunamadı."
                        : "Burada henüz bağlantı yok."}
                    </p>
                  )}
                </div>
              ) : (
                <div className="open-list">
                  {visibleOpen.map(openRow)}
                  {!visibleOpen.length && (
                    <p className="folder-empty">Burada açık sekme yok.</p>
                  )}
                </div>
              )}
            </>
          )}
        </main>
        <footer className="app-footer">
          <span>{saved.length} kayıtlı bağlantı</span>
          <span>Bu cihazda saklanır</span>
        </footer>
        {(notice || undoToken) && (
          <div className="toast" role="status">
            <span>{notice || "Son silme işlemi geri alınabilir."}</span>
            {undoToken && (
              <button
                disabled={busy}
                onClick={() => void act({ type: "undo", token: undoToken })}
              >
                Geri al
              </button>
            )}
          </div>
        )}
        {dialog?.type === "folder" && (
          <CategoryDialog
            category={dialog.category}
            busy={busy}
            act={act}
            onClose={close}
          />
        )}
        {dialog?.type === "menu" && (
          <Modal
            title={categoryName(dialog.category)}
            busy={busy}
            onClose={close}
          >
            <div className="menu-actions">
              <button
                onClick={() =>
                  show({ type: "folder", category: dialog.category })
                }
              >
                Adını veya rengini değiştir
              </button>
              <button
                disabled={busy}
                onClick={() => {
                  close();
                  openMany(
                    saved
                      .filter((t) => t.categoryId === dialog.category.id)
                      .map((t) => t.id),
                    dialog.category.id,
                  );
                }}
              >
                Klasördeki tüm bağlantıları aç
              </button>
              <button
                className="danger-text"
                onClick={() => {
                  setDisposition("uncategorized");
                  setTarget(null);
                  show({ type: "delete", category: dialog.category });
                }}
              >
                Klasörü sil…
              </button>
            </div>
          </Modal>
        )}
        {dialog?.type === "delete" && (
          <Modal
            title={`${categoryName(dialog.category)} silinsin mi?`}
            busy={busy}
            onClose={close}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run({
                  type: "category.delete",
                  id: dialog.category.id,
                  disposition,
                  targetId: target ?? undefined,
                });
              }}
            >
              <p className="confirm-copy">
                Bu klasörde{" "}
                {
                  saved.filter((t) => t.categoryId === dialog.category.id)
                    .length
                }{" "}
                kayıtlı bağlantı var.
              </p>
              <label>
                Bağlantılara ne yapılsın?
                <select
                  value={disposition}
                  onChange={(e) =>
                    setDisposition(e.target.value as typeof disposition)
                  }
                >
                  <option value="uncategorized">Klasörsüz olarak sakla</option>
                  <option value="move">Başka klasöre taşı</option>
                  <option value="delete">
                    Bağlantıları ve notlarını da sil
                  </option>
                </select>
              </label>
              {disposition === "move" && (
                <label>
                  Hedef klasör
                  <select
                    required
                    value={target ?? ""}
                    onChange={(e) => setTarget(e.target.value)}
                  >
                    <option value="" disabled>
                      Klasör seç
                    </option>
                    {categories
                      .filter((c) => c.id !== dialog.category.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {categoryName(c)}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              <div className="dialog-actions">
                <button type="button" disabled={busy} onClick={close}>
                  Vazgeç
                </button>
                <button type="submit" className="danger" disabled={busy}>
                  Klasörü sil
                </button>
              </div>
            </form>
          </Modal>
        )}
        {dialog?.type === "page" && (
          <PageDialog
            item={dialog.item}
            openTab={dialog.tab}
            previous={saved.find(
              (t) =>
                t.url === dialog.tab?.url &&
                t.categoryId === dialog.tab?.categoryId,
            )}
            categories={categories}
            busy={busy}
            act={act}
            onClose={close}
            onRemove={() =>
              dialog.item
                ? show({
                    type: "confirm",
                    title: "Kayıt kaldırılsın mı?",
                    body: "Bağlantı ve notu kaldırılır. Açık sekmeler etkilenmez.",
                    command: { type: "saved.delete", id: dialog.item.id },
                    danger: true,
                  })
                : dialog.tab &&
                  show({
                    type: "confirm",
                    title: "Kaydetmeden kapatılsın mı?",
                    body: "Bu işlem bağlantını kaydetmez.",
                    command: {
                      type: "tab.close",
                      tabId: dialog.tab.id,
                      url: dialog.tab.url,
                    },
                    danger: true,
                  })
            }
          />
        )}
        {dialog?.type === "assign" && (
          <Modal title="Klasör seç" busy={busy} onClose={close}>
            <CategorySelect
              categories={categories}
              value={target}
              onChange={setTarget}
            />
            <div className="dialog-actions">
              <button disabled={busy} onClick={close}>
                Vazgeç
              </button>
              <button
                className="primary"
                disabled={busy}
                onClick={() =>
                  void run({
                    type: "tab.assign",
                    tabId: dialog.tab.id,
                    url: dialog.tab.url,
                    categoryId: target,
                  })
                }
              >
                Klasöre taşı
              </button>
            </div>
          </Modal>
        )}
        {dialog?.type === "confirm" && (
          <Modal title={dialog.title} busy={busy} onClose={close}>
            <p className="confirm-copy">{dialog.body}</p>
            <div className="dialog-actions">
              <button disabled={busy} onClick={close}>
                Vazgeç
              </button>
              <button
                className={dialog.danger ? "danger" : "primary"}
                disabled={busy}
                onClick={() => void run(dialog.command)}
              >
                {dialog.danger ? "Onayla" : "Aç"}
              </button>
            </div>
          </Modal>
        )}
      </div>
    </ActionErrorContext.Provider>
  );
}
