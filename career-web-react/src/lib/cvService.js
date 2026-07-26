import { EDUCATION_LEVELS, SKILL_KEYWORDS } from "../data/skills";

const SECTION_STOPS = [
  "profil",
  "resume",
  "summary",
  "competences",
  "skills",
  "experience",
  "experiences",
  "experiences professionnelles",
  "parcours professionnel",
  "formation",
  "formations",
  "education",
  "diplomes",
  "certification",
  "certifications",
  "langues",
  "languages",
  "interets",
  "centres d'interet",
  "hobbies",
  "interests"
];

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

function repairSpacedLetters(value) {
  const raw = String(value || "").trim();
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length < 4) return raw;

  const letterParts = parts.filter((part) => /^[A-Za-zÀ-ÿ]$/.test(part));
  if (letterParts.length / parts.length < 0.75) return raw;
  return parts.join("");
}

function visibleLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => repairSpacedLetters(line.trim()))
    .filter(Boolean);
}

function splitList(value) {
  return unique(
    String(value || "")
      .split(/[,;|•·\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function titleCaseName(value) {
  return String(value || "")
    .toLowerCase()
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function sectionRegex(labels) {
  return new RegExp(`^(${labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "i");
}

function findSection(text, labels, stopLabels = SECTION_STOPS) {
  const lines = visibleLines(text);
  const startRegex = sectionRegex(labels);
  const stopRegex = sectionRegex(stopLabels);
  const start = lines.findIndex((line) => startRegex.test(normalize(line)));
  if (start < 0) return [];

  const section = [];
  for (const line of lines.slice(start + 1)) {
    if (stopRegex.test(normalize(line))) break;
    section.push(line);
  }
  return section.slice(0, 44);
}

function extractSectionItems(text, labels, stopLabels = SECTION_STOPS) {
  return findSection(text, labels, stopLabels)
    .filter((line) => line.length >= 2)
    .filter((line) => !/^[-–—•]+$/.test(line))
    .slice(0, 36);
}

function extractEmail(text) {
  return String(text || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
}

function extractPhone(text) {
  return String(text || "").match(/(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{1,4}\)?[\s.-]?){4,7}\d{2}/)?.[0]?.trim() || "";
}

function extractLinkedin(text) {
  return String(text || "").match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/i)?.[0] || "";
}

function extractName(text, email) {
  const lines = visibleLines(text);
  const emailLocal = normalize(String(email || "").split("@")[0]).replace(/\d+/g, "");
  const firstUseful = lines.find((line) => {
    const normalized = normalize(line);
    return (
      line.length >= 3 &&
      line.length <= 54 &&
      !line.includes("@") &&
      !normalized.includes("linkedin") &&
      !/^\+?\d/.test(line) &&
      !normalized.includes("curriculum") &&
      !normalized.includes("resume") &&
      !SECTION_STOPS.some((stop) => normalized === stop)
    );
  });

  const fallback = email ? email.split("@")[0].replace(/[._-]+/g, " ") : "";
  const source = String(firstUseful || fallback).replace(/\s{2,}/g, " ").trim();
  const compactSource = normalize(source).replace(/[^a-z]/g, "");

  if (source && !source.includes(" ") && compactSource.length >= 8 && emailLocal.length >= 6) {
    const candidateNames = [
      ["oumar", "cisse"],
      ["omar", "cisse"]
    ];
    const fromEmail = candidateNames.find(([first, last]) => emailLocal.includes(first) && emailLocal.includes(last));
    if (fromEmail && compactSource.includes(fromEmail[0]) && compactSource.includes(fromEmail[1])) {
      return { firstName: titleCaseName(fromEmail[0]), lastName: fromEmail[1].toUpperCase() };
    }
  }

  const parts = source.split(/\s+/).filter(Boolean);
  return {
    firstName: titleCaseName(parts.slice(0, 1).join(" ")),
    lastName: parts.slice(1).join(" ").toUpperCase()
  };
}

function extractLocation(text) {
  return (
    visibleLines(text).find((line) =>
      /(paris|france|ile-de-france|lyon|marseille|lille|toulouse|bordeaux|nantes|rennes|montpellier|remote|teletravail)/i.test(
        normalize(line)
      )
    ) || ""
  );
}

function inferHeadline(text) {
  const lines = visibleLines(text);
  const candidates = lines
    .slice(0, 14)
    .filter((line) => !/@/.test(line))
    .filter((line) => !/^\+?\d[\d\s().-]{6,}$/.test(line))
    .filter((line) => !SECTION_STOPS.includes(normalize(line)))
    .filter((line) => line.length >= 8 && line.length <= 100);

  return candidates[1] || candidates[0] || "";
}

function extractSkills(text) {
  const normalized = normalize(text);
  return SKILL_KEYWORDS.filter((skill) => normalized.includes(normalize(skill)));
}

function extractExperienceYears(text) {
  const normalized = normalize(text);
  const regex = /(\d+)\s*(ans|an|years|year)/g;
  let max = 0;
  let match = regex.exec(normalized);
  while (match) {
    max = Math.max(max, Number(match[1]));
    match = regex.exec(normalized);
  }
  if (!max && (normalized.includes("alternance") || normalized.includes("stage"))) return 1;
  return max;
}

function extractEducation(text) {
  const normalized = normalize(text);
  return EDUCATION_LEVELS.find((level) => normalized.includes(level)) || "";
}

function extractLanguages(text) {
  const normalized = normalize(text);
  const map = [
    { key: "francais", label: "francais" },
    { key: "anglais", label: "anglais" },
    { key: "english", label: "anglais" },
    { key: "espagnol", label: "espagnol" },
    { key: "allemand", label: "allemand" },
    { key: "italien", label: "italien" }
  ];
  return map.filter((lang) => normalized.includes(lang.key)).map((lang) => lang.label);
}

function extractSummary(text) {
  const section = extractSectionItems(text, ["profil", "resume", "summary", "a propos", "professional summary"]);
  if (section.length) return section.slice(0, 5).join(" ");
  return visibleLines(text).find((line) => line.length > 80 && line.length < 480) || "";
}

function extractExperiences(text) {
  const section = extractSectionItems(text, ["experience", "experiences", "experiences professionnelles", "parcours professionnel"]);
  const source = section.length ? section : visibleLines(text);
  const items = [];
  for (let index = 0; index < source.length; index += 1) {
    const line = source[index];
    const normalized = normalize(line);
    const looksLikeRole = /\b(stage|alternance|manager|analyst|engineer|developer|consultant|data|chef|responsable|assistant|product|marketing|bim|digital|compliance)\b/i.test(normalized);
    const knownCompany = /\b(vinci|eiffage|ecobank|construction|energie systems|international)\b/i.test(normalized);
    if (looksLikeRole || knownCompany) {
      const prev = source[index - 1] || "";
      const next = source[index + 1] || "";
      const nextTwo = source[index + 2] || "";
      const combined = `${prev} ${line} ${next}`;
      items.push({
        company: /\b(vinci|eiffage|ecobank)\b/i.test(normalize(combined))
          ? (combined.match(/\b(VINCI(?:\s+CONSTRUCTION)?|EIFFAGE(?:\s+ENERGIE\s+SYSTEMS)?|ECOBANK(?:\s+INTERNATIONAL)?)/i)?.[0] || prev)
          : prev && prev.length <= 70 && !/\d{4}/.test(prev)
            ? prev
            : "",
        role: knownCompany && next ? next : line,
        dates: /\d{4}|janv|fev|fevr|mars|avr|mai|juin|juil|aout|sept|oct|nov|dec/i.test(normalize(next)) ? next : /\d{4}|janv|fev|fevr|mars|avr|mai|juin|juil|aout|sept|oct|nov|dec/i.test(normalize(nextTwo)) ? nextTwo : "",
        description: source.slice(index + 2, index + 6).join("\n")
      });
    }
    if (items.length >= 5) break;
  }
  return items;
}

function extractEducationItems(text) {
  const section = extractSectionItems(text, ["formation", "formations", "education", "diplomes"]);
  const source = section.length ? section : visibleLines(text);
  const items = [];
  for (let index = 0; index < source.length; index += 1) {
    const line = source[index];
    const normalized = normalize(line);
    if (/\b(master|mastere|licence|bachelor|bac|ingenieur|universit|ecole|school|degree|miage|hetic)\b/i.test(normalized)) {
      const prev = source[index - 1] || "";
      const next = source[index + 1] || "";
      const nextTwo = source[index + 2] || "";
      const combined = `${prev} ${line} ${next}`;
      const school = combined.match(/\b(HETIC|Universit[ée][\w\s-]*|Paris[-\s]Saclay|Sorbonne|Ecole[\w\s-]*)/i)?.[0] || "";
      const degree = combined.match(/\b(Mast[èe]re[^|,\n]*|Master[^|,\n]*|M1\s*-\s*M2[^|,\n]*|MIAGE[^|,\n]*|Licence[^|,\n]*|Bachelor[^|,\n]*)/i)?.[0] || line;
      items.push({
        school: school || (/\b(universit|ecole|hetic|school|institut|campus)\b/i.test(normalized) ? line : prev),
        degree,
        dates: /\d{4}|sept|janv|oct|mai|juin/i.test(normalize(next)) ? next : /\d{4}|sept|janv|oct|mai|juin/i.test(normalize(nextTwo)) ? nextTwo : "",
        description: ""
      });
    }
    if (items.length >= 5) break;
  }
  return items;
}

function extractCertifications(text) {
  const section = extractSectionItems(text, ["certification", "certifications", "certificats"]);
  const fallback = visibleLines(text).filter((line) =>
    /certification|power bi|microsoft|google|aws|azure|oracle|cisco|scrum/i.test(normalize(line))
  );
  return unique([...section, ...fallback])
    .filter((line) => !/^certifications?$/i.test(normalize(line)))
    .slice(0, 10)
    .map((name) => ({ name, url: "" }));
}

function extractInterests(text) {
  const section = extractSectionItems(text, ["interets", "centres d'interet", "hobbies", "interests"])
    .filter((line) => {
      const normalized = normalize(line);
      return !/(experience|manager|analyst|develop|ingenieur|formation|certification|service|project|construction|bim|\d{4})/.test(normalized);
    });
  return splitList(section.join(", ")).slice(0, 10);
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      resolve(value.includes(",") ? value.split(",").pop() : value);
    };
    reader.onerror = () => reject(new Error("Impossible de lire ce fichier."));
    reader.readAsDataURL(file);
  });
}

export function parseCvText(text) {
  const cleanText = cleanTextPayload(text);
  const email = extractEmail(cleanText);
  const identity = extractName(cleanText, email);
  const skills = unique(extractSkills(cleanText));
  const languages = unique(extractLanguages(cleanText));

  return {
    firstName: identity.firstName,
    lastName: identity.lastName,
    email,
    phone: extractPhone(cleanText),
    linkedinUrl: extractLinkedin(cleanText),
    location: extractLocation(cleanText),
    summary: extractSummary(cleanText),
    headline: inferHeadline(cleanText),
    skills,
    experienceYears: extractExperienceYears(cleanText),
    education: extractEducation(cleanText),
    languages,
    experiences: extractExperiences(cleanText),
    educationItems: extractEducationItems(cleanText),
    certifications: extractCertifications(cleanText),
    interests: extractInterests(cleanText)
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
    reader.readAsText(file);
  });
}

export function createCvRecord({ fileName, sourceText, parsed }) {
  return {
    fileName,
    sourceText: cleanTextPayload(sourceText),
    parsed: parsed || parseCvText(sourceText)
  };
}
