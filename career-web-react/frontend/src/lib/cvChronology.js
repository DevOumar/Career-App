// Ordre antichronologique d'un CV (convention des CV) : expériences et
// formations de la plus récente à la plus ancienne, d'après le texte libre
// des dates (« sept. 2025 - oct. 2026 », « 2023 — Aujourd'hui », « 03/2021 »…).
// Une entrée sans date exploitable garde sa place relative, en fin de liste.

const MONTHS = {
  jan: 1, janv: 1, janvier: 1, january: 1,
  fev: 2, fevr: 2, fevrier: 2, feb: 2, february: 2,
  mar: 3, mars: 3, march: 3,
  avr: 4, avril: 4, apr: 4, april: 4,
  mai: 5, may: 5,
  juin: 6, jun: 6, june: 6,
  juil: 7, juillet: 7, jul: 7, july: 7,
  aou: 8, aout: 8, aug: 8, august: 8,
  sep: 9, sept: 9, septembre: 9, september: 9,
  oct: 10, octobre: 10, october: 10,
  nov: 11, novembre: 11, november: 11,
  dec: 12, decembre: 12, december: 12
};

const ONGOING = /(aujourd|present|actuel|en cours|current|now|ce jour|a ce jour|to date)/;
const POINT = /(?:\b([a-z]{3,9})\.?\s+|\b(\d{1,2})\s*[/.-]\s*)?\b((?:19|20)\d{2})\b/g;

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// { start, end } en mois absolus (année × 12 + mois), ou null sans date.
export function parseDateRange(dates) {
  const text = normalize(dates);
  const points = [];
  for (const match of text.matchAll(POINT)) {
    const year = Number(match[3]);
    const month = match[1] ? MONTHS[match[1]] || null : match[2] ? Number(match[2]) : null;
    points.push({ year, month: month >= 1 && month <= 12 ? month : null });
  }
  const ongoing = ONGOING.test(text);
  if (!points.length) return ongoing ? { start: -Infinity, end: Infinity } : null;
  const first = points[0];
  const last = points[points.length - 1];
  return {
    start: first.year * 12 + (first.month || 1),
    end: ongoing ? Infinity : last.year * 12 + (last.month || 12)
  };
}

export function sortByRecency(items) {
  if (!Array.isArray(items)) return items;
  return items
    .map((item, index) => ({ item, index, range: parseDateRange(item?.dates || item?.date) }))
    .sort((a, b) => {
      if (!a.range || !b.range) return a.range ? -1 : b.range ? 1 : a.index - b.index;
      if (b.range.end !== a.range.end) return b.range.end > a.range.end ? 1 : -1;
      if (b.range.start !== a.range.start) return b.range.start > a.range.start ? 1 : -1;
      return a.index - b.index;
    })
    .map((entry) => entry.item);
}

export function orderCvChronology(cvReview) {
  if (!cvReview) return cvReview;
  return {
    ...cvReview,
    experiences: sortByRecency(cvReview.experiences),
    educationItems: sortByRecency(cvReview.educationItems)
  };
}
