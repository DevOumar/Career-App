import React, { useMemo, useState } from "react";
// Centre d'aide de l'espace administrateur, sur le modèle de celui de
// Jurysia : recherche, filtres par catégorie, articles dépliables, puis accès
// au contact et version de l'application. Le contenu (adminHelpArticles.js)
// ne décrit que des fonctionnalités réellement présentes.
import { AdminLineIcon } from "../AdminApp.jsx";
import { ADMIN_HELP_ARTICLES, ADMIN_HELP_CATEGORIES } from "../adminHelpArticles.js";

// Version injectée au build depuis package.json (voir vite.config.js).
// eslint-disable-next-line no-undef
const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "";

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

// Réutilisable par chaque espace : `articles` / `categories` (même format que
// adminHelpArticles.js) et `intro` ({ fr, en } avec {count}) sont optionnels.
export default function AdminHelpPage({
  language,
  onContact,
  articles = ADMIN_HELP_ARTICLES,
  categories = ADMIN_HELP_CATEGORIES,
  intro = {
    fr: "{count} articles sur l'administration de Career CV, et un accès direct au contact.",
    en: "{count} articles about administering Career CV, and direct access to contact."
  }
}) {
  const lang = language === "en" ? "en" : "fr";
  const t = (fr, en) => (lang === "en" ? en : fr);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [openId, setOpenId] = useState(null);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    return articles.filter((article) => {
      if (category !== "all" && article.categoryId !== category) return false;
      if (!q) return true;
      return [article.title[lang], article.summary[lang], ...article.body[lang], article.caveat?.[lang]].some((text) => normalize(text).includes(q));
    });
  }, [query, category, lang, articles]);

  const countFor = (id) => articles.filter((article) => article.categoryId === id).length;

  return (
    <section className="admin-help">
      <header className="module-header">
        <h2>{t("Centre d'aide", "Help center")}</h2>
        <p>
          {(intro[lang] || intro.fr).replace("{count}", articles.length)}
        </p>
      </header>

      <label className="jy-help-search">
        <AdminLineIcon name="search" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Rechercher dans l'aide…", "Search help…")} aria-label={t("Rechercher dans l'aide", "Search help")} />
        {query ? (
          <button type="button" onClick={() => setQuery("")} aria-label={t("Effacer", "Clear")}>
            <AdminLineIcon name="close" />
          </button>
        ) : null}
      </label>

      <div className="jy-help-chips">
        <button type="button" className={category === "all" ? "is-active" : ""} onClick={() => setCategory("all")}>
          {t("Toutes", "All")} ({articles.length})
        </button>
        {categories.map((item) => (
          <button key={item.id} type="button" title={item.description[lang]} className={category === item.id ? "is-active" : ""} onClick={() => setCategory(item.id)}>
            {item.label[lang]} ({countFor(item.id)})
          </button>
        ))}
      </div>

      {results.length ? (
        <div className="jy-help-list">
          {results.map((article) => {
            const open = openId === article.id;
            const categoryLabel = categories.find((item) => item.id === article.categoryId)?.label[lang];
            return (
              <article key={article.id} className={`jy-help-article ${open ? "is-open" : ""}`}>
                <button type="button" aria-expanded={open} onClick={() => setOpenId(open ? null : article.id)}>
                  <AdminLineIcon name="book" className="jy-help-book" />
                  <span className="jy-help-text">
                    <span className="jy-help-title">
                      <strong>{article.title[lang]}</strong>
                      {categoryLabel ? <span className="jy-help-badge">{categoryLabel}</span> : null}
                    </span>
                    <span className="jy-help-summary">{article.summary[lang]}</span>
                  </span>
                  <AdminLineIcon name="chevronRight" className="jy-help-chevron" />
                </button>
                {open ? (
                  <div className="jy-help-body">
                    {article.body[lang].map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    {article.caveat ? (
                      <div className="jy-help-caveat">
                        <AdminLineIcon name="alert" />
                        <p>{article.caveat[lang]}</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="jy-card jy-help-empty">
          <AdminLineIcon name="search" />
          <strong>{t("Aucun article", "No article")}</strong>
          <span>{t("Aucun article ne correspond à cette recherche. Utilisez la page de contact ci-dessous.", "No article matches this search. Use the contact page below.")}</span>
        </div>
      )}

      <div className="jy-card jy-help-info">
        <span className="jy-help-info-icon">
          <AdminLineIcon name="help" />
        </span>
        <div>
          <strong>{t("Besoin d'aide supplémentaire ?", "Need more help?")}</strong>
          <p>{t("La page de contact de Career CV réunit les moyens de joindre l'équipe.", "The Career CV contact page lists the ways to reach the team.")}</p>
        </div>
        {onContact ? (
          <button type="button" className="jy-btn jy-btn-outline" onClick={onContact}>
            {t("Page de contact", "Contact page")}
          </button>
        ) : null}
      </div>

      {APP_VERSION ? (
        <div className="jy-card jy-help-info">
          <span className="jy-help-info-icon">
            <AdminLineIcon name="info" />
          </span>
          <div>
            <strong>
              {t("Version de Career CV", "Career CV version")} <span className="jy-help-badge">v{APP_VERSION}</span>
            </strong>
            <p>
              {t(
                "Vous utilisez actuellement cette version. Indiquez-la lorsque vous signalez un problème : elle permet d'identifier précisément la version concernée.",
                "You are currently using this version. Mention it when reporting a problem: it identifies exactly which version is affected."
              )}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
