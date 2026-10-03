import { useState } from "react";
import type { Command, Rule, WorkspaceState } from "../../types";
import { categoryName } from "../../utils/presentation";
import { CategorySelect } from "../Shared";

export function Settings({
  state,
  busy,
  act,
}: {
  state: WorkspaceState;
  busy: boolean;
  act: (command: Command) => Promise<boolean>;
}) {
  const [matchType, setMatchType] = useState<Rule["matchType"]>("domain");
  const [value, setValue] = useState("");
  const [category, setCategory] = useState(state.categories[0]?.id ?? "");
  return (
    <div className="settings">
      <section>
        <h2>Eşleşmeyen sekmeler</h2>
        <p className="hint">
          Bir kurala uymayan sekmeler için önerilecek klasör.
        </p>
        <CategorySelect
          categories={state.categories}
          value={state.settings.defaultCategoryId}
          disabled={busy}
          onChange={(defaultCategoryId) =>
            void act({ type: "settings.update", defaultCategoryId })
          }
        />
      </section>
      <section>
        <h2>
          Siteleri otomatik ayır{" "}
          <span className="count">{state.rules.length}</span>
        </h2>
        <p className="hint">
          Örneğin github.com → Yazılım. Bir sekmenin klasörünü her zaman elle
          değiştirebilirsin.
        </p>
        <details className="rule-form">
          <summary>+ Yeni kural ekle</summary>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await act({
                  type: "rule.add",
                  matchType,
                  matchValue: value,
                  categoryId: category,
                })
              )
                setValue("");
            }}
          >
            <fieldset disabled={busy || !state.categories.length}>
              <label>
                Eşleşme
                <select
                  value={matchType}
                  onChange={(e) =>
                    setMatchType(e.target.value as Rule["matchType"])
                  }
                >
                  <option value="domain">Site adı</option>
                  <option value="urlContains">
                    Adresin içinde geçen metin
                  </option>
                </select>
              </label>
              <label>
                {matchType === "domain" ? "Site adresi" : "Adres metni"}
                <input
                  required
                  value={value}
                  maxLength={500}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={
                    matchType === "domain"
                      ? "medium.com"
                      : "youtube.com/playlist"
                  }
                />
              </label>
              <label>
                Klasör
                <select
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {state.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {categoryName(c)}
                    </option>
                  ))}
                </select>
              </label>
              <button className="primary" type="submit">
                Kuralı ekle
              </button>
            </fieldset>
          </form>
        </details>
        <p className="hint">
          Yeni kurallar önce uygulanır. Kaydedilmiş sayfaların klasörü değişmez.
        </p>
        <div className="rule-list">
          {state.rules.map((rule) => (
            <div className="rule-row" key={rule.id}>
              <div>
                <code>{rule.matchValue}</code>
                <span>
                  {rule.matchType === "domain" ? "Site" : "Adres içerir"} →{" "}
                  {categoryName(
                    state.categories.find((c) => c.id === rule.categoryId),
                  )}
                </span>
              </div>
              <button
                className="text-button danger-text"
                disabled={busy}
                aria-label={`${rule.matchValue} kuralını sil`}
                onClick={() => void act({ type: "rule.delete", id: rule.id })}
              >
                Sil
              </button>
            </div>
          ))}
        </div>
      </section>
      <section className="privacy">
        <h2>Verilerin bu cihazda</h2>
        <p>
          Bağlantılar ve notlar bu Chrome profilinde saklanır. Hesap açman
          gerekmez.
        </p>
        <p>
          Uzantıyı kaldırmak veya Chrome profilini silmek kayıtları da siler. Bu
          sürümde eşitleme ve dışa aktarma yok.
        </p>
        <small>Ayraç 0.3.0</small>
      </section>
    </div>
  );
}
