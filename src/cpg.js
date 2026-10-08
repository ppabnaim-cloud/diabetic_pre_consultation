<script>
/* ============================================================
   PRA-KONSULTASI DIABETIK — CLINICAL CONSTANTS
   Klinik Diabetik, Hospital Tengku Permaisuri Norashikin, Kajang

   THIS FILE IS THE ONLY PLACE A CLINICAL NUMBER IS WRITTEN.

   Every threshold the application uses -- to colour a reading, to
   raise a flag, to classify a BMI, to decide that a screening test
   is overdue -- is declared here with the guideline clause it comes
   from. Nothing downstream invents a number: app.js, schema.js,
   summary.js and quiz.js all read CPG.*. A clinician auditing this
   application reads this one file, not six.

   SOURCES, and only these two:
     [T2DM] Clinical Practice Guidelines: Management of Type 2
            Diabetes Mellitus, 6th Edition. Ministry of Health
            Malaysia / Academy of Medicine Malaysia / Malaysian
            Endocrine & Metabolic Society / Diabetes Malaysia /
            FMSA Malaysia. December 2020.
            MOH/P/PAK/447.20(GU)-e.
     [OBES] Clinical Practice Guidelines: Management of Obesity,
            2nd Edition. Ministry of Health Malaysia / MEMS /
            FMSA / Malaysian Dietitians' Association / MASO. 2023.
            ISBN 978-967-2887-53-9.

   ── VERIFICATION STATUS ──────────────────────────────────────
   The `v` field on each entry records whether the value has been
   checked against the published PDF by a human:

     v: 'cpg'    checked against the document, clause cited
     v: 'verify' TRANSCRIBED FROM THE GUIDELINE BUT NOT YET
                 RE-CHECKED AGAINST THE PDF IN THIS REPOSITORY

   Entries marked 'verify' must be read against the source PDF
   before this application is used in a live clinic. The build
   prints a count of them and the Summary tab carries a visible
   notice for as long as any remain, so an unverified number
   cannot quietly reach a doctor's note. Correct a value here and
   it corrects everywhere; change `v` to 'cpg' as each is signed
   off, and add the page number to `cl`.
   ============================================================ */

/* L(ms, en) — every string in this application carries both
   languages at the point it is written, so a Malay label and its
   English twin cannot drift into different files. */
function L(ms, en) { return { ms: ms, en: en || ms }; }

var CPG = {

  /* The documents themselves, cited in full on the summary and in
     the guideline tab. Nothing in this app may cite anything else. */
  refs: {
    t2dm: {
      short: 'CPG T2DM 6th Ed. (2020)',
      full: L(
        'Garis Panduan Amalan Klinikal: Pengurusan Diabetes Mellitus Jenis 2, Edisi ke-6, Kementerian Kesihatan Malaysia, Disember 2020. MOH/P/PAK/447.20(GU)-e.',
        'Clinical Practice Guidelines: Management of Type 2 Diabetes Mellitus, 6th Edition, Ministry of Health Malaysia, December 2020. MOH/P/PAK/447.20(GU)-e.'),
      url: 'https://mems.my/wp-content/uploads/2021/03/CPG-T2DM_6th-Edition-2020_210226.pdf'
    },
    obes: {
      short: 'CPG Obesity 2nd Ed. (2023)',
      full: L(
        'Garis Panduan Amalan Klinikal: Pengurusan Obesiti, Edisi ke-2, Kementerian Kesihatan Malaysia, 2023. ISBN 978-967-2887-53-9.',
        'Clinical Practice Guidelines: Management of Obesity, 2nd Edition, Ministry of Health Malaysia, 2023. ISBN 978-967-2887-53-9.'),
      url: 'https://mems.my/wp-content/uploads/2023/06/230518_MEMS_CPG-Management-Obesity_FA8-Digital.pdf'
    }
  },

  /* ── Glycaemic targets ─────────────────────────────────────
     [T2DM] targets for control. The guideline sets a general
     HbA1c target and then individualises it; the app never
     applies a target to a patient on its own, it reports the
     reading beside the band and leaves the choice of band to the
     doctor. That is deliberate: picking the band is a clinical
     judgement about hypoglycaemia risk, comorbidity and life
     expectancy that a waiting-room form cannot make. */
  hba1c: {
    general:  { pct: 6.5, v: 'verify', cl: '[T2DM] targets for control',
                note: L('Sasaran am', 'General target') },
    tight:    { pct: 6.1, v: 'verify', cl: '[T2DM] individualisation of targets',
                note: L('Baru didiagnos, muda, tiada penyakit jantung',
                        'Newly diagnosed, younger, no cardiovascular disease') },
    relaxed:  { pct: 7.0, v: 'verify', cl: '[T2DM] individualisation of targets',
                note: L('Ada komorbiditi, risiko hipoglisemia',
                        'Comorbidity present, hypoglycaemia risk') },
    frail:    { pct: 8.0, v: 'verify', cl: '[T2DM] individualisation of targets',
                note: L('Komorbiditi berat, jangka hayat terhad, hipoglisemia teruk',
                        'Severe comorbidity, limited life expectancy, severe hypoglycaemia') }
  },

  /* Capillary (fingerprick) targets, mmol/L. These are the bands
     the home-monitoring chart shades and the "% in range" figure
     counts against. */
  cap: {
    fasting: { lo: 4.4, hi: 7.0, v: 'verify', cl: '[T2DM] targets for control',
               label: L('Berpuasa / sebelum makan', 'Fasting / pre-prandial') },
    post:    { lo: 4.4, hi: 8.5, v: 'verify', cl: '[T2DM] targets for control',
               label: L('2 jam selepas makan', '2 hours post-prandial') }
  },

  /* ── Hypoglycaemia ────────────────────────────────────────
     The three-level classification. Level 3 is defined by the
     need for external assistance and has no glucose threshold at
     all -- a patient who needed help is Level 3 whatever the
     meter said, which is why `l3` carries no number. */
  hypo: {
    l1: { lt: 3.9, ge: 3.0, v: 'verify', cl: '[T2DM] hypoglycaemia classification',
          name: L('Tahap 1 — amaran', 'Level 1 — alert value'),
          desc: L('Glukosa kurang 3.9 mmol/L dan 3.0 mmol/L atau lebih.',
                  'Glucose below 3.9 mmol/L and 3.0 mmol/L or above.') },
    l2: { lt: 3.0, v: 'verify', cl: '[T2DM] hypoglycaemia classification',
          name: L('Tahap 2 — bermakna klinikal', 'Level 2 — clinically significant'),
          desc: L('Glukosa kurang 3.0 mmol/L.', 'Glucose below 3.0 mmol/L.') },
    l3: { v: 'verify', cl: '[T2DM] hypoglycaemia classification',
          name: L('Tahap 3 — teruk', 'Level 3 — severe'),
          desc: L('Gangguan mental atau fizikal yang memerlukan bantuan orang lain. Tiada nilai glukosa tertentu.',
                  'Cognitive or physical impairment requiring assistance from another person. No specific glucose value.') },
    /* The "rule of 15", as the guideline states it for a conscious
       patient able to swallow. The quiz and the guideline tab both
       read these two numbers rather than restating them. */
    rule15: { carb_g: 15, recheck_min: 15, v: 'verify',
              cl: '[T2DM] management of hypoglycaemia' }
  },

  /* ── Blood pressure and lipids ────────────────────────────
     bp.sys / bp.dia is the treatment target in type 2 diabetes.
     THIS IS THE SINGLE MOST IMPORTANT ENTRY TO VERIFY: the
     Malaysian diabetes guideline's target is tighter than the
     <140/90 many clinicians carry in their head, and the nursing
     tab colours every reading against it. */
  bp: { sys: 135, dia: 75, v: 'verify', cl: '[T2DM] blood pressure target' },

  lipid: {
    ldl:      { max: 2.6, v: 'verify', cl: '[T2DM] lipid targets' },
    ldlHigh:  { max: 1.8, v: 'verify', cl: '[T2DM] lipid targets, very high risk / established CVD' },
    tg:       { max: 1.7, v: 'verify', cl: '[T2DM] lipid targets' },
    hdlMale:  { min: 1.0, v: 'verify', cl: '[T2DM] lipid targets' },
    hdlFemale:{ min: 1.2, v: 'verify', cl: '[T2DM] lipid targets' }
  },

  /* ── Anthropometry, Asian cut-offs ───────────────────────
     [OBES] uses the Asian BMI categories, not the WHO
     international ones: overweight begins at 23.0 and obesity at
     27.5, both lower than the 25/30 a non-Asian guideline would
     use. Getting this wrong under-calls obesity in exactly the
     population this clinic serves. */
  bmi: {
    v: 'verify', cl: '[OBES] BMI classification, Asian cut-offs',
    bands: [
      { max: 18.49, key: 'under',  name: L('Kurang berat', 'Underweight') },
      { max: 22.99, key: 'normal', name: L('Normal', 'Normal') },
      { max: 27.49, key: 'over',   name: L('Berlebihan berat', 'Overweight') },
      { max: 34.99, key: 'ob1',    name: L('Obesiti Kelas I', 'Obesity Class I') },
      { max: 39.99, key: 'ob2',    name: L('Obesiti Kelas II', 'Obesity Class II') },
      { max: Infinity, key: 'ob3',  name: L('Obesiti Kelas III', 'Obesity Class III') }
    ],
    /* Above this BMI the obesity guideline's weight-management
       pathway applies, and the summary says so. */
    obeseFrom: 27.5
  },

  waist: { male: 90, female: 80, v: 'verify',
           cl: '[OBES] waist circumference cut-offs, Asian' },

  /* Weight loss worth achieving, as a percentage of present body
     weight. The summary converts these to kilograms for the
     individual patient so the target is a number they recognise. */
  weightLoss: { minPct: 5, goodPct: 10, v: 'verify',
                cl: '[OBES] weight reduction targets' },

  /* Daily energy deficit for weight reduction, kcal/day. */
  energyDeficit: { lo: 500, hi: 750, v: 'verify',
                   cl: '[OBES] dietary intervention' },

  /* ── Physical activity ───────────────────────────────────
     [T2DM] exercise prescription. `maxGapDays` is the "no more
     than two consecutive days without activity" clause, which
     matters more for glycaemic control than the weekly total and
     is the one patients most often miss. */
  activity: {
    v: 'verify', cl: '[T2DM] physical activity; [OBES] physical activity',
    minPerWeek: 150,
    maxGapDays: 2,
    resistanceSessions: 2,
    sedentaryBreakMin: 30,
    /* For weight loss and its maintenance the obesity guideline
       asks for more than the glycaemic minimum. */
    weightMinPerWeek: 300
  },

  /* Daily step counts are NOT a guideline target. The guideline
     prescribes minutes of moderate activity, not steps. These
     bands exist only to turn a pedometer or phone figure the
     patient already has into a rough statement about whether they
     are near the 150-minute prescription, and the summary labels
     them as a proxy every time it prints one. Do not promote
     these to a target. */
  steps: {
    v: 'proxy', cl: 'Not a CPG target. Proxy for [T2DM] activity prescription only.',
    sedentary: 5000,
    low: 7500,
    active: 10000
  },

  /* ── Screening intervals, in months ──────────────────────
     Each drives one line of the overdue-screening list on the
     summary. `at` records the guideline's starting point. */
  screening: {
    v: 'verify', cl: '[T2DM] screening for complications',
    eye:    { months: 12, at: L('semasa diagnosis', 'at diagnosis'),
              name: L('Saringan mata (retinopati)', 'Eye screening (retinopathy)') },
    renal:  { months: 12, at: L('semasa diagnosis', 'at diagnosis'),
              name: L('Saringan buah pinggang (albumin kencing, eGFR)',
                      'Renal screening (urine albumin, eGFR)') },
    foot:   { months: 12, at: L('semasa diagnosis', 'at diagnosis'),
              name: L('Pemeriksaan kaki', 'Foot examination') },
    lipid:  { months: 12, at: L('semasa diagnosis', 'at diagnosis'),
              name: L('Profil lipid', 'Lipid profile') },
    dental: { months: 12, at: L('semasa diagnosis', 'at diagnosis'),
              name: L('Pemeriksaan pergigian', 'Dental examination') }
  },

  /* ── Counter escalation thresholds ───────────────────────
     A pre-consultation form that silently records a capillary
     glucose of 2.8 and files it for the doctor an hour later has
     done harm. These are the values at which this application
     stops being a questionnaire and puts a red banner on the
     screen telling the patient to speak to staff now. They are
     intentionally conservative. */
  escalate: {
    v: 'clinical', cl: 'Local operational safety thresholds, set to be conservative. Not CPG clauses.',
    rbgLow: 4.0,
    rbgVeryLow: 3.0,
    rbgHigh: 20.0,
    bpSys: 180,
    bpDia: 110,
    pulseLow: 50,
    pulseHigh: 120,
    spo2Low: 94,
    tempHigh: 38.0
  },

  /* ── Salt, alcohol, smoking ──────────────────────────────
     Used by the dietary section's feedback lines. */
  diet: {
    v: 'verify', cl: '[T2DM] medical nutrition therapy',
    saltMaxG: 5,
    vegServings: 3,
    fruitServings: 2
  },

  /* Emergency contact shown on every red banner. */
  emergency: { number: '999', ed: L('Jabatan Kecemasan HTPN', 'HTPN Emergency Department') }
};

/* Count of entries still awaiting a signature against the PDF.
   app.js renders a notice while this is above zero; build/web.js
   prints it so it cannot be forgotten. */
CPG.unverified = (function () {
  var n = 0;
  (function walk(o) {
    if (!o || typeof o !== 'object') return;
    if (o.v === 'verify') n++;
    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) walk(o[k]);
  })(CPG);
  return n;
})();

/* ── Derived helpers ─────────────────────────────────────────
   Shared by the questionnaire, the nursing tab and the summary so
   a BMI band is computed once and identically everywhere. */
var CPGcalc = {

  bmi: function (kg, cm) {
    kg = parseFloat(kg); cm = parseFloat(cm);
    if (!(kg > 0) || !(cm > 0)) return null;
    var m = cm / 100;
    return Math.round((kg / (m * m)) * 10) / 10;
  },

  bmiBand: function (bmi) {
    if (bmi == null || isNaN(bmi)) return null;
    for (var i = 0; i < CPG.bmi.bands.length; i++) {
      if (bmi <= CPG.bmi.bands[i].max) return CPG.bmi.bands[i];
    }
    /* Unreachable while the top band is open-ended, and kept so
       that closing it later cannot start returning null to callers
       that reasonably assume a number always lands in a band. */
    return CPG.bmi.bands[CPG.bmi.bands.length - 1];
  },

  /* A BMI outside this range is a mistyped weight or height, not a
     person. Saying so is more use to a patient than solemnly
     classifying the typo. */
  bmiPlausible: function (bmi) { return bmi != null && bmi >= 10 && bmi <= 100; },

  /* Waist above the Asian cut-off for the recorded sex. Returns
     null when either is unknown rather than guessing a cut-off. */
  waistHigh: function (cm, sex) {
    cm = parseFloat(cm);
    if (!(cm > 0) || !sex) return null;
    var cut = sex === 'F' ? CPG.waist.female : CPG.waist.male;
    return { high: cm >= cut, cut: cut };
  },

  /* Classify one capillary reading against the band for its
     context. Returns 'low2' | 'low1' | 'in' | 'high'. */
  glucoseBand: function (mmol, context) {
    var v = parseFloat(mmol);
    if (!(v > 0)) return null;
    if (v < CPG.hypo.l2.lt) return 'low2';
    if (v < CPG.hypo.l1.lt) return 'low1';
    var band = (context === 'post2h') ? CPG.cap.post : CPG.cap.fasting;
    if (v > band.hi) return 'high';
    return 'in';
  },

  /* Months between an ISO-ish month string (YYYY-MM) and now.
     Returns null for blank or unparseable input, which the
     summary reports as "not known" rather than as overdue. */
  monthsSince: function (ym) {
    if (!ym) return null;
    var m = /^(\d{4})-(\d{1,2})/.exec(String(ym));
    if (!m) return null;
    var then = new Date(+m[1], +m[2] - 1, 1), now = new Date();
    if (isNaN(then.getTime())) return null;
    var d = (now.getFullYear() - then.getFullYear()) * 12 + (now.getMonth() - then.getMonth());
    return d < 0 ? null : d;
  },

  /* Weight to lose for the guideline's 5% and 10% milestones. */
  weightTargets: function (kg) {
    kg = parseFloat(kg);
    if (!(kg > 0)) return null;
    var r = function (x) { return Math.round(x * 10) / 10; };
    return {
      now: r(kg),
      min: { pct: CPG.weightLoss.minPct, lose: r(kg * CPG.weightLoss.minPct / 100),
             to: r(kg * (1 - CPG.weightLoss.minPct / 100)) },
      good: { pct: CPG.weightLoss.goodPct, lose: r(kg * CPG.weightLoss.goodPct / 100),
              to: r(kg * (1 - CPG.weightLoss.goodPct / 100)) }
    };
  },

  /* Malaysian NRIC. Derives date of birth, age and sex -- three
     fields the patient then does not have to type, and three
     fewer chances to mistype them. Place-of-birth is deliberately
     not decoded: the code list has changed over time and a wrong
     state of birth on a clinical note is worse than a blank.

     Returns { ok, dob, age, sex, why } -- `why` names the failure
     so the field can say what is wrong rather than just reject. */
  ic: function (raw) {
    var s = String(raw || '').replace(/\D/g, '');
    if (!s) return { ok: false, why: 'empty' };
    if (s.length !== 12) return { ok: false, why: 'length' };
    var yy = +s.slice(0, 2), mm = +s.slice(2, 4), dd = +s.slice(4, 6);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return { ok: false, why: 'date' };

    /* Two-digit years: assume this century until that would put
       the birth in the future, then fall back a hundred years. */
    var now = new Date(), cy = now.getFullYear();
    var year = 2000 + yy;
    if (year > cy) year = 1900 + yy;
    var dob = new Date(year, mm - 1, dd);
    if (dob.getFullYear() !== year || dob.getMonth() !== mm - 1 || dob.getDate() !== dd) {
      return { ok: false, why: 'date' };
    }
    var age = cy - year;
    var md = (now.getMonth() + 1) * 100 + now.getDate();
    if (md < mm * 100 + dd) age--;
    if (age < 0 || age > 120) return { ok: false, why: 'age' };

    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    return {
      ok: true,
      dob: year + '-' + pad(mm) + '-' + pad(dd),
      age: age,
      sex: (+s.slice(11, 12) % 2) ? 'M' : 'F'
    };
  }
};
</script>
