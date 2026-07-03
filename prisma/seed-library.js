// Seeds the digital library: past-paper collections (links verified ALIVE at
// seed time — dead links are skipped, never seeded), quality inline study
// guides, and syllabus outlines. Curated server-side; idempotent by title.
// Run: node prisma/seed-library.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

async function alive(url) {
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(12000), headers: { "User-Agent": "Mozilla/5.0" } });
    return res.ok;
  } catch {
    return false;
  }
}

const ITEMS = [
  // ── Past papers (external, verified before insert) ──
  { kind: "PAST_PAPER", subject: "All subjects", exam: "GCE O Level", title: "GCE O Level — past papers collection", url: "https://cameroongcerevision.com" },
  { kind: "PAST_PAPER", subject: "All subjects", exam: "GCE A Level", title: "GCE A Level — past papers collection", url: "https://cameroongcerevision.com" },

  // ── Study guides (external, verified) ──
  { kind: "STUDY_GUIDE", subject: "Mathematics", title: "Mathematics practice with worked examples — Khan Academy", url: "https://www.khanacademy.org/math/algebra" },
  { kind: "STUDY_GUIDE", subject: "English Language", title: "English language skills — BBC Learning English", url: "https://www.bbc.co.uk/learningenglish" },
  { kind: "STUDY_GUIDE", subject: "Physics", title: "Physics revision notes and worked papers — PMT", url: "https://www.physicsandmathstutor.com" },

  // ── Study guides (inline — readable fully offline once opened) ──
  {
    kind: "STUDY_GUIDE",
    subject: "All subjects",
    title: "How to revise with past papers — the 5-step method",
    body: [
      "1. SIT THE PAPER COLD. Full paper, timed, no notes. This shows you what you actually know, not what feels familiar.",
      "2. MARK IT HONESTLY. Use the marking scheme line by line. Half-right answers are wrong answers in an exam.",
      "3. KEEP AN ERROR LOG. One notebook page per paper: question number, why you lost the marks (didn't know / misread / ran out of time), and the correct method.",
      "4. RE-DO ONLY THE WRONG QUESTIONS three days later. If you get them right now, tick them off. If not, back in the log.",
      "5. REPEAT WEEKLY. One full paper per subject per week in the last two months beats any amount of note-reading.",
      "",
      "The error log is the whole secret: you stop revising what you already know and attack only what loses you marks.",
    ].join("\n"),
  },
  {
    kind: "STUDY_GUIDE",
    subject: "Mathematics",
    exam: "GCE O Level",
    title: "Mathematics formula essentials (O Level)",
    body: [
      "QUADRATICS: x = (−b ± √(b² − 4ac)) / 2a. Discriminant b² − 4ac: positive = two roots, zero = one, negative = none.",
      "INDICES: aᵐ × aⁿ = aᵐ⁺ⁿ · aᵐ ÷ aⁿ = aᵐ⁻ⁿ · (aᵐ)ⁿ = aᵐⁿ · a⁰ = 1 · a⁻ⁿ = 1/aⁿ.",
      "TRIGONOMETRY: sin = opp/hyp, cos = adj/hyp, tan = opp/adj (SOH-CAH-TOA). Sine rule a/sinA = b/sinB. Cosine rule a² = b² + c² − 2bc·cosA.",
      "MENSURATION: circle area πr², circumference 2πr · cylinder volume πr²h · cone ⅓πr²h · sphere ⁴⁄₃πr³.",
      "COORDINATE GEOMETRY: gradient (y₂−y₁)/(x₂−x₁) · midpoint ((x₁+x₂)/2, (y₁+y₂)/2) · distance √((x₂−x₁)² + (y₂−y₁)²).",
      "STATISTICS: mean = Σfx/Σf · the median class holds the (n+1)/2-th value · probability of A or B (exclusive) = P(A) + P(B).",
    ].join("\n"),
  },
  {
    kind: "STUDY_GUIDE",
    subject: "English Language",
    exam: "GCE O Level",
    title: "Essay technique — PEEL paragraphs",
    body: [
      "Every body paragraph earns marks with four moves:",
      "P — POINT. One sentence stating the idea. No examples yet.",
      "E — EVIDENCE. A fact, example or quotation that supports the point.",
      "E — EXPLAIN. Two or three sentences: HOW does the evidence prove the point? This is where most marks live and most candidates stop short.",
      "L — LINK. One sentence tying the paragraph back to the question's exact words.",
      "",
      "Before writing: 5 minutes planning — thesis + three PEEL points. Examiners reward structure over length; four tight PEEL paragraphs beat seven rambling ones.",
    ].join("\n"),
  },
  {
    kind: "STUDY_GUIDE",
    subject: "Chemistry",
    exam: "GCE O Level",
    title: "The mole concept in six steps",
    body: [
      "1. A mole is 6.02 × 10²³ particles (Avogadro's number) — a counting unit, like 'a dozen'.",
      "2. Molar mass = the A_r or M_r in grams. One mole of carbon-12 weighs exactly 12 g.",
      "3. moles = mass ÷ molar mass. Rearrange: mass = moles × molar mass.",
      "4. For gases at r.t.p.: moles = volume (dm³) ÷ 24.",
      "5. For solutions: moles = concentration (mol/dm³) × volume (dm³).",
      "6. In equations, coefficients are mole ratios: 2H₂ + O₂ → 2H₂O means 2 mol hydrogen react with 1 mol oxygen.",
      "",
      "Exam habit: write the three formula triangles at the top of your working before you start.",
    ].join("\n"),
  },

  // ── Syllabus outlines (inline) ──
  {
    kind: "SYLLABUS",
    subject: "Mathematics",
    exam: "GCE O Level",
    title: "GCE O Level Mathematics — syllabus outline",
    body: [
      "1. Number: fractions, percentages, ratio, standard form, approximation.",
      "2. Sets and logic: notation, Venn diagrams.",
      "3. Algebra: expressions, equations (linear, simultaneous, quadratic), inequalities, variation, indices.",
      "4. Mensuration: perimeter, area, volume of standard solids.",
      "5. Geometry: angles, polygons, circle theorems, constructions, loci.",
      "6. Trigonometry: right-angled triangles, sine and cosine rules, bearings.",
      "7. Vectors and transformations: translation, reflection, rotation, enlargement.",
      "8. Statistics and probability: data presentation, averages, spread, probability rules.",
      "9. Functions and graphs: linear, quadratic, gradient, travel graphs.",
    ].join("\n"),
  },
  {
    kind: "SYLLABUS",
    subject: "Biology",
    exam: "GCE O Level",
    title: "GCE O Level Biology — syllabus outline",
    body: [
      "1. Cell structure and organisation; diffusion, osmosis, active transport.",
      "2. Nutrition: photosynthesis, balanced diet, digestion and enzymes.",
      "3. Transport: in plants (xylem/phloem) and animals (blood, heart, vessels).",
      "4. Respiration and gas exchange; aerobic vs anaerobic.",
      "5. Excretion and homeostasis: kidneys, skin, temperature control.",
      "6. Coordination: nervous system, hormones, the eye, tropisms.",
      "7. Reproduction: in plants and humans; growth and development.",
      "8. Inheritance: DNA, monohybrid crosses, variation, selection.",
      "9. Ecology: energy flow, nutrient cycles, human impact on the environment.",
    ].join("\n"),
  },
];

async function main() {
  const flintAdmin =
    (await prisma.user.findFirst({ where: { isFlintAdmin: true } })) ??
    (await prisma.user.findFirst({ where: { memberships: { some: { role: "ADMIN" } } } }));
  if (!flintAdmin) return console.log("no curator user found");

  let created = 0;
  let skippedDead = 0;
  for (const item of ITEMS) {
    const existing = await prisma.libraryItem.findFirst({ where: { title: item.title, deletedAt: null } });
    if (existing) continue;
    if (item.url) {
      const ok = await alive(item.url);
      if (!ok) {
        console.log(`  ! skipped (link dead at seed time): ${item.title}`);
        skippedDead++;
        continue;
      }
    }
    await prisma.libraryItem.create({
      data: {
        kind: item.kind,
        title: item.title,
        subject: item.subject,
        exam: item.exam ?? null,
        year: item.year ?? null,
        paper: item.paper ?? null,
        url: item.url ?? null,
        body: item.body ?? null,
        createdBy: flintAdmin.id,
      },
    });
    created++;
  }
  console.log(`Done. ${created} library item(s) created, ${skippedDead} dead link(s) skipped.`);
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
