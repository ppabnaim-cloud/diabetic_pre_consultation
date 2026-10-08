/**
 * Builds index.html from the partials in src/.
 *
 * ONE SET OF SOURCES, ONE ARTEFACT
 *   The clinical content lives in small reviewable files -- cpg.js
 *   holds every threshold, schema.js every question, quiz.js the
 *   quiz -- and this inlines them into a single static page with
 *   no runtime dependency on anything but a web font. The built
 *   file is committed, so the host needs no build step: point
 *   Vercel (or any static host, or a USB stick) at the repository
 *   root and it serves.
 *
 * THE BUILD IS A GATE, NOT A COPY
 *   Before writing anything it evaluates the clinical partials in
 *   a sandbox and asserts the properties that a reviewer cannot
 *   check by eye across 130-odd questions:
 *
 *     - every question id is unique, since the id is also the
 *       storage key and a collision would silently overwrite one
 *       answer with another;
 *     - every question, option, hint and quiz explanation carries
 *       BOTH languages, so a Malay-first clinic never meets a
 *       blank label;
 *     - every quiz item has exactly one answer, in range;
 *     - every `when` and every `flag` actually runs, against both
 *       an empty patient and a populated one -- a flag rule that
 *       throws would otherwise fail silently at the bedside and
 *       lose a red flag;
 *     - the summary generator produces a note containing the
 *       sections a doctor is promised.
 *
 *   It then prints how many clinical values in cpg.js are still
 *   marked 'verify', because that number must reach zero before
 *   the application is used on real patients.
 *
 * Run: node build/build.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

/* Deployment values. Overridable from the environment so a clinic
   can point the build at its own notebook or change the counter
   code without editing a tracked file. */
const NOTEBOOK_URL = process.env.DMPC_NOTEBOOK_URL ||
  'https://notebook.google.com/notebook/e387bdb0-9a08-4ce0-a363-6765e71c7d98/preview';
const NURSE_CODE = process.env.DMPC_NURSE_CODE || 'jururawat';
const VERSION = process.env.DMPC_VERSION ||
  ('v1.0 \u00b7 ' + new Date().toISOString().slice(0, 10));

const fail = m => { console.error('\n  BUILD FAILED: ' + m + '\n'); process.exit(1); };

/* ── 1. Read the partials ──────────────────────────────────── */
const PARTIALS = {
  STYLES:  'src/styles.html',
  CPG:     'src/cpg.js',
  I18N:    'src/i18n.js',
  SCHEMA:  'src/schema.js',
  QUIZ:    'src/quiz.js',
  SUMMARY: 'src/summary.js',
  APP:     'src/app.js'
};
const src = {};
for (const k of Object.keys(PARTIALS)) {
  const p = path.join(ROOT, PARTIALS[k]);
  if (!fs.existsSync(p)) fail('missing partial ' + PARTIALS[k]);
  src[k] = read(PARTIALS[k]);
}

/* Each partial is a <script> (or <style>) block so that editors
   treat it as what it is. Strip the wrapper to evaluate it. */
const strip = s => s
  .replace(/^\s*<script>\n?/, '').replace(/<\/script>\s*$/, '')
  .replace(/^\s*<style>\n?/, '').replace(/<\/style>\s*$/, '');

/* ── 2. Evaluate the clinical partials and assert ──────────── */
const SANDBOX = strip(src.CPG) + '\n' + strip(src.I18N) + '\n' +
                strip(src.SCHEMA) + '\n' + strip(src.QUIZ) + '\n' +
                strip(src.SUMMARY) + '\n' +
                'return { CPG: CPG, CPGcalc: CPGcalc, T: T, SCHEMA: SCHEMA, ' +
                'QUIZ: QUIZ, Summary: Summary, L: L };';

let M;
try {
  M = new Function(SANDBOX)();
} catch (e) {
  fail('a clinical partial does not evaluate: ' + e.message);
}

const problems = [];
const bad = m => problems.push(m);

/* Both languages, everywhere. A missing `en` is a blank label on
   an English-speaking patient's screen, which is a defect even
   though Malay is the default. */
function bilingual(o, where) {
  if (o == null) return;
  if (typeof o !== 'object') { bad(where + ' is not a language pair'); return; }
  if (!o.ms || !String(o.ms).trim()) bad(where + ' has no Malay text');
  if (!o.en || !String(o.en).trim()) bad(where + ' has no English text');
}

/* -- schema -- */
const ids = Object.create(null);
let nFields = 0, nFlags = 0, nConds = 0;

if (!Array.isArray(M.SCHEMA) || !M.SCHEMA.length) fail('SCHEMA is empty');

for (const sec of M.SCHEMA) {
  if (!sec.id) bad('a section has no id');
  bilingual(sec.title, 'section ' + sec.id + ' title');
  if (sec.lead) bilingual(sec.lead, 'section ' + sec.id + ' lead');
  if (!Array.isArray(sec.fields) || !sec.fields.length) bad('section ' + sec.id + ' has no fields');

  for (const f of sec.fields || []) {
    nFields++;
    if (!f.id) { bad('a field in ' + sec.id + ' has no id'); continue; }
    if (ids[f.id]) bad('duplicate field id "' + f.id + '" (in ' + ids[f.id] + ' and ' + sec.id + ')');
    ids[f.id] = sec.id;

    bilingual(f.q, f.id + '.q');
    if (f.hint) bilingual(f.hint, f.id + '.hint');
    if (f.sum) bilingual(f.sum, f.id + '.sum');

    const needsOpts = ['radio', 'checks', 'select'].indexOf(f.type) >= 0;
    if (needsOpts && (!Array.isArray(f.opts) || f.opts.length < 2)) {
      bad(f.id + ' is a ' + f.type + ' with fewer than two options');
    }
    const seen = Object.create(null);
    for (const o of f.opts || []) {
      if (o.v == null || o.v === '') bad(f.id + ' has an option with no value');
      if (seen[o.v]) bad(f.id + ' repeats the option value "' + o.v + '"');
      seen[o.v] = 1;
      bilingual(o.l, f.id + ' option "' + o.v + '"');
    }
    if (f.type === 'scale' && (f.min == null || f.max == null)) {
      bad(f.id + ' is a scale without min and max');
    }
    if (f.type === 'num' && f.min != null && f.max != null && f.min >= f.max) {
      bad(f.id + ' has min >= max');
    }
    if (f.when) { nConds++; if (typeof f.when !== 'function') bad(f.id + '.when is not a function'); }
    if (f.flag) { nFlags++; if (typeof f.flag !== 'function') bad(f.id + '.flag is not a function'); }
  }
}

/* -- quiz -- */
if (!Array.isArray(M.QUIZ) || M.QUIZ.length < 4) fail('QUIZ has fewer than four items');
for (const q of M.QUIZ) {
  if (!q.id) bad('a quiz item has no id');
  bilingual(q.q, 'quiz ' + q.id + ' question');
  bilingual(q.why, 'quiz ' + q.id + ' explanation');
  bilingual(q.topic, 'quiz ' + q.id + ' topic');
  if (!Array.isArray(q.opts) || q.opts.length < 3) bad('quiz ' + q.id + ' has fewer than three options');
  (q.opts || []).forEach((o, i) => bilingual(o, 'quiz ' + q.id + ' option ' + i));
  if (typeof q.ans !== 'number' || q.ans < 0 || q.ans >= (q.opts || []).length) {
    bad('quiz ' + q.id + ' has no valid answer index');
  }
  if (['T2DM', 'OBES'].indexOf(q.src) < 0) {
    bad('quiz ' + q.id + ' cites "' + q.src + '", which is not one of the two guidelines');
  }
}

/* -- i18n chrome -- */
(function walkT(o, p) {
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (v && typeof v === 'object') {
      if ('ms' in v || 'en' in v) bilingual(v, 'T.' + p + k);
      else walkT(v, p + k + '.');
    }
  }
})(M.T, '');

/* -- every rule must run, on an empty patient and a full one --
   A `when` or `flag` that throws is the worst kind of defect here:
   the question silently disappears, or the red flag silently fails
   to raise, and nothing on the screen says so. */
const FULL = {
  name: 'Ujian Binaan', ic: '600101145503', sex: 'M', age: 66,
  dxYear: 2009, dmType: 't2', tabs: 'yes', inject: 'yes',
  drugs: ['metformin', 'su', 'insulin'], otherMeds: ['bp', 'statin'],
  adherence: 'many', adherenceWhy: ['forget', 'cost'],
  hba1cKnown: 'yes', hba1c: 9.4, hba1cWhen: '2026-07',
  smoke: 'cig', smokeQuit: 'soon', alcohol: 'no', family: ['dm', 'cvd'],
  admissions: 'more',
  osmotic: ['thirst', 'urine', 'blur'], sick: ['vomit', 'drowsy'], weightChange: 'downNo',
  chest: 'rest', breathless: 'flat', orthopnoea: ['wake', 'swell'],
  stroke: ['weak'], claudication: 'short', knownCvd: ['mi'],
  eyeSx: ['sudden', 'floaters'], eyeScreen: 'gt2',
  renalSx: ['frothy', 'less'], renalScreen: 'never',
  neuroSx: ['numb', 'noFeel'], autonomic: ['dizzy'], ed: 'yes',
  footNow: ['ulcer', 'redHot'], footCare: ['barefoot', 'hotWater'],
  footScreen: 'never', amputation: 'no', lipidScreen: '1to2',
  dentalScreen: 'never', dentalSx: ['bleed'],
  meals: '3', rice: '4', plate: 'little', veg: '0', fruit: '0',
  sugarDrink: 'daily', sugarAdd: 'yes', fried: 'daily', outside: 'daily',
  supper: 'wk3', salt: 'yes', cook: 'spouse', dietitian: 'never',
  fasting: 'ramadan', foodSecurity: 'yes',
  hasMeter: 'yes', smbgFreq: 'wk',
  gluLog: [{ d: '2026-10-01', v: 2.7, ctx: 'fasting' },
           { d: '2026-10-02', v: 6.1, ctx: 'fasting' },
           { d: '2026-10-03', v: 14.2, ctx: 'post2h' },
           { d: '2026-10-04', v: 3.6, ctx: 'night' }],
  gluPattern: ['swing', 'lowAm'],
  exMin: 20, exDays: '1', resistance: 'no', sitting: 'gt2',
  stepsTrack: 'yes', stepsTypical: 2600,
  stepsLog: [{ label: 'wk 0', v: 2600 }, { label: 'wk 1', v: 3100 }],
  exBarrier: ['pain', 'fear'],
  hypoKnow: 'no', hypoCount: 'gt5', hypoLowest: 2.6, hypoHelp: 'uncons',
  hypoWarn: 'never', hypoNight: 'yes', hypoAction: ['nothing'],
  hypoCarry: 'never', drives: 'yes',
  insRegimen: '2', insMissed: 'gt3', insSite: ['same', 'lump'],
  insStore: 'freezer', insNeedle: 'many',
  wt: 92.5, ht: 165, wtMax: 97, wtTried: ['diet', 'slimming'],
  wtReady: '7', wtGoal: 'Turun 10 kg', osa: ['snore', 'sleepy', 'drive'],
  sleepHours: 'lt5', joints: 'lots',
  mood1: '2', mood2: '3', distress: 'overwhelmed', support: 'no',
  access: ['transport', 'cost'], vaccine: ['none'], pregnancy: 'na',
  topics: ['sugar', 'feet', 'lows'], oneThing: 'Kaki saya sakit.',
  worry: 'Saya takut buta.', question: 'Bolehkah saya berhenti insulin?'
};
const FULL_F = JSON.parse(JSON.stringify(FULL));
FULL_F.sex = 'F'; FULL_F.ic = '750615146002'; FULL_F.pregnancy = 'pregnant';
delete FULL_F.ed;

const CASES = { empty: {}, male: FULL, female: FULL_F };

for (const [name, st] of Object.entries(CASES)) {
  for (const sec of M.SCHEMA) {
    try { if (sec.when) sec.when(st); }
    catch (e) { bad('section ' + sec.id + '.when throws on the ' + name + ' case: ' + e.message); }
    for (const f of sec.fields) {
      try { if (f.when) f.when(st); }
      catch (e) { bad(f.id + '.when throws on the ' + name + ' case: ' + e.message); }
      try { if (f.flag) f.flag(st[f.id], st); }
      catch (e) { bad(f.id + '.flag throws on the ' + name + ' case: ' + e.message); }
    }
  }
}

/* -- the summary must actually generate, in both languages -- */
const NURSE = {
  sys1: 168, dia1: 96, sys2: 172, dia2: 98, pulse: 104, pulseRhythm: 'irregular',
  rbg: 21.4, rbgCtx: 'random', wt: 92.5, ht: 165, waist: 108, temp: 37.2, spo2: 97,
  pulsesR: 'absent', pulsesL: 'present', monoR: 'reduced', monoL: 'reduced',
  footUlcer: 'yes', footDeform: 'no', staff: 'SN Test', at: '2026-10-08T09:40'
};

let noteMs = '', noteEn = '';
try {
  noteMs = M.Summary.text(FULL, NURSE, 'ms', { maskIc: false, appVersion: VERSION, quizTopics: [] });
  noteEn = M.Summary.text(FULL, NURSE, 'en', { maskIc: true, appVersion: VERSION,
                                               quizTopics: [M.QUIZ[0].topic] });
  M.Summary.text({}, {}, 'ms', {});
  M.Summary.text(FULL_F, {}, 'en', {});
} catch (e) {
  bad('the summary generator throws: ' + e.message);
}

if (noteEn) {
  for (const needle of ['IDENTIFICATION', 'CPG-ANCHORED CARE GAPS',
                        'NURSING STATION OBSERVATIONS', 'GLYCAEMIC PICTURE',
                        'PROVENANCE AND LIMITS', 'END OF SUMMARY']) {
    if (noteEn.indexOf(needle) < 0) bad('the English summary is missing its "' + needle + '" section');
  }
  if (noteEn.indexOf('850101') >= 0) bad('the masked summary still contains a full IC number');
  if (noteEn.indexOf('600101-14-****') < 0) bad('IC masking did not take effect');
}
if (noteMs && noteMs.indexOf('PENGENALAN') < 0) bad('the Malay summary is missing its identification section');

/* The red flags the populated case must raise. If the chain from
   a question to the doctor's note ever breaks, it breaks here,
   not in a clinic. */
try {
  const fl = M.Summary.flags(FULL, NURSE);
  const reds = fl.filter(f => f.lvl === 'red');
  if (!reds.length) bad('the populated case raises no red flag, which cannot be right');
  const mustSee = [/chest pain/i, /foot/i, /severe\) hypoglycaemia|Level 3/i,
                   /visual loss|curtain/i, /capillary glucose/i];
  for (const re of mustSee) {
    if (!reds.some(f => re.test(f.en))) bad('no red flag matches ' + re + ' on the populated case');
  }
  const gaps = M.Summary.gaps(FULL, NURSE, 'en');
  if (gaps.length < 6) bad('only ' + gaps.length + ' care gaps found on a case that should have many');
  if (!gaps.every(g => g.cite && /^\[(T2DM|OBES)\]/.test(g.cite))) {
    bad('a care gap is not cited to one of the two guidelines');
  }
} catch (e) {
  bad('flag or gap generation throws: ' + e.message);
}

/* No source but the two documents may be cited. The phrases below
   are matched rather than bare acronyms on purpose: "ADA" and
   "WHO" collide with ordinary Malay ("ada" = present, "siapa"
   aside) and with the word "who", and a gate that cries wolf on
   Malay prose would be switched off within a week. */
const foreignCite = new RegExp([
  'NICE guideline', 'NICE NG\\d', 'American Diabetes Association',
  'Standards of (Medical )?Care in Diabetes', 'UpToDate', 'WebMD',
  'Mayo Clinic', 'Diabetes UK', 'IDF Guideline', 'World Health Organization',
  'World Health Organisation', 'Endocrine Society', 'AACE'
].join('|'), 'i');
for (const [k, v] of Object.entries(src)) {
  const m = foreignCite.exec(v);
  if (m) bad(PARTIALS[k] + ' cites "' + m[0] + '", but only the two Malaysian CPGs may be cited');
}

/* Every clinical constant must declare a verification state, and
   it must be one we recognise -- a typo such as v:'verfiy' would
   otherwise drop a value out of the unverified count and out of
   the notice the summary carries. */
(function walkCPG(o, p) {
  if (!o || typeof o !== 'object') return;
  if ('v' in o && ['cpg', 'verify', 'proxy', 'clinical'].indexOf(o.v) < 0) {
    bad('CPG' + p + '.v is "' + o.v + '", which is not a recognised verification state');
  }
  if ('v' in o && o.v === 'verify' && !o.cl) {
    bad('CPG' + p + ' is marked for verification but names no guideline clause');
  }
  for (const k of Object.keys(o)) {
    if (k === 'bands') continue;
    walkCPG(o[k], p + '.' + k);
  }
})(M.CPG, '');

if (problems.length) {
  console.error('\n  BUILD FAILED \u2014 ' + problems.length + ' problem(s):');
  problems.forEach(p => console.error('   \u2022 ' + p));
  console.error('');
  process.exit(1);
}

/* ── 3. Assemble ───────────────────────────────────────────── */
let page = read('src/page.html');

const qrlib = '<script>\n/* qrcode-generator by Kazuhiko Arase, MIT licence. Vendored so the\n' +
  '   page fetches nothing: the counter QR is drawn in the browser as\n' +
  '   inline SVG paths, with no image host involved. */\n' +
  read('build/vendor/qrcode-generator.js') + '\n<\/script>';

const subs = {
  STYLES: src.STYLES,
  QRLIB: qrlib,
  CPG: src.CPG,
  I18N: src.I18N,
  SCHEMA: src.SCHEMA,
  QUIZ: src.QUIZ,
  SUMMARY: src.SUMMARY,
  APP: src.APP,
  NOTEBOOK_URL: NOTEBOOK_URL,
  NURSE_CODE: NURSE_CODE,
  VERSION: VERSION
};
for (const [k, v] of Object.entries(subs)) {
  page = page.split('{{' + k + '}}').join(v);
}

const leftover = /\{\{(\w+)\}\}/.exec(page);
if (leftover) fail('unfilled placeholder {{' + leftover[1] + '}} in src/page.html');

/* A stray Apps Script tag would mean a partial was copied from the
   sibling dashboard without being adapted. */
if (/<\?!?=?/.test(page)) fail('the page contains an Apps Script template tag');

/* The config block must have taken the real values, not kept the
   placeholders -- a page shipped with a literal {{NURSE_CODE}}
   would let anyone into the nursing tab. */
if (page.indexOf("nurseCode: '" + NURSE_CODE + "'") < 0) fail('the nursing code was not substituted');

/* Emitted into public/ rather than the repository root. That is
   the directory a static host serves by default, and it means the
   deployed surface is exactly the one artefact -- not src/, not
   build/, not tests/, not package.json. */
const OUT_DIR = path.join(ROOT, 'public');
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'index.html'), page);

/* ── 4. Report ─────────────────────────────────────────────── */
const kb = n => (n / 1024).toFixed(1) + ' KB';
const sections = M.SCHEMA.length;
console.log('');
console.log('  public/index.html built \u2014 ' + kb(page.length));
console.log('    sections            : ' + sections);
console.log('    questions           : ' + nFields);
console.log('    conditional on other answers : ' + nConds);
console.log('    questions that can raise a flag : ' + nFlags);
console.log('    quiz items          : ' + M.QUIZ.length);
console.log('    summary, populated case : ' + noteMs.split('\n').length + ' lines');
console.log('    languages           : Bahasa Malaysia (default), English');
console.log('');
if (M.CPG.unverified > 0) {
  console.log('  \u26a0  ' + M.CPG.unverified + ' clinical values in src/cpg.js are marked');
  console.log('     v:\'verify\' \u2014 transcribed from the guidelines but NOT yet');
  console.log('     re-checked against the published PDFs.');
  console.log('     Work through docs/CLINICAL_SPEC.md before any clinical use.');
  console.log('');
} else {
  console.log('  \u2713  every clinical value in src/cpg.js is signed off against a PDF.');
  console.log('');
}
