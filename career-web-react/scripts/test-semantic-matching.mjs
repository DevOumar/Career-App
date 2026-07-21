// Script de vérification manuelle du matching sémantique (Sentence-BERT via
// transformers.js). À lancer une fois, chez toi (réseau complet requis pour le
// premier téléchargement du modèle depuis Hugging Face) :
//
//   node scripts/test-semantic-matching.mjs
//
// Ce script n'a pas pu être exécuté par Claude (accès huggingface.co bloqué
// dans l'environnement de développement utilisé pour écrire ce code). Il sert
// à vérifier concrètement, chez toi, que :
//   1) le modèle se télécharge et se charge sans erreur (premier appel, plus lent) ;
//   2) deux textes très proches obtiennent un score élevé ;
//   3) deux textes sans rapport obtiennent un score nettement plus bas.
// Si ces 3 points sont vérifiés, la fonctionnalité peut être considérée comme fiable.

import { pipeline } from "@xenova/transformers";

function dotProduct(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) sum += a[i] * b[i];
  return sum;
}

async function main() {
  console.log("Chargement du modèle (peut prendre plusieurs minutes la première fois)...");
  const extractor = await pipeline("feature-extraction", "Xenova/paraphrase-multilingual-MiniLM-L12-v2");
  console.log("Modèle chargé.\n");

  async function embed(text) {
    const output = await extractor(text, { pooling: "mean", normalize: true });
    return Array.from(output.data);
  }

  const cases = [
    {
      label: "CAS 1 — CV data et offre data (attendu : score élevé, > 60)",
      a: "Data Engineer avec 5 ans d'expérience en Python, SQL, Spark et pipelines de données sur le cloud.",
      b: "Nous recherchons un(e) Data Engineer maîtrisant Python et SQL pour construire des pipelines de données."
    },
    {
      label: "CAS 2 — CV marketing et offre data (attendu : score plus bas que le cas 1)",
      a: "Chargée de marketing digital, growth hacking, SEO/SEA, community management.",
      b: "Nous recherchons un(e) Data Engineer maîtrisant Python et SQL pour construire des pipelines de données."
    },
    {
      label: "CAS 3 — Synonymes/reformulation (attendu : score élevé malgré des mots différents)",
      a: "Ingénieur logiciel spécialisé dans le traitement de larges volumes de données.",
      b: "Data Engineer expérimenté en gestion de bases de données massives."
    }
  ];

  for (const { label, a, b } of cases) {
    const [va, vb] = await Promise.all([embed(a), embed(b)]);
    const score = Math.round(dotProduct(va, vb) * 100);
    console.log(label);
    console.log(`  Score de similarité : ${score}/100\n`);
  }

  console.log(
    "Vérification attendue : CAS 1 et CAS 3 nettement > CAS 2. " +
    "Si ce n'est pas le cas, ne pas activer cette fonctionnalité en l'état."
  );
}

main().catch((error) => {
  console.error("ÉCHEC du chargement ou du calcul :", error);
  process.exit(1);
});
