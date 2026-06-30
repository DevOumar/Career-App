import { EDUCATION_LEVELS, SKILL_KEYWORDS } from "../data/skills";

function cleanTextPayload(value) {
  return String(value || "")
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function decodeArrayBuffer(buffer) {
  const decoder = new TextDecoder("utf-8", { fatal: false });
  return decoder.decode(buffer);
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function unique(list) {
  return [...new Set(list.filter(Boolean))];
}

function extractSkills(text) {
  const normalized = normalize(text);
  return SKILL_KEYWORDS.filter((skill) => normalized.includes(skill));
}

function extractExperienceYears(text) {
  const normalized = normalize(text);
  const regex = /(\d+)\s*(ans|an|years|year)/g;
  let max = 0;
  let match = regex.exec(normalized);

  while (match) {
    const value = Number(match[1]);
    if (value > max) max = value;
    match = regex.exec(normalized);
  }

  if (!max) {
    if (normalized.includes("alternance")) return 1;
    if (normalized.includes("stage")) return 1;
  }

  return max;
}

function extractEducation(text) {
  const normalized = normalize(text);
  const found = EDUCATION_LEVELS.find((level) => normalized.includes(level));
  return found || "";
}

function extractLanguages(text) {
  const normalized = normalize(text);
  const map = [
    { key: "francais", label: "français" },
    { key: "anglais", label: "anglais" },
    { key: "espagnol", label: "espagnol" },
    { key: "allemand", label: "allemand" },
    { key: "italien", label: "italien" }
  ];
  return map.filter((lang) => normalized.includes(lang.key)).map((lang) => lang.label);
}

function inferHeadline(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines[0] || "";
}

export function parseCvText(text) {
  const skills = unique(extractSkills(text));
  const experienceYears = extractExperienceYears(text);
  const education = extractEducation(text);
  const languages = unique(extractLanguages(text));

  return {
    headline: inferHeadline(text),
    skills,
    experienceYears,
    education,
    languages
  };
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw =
        typeof reader.result === "string"
          ? reader.result
          : reader.result instanceof ArrayBuffer
            ? decodeArrayBuffer(reader.result)
            : "";

      const cleaned = cleanTextPayload(raw);
      if (!cleaned) {
        reject(new Error("Impossible d'extraire du texte lisible depuis ce fichier."));
        return;
      }
      resolve(cleaned);
    };
    reader.onerror = () => reject(new Error("Impossible de lire ce fichier."));

    const isBinaryFormat =
      /\.(pdf|doc|docx)$/i.test(String(file?.name || "")) ||
      /(pdf|msword|officedocument)/i.test(String(file?.type || ""));

    if (isBinaryFormat) {
      reader.readAsArrayBuffer(file);
      return;
    }

    reader.readAsText(file);
  });
}

export function createCvRecord({ fileName, sourceText }) {
  const parsed = parseCvText(sourceText);
  return {
    fileName,
    sourceText,
    parsed
  };
}
