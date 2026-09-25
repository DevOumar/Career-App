import React, { useEffect, useRef, useState } from "react";
// Outils de liste transversaux de l'espace admin, sur le modèle de Jurysia
// (dossiers) : « Filtres avancés », « Colonnes », « Exporter ».
//  - les filtres et les colonnes s'appliquent aux données déjà chargées par
//    la page (aucune requête supplémentaire) ;
//  - l'export porte sur le résultat filtré complet (toutes les pages), avec
//    uniquement les colonnes visibles, dans l'ordre affiché.
import { AdminLineIcon } from "./AdminApp.jsx";

const tr = (language) => (fr, en) => (language === "en" ? en : fr);

// ---------------------------------------------------------------- popover commun
function ToolPopover({ label, icon, badge, children, width = 320, className = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`jy-tool ${className}`} ref={ref}>
      <button type="button" className={`jy-tool-btn ${open ? "is-open" : ""}`} aria-expanded={open} onClick={() => setOpen((prev) => !prev)}>
        <AdminLineIcon name={icon} />
        {label}
        {badge ? <span className="jy-tool-badge">{badge}</span> : null}
      </button>
      {open ? (
        <div className="jy-tool-pop" style={{ width }}>
          {typeof children === "function" ? children(() => setOpen(false)) : children}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- colonnes
/**
 * Colonnes visibles, mémorisées par liste dans localStorage (simple confort
 * d'affichage). Une colonne `required` ne peut pas être masquée ; une colonne
 * `defaultHidden` est proposée mais masquée tant que l'admin ne l'active pas.
 */
export function useAdminColumns(storageKey, columns) {
  const allKeys = columns.map((column) => column.key);
  const defaults = columns.filter((column) => !column.defaultHidden).map((column) => column.key);
  const requiredKeys = columns.filter((column) => column.required).map((column) => column.key);

  const [visible, setVisible] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (Array.isArray(saved)) return [...new Set([...saved, ...requiredKeys])];
    } catch (_error) {
      // stockage indisponible : colonnes par défaut
    }
    return defaults;
  });

  function update(next) {
    setVisible(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch (_error) {
      // préférence non mémorisée, sans conséquence
    }
  }

  // Seules les colonnes proposées par la page comptent (une colonne propre à
  // un onglet n'apparaît pas dans un autre).
  const shown = visible.filter((key) => allKeys.includes(key));
  return {
    visible: shown,
    isVisible: (key) => shown.includes(key),
    toggle: (key) => {
      if (requiredKeys.includes(key)) return;
      update(visible.includes(key) ? visible.filter((k) => k !== key) : [...visible, key]);
    },
    reset: () => update(defaults)
  };
}

export function AdminColumnSelector({ columns, visible, onToggle, onReset, language }) {
  const t = tr(language);
  return (
    <ToolPopover label={t("Colonnes", "Columns")} icon="columns" width={232}>
      <div className="jy-col-list">
        {columns.map((column) => (
          <label key={column.key} className={column.required ? "is-disabled" : ""}>
            <input type="checkbox" checked={visible.includes(column.key)} disabled={column.required} onChange={() => onToggle(column.key)} />
            <span>{column.label}</span>
            {column.required ? <small>{t("requise", "required")}</small> : null}
          </label>
        ))}
      </div>
      <div className="jy-tool-foot">
        <button type="button" onClick={onReset}>
          <AdminLineIcon name="reset" />
          {t("Restaurer par défaut", "Restore default")}
        </button>
      </div>
    </ToolPopover>
  );
}

// ---------------------------------------------------------------- filtres avancés
/**
 * `fields` : [{ key, label, type: "select", options: [{ value, label }], allLabel }]
 *            ou [{ key, label, type: "dateRange" }] (valeurs `${key}From` / `${key}To`).
 */
export function emptyAdminFilters(fields) {
  const empty = {};
  for (const field of fields) {
    if (field.type === "dateRange") {
      empty[`${field.key}From`] = "";
      empty[`${field.key}To`] = "";
    } else empty[field.key] = "";
  }
  return empty;
}

export function countAdminFilters(value) {
  return Object.values(value || {}).filter(Boolean).length;
}

// Vrai si la date ISO `iso` est comprise dans [from ; to] (bornes incluses,
// journées entières, fuseau local).
export function inAdminDateRange(iso, from, to) {
  if (!from && !to) return true;
  if (!iso) return false;
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return false;
  if (from && time < new Date(`${from}T00:00:00`).getTime()) return false;
  if (to && time > new Date(`${to}T23:59:59.999`).getTime()) return false;
  return true;
}

export function AdminAdvancedFilters({ fields, value, onChange, language }) {
  const t = tr(language);
  const active = countAdminFilters(value);
  const set = (key, next) => onChange({ ...value, [key]: next });

  return (
    <ToolPopover label={t("Filtres avancés", "Advanced filters")} icon="sliders" badge={active || null} width={320}>
      <div className="jy-filter-head">
        <strong>{t("Filtres avancés", "Advanced filters")}</strong>
        {active ? (
          <button type="button" onClick={() => onChange(emptyAdminFilters(fields))}>
            <AdminLineIcon name="close" />
            {t("Réinitialiser", "Reset")}
          </button>
        ) : null}
      </div>
      <div className="jy-filter-body">
        {fields.map((field) =>
          field.type === "dateRange" ? (
            <div key={field.key} className="jy-filter-field">
              <span className="jy-filter-label">{field.label}</span>
              <div className="jy-filter-dates">
                <label>
                  <small>{t("Du", "From")}</small>
                  <input type="date" value={value[`${field.key}From`] || ""} max={value[`${field.key}To`] || undefined} onChange={(event) => set(`${field.key}From`, event.target.value)} />
                </label>
                <label>
                  <small>{t("Au", "To")}</small>
                  <input type="date" value={value[`${field.key}To`] || ""} min={value[`${field.key}From`] || undefined} onChange={(event) => set(`${field.key}To`, event.target.value)} />
                </label>
              </div>
            </div>
          ) : (
            <label key={field.key} className="jy-filter-field">
              <span className="jy-filter-label">{field.label}</span>
              <select value={value[field.key] || ""} onChange={(event) => set(field.key, event.target.value)}>
                <option value="">{field.allLabel || t("Tous", "All")}</option>
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )
        )}
      </div>
    </ToolPopover>
  );
}

// ---------------------------------------------------------------- export
function exportFileName(base, extension) {
  const stamp = new Date().toISOString().slice(0, 10);
  return `career-cv-${base}-${stamp}.${extension}`;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Une colonne peut s'exporter en plusieurs champs (`exportColumns`), par
// ex. « Nom » affiché avec l'e-mail, exporté en « Nom » + « E-mail ».
function tableOf(columns, rows) {
  const fields = columns.flatMap((column) => column.exportColumns || [{ label: column.label, value: column.exportValue }]);
  return {
    head: fields.map((field) => field.label),
    body: rows.map((row) =>
      fields.map((field) => {
        const value = field.value(row);
        return value === null || value === undefined ? "" : value;
      })
    )
  };
}

// CSV « à la française » : séparateur point-virgule et BOM UTF-8, pour
// qu'Excel l'ouvre directement avec les accents et les colonnes correctes.
function toCsv({ head, body }) {
  const cell = (value) => {
    const text = String(value);
    return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return `﻿${[head, ...body].map((line) => line.map(cell).join(";")).join("\r\n")}`;
}

// --- XLSX natif (Office Open XML) : un classeur minimal zippé sans
// compression, sans dépendance externe. En-têtes en gras, nombres typés.
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(files) {
  const encoder = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    chunks.push(new Uint8Array(local.buffer), name, data);

    const entry = new DataView(new ArrayBuffer(46));
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(4, 20, true);
    entry.setUint16(6, 20, true);
    entry.setUint16(8, 0x0800, true);
    entry.setUint32(16, crc, true);
    entry.setUint32(20, data.length, true);
    entry.setUint32(24, data.length, true);
    entry.setUint16(28, name.length, true);
    entry.setUint32(42, offset, true);
    central.push(new Uint8Array(entry.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  return new Blob([...chunks, ...central, new Uint8Array(end.buffer)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
}

const xmlEscape = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    // caractères de contrôle interdits en XML
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

function columnLetter(index) {
  let letter = "";
  let n = index + 1;
  while (n > 0) {
    const rest = (n - 1) % 26;
    letter = String.fromCharCode(65 + rest) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

function toXlsx({ head, body }, sheetName) {
  const cellXml = (value, rowIndex, colIndex, bold) => {
    const ref = `${columnLetter(colIndex)}${rowIndex + 1}`;
    if (typeof value === "number" && Number.isFinite(value)) return `<c r="${ref}"${bold ? ' s="1"' : ""}><v>${value}</v></c>`;
    return `<c r="${ref}" t="inlineStr"${bold ? ' s="1"' : ""}><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
  };
  const rowsXml = [head, ...body]
    .map((line, rowIndex) => `<row r="${rowIndex + 1}">${line.map((value, colIndex) => cellXml(value, rowIndex, colIndex, rowIndex === 0)).join("")}</row>`)
    .join("");
  const widths = head
    .map((label, colIndex) => {
      const longest = Math.max(String(label).length, ...body.map((line) => String(line[colIndex] ?? "").length));
      return `<col min="${colIndex + 1}" max="${colIndex + 1}" width="${Math.min(60, Math.max(10, longest + 2))}" customWidth="1"/>`;
    })
    .join("");
  const safeSheet = xmlEscape(String(sheetName || "Export").replace(/[\\/?*[\]:]/g, " ").slice(0, 31));

  return zipStore([
    {
      name: "[Content_Types].xml",
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'
    },
    {
      name: "_rels/.rels",
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${safeSheet}" sheetId="1" r:id="rId1"/></sheets></workbook>`
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'
    },
    {
      name: "xl/styles.xml",
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'
    },
    {
      name: "xl/worksheets/sheet1.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths}</cols><sheetData>${rowsXml}</sheetData></worksheet>`
    }
  ]);
}

// PDF / impression : document mis en page (titre, date de génération, filtres
// appliqués, tableau) ouvert dans la boîte d'impression du navigateur, d'où
// l'on imprime ou l'on choisit « Enregistrer au format PDF ».
function printTable({ head, body }, { title, filters, language }) {
  const t = tr(language);
  const escape = (value) => xmlEscape(value).replace(/'/g, "&#39;");
  const generated = new Date().toLocaleString(language === "en" ? "en-GB" : "fr-FR", { dateStyle: "long", timeStyle: "short" });
  const html = `<!doctype html><html lang="${language === "en" ? "en" : "fr"}"><head><meta charset="utf-8"><title>${escape(title)}</title>
<style>
@page{size:A4 landscape;margin:14mm}
*{box-sizing:border-box}
body{margin:0;font-family:Inter,Arial,sans-serif;color:#1c1917;font-size:11px}
header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #b83309;padding-bottom:10px;margin-bottom:12px}
.brand{font-family:Georgia,serif;font-size:13px;color:#b83309;font-weight:700}
h1{margin:4px 0 0;font-family:Georgia,serif;font-size:20px;font-weight:600}
.meta{text-align:right;color:#6b6760;font-size:10.5px;line-height:1.5}
.filters{margin:0 0 12px;color:#6b6760;font-size:10.5px}
table{width:100%;border-collapse:collapse}
th{background:#f1eee7;text-align:left;font-weight:600;padding:7px 8px;border-bottom:1px solid #d9d4c8;font-size:10.5px}
td{padding:6px 8px;border-bottom:1px solid #ece8df;vertical-align:top}
tr{page-break-inside:avoid}
tbody tr:nth-child(even) td{background:#faf9f6}
.empty{padding:24px;text-align:center;color:#6b6760}
</style></head><body>
<header><div><div class="brand">Career CV</div><h1>${escape(title)}</h1></div>
<div class="meta">${escape(t("Généré le", "Generated on"))} ${escape(generated)}<br>${body.length} ${escape(t("ligne(s)", "row(s)"))}</div></header>
${filters && filters.length ? `<p class="filters"><strong>${escape(t("Filtres appliqués", "Applied filters"))} :</strong> ${filters.map(escape).join(" · ")}</p>` : ""}
<table><thead><tr>${head.map((label) => `<th>${escape(label)}</th>`).join("")}</tr></thead>
<tbody>${body.length ? body.map((line) => `<tr>${line.map((value) => `<td>${escape(value)}</td>`).join("")}</tr>`).join("") : `<tr><td class="empty" colspan="${head.length}">${escape(t("Aucune donnée.", "No data."))}</td></tr>`}</tbody></table>
<script>window.onload=function(){window.focus();window.print();};window.onafterprint=function(){window.close();};</script>
</body></html>`;
  const popup = window.open("", "_blank", "width=1100,height=800");
  if (!popup) return false;
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  return true;
}

/**
 * `columns` : colonnes VISIBLES, chacune avec `label` et `exportValue(row)`.
 * `rows` : résultat filtré complet. `filters` : libellés des filtres actifs.
 */
export function AdminExportMenu({ language, title, fileBase, columns, rows, filters = [], onBlocked }) {
  const t = tr(language);
  const exportable = columns.filter((column) => column.exportValue || column.exportColumns);

  function run(format, close) {
    close();
    const table = tableOf(exportable, rows);
    if (format === "xlsx") downloadBlob(toXlsx(table, title), exportFileName(fileBase, "xlsx"));
    else if (format === "csv") downloadBlob(new Blob([toCsv(table)], { type: "text/csv;charset=utf-8" }), exportFileName(fileBase, "csv"));
    else if (!printTable(table, { title, filters, language })) onBlocked?.();
  }

  return (
    <ToolPopover label={t("Exporter", "Export")} icon="download" width={236} className="jy-tool-end">
      {(close) => (
        <>
          <div className="jy-export-label">
            {t("Résultat filtré", "Filtered results")}
            <span>
              {rows.length} {t("ligne(s)", "row(s)")}
            </span>
          </div>
          <button type="button" className="jy-export-item" onClick={() => run("xlsx", close)}>
            <AdminLineIcon name="sheet" /> Excel (.xlsx)
          </button>
          <button type="button" className="jy-export-item" onClick={() => run("csv", close)}>
            <AdminLineIcon name="fileText" /> CSV
          </button>
          <button type="button" className="jy-export-item" onClick={() => run("pdf", close)}>
            <AdminLineIcon name="fileType" /> PDF
          </button>
          <div className="jy-export-sep" />
          <button type="button" className="jy-export-item" onClick={() => run("print", close)}>
            <AdminLineIcon name="printer" /> {t("Imprimer", "Print")}
          </button>
        </>
      )}
    </ToolPopover>
  );
}
