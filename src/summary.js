<script>
/* ============================================================
   PRA-KONSULTASI DIABETIK — SUMMARY GENERATOR

   Turns the answers into the one artefact the clinic actually
   needs: a plain-text note a doctor can read in ninety seconds
   and paste straight into the Hospital Information System.

   DESIGN OF THE NOTE
     The order is the order a clinician reads in, not the order
     the patient answered in:
       1. flags first -- anything that should not wait;
       2. identification;
       3. the CPG-anchored care gaps, as a worklist;
       4. counter observations;
       5. glycaemic picture, with the home readings summarised;
       6. then the history, section by section;
       7. the patient's own agenda LAST, because it is the thing
          the doctor should still have in mind when they look up
          from the screen;
       8. provenance, so the note says what made it and what has
          not been verified.

   Two rules hold throughout:
     - Nothing is invented. A question not answered prints as
       "not answered", never as a normal finding. A doctor must be
       able to tell a negative answer from a missing one, because
       "no chest pain" and "never asked about chest pain" are
       different clinical facts.
     - No interpretation beyond what the CPG states. The note
       reports the reading and the guideline's target beside it.
       It does not stage, diagnose, or recommend a drug.
   ============================================================ */

var Summary = (function () {

  var W = 64;                                   /* note width */
  function rule(ch) { return new Array(W + 1).join(ch || '-'); }

  function pad(s, n) {
    s = String(s == null ? '' : s);
    while (s.length < n) s += ' ';
    return s;
  }

  /* Wrap to the note width, indenting continuation lines so the
     label column stays readable in a fixed-width HIS text box. */
  function wrap(s, indent, width) {
    indent = indent || 0; width = width || W;
    var words = String(s == null ? '' : s).split(/\s+/).filter(Boolean);
    var lines = [], cur = '', lead = new Array(indent + 1).join(' ');
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (cur && (lead + cur + ' ' + w).length > width) { lines.push(lead + cur); cur = w; }
      else { cur = cur ? cur + ' ' + w : w; }
    }
    if (cur) lines.push(lead + cur);
    return lines.length ? lines : [lead];
  }

  function tr(o, lang) {
    if (o == null) return '';
    if (typeof o === 'string') return o;
    return o[lang] || o.ms || o.en || '';
  }

  /* ── Reading an answer back as words ──────────────────────
     The schema holds the option labels, so the note prints what
     the patient actually saw rather than a storage key. */
  function labelFor(field, value, lang) {
    if (value == null || value === '') return null;
    if (field.opts) {
      var find = function (v) {
        for (var i = 0; i < field.opts.length; i++) {
          if (field.opts[i].v === v) return tr(field.opts[i].l, lang);
        }
        return String(v);
      };
      if (Object.prototype.toString.call(value) === '[object Array]') {
        return value.length ? value.map(find).join('; ') : null;
      }
      return find(value);
    }
    if (Object.prototype.toString.call(value) === '[object Array]') {
      return value.length ? value.join('; ') : null;
    }
    return String(value);
  }

  /* Every field in the schema, flattened, with its section. */
  function allFields() {
    var out = [];
    for (var i = 0; i < SCHEMA.length; i++) {
      for (var j = 0; j < SCHEMA[i].fields.length; j++) {
        out.push({ sec: SCHEMA[i], f: SCHEMA[i].fields[j] });
      }
    }
    return out;
  }

  /* A field is asked of this patient when its own `when` and its
     section's `when` both pass. A field that was never asked is
     not a gap in the record and must not print as unanswered. */
  function asked(sec, f, S) {
    try {
      if (sec.when && !sec.when(S)) return false;
      if (f.when && !f.when(S)) return false;
    } catch (e) { return false; }
    return true;
  }

  function answered(v) {
    if (v == null || v === '') return false;
    if (Object.prototype.toString.call(v) === '[object Array]') return v.length > 0;
    return true;
  }

  /* ── Home glucose arithmetic ──────────────────────────────
     "Percentage within the CPG target" is the single most useful
     number this application produces, because it converts a
     logbook the doctor has no time to read into one figure. */
  function glucoseStats(log) {
    var rows = (log || []).filter(function (r) { return r && parseFloat(r.v) > 0; });
    if (!rows.length) return null;
    var vals = rows.map(function (r) { return parseFloat(r.v); });
    var sum = 0, lo = vals[0], hi = vals[0], inR = 0, below1 = 0, below2 = 0, above = 0;
    for (var i = 0; i < rows.length; i++) {
      var v = vals[i];
      sum += v;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
      var band = CPGcalc.glucoseBand(v, rows[i].ctx);
      if (band === 'in') inR++;
      else if (band === 'low1') { below1++; }
      else if (band === 'low2') { below2++; }
      else if (band === 'high') above++;
    }
    return {
      n: rows.length,
      mean: Math.round((sum / rows.length) * 10) / 10,
      lo: lo, hi: hi,
      inRange: inR, pctInRange: Math.round(inR / rows.length * 100),
      below1: below1, below2: below2, belowAny: below1 + below2, above: above,
      rows: rows
    };
  }

  /* ── Flags ────────────────────────────────────────────────
     Collected by running each field's own rule. Keeping the rule
     beside the question in schema.js, rather than in a separate
     list here, is what stops a question being added without
     anybody deciding whether it can raise a flag. */
  function flags(S, N) {
    var out = [], seen = {};
    var push = function (fl, src) {
      if (!fl) return;
      var k = fl.lvl + '|' + fl.en;
      if (seen[k]) return;
      seen[k] = 1;
      out.push({ lvl: fl.lvl, ms: fl.ms, en: fl.en, src: src });
    };

    var fields = allFields();
    for (var i = 0; i < fields.length; i++) {
      var sec = fields[i].sec, f = fields[i].f;
      if (!f.flag || !asked(sec, f, S)) continue;
      var v = S[f.id];
      if (!answered(v)) continue;
      try { push(f.flag(v, S), tr(sec.title, 'en')); } catch (e) {}
    }

    /* Counter observations carry their own thresholds, declared in
       CPG.escalate rather than here. */
    if (N) {
      var e = CPG.escalate;
      var rbg = parseFloat(N.rbg);
      if (!isNaN(rbg)) {
        if (rbg < e.rbgVeryLow) push({ lvl: 'red',
          ms: 'Glukosa kapilari di kaunter ' + rbg + ' mmol/L — hipoglisemia. Rawat sekarang.',
          en: 'Counter capillary glucose ' + rbg + ' mmol/L — hypoglycaemia. Treat now.' }, 'Nursing station');
        else if (rbg < e.rbgLow) push({ lvl: 'red',
          ms: 'Glukosa kapilari di kaunter ' + rbg + ' mmol/L — di bawah ' + e.rbgLow + '. Rawat sebelum pesakit menunggu lagi.',
          en: 'Counter capillary glucose ' + rbg + ' mmol/L — below ' + e.rbgLow + '. Treat before the patient waits further.' }, 'Nursing station');
        else if (rbg > e.rbgHigh) push({ lvl: 'red',
          ms: 'Glukosa kapilari di kaunter ' + rbg + ' mmol/L — melebihi ' + e.rbgHigh + '. Nilai untuk hiperglisemia akut.',
          en: 'Counter capillary glucose ' + rbg + ' mmol/L — above ' + e.rbgHigh + '. Assess for acute hyperglycaemia.' }, 'Nursing station');
      }
      var sys = parseFloat(N.sys2 || N.sys1), dia = parseFloat(N.dia2 || N.dia1);
      if ((!isNaN(sys) && sys >= e.bpSys) || (!isNaN(dia) && dia >= e.bpDia)) {
        push({ lvl: 'red',
          ms: 'Tekanan darah ' + (sys || '?') + '/' + (dia || '?') + ' mmHg — pada atau melebihi ' + e.bpSys + '/' + e.bpDia + '. Ulang dan nilai sekarang.',
          en: 'Blood pressure ' + (sys || '?') + '/' + (dia || '?') + ' mmHg — at or above ' + e.bpSys + '/' + e.bpDia + '. Repeat and assess now.' }, 'Nursing station');
      }
      var p = parseFloat(N.pulse);
      if (!isNaN(p) && (p < e.pulseLow || p > e.pulseHigh)) push({ lvl: 'amber',
        ms: 'Nadi ' + p + '/min di luar julat ' + e.pulseLow + '–' + e.pulseHigh + '.',
        en: 'Pulse ' + p + '/min outside ' + e.pulseLow + '–' + e.pulseHigh + '.' }, 'Nursing station');
      if (N.pulseRhythm === 'irregular') push({ lvl: 'amber',
        ms: 'Nadi tidak sekata di kaunter — pertimbang ECG untuk fibrilasi atrium.',
        en: 'Irregular pulse at the counter — consider ECG for atrial fibrillation.' }, 'Nursing station');
      var sp = parseFloat(N.spo2);
      if (!isNaN(sp) && sp < e.spo2Low) push({ lvl: 'red',
        ms: 'SpO2 ' + sp + '% — di bawah ' + e.spo2Low + '%.',
        en: 'SpO2 ' + sp + '% — below ' + e.spo2Low + '%.' }, 'Nursing station');
      var t = parseFloat(N.temp);
      if (!isNaN(t) && t >= e.tempHigh) push({ lvl: 'amber',
        ms: 'Suhu ' + t + ' °C.', en: 'Temperature ' + t + ' °C.' }, 'Nursing station');

      /* An insensate foot found at the counter outranks anything
         the patient said about their feet. */
      if (N.monoR === 'reduced' || N.monoL === 'reduced') push({ lvl: 'amber',
        ms: 'Rasa monofilamen berkurang — kaki berisiko. Pendidikan kaki dan susulan podiatri.',
        en: 'Reduced monofilament sensation — foot at risk. Foot education and podiatry follow-up.' }, 'Nursing station');
      if (N.pulsesR === 'absent' || N.pulsesL === 'absent') push({ lvl: 'amber',
        ms: 'Nadi pedal tidak dapat dirasa — nilai penyakit arteri periferi.',
        en: 'Pedal pulses not palpable — assess for peripheral arterial disease.' }, 'Nursing station');
      if (N.footUlcer === 'yes') push({ lvl: 'red',
        ms: 'Ulser kaki dilihat di kaunter — perlu dinilai hari ini.',
        en: 'Foot ulcer seen at the counter — needs assessment today.' }, 'Nursing station');
    }

    /* Red first, then amber; order within a level is the order
       the questions were asked, which keeps it stable. */
    return out.filter(function (f) { return f.lvl === 'red'; })
      .concat(out.filter(function (f) { return f.lvl === 'amber'; }));
  }

  /* ── CPG-anchored care gaps ───────────────────────────────
     This is the worklist. Each entry names the thing not done and
     the clause that asks for it, so the doctor can act or dismiss
     it without looking anything up. */
  function gaps(S, N, lang) {
    var g = [];
    var add = function (ms, en, cite) { g.push({ text: lang === 'en' ? en : ms, cite: cite }); };

    /* Overdue screening. A band of 'lt6' or '6to12' is within the
       interval; everything else is overdue or unknown. */
    var overdue = function (val) { return ['1to2', 'gt2', 'never'].indexOf(val) >= 0; };
    var unknown = function (val) { return val === 'dk' || !val; };

    var items = [
      { v: S.eyeScreen,    s: CPG.screening.eye },
      { v: S.renalScreen,  s: CPG.screening.renal },
      { v: S.footScreen,   s: CPG.screening.foot },
      { v: S.lipidScreen,  s: CPG.screening.lipid },
      { v: S.dentalScreen, s: CPG.screening.dental }
    ];
    for (var i = 0; i < items.length; i++) {
      var it = items[i], nm = tr(it.s.name, lang);
      if (overdue(it.v)) {
        add(nm + ' tertunggak. CPG mengesyorkan setiap ' + it.s.months + ' bulan.',
            nm + ' overdue. The CPG recommends every ' + it.s.months + ' months.',
            '[T2DM] screening for complications');
      } else if (unknown(it.v)) {
        add(nm + ' — pesakit tidak pasti bila kali terakhir. Sahkan daripada rekod.',
            nm + ' — patient unsure when it was last done. Confirm from the record.',
            '[T2DM] screening for complications');
      }
    }

    /* Activity below the prescription. */
    var ex = parseFloat(S.exMin);
    if (!isNaN(ex) && ex < CPG.activity.minPerWeek) {
      add('Aktiviti fizikal ' + ex + ' minit/minggu, di bawah ' + CPG.activity.minPerWeek + ' minit yang disyorkan.',
          'Physical activity ' + ex + ' minutes/week, below the recommended ' + CPG.activity.minPerWeek + ' minutes.',
          '[T2DM] physical activity');
    }
    if (S.resistance === 'no') {
      add('Tiada latihan rintangan. CPG mengesyorkan ' + CPG.activity.resistanceSessions + ' sesi seminggu.',
          'No resistance training. The CPG recommends ' + CPG.activity.resistanceSessions + ' sessions a week.',
          '[T2DM] physical activity');
    }

    /* Weight, against the Asian cut-offs. Counter-measured values
       outrank patient-reported ones. */
    var kg = parseFloat((N && N.wt) || S.wt), cm = parseFloat((N && N.ht) || S.ht);
    var bmi = CPGcalc.bmi(kg, cm), band = CPGcalc.bmiBand(bmi);
    if (bmi != null && !CPGcalc.bmiPlausible(bmi)) {
      add('BMI dikira ' + bmi + ' kg/m\u00b2 daripada nilai yang dimasukkan \u2014 semak berat dan tinggi.',
          'BMI calculates to ' + bmi + ' kg/m\u00b2 from the values entered \u2014 check the weight and height.',
          '[OBES] BMI classification');
    } else if (bmi != null && bmi >= CPG.bmi.obeseFrom) {
      var wt = CPGcalc.weightTargets(kg);
      add('BMI ' + bmi + ' kg/m² (' + tr(band.name, lang) + ', julat Asia). Laluan pengurusan berat CPG Obesiti berkenaan. Sasaran ' +
          wt.min.pct + '% = ' + wt.min.lose + ' kg (ke ' + wt.min.to + ' kg); ' +
          wt.good.pct + '% = ' + wt.good.lose + ' kg (ke ' + wt.good.to + ' kg).',
          'BMI ' + bmi + ' kg/m² (' + tr(band.name, lang) + ', Asian cut-offs). The Obesity CPG weight-management pathway applies. Target ' +
          wt.min.pct + '% = ' + wt.min.lose + ' kg (to ' + wt.min.to + ' kg); ' +
          wt.good.pct + '% = ' + wt.good.lose + ' kg (to ' + wt.good.to + ' kg).',
          '[OBES] BMI classification; weight reduction targets');
    } else if (bmi != null && bmi >= CPG.bmi.bands[2].max - 4.49) {
      /* Overweight band: worth naming, without invoking the
         obesity pathway. */
      if (band && band.key === 'over') {
        add('BMI ' + bmi + ' kg/m² — berlebihan berat pada julat Asia (' +
            CPG.bmi.bands[2].max + ' ke bawah ' + CPG.bmi.obeseFrom + ').',
            'BMI ' + bmi + ' kg/m² — overweight on the Asian cut-offs (up to ' +
            CPG.bmi.bands[2].max + ', obesity from ' + CPG.bmi.obeseFrom + ').',
            '[OBES] BMI classification');
      }
    }
    var waistCm = parseFloat(N && N.waist);
    var wh = CPGcalc.waistHigh(waistCm, S.sex);
    if (wh && wh.high) {
      add('Lilitan pinggang ' + waistCm + ' cm, pada atau melebihi nilai Asia ' + wh.cut + ' cm.',
          'Waist circumference ' + waistCm + ' cm, at or above the Asian cut-off of ' + wh.cut + ' cm.',
          '[OBES] waist circumference cut-offs');
    }

    /* Smoking. */
    if (['cig', 'vape', 'both'].indexOf(S.smoke) >= 0) {
      add('Masih merokok atau vape. Nasihat berhenti merokok dan rujukan klinik berhenti merokok.',
          'Still smoking or vaping. Smoking-cessation advice and referral to a cessation clinic.',
          '[T2DM] lifestyle modification');
    }

    /* Self-monitoring in a patient on insulin. */
    if ((S.hasMeter === 'no' || S.hasMeter === 'yesUnused') &&
        ((S.drugs || []).indexOf('insulin') >= 0 || S.inject === 'yes')) {
      add('Mengambil insulin tanpa pemantauan gula sendiri yang berkesan.',
          'On insulin without effective self-monitoring of blood glucose.',
          '[T2DM] self-monitoring of blood glucose');
    }

    /* Home readings out of band. */
    var gs = glucoseStats(S.gluLog);
    if (gs) {
      if (gs.belowAny > 0) {
        add(gs.belowAny + ' daripada ' + gs.n + ' bacaan rumah di bawah ' + CPG.hypo.l1.lt +
            ' mmol/L' + (gs.below2 ? ', termasuk ' + gs.below2 + ' di bawah ' + CPG.hypo.l2.lt : '') + '.',
            gs.belowAny + ' of ' + gs.n + ' home readings below ' + CPG.hypo.l1.lt +
            ' mmol/L' + (gs.below2 ? ', including ' + gs.below2 + ' below ' + CPG.hypo.l2.lt : '') + '.',
            '[T2DM] hypoglycaemia');
      }
      if (gs.pctInRange < 50) {
        add('Hanya ' + gs.pctInRange + '% bacaan rumah dalam julat sasaran CPG.',
            'Only ' + gs.pctInRange + '% of home readings are within the CPG target band.',
            '[T2DM] targets for control');
      }
    }

    /* HbA1c the patient reports, against the general target. The
       note states the general target and says plainly that the
       band is the doctor's to choose. */
    var a1c = parseFloat(S.hba1c);
    if (!isNaN(a1c) && a1c > CPG.hba1c.general.pct) {
      add('HbA1c dilapor ' + a1c + '%, melebihi sasaran am CPG ' + CPG.hba1c.general.pct +
          '%. Sasaran individu adalah keputusan klinikal.',
          'Reported HbA1c ' + a1c + '%, above the CPG general target of ' + CPG.hba1c.general.pct +
          '%. The individualised target is a clinical decision.',
          '[T2DM] targets for control');
    }

    /* Blood pressure against target. */
    if (N) {
      var s2 = parseFloat(N.sys2 || N.sys1), d2 = parseFloat(N.dia2 || N.dia1);
      if (!isNaN(s2) && !isNaN(d2) && (s2 >= CPG.bp.sys || d2 >= CPG.bp.dia)) {
        add('Tekanan darah ' + s2 + '/' + d2 + ' mmHg, pada atau melebihi sasaran CPG ' +
            CPG.bp.sys + '/' + CPG.bp.dia + ' mmHg.',
            'Blood pressure ' + s2 + '/' + d2 + ' mmHg, at or above the CPG target of ' +
            CPG.bp.sys + '/' + CPG.bp.dia + ' mmHg.',
            '[T2DM] blood pressure target');
      }
    }

    /* Immunisation. */
    var vac = S.vaccine || [];
    if (vac.indexOf('none') >= 0 || (vac.length && vac.indexOf('flu') < 0)) {
      add('Imunisasi influenza tidak direkod dalam setahun lepas.',
          'Influenza immunisation not recorded within the last year.',
          '[T2DM] immunisation');
    }

    /* Dietitian contact. */
    if (S.dietitian === 'never') {
      add('Belum pernah berjumpa pakar diet. Terapi nutrisi perubatan ialah asas rawatan.',
          'Never seen a dietitian. Medical nutrition therapy is a foundation of treatment.',
          '[T2DM] medical nutrition therapy');
    }

    /* Mood screen. */
    if (parseInt(S.mood1 || '0', 10) >= 2 || parseInt(S.mood2 || '0', 10) >= 2) {
      add('Saringan mood dua item positif — penilaian psikologi disyorkan.',
          'Two-item mood screen positive — psychological assessment advised.',
          '[T2DM] psychological aspects');
    }

    /* Fasting while on a hypoglycaemia-causing agent. */
    if (S.fasting && S.fasting !== 'no' &&
        ((S.drugs || []).indexOf('insulin') >= 0 || (S.drugs || []).indexOf('su') >= 0)) {
      add('Berpuasa sambil mengambil insulin atau sulfonilurea — nasihat pra-puasa dan pelarasan dos.',
          'Fasting while on insulin or a sulphonylurea — pre-fasting advice and dose adjustment.',
          '[T2DM] diabetes and fasting');
    }

    return g;
  }

  /* ── The note ─────────────────────────────────────────────── */
  function text(S, N, lang, meta) {
    lang = lang === 'en' ? 'en' : 'ms';
    meta = meta || {};
    var out = [];
    var line = function (s) { out.push(s == null ? '' : String(s)); };
    var blank = function () { out.push(''); };
    var head = function (n, ms, en) {
      blank();
      line(n + '. ' + (lang === 'en' ? en : ms).toUpperCase());
      line(rule('-'));
    };
    var kv = function (k, v) {
      if (v == null || v === '') v = (lang === 'en' ? '(not answered)' : '(tidak dijawab)');
      var key = pad(k, 24);
      var lines = wrap(v, 0, W - 26);
      line('  ' + key + lines[0].replace(/^\s+/, ''));
      for (var i = 1; i < lines.length; i++) line('  ' + pad('', 24) + lines[i].replace(/^\s+/, ''));
    };
    var bullets = function (arr, mark) {
      for (var i = 0; i < arr.length; i++) {
        var ls = wrap(arr[i], 0, W - 6);
        line('  ' + (mark || '-') + ' ' + ls[0].replace(/^\s+/, ''));
        for (var j = 1; j < ls.length; j++) line('      ' + ls[j].replace(/^\s+/, ''));
      }
    };

    var now = new Date();
    var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
    var stamp = now.getFullYear() + '-' + p2(now.getMonth() + 1) + '-' + p2(now.getDate()) +
                ' ' + p2(now.getHours()) + ':' + p2(now.getMinutes());

    /* ── Masthead ── */
    line(rule('='));
    line(lang === 'en' ? 'PRE-CONSULTATION SUMMARY — DIABETES CLINIC'
                       : 'RINGKASAN PRA-KONSULTASI — KLINIK DIABETIK');
    line(lang === 'en' ? 'Completed by the patient while waiting'
                       : 'Diisi oleh pesakit sementara menunggu');
    line(rule('='));
    kv(lang === 'en' ? 'Generated' : 'Dijana', stamp);
    var fb = null;
    for (var i = 0; i < SCHEMA[0].fields.length; i++) {
      if (SCHEMA[0].fields[i].id === 'filledBy') fb = SCHEMA[0].fields[i];
    }
    kv(lang === 'en' ? 'Form completed by' : 'Borang diisi oleh',
       fb ? labelFor(fb, S.filledBy, lang) : null);
    if (meta.appVersion) kv(lang === 'en' ? 'Application' : 'Aplikasi', meta.appVersion);

    /* ── 1. Flags ── */
    var fl = flags(S, N);
    var reds = fl.filter(function (f) { return f.lvl === 'red'; });
    var ambers = fl.filter(function (f) { return f.lvl === 'amber'; });

    head(1, 'Perkara yang tidak boleh ditunggu', 'Items that should not wait');
    if (!reds.length && !ambers.length) {
      line(lang === 'en' ? '  None raised from the answers given.'
                         : '  Tiada dibangkitkan daripada jawapan yang diberi.');
    }
    if (reds.length) {
      line(lang === 'en' ? '  SEGERA / URGENT:' : '  SEGERA:');
      bullets(reds.map(function (f) { return f[lang]; }), '!');
    }
    if (ambers.length) {
      if (reds.length) blank();
      line(lang === 'en' ? '  To address at this visit:' : '  Untuk diuruskan pada kunjungan ini:');
      bullets(ambers.map(function (f) { return f[lang]; }), '*');
    }
    if (reds.length || ambers.length) {
      blank();
      bullets(wrap(lang === 'en'
        ? 'Raised automatically from the patient’s own answers and the counter observations. Not screened by a clinician. Each needs confirming at the consultation.'
        : 'Dibangkitkan secara automatik daripada jawapan pesakit dan catatan kaunter. Tidak disaring oleh klinisian. Setiap satu perlu disahkan semasa konsultasi.',
        0, W - 6), ' ');
    }

    /* ── 2. Identification ── */
    head(2, 'Pengenalan', 'Identification');
    kv(lang === 'en' ? 'Name' : 'Nama', S.name);
    kv(lang === 'en' ? 'IC number' : 'No. kad pengenalan', meta.maskIc ? maskIc(S.ic) : S.ic);
    var icp = CPGcalc.ic(S.ic);
    if (icp.ok) {
      kv(lang === 'en' ? 'Date of birth' : 'Tarikh lahir', icp.dob);
      kv(lang === 'en' ? 'Age' : 'Umur', icp.age + (lang === 'en' ? ' years' : ' tahun'));
      kv(lang === 'en' ? 'Sex' : 'Jantina',
         icp.sex === 'M' ? (lang === 'en' ? 'Male' : 'Lelaki') : (lang === 'en' ? 'Female' : 'Perempuan'));
    }
    kv('RN', S.mrn);
    kv(lang === 'en' ? 'Telephone' : 'Telefon', S.phone);
    var secA = SCHEMA[0];
    ['race', 'religion', 'lang', 'marital', 'livesWith', 'work', 'educ'].forEach(function (id) {
      for (var i = 0; i < secA.fields.length; i++) {
        if (secA.fields[i].id === id) {
          kv(tr(secA.fields[i].sum || secA.fields[i].q, lang), labelFor(secA.fields[i], S[id], lang));
        }
      }
    });
    if (S.raceOther) kv(lang === 'en' ? 'Race (other)' : 'Bangsa (lain)', S.raceOther);

    /* ── 3. Care gaps ── */
    var gp = gaps(S, N, lang);
    head(3, 'Jurang penjagaan berasaskan CPG', 'CPG-anchored care gaps');
    if (!gp.length) {
      line(lang === 'en' ? '  None identified from the answers given.'
                         : '  Tiada dikenal pasti daripada jawapan yang diberi.');
    } else {
      for (var gi = 0; gi < gp.length; gi++) {
        var ls = wrap(gp[gi].text, 0, W - 6);
        line('  ' + (gi + 1) + '. ' + ls[0].replace(/^\s+/, ''));
        for (var lj = 1; lj < ls.length; lj++) line('     ' + ls[lj].replace(/^\s+/, ''));
        line('     ' + gp[gi].cite);
      }
    }

    /* ── 4. Counter observations ── */
    head(4, 'Catatan kaunter jururawat', 'Nursing station observations');
    if (!N || !Object.keys(N).filter(function (k) { return N[k] !== '' && N[k] != null; }).length) {
      line(lang === 'en' ? '  Not recorded.' : '  Tidak direkod.');
    } else {
      var bp1 = (N.sys1 && N.dia1) ? N.sys1 + '/' + N.dia1 + ' mmHg' : null;
      var bp2 = (N.sys2 && N.dia2) ? N.sys2 + '/' + N.dia2 + ' mmHg' : null;
      kv(lang === 'en' ? 'BP, first reading' : 'TD, bacaan pertama', bp1);
      kv(lang === 'en' ? 'BP, second reading' : 'TD, bacaan kedua', bp2);
      var ms_ = parseFloat(N.sys1), ms2 = parseFloat(N.sys2),
          md_ = parseFloat(N.dia1), md2 = parseFloat(N.dia2);
      if (!isNaN(ms_) && !isNaN(ms2) && !isNaN(md_) && !isNaN(md2)) {
        kv(lang === 'en' ? 'BP, mean' : 'TD, purata',
           Math.round((ms_ + ms2) / 2) + '/' + Math.round((md_ + md2) / 2) + ' mmHg');
      }
      kv(lang === 'en' ? 'CPG BP target' : 'Sasaran TD CPG',
         '< ' + CPG.bp.sys + '/' + CPG.bp.dia + ' mmHg');
      kv(lang === 'en' ? 'Pulse' : 'Nadi',
         N.pulse ? N.pulse + '/min' + (N.pulseRhythm ? ' (' + (N.pulseRhythm === 'irregular'
            ? (lang === 'en' ? 'irregular' : 'tidak sekata')
            : (lang === 'en' ? 'regular' : 'sekata')) + ')' : '') : null);
      kv(lang === 'en' ? 'Capillary glucose' : 'Glukosa kapilari',
         N.rbg ? N.rbg + ' mmol/L' + (N.rbgCtx ? ' (' + N.rbgCtx + ')' : '') : null);
      kv(lang === 'en' ? 'Capillary HbA1c' : 'HbA1c kapilari', N.hba1cPoc ? N.hba1cPoc + ' %' : null);
      kv(lang === 'en' ? 'Weight' : 'Berat', N.wt ? N.wt + ' kg' : null);
      kv(lang === 'en' ? 'Height' : 'Tinggi', N.ht ? N.ht + ' cm' : null);
      var nb = CPGcalc.bmi(N.wt, N.ht), nbd = CPGcalc.bmiBand(nb);
      kv('BMI', nb != null ? nb + ' kg/m² — ' + tr(nbd.name, lang) +
         (lang === 'en' ? ' (Asian cut-offs)' : ' (julat Asia)') : null);
      kv(lang === 'en' ? 'Waist' : 'Lilitan pinggang', N.waist ? N.waist + ' cm' : null);
      var whh = CPGcalc.waistHigh(N.waist, S.sex || (icp.ok ? icp.sex : null));
      if (whh) kv(lang === 'en' ? 'Waist cut-off' : 'Nilai rujukan pinggang',
                  wh_text(whh, lang));
      kv(lang === 'en' ? 'Temperature' : 'Suhu', N.temp ? N.temp + ' °C' : null);
      kv('SpO2', N.spo2 ? N.spo2 + ' %' : null);
      blank();
      line('  ' + (lang === 'en' ? 'Foot examination:' : 'Pemeriksaan kaki:'));
      var ft = function (k, r, l) {
        var f = function (v) {
          if (!v) return lang === 'en' ? 'not done' : 'tidak dibuat';
          if (v === 'present') return lang === 'en' ? 'present' : 'ada';
          if (v === 'absent') return lang === 'en' ? 'absent' : 'tiada';
          if (v === 'intact') return lang === 'en' ? 'intact' : 'normal';
          if (v === 'reduced') return lang === 'en' ? 'reduced' : 'berkurang';
          if (v === 'yes') return lang === 'en' ? 'yes' : 'ya';
          if (v === 'no') return lang === 'en' ? 'no' : 'tidak';
          return v;
        };
        kv('  ' + k, (lang === 'en' ? 'R ' : 'Kanan ') + f(r) + ' / ' +
                     (lang === 'en' ? 'L ' : 'Kiri ') + f(l));
      };
      ft(lang === 'en' ? 'Pedal pulses' : 'Nadi pedal', N.pulsesR, N.pulsesL);
      ft(lang === 'en' ? 'Monofilament' : 'Monofilamen', N.monoR, N.monoL);
      kv('  ' + (lang === 'en' ? 'Ulcer or wound' : 'Ulser atau luka'),
         N.footUlcer ? (N.footUlcer === 'yes' ? (lang === 'en' ? 'YES' : 'ADA')
                                              : (lang === 'en' ? 'no' : 'tiada')) : null);
      kv('  ' + (lang === 'en' ? 'Deformity' : 'Kecacatan bentuk'),
         N.footDeform ? (N.footDeform === 'yes' ? (lang === 'en' ? 'yes' : 'ada')
                                                : (lang === 'en' ? 'no' : 'tiada')) : null);
      blank();
      kv(lang === 'en' ? 'Recorded by' : 'Direkod oleh', N.staff);
      kv(lang === 'en' ? 'Recorded at' : 'Direkod pada', N.at);
    }

    /* ── 5. Glycaemic picture ── */
    head(5, 'Gambaran glisemik', 'Glycaemic picture');
    kv(lang === 'en' ? 'Reported HbA1c' : 'HbA1c dilapor',
       S.hba1c ? S.hba1c + ' %' + (S.hba1cWhen ? ' (' + S.hba1cWhen + ')' : '') : null);
    kv(lang === 'en' ? 'CPG general target' : 'Sasaran am CPG',
       '≤ ' + CPG.hba1c.general.pct + ' %');
    bullets(wrap(lang === 'en'
      ? 'The CPG individualises this target. The band for this patient is a clinical decision and is not set by this form.'
      : 'CPG mengindividukan sasaran ini. Julat bagi pesakit ini ialah keputusan klinikal dan tidak ditetapkan oleh borang ini.',
      0, W - 6), ' ');
    blank();
    var gstat = glucoseStats(S.gluLog);
    if (!gstat) {
      line(lang === 'en' ? '  No home readings entered.' : '  Tiada bacaan rumah dimasukkan.');
      var hm = null;
      for (var hi = 0; hi < SCHEMA.length; hi++) {
        for (var hj = 0; hj < SCHEMA[hi].fields.length; hj++) {
          if (SCHEMA[hi].fields[hj].id === 'hasMeter') hm = SCHEMA[hi].fields[hj];
        }
      }
      kv(lang === 'en' ? 'Home meter' : 'Alat meter di rumah', hm ? labelFor(hm, S.hasMeter, lang) : null);
    } else {
      line('  ' + (lang === 'en' ? 'Home capillary readings:' : 'Bacaan kapilari di rumah:'));
      kv('  ' + (lang === 'en' ? 'Readings' : 'Bilangan bacaan'), String(gstat.n));
      kv('  ' + (lang === 'en' ? 'Mean' : 'Purata'), gstat.mean + ' mmol/L');
      kv('  ' + (lang === 'en' ? 'Range' : 'Julat'), gstat.lo + ' – ' + gstat.hi + ' mmol/L');
      kv('  ' + (lang === 'en' ? 'Within CPG band' : 'Dalam julat CPG'),
         gstat.inRange + '/' + gstat.n + ' (' + gstat.pctInRange + '%)');
      kv('  ' + (lang === 'en' ? 'Below ' : 'Bawah ') + CPG.hypo.l1.lt + ' mmol/L', String(gstat.belowAny));
      kv('  ' + (lang === 'en' ? 'Below ' : 'Bawah ') + CPG.hypo.l2.lt + ' mmol/L', String(gstat.below2));
      kv('  ' + (lang === 'en' ? 'CPG bands used' : 'Julat CPG digunakan'),
         (lang === 'en' ? 'fasting/pre-meal ' : 'puasa/sebelum makan ') +
         CPG.cap.fasting.lo + '–' + CPG.cap.fasting.hi + ', ' +
         (lang === 'en' ? '2 h post-meal ' : '2 jam selepas makan ') +
         CPG.cap.post.lo + '–' + CPG.cap.post.hi + ' mmol/L');
      blank();
      line('  ' + (lang === 'en' ? 'Readings as entered:' : 'Bacaan seperti dimasukkan:'));
      for (var ri = 0; ri < gstat.rows.length; ri++) {
        var r = gstat.rows[ri];
        var cname = (T.glu.ctx[r.ctx] ? tr(T.glu.ctx[r.ctx], lang) : (r.ctx || ''));
        var bandk = CPGcalc.glucoseBand(r.v, r.ctx);
        var tagm = bandk === 'low2' ? ' [LOW2]' : bandk === 'low1' ? ' [LOW1]'
                 : bandk === 'high' ? ' [HIGH]' : '';
        line('    ' + pad(r.d || '?', 12) + pad(r.v + ' mmol/L', 14) + cname + tagm);
      }
    }

    /* ── 6. The history, section by section ── */
    var n = 6;
    var skipIds = { name: 1, ic: 1, mrn: 1, phone: 1, race: 1, raceOther: 1, religion: 1,
                    lang: 1, marital: 1, livesWith: 1, work: 1, educ: 1, filledBy: 1,
                    gluLog: 1, hba1c: 1, hba1cWhen: 1, hba1cKnown: 1 };
    var unanswered = 0;

    for (var si = 0; si < SCHEMA.length; si++) {
      var sec = SCHEMA[si];
      if (sec.when && !sec.when(S)) continue;
      var rows = [];
      for (var fi = 0; fi < sec.fields.length; fi++) {
        var f = sec.fields[fi];
        if (skipIds[f.id]) continue;
        if (f.type === 'calc' || f.type === 'steps') continue;
        if (!asked(sec, f, S)) continue;
        var val = labelFor(f, S[f.id], lang);
        if (!answered(S[f.id])) { unanswered++; val = null; }
        rows.push([tr(f.sum || f.q, lang), val]);
      }
      if (!rows.length) continue;
      head(n++, tr(sec.title, 'ms'), tr(sec.title, 'en'));
      for (var ri2 = 0; ri2 < rows.length; ri2++) kv(rows[ri2][0], rows[ri2][1]);

      /* Steps live in their own shape, so they print their own way. */
      if (sec.id === 'activity' && (S.stepsLog || []).length) {
        blank();
        line('  ' + (lang === 'en' ? 'Weekly step average:' : 'Purata langkah mingguan:'));
        var sl = (S.stepsLog || []).filter(function (w) { return parseFloat(w.v) > 0; });
        for (var wi = 0; wi < sl.length; wi++) {
          line('    ' + pad(sl[wi].label || ('wk ' + (wi + 1)), 16) +
               Math.round(parseFloat(sl[wi].v)).toLocaleString('en-US') +
               (lang === 'en' ? ' steps/day' : ' langkah/hari'));
        }
        bullets(wrap(tr(T.steps.proxy, lang), 0, W - 6), ' ');
      }
      if (sec.id === 'weight') {
        var bk = parseFloat(S.wt), bc = parseFloat(S.ht);
        var pb = CPGcalc.bmi(bk, bc), pbd = CPGcalc.bmiBand(pb);
        if (pb != null) {
          kv(lang === 'en' ? 'BMI (patient-reported)' : 'BMI (nilai pesakit)',
             pb + ' kg/m² — ' + tr(pbd.name, lang) +
             (lang === 'en' ? ' (Asian cut-offs)' : ' (julat Asia)'));
        }
      }
    }

    /* ── Quiz topics the patient asked to carry over ── */
    if (meta.quizTopics && meta.quizTopics.length) {
      head(n++, 'Topik pendidikan daripada kuiz', 'Education topics from the quiz');
      bullets(wrap(lang === 'en'
        ? 'The patient asked for these topics to be passed on. They are subjects the patient answered incorrectly in the optional quiz, not clinical findings.'
        : 'Pesakit meminta topik ini disampaikan. Ia adalah subjek yang pesakit jawab salah dalam kuiz pilihan, bukan penemuan klinikal.', 0, W - 6), ' ');
      blank();
      bullets(meta.quizTopics.map(function (t) { return tr(t, lang); }));
    }

    /* ── The patient's agenda, last ── */
    head(n++, 'Dalam kata-kata pesakit sendiri', 'In the patient’s own words');
    var ag = [
      ['oneThing', lang === 'en' ? 'The one thing they want' : 'Satu perkara yang dimahukan'],
      ['worry', lang === 'en' ? 'What is worrying them' : 'Apa yang membimbangkan'],
      ['question', lang === 'en' ? 'Their question' : 'Soalan mereka'],
      ['wtGoal', lang === 'en' ? 'Their own weight goal' : 'Matlamat berat sendiri']
    ];
    var anyAg = false;
    for (var ai = 0; ai < ag.length; ai++) {
      var av = S[ag[ai][0]];
      if (!answered(av)) continue;
      anyAg = true;
      line('  ' + ag[ai][1] + ':');
      bullets(wrap('“' + String(av).replace(/\s+/g, ' ').trim() + '”', 0, W - 6), ' ');
      blank();
    }
    if (!anyAg) line(lang === 'en' ? '  Nothing written.' : '  Tiada ditulis.');

    /* ── Provenance ── */
    blank();
    line(rule('='));
    line(lang === 'en' ? 'PROVENANCE AND LIMITS' : 'ASAL SUMBER DAN BATASAN');
    line(rule('='));
    bullets(wrap(lang === 'en'
      ? 'Every question, threshold and piece of advice in the application that produced this note is drawn from the two documents below and from no other source.'
      : 'Setiap soalan, nilai rujukan dan nasihat di dalam aplikasi yang menghasilkan nota ini diambil daripada dua dokumen di bawah dan tiada sumber lain.', 0, W - 6), ' ');
    blank();
    bullets(wrap('[T2DM] ' + tr(CPG.refs.t2dm.full, lang), 0, W - 6), ' ');
    bullets(wrap('[OBES] ' + tr(CPG.refs.obes.full, lang), 0, W - 6), ' ');
    blank();
    bullets(wrap(lang === 'en'
      ? 'Answers are the patient’s own report, entered by the patient, and are not verified against the medical record. Flags and care gaps are generated by rule from those answers and have not been screened by a clinician. This note is a history-taking aid. It is not a diagnosis, not a triage decision, and not a medical device.'
      : 'Jawapan ialah laporan pesakit sendiri, dimasukkan oleh pesakit, dan tidak disahkan terhadap rekod perubatan. Tanda dan jurang penjagaan dijana oleh peraturan daripada jawapan itu dan tidak disaring oleh klinisian. Nota ini ialah alat bantu pengambilan sejarah. Ia bukan diagnosis, bukan keputusan triaj, dan bukan peranti perubatan.', 0, W - 6), ' ');
    if (CPG.unverified > 0) {
      blank();
      bullets(wrap((lang === 'en'
        ? 'NOTICE: ' + CPG.unverified + ' clinical values in this application are marked as not yet re-checked against the source PDFs. Verify them before relying on this note clinically.'
        : 'NOTIS: ' + CPG.unverified + ' nilai klinikal di dalam aplikasi ini ditanda sebagai belum disahkan semula terhadap PDF sumber. Sahkan sebelum bergantung kepada nota ini secara klinikal.'), 0, W - 6), '!');
    }
    if (unanswered) {
      blank();
      bullets(wrap((lang === 'en'
        ? unanswered + ' questions that were asked of this patient were left unanswered, and are printed above as "(not answered)".'
        : unanswered + ' soalan yang ditanya kepada pesakit ini tidak dijawab, dan dicetak di atas sebagai "(tidak dijawab)".'), 0, W - 6), ' ');
    }
    blank();
    line(rule('='));
    line(lang === 'en' ? 'END OF SUMMARY' : 'TAMAT RINGKASAN');
    line(rule('='));

    return out.join('\n');
  }

  function wh_text(wh, lang) {
    return (lang === 'en' ? 'cut-off ' : 'nilai rujukan ') + wh.cut + ' cm — ' +
      (wh.high ? (lang === 'en' ? 'at or above' : 'pada atau melebihi')
               : (lang === 'en' ? 'below' : 'di bawah'));
  }

  function maskIc(ic) {
    var s = String(ic || '').replace(/\D/g, '');
    if (s.length !== 12) return ic || '';
    return s.slice(0, 6) + '-' + s.slice(6, 8) + '-****';
  }

  /* How much of the form has been filled, for the progress meter
     and for the "incomplete" notice on the summary tab. */
  function completeness(S) {
    var total = 0, done = 0, secs = [];
    for (var i = 0; i < SCHEMA.length; i++) {
      var sec = SCHEMA[i];
      if (sec.when && !sec.when(S)) continue;
      var t = 0, d = 0;
      for (var j = 0; j < sec.fields.length; j++) {
        var f = sec.fields[j];
        if (f.type === 'calc') continue;
        if (!asked(sec, f, S)) continue;
        t++;
        if (answered(S[f.id])) d++;
      }
      total += t; done += d;
      secs.push({ id: sec.id, total: t, done: d });
    }
    return { total: total, done: done,
             pct: total ? Math.round(done / total * 100) : 0,
             sections: secs,
             blankSections: secs.filter(function (s) { return s.done === 0; }).length };
  }

  return { text: text, flags: flags, gaps: gaps, glucoseStats: glucoseStats,
           completeness: completeness, labelFor: labelFor, maskIc: maskIc,
           asked: asked, answered: answered };
})();
</script>
