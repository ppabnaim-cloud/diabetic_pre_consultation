# Pra-Konsultasi Klinik Diabetik

**Diabetes clinic pre-consultation application**
Hospital Tengku Permaisuri Norashikin (HTPN), Kajang

The waiting time is not going to get shorter. This makes it productive.

At the registration counter the patient is handed a link. While they wait,
they answer a structured history about their diabetes on their own phone.
When their name is called, the doctor is handed a one-page summary — the
history already taken, the red flags already surfaced, the care gaps already
measured against the guidelines, and, at the bottom, the one thing the
patient actually came to talk about.

Bahasa Malaysia is the default. English is one tap away.

---

## What it is made of

Five tabs:

| Tab | Who uses it | What it does |
|---|---|---|
| **Soalan Anda** | Patient | 12 sections, 115 questions, 20 of them conditional. Demographics, diabetes history and medicines, symptoms, target-organ review, diet, home glucose readings with a chart, activity and step counts, insulin and hypoglycaemia, weight and sleep, mood and barriers, and the patient's own agenda. |
| **Kaunter Jururawat** | Nursing staff | Two blood pressures with the mean computed against the CPG target, pulse and rhythm, capillary glucose, weight, height, waist, temperature, SpO₂, and a structured foot screen. Plus a printable QR card for the registration counter. |
| **Tanya Panduan** | Patient | Opens the NotebookLM instance grounded solely in the two CPGs, with eight suggested questions the patient can copy, and a plain statement of what the tool cannot do. |
| **Keadaan Negara** | Patient | The national picture, from NHMS 2023: how many Malaysian adults live with diabetes, how many do not know, how the weight and smoking trends have moved since 2011, and how common the habits this form just asked about actually are. Education only — it reads nothing from the patient's answers and never enters the doctor's note. |
| **Kuiz Ringkas** | Patient | Eight public-level questions with an explanation after each. No mark is stored. Its only output is a list of topics the patient got wrong, which they may choose to pass to the doctor. |
| **Ringkasan** | Doctor / staff | The generated note. Copy to clipboard, download as `.txt`, or print to PDF for upload to the HIS. |

### The output

A fixed-width plain-text note, ordered the way a clinician reads rather than
the way the patient answered:

1. **Items that should not wait** — red flags first, then amber
2. Identification
3. **CPG-anchored care gaps**, each citing the clause behind it
4. Counter observations
5. Glycaemic picture, including *% of home readings within the CPG band*
6. The history, section by section
7. Quiz topics the patient asked to pass on
8. **The patient's own words**, last — so it is the thing still on screen
   when the doctor looks up
9. Provenance and limits

Two rules hold throughout. **Nothing is invented**: a question that was asked
and not answered prints as `(tidak dijawab)`, never as a normal finding,
because "no chest pain" and "never asked about chest pain" are different
clinical facts. And **nothing is interpreted beyond what the CPGs state**: the
note reports the reading with the guideline's target beside it, and does not
stage, diagnose, or suggest a drug.

---

## Deploying it

The deployed site is **one file**: `public/index.html`. No bundler at serve
time, no API, no database — just that page plus a web font. It is committed,
so the repository can also be served as-is by anything that can serve a
directory.

### Vercel

**[→ Import this repository into Vercel](https://vercel.com/new/import?s=https%3A%2F%2Fgithub.com%2Fppabnaim-cloud%2Fdiabetic_pre_consultation)**

That link opens Vercel's import flow with this repository already selected.
Then:

1. Framework Preset: **Other**.
2. Leave every build setting alone — `vercel.json` already specifies all
   three, so the dialog's defaults do not matter:

   | Setting | Value | Why |
   |---|---|---|
   | `installCommand` | `npm install --omit=dev …` | `build/build.js` uses nothing but node's own `fs` and `path`, so there are no production dependencies to install. Omitting dev dependencies skips Playwright and its browser download. |
   | `buildCommand` | `npm run build` | The build re-runs on every deploy, so its gates — unique ids, both languages present, every flag rule executing, the summary generating — run in CI too. |
   | `outputDirectory` | `public` | Only the page is served. `src/`, `build/`, `tests/` and `package.json` are not published. |

3. Deploy.

If Vercel cannot see the repository, it is because this repo is private and
the Vercel GitHub app has not been granted access to it — grant it under
**Vercel → Settings → Git → GitHub → Manage Access**, or make the repository
public.

> **If the deploy fails with `No Output Directory named "public" found`**,
> the project has a stale Output Directory override set in the Vercel
> dashboard from an earlier attempt. Project → Settings → Build & Deployment
> → Output Directory → switch it back to **Override: off** so `vercel.json`
> is used, then redeploy.

`vercel.json` sets the security headers: a content-security policy that
permits only this origin plus Google Fonts, `noindex` so the form never
reaches a search engine, and `frame-ancestors 'none'`.

### Anywhere else

It is a static page. Serve the `public/` directory. GitHub Pages, Netlify, an
Apache directory, a clinic tablet with `public/index.html` copied onto it and
no network at all — all work identically, though a host other than Vercel
will not apply `vercel.json`, so set the equivalent headers yourself if you
have the means.

### Configuration

Three values, set at build time, all with sensible defaults:

```bash
DMPC_NURSE_CODE=yourcode \
DMPC_NOTEBOOK_URL=https://notebook.google.com/notebook/.../preview \
DMPC_VERSION="v1.1 · 2026-11-01" \
npm run build
```

**Change `DMPC_NURSE_CODE` before you deploy.** It defaults to `jururawat`.

> The counter code is a **speed bump, not security.** The whole application
> runs in the browser, so anyone who views the page source can read it. It
> exists to stop a patient wandering into the nursing tab by accident, and
> that is all it is for. Never reuse a code from another system. The tab
> itself says this to the staff member who opens it.

---

## Where the data goes

**Nowhere.** Every answer stays in the patient's own browser, in
`localStorage`, and is never transmitted.

That is a clinical decision before it is an engineering one. A waiting-room
form that posts a name, an IC number and a medication list to a server needs
a data-protection case, a retention policy, an access log, and somebody
accountable for a breach. Keeping it on the patient's device for the twenty
minutes between the counter and the consulting room needs none of that, and
the only copy that persists is the one the doctor pastes into the HIS — the
system that is already the record of truth and already governed.

The trade-offs are accepted and stated to the patient on the consent screen:
answers do not follow them to the next visit, closing the tab loses them, and
the summary has to be handed over before the device is cleared. **Padam
semua** erases everything, and should be pressed once the doctor has the
summary.

The IC number is masked on screen (`600101-14-****`) and whole in the
downloaded file, because the HIS needs the identifier and a waiting room
does not.

---

## Working on it

```bash
npm install       # playwright, for the tests
npm run build     # src/ -> public/index.html
npm test          # build, then 77 browser assertions
npm run serve     # http://localhost:8099
```

**Edit the partials in `src/`, never `public/index.html`** — it is generated
and will be overwritten on the next build.

| File | Holds |
|---|---|
| `src/cpg.js` | **Every clinical number in the application**, with the guideline clause beside it. Nothing downstream hard-codes a threshold. |
| `src/schema.js` | Every question: wording in both languages, options, the condition it appears under, and the rule that decides whether the answer raises a flag. |
| `src/i18n.js` | Interface strings. Question wording lives with the question, not here. |
| `src/quiz.js` | The eight quiz items. Numbers are read from `CPG.*`, not typed. |
| `src/nhms.js` | Every figure on the national-picture dashboard, each with the infographic and page it was read from. Unlike `cpg.js`, **these are verified** — read directly off the published booklet. |
| `src/summary.js` | The note, the flag collection, the care-gap analysis. |
| `src/app.js` | Rendering, state, storage, charts, tabs, export. |
| `src/styles.html` | Design tokens and layout. |
| `src/page.html` | The shell the build fills in. |

### The build is a gate

`npm run build` refuses to write `public/index.html` unless:

- every question id is unique — the id is also the storage key, so a
  collision would silently overwrite one answer with another;
- every question, option, hint and explanation carries **both** languages;
- every quiz item has exactly one answer, in range, citing `T2DM` or `OBES`;
- every `when` and every `flag` rule runs without throwing against an empty
  patient, a populated male case and a populated female case — a flag rule
  that threw would otherwise fail silently at the bedside and lose a red
  flag;
- the summary generates in both languages and contains every section;
- the populated case raises the red flags it must;
- no file cites any guideline body other than the two Malaysian CPGs.

It then prints how many clinical values are still awaiting verification.

### Adding a question

Add one object to the right section in `src/schema.js`. Nothing else needs
touching: the renderer, the progress meter, the summary and the completeness
count all read the schema.

```js
{ id: 'uniqueId', type: 'radio',
  q: L('Soalan dalam Bahasa Malaysia', 'The question in English'),
  hint: L('Nota kecil', 'Small print'),
  opts: [opt('yes', 'Ya', 'Yes'), opt('no', 'Tidak', 'No')],
  when: function (S) { return S.someOtherAnswer === 'yes'; },
  flag: function (v) {
    return v === 'yes' ? { lvl: 'amber', ms: 'Untuk doktor.', en: 'For the doctor.' } : null;
  },
  sum: L('Label ringkasan', 'Summary label') }
```

---

## ⚠ Before using this with real patients

**The clinical thresholds have not yet been checked against the published
PDFs.** They were transcribed from the guidelines, carefully, but the machine
this was built on could not reach `mems.my`, `moh.gov.my` or any mirror —
the network policy refused every one — so no value has been read off the
source document.

The application does not hide this. The build prints the count, the Summary
tab shows a red notice, and the generated note repeats it in its provenance
block.

**[`docs/CLINICAL_SPEC.md`](docs/CLINICAL_SPEC.md) is the checklist.** Every
value, what it drives, and the clause to read it against. It is a single-file
job: correct a number in `src/cpg.js` and every chart band, flag rule, care
gap, quiz explanation and note line follows automatically.

The three to check first, because they are the ones most likely to be wrong
and the ones with the most reach:

1. **`bp`** — 135/75 mmHg. The nursing tab colours every reading against it.
2. **`hba1c.general`** — 6.5 %. Tighter than the <7 % many clinicians assume.
3. **`bmi` and `waist`** — the Asian cut-offs. Using the international ones
   would under-call obesity in exactly this population.

---

## Clinical grounding

Everything — every question, every threshold, every word of patient-facing
advice, every quiz answer — comes from these two documents and no other
source. The build enforces it.

- Clinical Practice Guidelines: **Management of Type 2 Diabetes Mellitus,
  6th Edition**. Ministry of Health Malaysia / Academy of Medicine Malaysia /
  Malaysian Endocrine & Metabolic Society / Diabetes Malaysia / FMSA
  Malaysia. December 2020. MOH/P/PAK/447.20(GU)-e.
- Clinical Practice Guidelines: **Management of Obesity, 2nd Edition**.
  Ministry of Health Malaysia / MEMS / FMSA / Malaysian Dietitians'
  Association / MASO. 2023. ISBN 978-967-2887-53-9.

**This application is not a medical device.** It does not diagnose, does not
triage, and does not treat. It is a history-taking aid. Answers are the
patient's own report, are not verified against the medical record, and the
flags are generated by rule and have not been screened by a clinician. Every
generated note says exactly this.

---

## Credits

QR codes are drawn in the browser by `qrcode-generator` (Kazuhiko Arase,
MIT), vendored in `build/vendor/` so the page fetches nothing — the counter
QR is inline SVG with no image host involved.
