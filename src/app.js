<script>
/* ============================================================
   PRA-KONSULTASI DIABETIK — APPLICATION

   Renders schema.js, keeps state, draws the two charts, gates the
   nursing tab, runs the quiz, and produces the summary.

   WHY THERE IS NO SERVER
     The whole application is one static page and every answer
     lives in this browser's localStorage. That is a clinical
     decision before it is an engineering one: a waiting-room
     form that posts a name, an IC number and a medication list
     to a server needs a data-protection case, a retention
     policy, an access log and somebody accountable for a breach.
     Keeping the data on the patient's own device for the twenty
     minutes between the registration counter and the consulting
     room needs none of that, and the only copy that persists is
     the one the doctor pastes into the HIS -- the system that is
     already the record of truth and already governed.

     The consequences are accepted and stated to the patient: the
     answers do not follow them to the next visit, a closed
     browser tab loses them, and the summary must be handed over
     before the device is cleared.

   SCROLLING
     The sibling dashboards in this hospital's estate are built
     never to scroll, because they run on fixed wall screens. This
     page is the opposite case -- it is a long form on a patient's
     own phone -- so it scrolls deliberately, one section to a
     screen, with the next control always within thumb reach.
   ============================================================ */

var App = (function () {

  var CFG = window.DMPC_CONFIG || {};
  var LANG = 'ms';

  /* State. S is the patient's answers, N the counter's, Q the quiz. */
  var S = {}, N = {}, Q = { idx: 0, answers: [], started: false, carry: false };
  var UI = { tab: 'patient', sec: -1, consent: false, nurse: false,
             ackFlags: false, showIc: false, nudged: {} };

  var KEY = 'dmpc.v1.';

  /* ── Storage ──────────────────────────────────────────────
     Wrapped because a browser in private mode throws on write,
     and a form that crashes on a thrown quota error is worse
     than a form that silently stops remembering. */
  function save() {
    try {
      localStorage.setItem(KEY + 'patient', JSON.stringify(S));
      localStorage.setItem(KEY + 'nurse', JSON.stringify(N));
      localStorage.setItem(KEY + 'quiz', JSON.stringify(Q));
      localStorage.setItem(KEY + 'ui', JSON.stringify({
        tab: UI.tab, sec: UI.sec, consent: UI.consent, lang: LANG
      }));
      flash();
    } catch (e) { /* no persistence available; the form still works */ }
  }
  function load() {
    try {
      S = JSON.parse(localStorage.getItem(KEY + 'patient') || '{}') || {};
      N = JSON.parse(localStorage.getItem(KEY + 'nurse') || '{}') || {};
      Q = JSON.parse(localStorage.getItem(KEY + 'quiz') || 'null') ||
          { idx: 0, answers: [], started: false, carry: false };
      var u = JSON.parse(localStorage.getItem(KEY + 'ui') || '{}') || {};
      if (u.lang) LANG = u.lang;
      if (u.consent) UI.consent = true;
      if (typeof u.sec === 'number') UI.sec = u.sec;
    } catch (e) { S = {}; N = {}; }
  }
  function wipe() {
    try {
      localStorage.removeItem(KEY + 'patient');
      localStorage.removeItem(KEY + 'nurse');
      localStorage.removeItem(KEY + 'quiz');
      localStorage.removeItem(KEY + 'ui');
    } catch (e) {}
    S = {}; N = {}; Q = { idx: 0, answers: [], started: false, carry: false };
    UI = { tab: 'patient', sec: -1, consent: false, nurse: false,
           ackFlags: false, showIc: false, nudged: {} };
  }

  var flashTimer = null;
  function flash() {
    var el = $('#saveChip');
    if (!el) return;
    el.classList.add('on');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { el.classList.remove('on'); }, 1200);
  }

  /* ── Tiny DOM helpers ─────────────────────────────────────── */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function t(o) { if (o == null) return ''; return o[LANG] || o.ms || o.en || ''; }
  function fill(s, map) {
    return String(s).replace(/\{(\w+)\}/g, function (_, k) {
      return map[k] == null ? '' : map[k];
    });
  }

  /* ── Sections this patient is asked ───────────────────────── */
  function sections() {
    return SCHEMA.filter(function (sec) {
      try { return !sec.when || sec.when(S); } catch (e) { return false; }
    });
  }
  function fieldsOf(sec) {
    return sec.fields.filter(function (f) {
      try { return !f.when || f.when(S); } catch (e) { return false; }
    });
  }

  /* ════════════════════════════════════════════════════════════
     FIELD RENDERERS
     Each returns markup; one delegated listener per container
     reads values back, so re-rendering never leaks handlers.
     ════════════════════════════════════════════════════════════ */

  function fieldHtml(f) {
    var v = S[f.id];
    var h = '<div class="q" data-qid="' + esc(f.id) + '">';
    h += '<label class="q-label" for="fld-' + esc(f.id) + '">' + esc(t(f.q));
    if (f.key) h += ' <span class="q-key" title="' + esc(t(T.nav.optionalTag)) + '">•</span>';
    h += '</label>';
    if (f.hint) h += '<p class="q-hint">' + esc(t(f.hint)) + '</p>';
    h += '<div class="q-in">' + inputHtml(f, v) + '</div>';

    /* Live feedback: the flag the answer would raise, shown to the
       patient as plain reassurance or a prompt to tell staff. */
    if (f.flag && Summary.answered(v)) {
      var fl = null;
      try { fl = f.flag(v, S); } catch (e) {}
      if (fl) {
        h += '<p class="q-flag ' + (fl.lvl === 'red' ? 'is-red' : 'is-amber') + '">' +
             esc(fl.lvl === 'red'
               ? t(T.alert.h)
               : (LANG === 'en' ? 'The doctor will be told about this.'
                                : 'Doktor akan diberitahu tentang perkara ini.')) +
             '</p>';
      }
    }
    h += '</div>';
    return h;
  }

  function inputHtml(f, v) {
    var id = 'fld-' + esc(f.id);
    switch (f.type) {

      case 'text': case 'tel':
        return '<input id="' + id + '" class="in" type="' + (f.type === 'tel' ? 'tel' : 'text') +
               '" data-f="' + esc(f.id) + '" value="' + esc(v || '') +
               '" autocomplete="off" spellcheck="false"/>';

      case 'ic':
        var p = CPGcalc.ic(v);
        var note = '';
        if (v && !p.ok && p.why !== 'empty') {
          note = '<p class="q-bad">' + esc(t(T.f.icBad[p.why] || T.f.icBad.length)) + '</p>';
        } else if (p.ok) {
          note = '<p class="q-good">' + esc(fill(t(T.f.icOk), {
            dob: p.dob, age: p.age,
            sex: p.sex === 'M' ? t(T.f.male) : t(T.f.female)
          })) + '</p>';
        }
        return '<input id="' + id + '" class="in mono" type="text" inputmode="numeric" ' +
               'data-f="' + esc(f.id) + '" value="' + esc(v || '') + '" maxlength="14" ' +
               'placeholder="' + esc(t(T.f.icHelp)) + '" autocomplete="off"/>' + note;

      case 'num':
        return '<div class="in-row"><input id="' + id + '" class="in in-num" type="number" ' +
               'inputmode="decimal" data-f="' + esc(f.id) + '" value="' + esc(v == null ? '' : v) + '"' +
               (f.min != null ? ' min="' + f.min + '"' : '') +
               (f.max != null ? ' max="' + f.max + '"' : '') +
               (f.step ? ' step="' + f.step + '"' : '') + '/>' +
               (f.unit ? '<span class="in-unit">' + esc(t(f.unit) || f.unit) + '</span>' : '') +
               '</div>';

      case 'month':
        return '<input id="' + id + '" class="in" type="month" data-f="' + esc(f.id) +
               '" value="' + esc(v || '') + '"/>';

      case 'select':
        var o = '<option value="">' + esc(t(T.f.choose)) + '</option>';
        f.opts.forEach(function (op) {
          o += '<option value="' + esc(op.v) + '"' + (v === op.v ? ' selected' : '') + '>' +
               esc(t(op.l)) + '</option>';
        });
        return '<select id="' + id + '" class="in" data-f="' + esc(f.id) + '">' + o + '</select>';

      case 'radio':
        return '<div class="opts" role="radiogroup" aria-labelledby="' + id + '">' +
          f.opts.map(function (op) {
            return '<label class="opt' + (v === op.v ? ' on' : '') + '">' +
              '<input type="radio" name="' + esc(f.id) + '" data-f="' + esc(f.id) +
              '" value="' + esc(op.v) + '"' + (v === op.v ? ' checked' : '') + '/>' +
              '<span class="opt-mark" aria-hidden="true"></span>' +
              '<span class="opt-txt">' + esc(t(op.l)) + '</span></label>';
          }).join('') + '</div>';

      case 'checks':
        var arr = v || [];
        return '<p class="q-multi">' + esc(t(T.f.chooseAll)) + '</p>' +
          '<div class="opts">' + f.opts.map(function (op) {
            var on = arr.indexOf(op.v) >= 0;
            return '<label class="opt' + (on ? ' on' : '') + '">' +
              '<input type="checkbox" data-f="' + esc(f.id) + '" data-multi="1" value="' +
              esc(op.v) + '"' + (on ? ' checked' : '') + '/>' +
              '<span class="opt-mark is-box" aria-hidden="true"></span>' +
              '<span class="opt-txt">' + esc(t(op.l)) + '</span></label>';
          }).join('') + '</div>';

      case 'scale':
        var cur = v == null || v === '' ? '' : v;
        var marks = '';
        for (var i = f.min; i <= f.max; i++) {
          marks += '<button type="button" class="sc' + (String(cur) === String(i) ? ' on' : '') +
                   '" data-scale="' + esc(f.id) + '" value="' + i + '">' + i + '</button>';
        }
        return '<div class="scale">' + marks + '</div>' +
               '<div class="scale-ends"><span>' + (LANG === 'en' ? 'Not ready' : 'Belum bersedia') +
               '</span><span>' + (LANG === 'en' ? 'Very ready' : 'Sangat bersedia') + '</span></div>';

      case 'textarea':
        return '<textarea id="' + id + '" class="in in-area" rows="3" data-f="' + esc(f.id) +
               '">' + esc(v || '') + '</textarea>';

      case 'calc':
        var kg = parseFloat(S.wt), cm = parseFloat(S.ht);
        var b = CPGcalc.bmi(kg, cm), bd = CPGcalc.bmiBand(b);
        if (b == null) {
          return '<p class="calc is-wait">' +
            esc(LANG === 'en' ? 'Enter your weight and height above and this fills in by itself.'
                              : 'Masukkan berat dan tinggi di atas dan ini akan terisi sendiri.') + '</p>';
        }
        if (!CPGcalc.bmiPlausible(b)) {
          return '<p class="calc is-warn">' + esc(t(T.f.checkNums)) + '</p>';
        }
        var cls = (bd.key === 'normal') ? 'ok' : (bd.key === 'under' || bd.key === 'over') ? 'warn' : 'bad';
        var tg = CPGcalc.weightTargets(kg);
        var extra = '';
        if (b >= CPG.bmi.obeseFrom && tg) {
          extra = '<p class="calc-note">' + esc(LANG === 'en'
            ? 'Losing ' + tg.min.pct + '% of your weight — about ' + tg.min.lose +
              ' kg, taking you to ' + tg.min.to + ' kg — already improves sugar, blood pressure and cholesterol. ' +
              tg.good.pct + '% is ' + tg.good.lose + ' kg.'
            : 'Menurunkan ' + tg.min.pct + '% berat anda — kira-kira ' + tg.min.lose +
              ' kg, membawa anda ke ' + tg.min.to + ' kg — sudah memperbaiki gula, tekanan darah dan kolesterol. ' +
              tg.good.pct + '% ialah ' + tg.good.lose + ' kg.') + '</p>';
        }
        return '<div class="calc is-' + cls + '"><b>' + b + '</b> kg/m² — ' +
               esc(t(bd.name)) + '</div>' + extra;

      case 'glucose': return glucoseHtml();
      case 'steps':   return stepsHtml();
    }
    return '';
  }

  /* ── Home glucose table and chart ─────────────────────────── */
  function glucoseHtml() {
    var rows = S.gluLog || [];
    var h = '<div class="log">';
    h += '<div class="log-head"><span>' + esc(t(T.glu.date)) + '</span>' +
         '<span>' + esc(t(T.glu.value)) + '</span>' +
         '<span>' + esc(t(T.glu.when)) + '</span><span></span></div>';
    if (!rows.length) {
      h += '<p class="log-empty">' + esc(t(T.glu.noneYet)) + '</p>';
    }
    rows.forEach(function (r, i) {
      var band = CPGcalc.glucoseBand(r.v, r.ctx);
      h += '<div class="log-row' + (band ? ' b-' + band : '') + '">' +
        '<input class="in" type="date" data-glu="' + i + '" data-k="d" value="' + esc(r.d || '') + '"/>' +
        '<input class="in in-num" type="number" inputmode="decimal" step="0.1" min="0.5" max="40" ' +
          'data-glu="' + i + '" data-k="v" value="' + esc(r.v == null ? '' : r.v) + '"/>' +
        '<select class="in" data-glu="' + i + '" data-k="ctx">' +
          Object.keys(T.glu.ctx).map(function (k) {
            return '<option value="' + k + '"' + (r.ctx === k ? ' selected' : '') + '>' +
                   esc(t(T.glu.ctx[k])) + '</option>';
          }).join('') +
        '</select>' +
        '<button type="button" class="x" data-gludel="' + i + '" aria-label="' +
          esc(t(T.f.remove)) + '">×</button>' +
      '</div>';
    });
    h += '<button type="button" class="btn btn-add" data-gluadd="1">+ ' +
         esc(t(T.f.addReading)) + '</button></div>';

    /* The chart and the figures sit in their own container so that
       typing a reading can redraw them without replacing the input
       the patient is still typing into. See refreshDerived(). */
    h += '<div id="gluDerived">' + gluDerivedHtml(rows) + '</div>';
    return h;
  }

  function gluDerivedHtml(rows) {
    var st = Summary.glucoseStats(rows);
    if (!st) return '';
    return gluChart(rows) + '<div class="stats">' +
      stat(t(T.glu.stats.n), st.n) +
      stat(t(T.glu.stats.mean), st.mean + ' mmol/L') +
      stat(t(T.glu.stats.inRange), st.pctInRange + '%') +
      stat(t(T.glu.stats.lo), st.lo) +
      stat(t(T.glu.stats.hi), st.hi) +
      stat(fill(t(T.glu.stats.below), { n: CPG.hypo.l1.lt }), st.belowAny) +
    '</div>';
  }
  function stat(k, v) {
    return '<div class="stat"><span class="stat-k">' + esc(k) + '</span>' +
           '<span class="stat-v">' + esc(v) + '</span></div>';
  }

  /* Inline SVG, drawn by hand. No chart library: the page has no
     external dependency and this is a scatter with one shaded
     band, which is less code than configuring a library would be. */
  function gluChart(rows) {
    var pts = rows.filter(function (r) { return parseFloat(r.v) > 0; });
    if (!pts.length) return '';
    /* A 640-wide frame scaled into a 300px phone column renders
       its labels at under 6px. The frame is narrowed and deepened
       instead, so the same drawing lands around 170px tall with
       readable ticks. */
    var narrow = (window.innerWidth || 1024) < 520;
    var W = narrow ? 440 : 640, H = narrow ? 250 : 220;
    var L = narrow ? 36 : 42, R = 12, Tp = 14, B = 30;
    var yMax = Math.max(14, Math.ceil(Math.max.apply(null,
      pts.map(function (r) { return parseFloat(r.v); })) + 1));
    var x = function (i) {
      return pts.length === 1 ? L + (W - L - R) / 2
        : L + i * (W - L - R) / (pts.length - 1);
    };
    var y = function (v) { return Tp + (H - Tp - B) * (1 - v / yMax); };

    var g = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' +
            esc(t(T.glu.h)) + '">';
    /* Target band and the hypoglycaemia line, from CPG. */
    g += '<rect x="' + L + '" y="' + y(CPG.cap.fasting.hi) + '" width="' + (W - L - R) +
         '" height="' + (y(CPG.cap.fasting.lo) - y(CPG.cap.fasting.hi)) + '" class="c-band"/>';
    g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(CPG.hypo.l1.lt) +
         '" y2="' + y(CPG.hypo.l1.lt) + '" class="c-hypo"/>';
    for (var v = 0; v <= yMax; v += (yMax > 20 ? 5 : 2)) {
      g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="c-grid"/>';
      g += '<text x="' + (L - 8) + '" y="' + (y(v) + 4) + '" class="c-ytick">' + v + '</text>';
    }
    var d = pts.map(function (r, i) {
      return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(parseFloat(r.v)).toFixed(1);
    }).join(' ');
    if (pts.length > 1) g += '<path d="' + d + '" class="c-line"/>';
    pts.forEach(function (r, i) {
      var band = CPGcalc.glucoseBand(r.v, r.ctx);
      g += '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(parseFloat(r.v)).toFixed(1) +
           '" r="5" class="c-dot d-' + band + '"><title>' + esc(r.v + ' mmol/L') + '</title></circle>';
    });
    g += '<text x="' + L + '" y="' + (H - 8) + '" class="c-note">' + esc(t(T.glu.band)) + '</text>';
    g += '</svg>';
    return g;
  }

  /* ── Weekly steps ─────────────────────────────────────────── */
  function stepsHtml() {
    var rows = S.stepsLog || [];
    if (!rows.length) {
      rows = [0, 1, 2, 3].map(function (i) {
        return { label: i === 0 ? t(T.steps.thisWeek) : fill(t(T.steps.wkAgo), { n: i }), v: '' };
      });
      S.stepsLog = rows;
    }
    var h = '<div class="log log-steps">';
    rows.forEach(function (r, i) {
      h += '<div class="log-row2"><span class="log-lab">' + esc(r.label || ('#' + (i + 1))) + '</span>' +
        '<input class="in in-num" type="number" inputmode="numeric" min="0" max="60000" step="100" ' +
          'data-step="' + i + '" value="' + esc(r.v == null ? '' : r.v) + '"/>' +
        '<span class="in-unit">' + esc(t(T.steps.avg)) + '</span></div>';
    });
    h += '</div>';
    h += '<div id="stepDerived">' + stepDerivedHtml(rows) + '</div>';
    h += '<p class="q-hint">' + esc(t(T.steps.proxy)) + '</p>';
    return h;
  }

  function stepDerivedHtml(rows) {
    var any = rows.some(function (r) { return parseFloat(r.v) > 0; });
    return any ? stepChart(rows) : '';
  }

  function stepChart(rows) {
    var pts = rows.map(function (r) { return { l: r.label, v: parseFloat(r.v) || 0 }; });
    var max = Math.max(CPG.steps.active, Math.max.apply(null, pts.map(function (p) { return p.v; })));
    var narrow = (window.innerWidth || 1024) < 520;
    var W = narrow ? 440 : 640, H = narrow ? 230 : 200;
    var L = narrow ? 42 : 48, R = 12, Tp = 12, B = 48;
    var bw = (W - L - R) / pts.length;
    var y = function (v) { return Tp + (H - Tp - B) * (1 - v / max); };
    var g = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' +
            esc(t(T.steps.h)) + '">';
    [CPG.steps.sedentary, CPG.steps.low, CPG.steps.active].forEach(function (lv) {
      g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(lv) + '" y2="' + y(lv) + '" class="c-grid"/>';
      g += '<text x="' + (L - 8) + '" y="' + (y(lv) + 4) + '" class="c-ytick">' +
           (lv / 1000) + 'k</text>';
    });
    pts.forEach(function (p, i) {
      if (!p.v) return;
      var cls = p.v >= CPG.steps.active ? 'ok' : p.v >= CPG.steps.low ? 'mid' : 'low';
      g += '<rect x="' + (L + i * bw + bw * 0.18).toFixed(1) + '" y="' + y(p.v).toFixed(1) +
           '" width="' + (bw * 0.64).toFixed(1) + '" height="' + (H - B - y(p.v)).toFixed(1) +
           '" class="c-bar b-' + cls + '" rx="3"><title>' +
           esc(Math.round(p.v) + '') + '</title></rect>';
      g += '<text x="' + (L + i * bw + bw / 2).toFixed(1) + '" y="' + (H - B + 16) +
           '" class="c-xtick">' + esc(Math.round(p.v / 100) / 10) + 'k</text>';
    });
    pts.forEach(function (p, i) {
      g += '<text x="' + (L + i * bw + bw / 2).toFixed(1) + '" y="' + (H - 8) +
           '" class="c-xlab">' + esc(String(p.l || '').slice(0, 14)) + '</text>';
    });
    g += '</svg>';
    return g;
  }

  /* ════════════════════════════════════════════════════════════
     PATIENT TAB
     ════════════════════════════════════════════════════════════ */

  function renderPatient() {
    if (!UI.consent) return consentHtml();
    if (UI.sec < 0) return welcomeHtml();

    var secs = sections();
    if (UI.sec >= secs.length) return doneHtml();

    var sec = secs[UI.sec], fs = fieldsOf(sec);
    var h = '<div class="sec">';
    h += '<div class="sec-top"><span class="sec-ic" aria-hidden="true">' + sec.icon + '</span>' +
      '<div><p class="sec-n">' + esc(t(T.nav.section)) + ' ' + (UI.sec + 1) + ' ' +
      esc(t(T.nav.of)) + ' ' + secs.length + '</p>' +
      '<h2>' + esc(t(sec.title)) + '</h2></div></div>';
    if (sec.lead) h += '<p class="sec-lead">' + esc(t(sec.lead)) + '</p>';
    h += fs.map(fieldHtml).join('');
    h += '<div class="sec-nav">' +
      (UI.sec > 0 ? '<button type="button" class="btn" data-go="prev">← ' + esc(t(T.nav.back)) + '</button>' : '<span></span>') +
      '<button type="button" class="btn btn-go" data-go="next">' +
        esc(UI.sec === secs.length - 1 ? t(T.nav.done) : t(T.nav.next)) + ' →</button>' +
    '</div></div>';
    return h;
  }

  function consentHtml() {
    var c = T.consent;
    return '<div class="card card-consent"><h2>' + esc(t(c.h)) + '</h2>' +
      '<ul class="plain">' +
        '<li><b>' + esc(t(c.local)) + '</b></li>' +
        '<li>' + esc(t(c.purpose)) + '</li>' +
        '<li>' + esc(t(c.optional)) + '</li>' +
        '<li>' + esc(t(c.erase)) + '</li>' +
        '<li>' + esc(t(c.notDoctor)) + '</li>' +
      '</ul>' +
      '<p class="pdpa">' + esc(t(c.pdpa)) + '</p>' +
      '<button type="button" class="btn btn-go btn-big" data-consent="1">' +
        esc(t(c.agree)) + '</button></div>';
  }

  function welcomeHtml() {
    var w = T.welcome;
    var has = Object.keys(S).length > 0;
    return '<div class="card"><h2>' + esc(t(w.h)) + '</h2>' +
      '<p class="big">' + esc(t(w.p1)) + '</p>' +
      '<p>' + esc(t(w.p2)) + '</p>' +
      '<p class="time">⏱ ' + esc(t(w.time)) + '</p>' +
      '<button type="button" class="btn btn-go btn-big" data-start="1">' +
        esc(has ? t(w.resume) : t(w.start)) + '</button>' +
      (has ? '<button type="button" class="btn btn-sub" data-fresh="1">' +
        esc(t(w.fresh)) + '</button>' : '') +
    '</div>';
  }

  function doneHtml() {
    var cm = Summary.completeness(S);
    return '<div class="card card-done"><div class="tick" aria-hidden="true">✓</div>' +
      '<h2>' + esc(LANG === 'en' ? 'Thank you. That is everything.'
                                 : 'Terima kasih. Itu sudah semuanya.') + '</h2>' +
      '<p class="big">' + esc(LANG === 'en'
        ? 'Your summary is ready. Show it to the nurse or the doctor when your name is called.'
        : 'Ringkasan anda sudah siap. Tunjukkan kepada jururawat atau doktor apabila nama anda dipanggil.') + '</p>' +
      '<p>' + esc(LANG === 'en' ? 'You answered ' + cm.done + ' of ' + cm.total + ' questions.'
                                : 'Anda menjawab ' + cm.done + ' daripada ' + cm.total + ' soalan.') + '</p>' +
      '<button type="button" class="btn btn-go btn-big" data-tab="summary">' +
        esc(t(T.sum.h)) + ' →</button>' +
      '<button type="button" class="btn btn-sub" data-tab="quiz">' +
        esc(LANG === 'en' ? 'Still waiting? Try the short quiz'
                          : 'Masih menunggu? Cuba kuiz ringkas') + '</button>' +
      '<button type="button" class="btn btn-sub" data-go="back-last">' +
        esc(LANG === 'en' ? 'Go back and change an answer' : 'Kembali dan ubah jawapan') + '</button>' +
    '</div>';
  }

  /* ════════════════════════════════════════════════════════════
     NURSING TAB
     ════════════════════════════════════════════════════════════ */

  function renderNurse() {
    if (!UI.nurse) {
      return '<div class="card card-gate"><h2>' + esc(t(T.nurse.gateH)) + '</h2>' +
        '<p>' + esc(t(T.nurse.gateP)) + '</p>' +
        '<div class="in-row"><input id="gateCode" class="in" type="password" ' +
          'autocomplete="off" placeholder="' + esc(t(T.nurse.code)) + '"/>' +
          '<button type="button" class="btn btn-go" data-gate="1">' + esc(t(T.nurse.enter)) + '</button></div>' +
        '<p class="gate-bad" id="gateBad" hidden>' + esc(t(T.nurse.wrong)) + '</p>' +
        '<p class="warnbox">' + esc(t(T.nurse.gateNote)) + '</p></div>';
    }

    var h = '<div class="card"><div class="row-between"><h2>' + esc(t(T.nurse.h)) + '</h2>' +
      '<button type="button" class="btn btn-sub" data-lock="1">🔒 ' + esc(t(T.nurse.lock)) + '</button></div>' +
      '<p>' + esc(t(T.nurse.p)) + '</p>';

    h += '<p class="ref">' + esc(t(T.nurse.patientRef)) + ': <b>' +
      esc(S.name || (LANG === 'en' ? '(no name entered)' : '(tiada nama)')) + '</b>' +
      (S.ic ? ' · <span class="mono">' + esc(Summary.maskIc(S.ic)) + '</span>' : '') + '</p>';
    if (!S.name && !S.ic) h += '<p class="warnbox">' + esc(t(T.nurse.noPatient)) + '</p>';

    /* Observations. */
    h += '<h3>' + esc(LANG === 'en' ? 'Observations' : 'Catatan tanda vital') + '</h3>';
    h += '<div class="grid2">';
    h += nIn('sys1', LANG === 'en' ? 'BP systolic, 1st' : 'TD sistolik, ke-1', 'mmHg', 60, 300);
    h += nIn('dia1', LANG === 'en' ? 'BP diastolic, 1st' : 'TD diastolik, ke-1', 'mmHg', 30, 200);
    h += nIn('sys2', LANG === 'en' ? 'BP systolic, 2nd' : 'TD sistolik, ke-2', 'mmHg', 60, 300);
    h += nIn('dia2', LANG === 'en' ? 'BP diastolic, 2nd' : 'TD diastolik, ke-2', 'mmHg', 30, 200);
    h += '</div>';

    h += '<div id="nurseBp">' + nurseBpHtml() + '</div>';

    h += '<div class="grid2">';
    h += nIn('pulse', LANG === 'en' ? 'Pulse rate' : 'Kadar nadi', '/min', 20, 220);
    h += nSel('pulseRhythm', LANG === 'en' ? 'Pulse rhythm' : 'Irama nadi', [
      ['regular', LANG === 'en' ? 'Regular' : 'Sekata'],
      ['irregular', LANG === 'en' ? 'Irregular' : 'Tidak sekata']]);
    h += nIn('rbg', LANG === 'en' ? 'Capillary glucose' : 'Glukosa kapilari', 'mmol/L', 0.5, 50, '0.1');
    h += nSel('rbgCtx', LANG === 'en' ? 'Glucose taken' : 'Glukosa diambil', [
      ['fasting', LANG === 'en' ? 'Fasting' : 'Berpuasa'],
      ['random', LANG === 'en' ? 'Random' : 'Rawak'],
      ['post2h', LANG === 'en' ? '2 h post-meal' : '2 jam selepas makan']]);
    h += nIn('hba1cPoc', LANG === 'en' ? 'Capillary HbA1c' : 'HbA1c kapilari', '%', 3, 20, '0.1');
    h += nIn('temp', LANG === 'en' ? 'Temperature' : 'Suhu', '°C', 30, 43, '0.1');
    h += nIn('spo2', 'SpO₂', '%', 50, 100);
    h += nIn('wt', LANG === 'en' ? 'Weight' : 'Berat', 'kg', 20, 300, '0.1');
    h += nIn('ht', LANG === 'en' ? 'Height' : 'Tinggi', 'cm', 100, 220);
    h += nIn('waist', LANG === 'en' ? 'Waist' : 'Lilitan pinggang', 'cm', 40, 220, '0.5');
    h += '</div>';

    h += '<div id="nurseBody">' + nurseBodyHtml() + '</div>';

    /* Foot screen. */
    h += '<h3>' + esc(t(T.nurse.footH)) + '</h3><div class="grid2">';
    h += nSel('pulsesR', (LANG === 'en' ? 'Pedal pulses, right' : 'Nadi pedal, kanan'), [
      ['present', LANG === 'en' ? 'Present' : 'Ada'], ['absent', LANG === 'en' ? 'Absent' : 'Tiada']]);
    h += nSel('pulsesL', (LANG === 'en' ? 'Pedal pulses, left' : 'Nadi pedal, kiri'), [
      ['present', LANG === 'en' ? 'Present' : 'Ada'], ['absent', LANG === 'en' ? 'Absent' : 'Tiada']]);
    h += nSel('monoR', (LANG === 'en' ? 'Monofilament, right' : 'Monofilamen, kanan'), [
      ['intact', LANG === 'en' ? 'Intact' : 'Normal'], ['reduced', LANG === 'en' ? 'Reduced' : 'Berkurang']]);
    h += nSel('monoL', (LANG === 'en' ? 'Monofilament, left' : 'Monofilamen, kiri'), [
      ['intact', LANG === 'en' ? 'Intact' : 'Normal'], ['reduced', LANG === 'en' ? 'Reduced' : 'Berkurang']]);
    h += nSel('footUlcer', (LANG === 'en' ? 'Ulcer or open wound' : 'Ulser atau luka terbuka'), [
      ['no', LANG === 'en' ? 'No' : 'Tiada'], ['yes', LANG === 'en' ? 'Yes' : 'Ada']]);
    h += nSel('footDeform', (LANG === 'en' ? 'Deformity' : 'Kecacatan bentuk'), [
      ['no', LANG === 'en' ? 'No' : 'Tiada'], ['yes', LANG === 'en' ? 'Yes' : 'Ada']]);
    h += '</div>';

    h += '<div class="grid2">';
    h += '<label class="nf"><span>' + esc(t(T.nurse.staffId)) + '</span>' +
      '<input class="in" type="text" data-n="staff" value="' + esc(N.staff || '') + '"/></label>';
    h += '<label class="nf"><span>' + esc(LANG === 'en' ? 'Recorded at' : 'Direkod pada') + '</span>' +
      '<input class="in" type="datetime-local" data-n="at" value="' + esc(N.at || '') + '"/>' +
      '</label>';
    h += '</div>';
    h += '<button type="button" class="btn btn-sub" data-now="1">' +
      esc(LANG === 'en' ? 'Stamp the time now' : 'Cap masa sekarang') + '</button>';

    /* Counter flags, so the nurse sees what the form raised. */
    h += '<div id="nurseFlags">' + nurseFlagsHtml() + '</div>';
    h += '</div>';

    /* QR card for the registration counter. */
    h += '<div class="card card-qr"><h2>' + esc(t(T.nurse.counterH)) + '</h2>' +
      '<p>' + esc(t(T.nurse.counterP)) + '</p>' +
      '<div class="qrwrap"><figure class="qr" data-qr></figure>' +
        '<div><p class="qr-url mono">' + esc(baseUrl()) + '</p>' +
        '<p class="qr-cap">' + esc(t(T.nurse.counterScan)) + '</p></div></div>' +
      '<button type="button" class="btn btn-sub" data-printqr="1">' + esc(t(T.nurse.print)) + '</button>' +
    '</div>';
    return h;
  }

  /* The counter's three derived read-outs live in their own
     containers and are rebuilt in place by refreshDerived(). They
     must NOT come from a full re-render: a nurse tabbing out of the
     systolic box fires `change` on the box being left, and a
     re-render at that instant destroys the box they are tabbing
     INTO -- so the next number typed goes into a node that is no
     longer in the document, and is silently lost. */
  function nurseBpHtml() {
    var s1 = parseFloat(N.sys1), s2 = parseFloat(N.sys2),
        d1 = parseFloat(N.dia1), d2 = parseFloat(N.dia2);
    if (isNaN(s1) || isNaN(s2) || isNaN(d1) || isNaN(d2)) return '';
    var ms = Math.round((s1 + s2) / 2), md = Math.round((d1 + d2) / 2);
    var over = ms >= CPG.bp.sys || md >= CPG.bp.dia;
    return '<div class="calc is-' + (over ? 'bad' : 'ok') + '"><b>' + ms + '/' + md +
      '</b> mmHg \u2014 ' + esc(t(T.nurse.bpMean)) + '<br><small>' +
      esc(fill(t(over ? T.nurse.aboveTarget : T.nurse.atTarget),
               { t: '< ' + CPG.bp.sys + '/' + CPG.bp.dia })) + '</small></div>';
  }

  function nurseBodyHtml() {
    var out = '';
    var nb = CPGcalc.bmi(N.wt, N.ht), nbd = CPGcalc.bmiBand(nb);
    if (nb != null && !CPGcalc.bmiPlausible(nb)) {
      out += '<div class="calc is-warn">' + esc(LANG === 'en'
        ? 'BMI ' + nb + ' \u2014 check the weight and height entered.'
        : 'BMI ' + nb + ' \u2014 semak berat dan tinggi yang dimasukkan.') + '</div>';
    } else if (nb != null) {
      var cls = (nbd.key === 'normal') ? 'ok' : (nbd.key === 'under' || nbd.key === 'over') ? 'warn' : 'bad';
      out += '<div class="calc is-' + cls + '"><b>' + nb + '</b> kg/m\u00b2 \u2014 ' + esc(t(nbd.name)) +
        '<br><small>' + esc(LANG === 'en' ? 'Asian cut-offs, Obesity CPG' : 'Julat Asia, CPG Obesiti') +
        '</small></div>';
    }
    /* Sex comes from the IC the patient entered, because the waist
       cut-off differs between men and women. With no IC there is no
       cut-off to compare against, and none is guessed. */
    var sexFor = S.sex || (CPGcalc.ic(S.ic).ok ? CPGcalc.ic(S.ic).sex : null);
    var wh = CPGcalc.waistHigh(N.waist, sexFor);
    if (wh) {
      out += '<div class="calc is-' + (wh.high ? 'bad' : 'ok') + '"><b>' + esc(N.waist) +
        '</b> cm \u2014 ' + esc(wh.high
          ? (LANG === 'en' ? 'at or above the Asian cut-off of ' : 'pada atau melebihi nilai Asia ')
          : (LANG === 'en' ? 'below the Asian cut-off of ' : 'di bawah nilai Asia ')) + wh.cut + ' cm</div>';
    }
    return out;
  }

  function nurseFlagsHtml() {
    var fl = Summary.flags(S, N);
    if (!fl.length) return '';
    return '<h3>' + esc(t(T.nurse.flagged)) + '</h3><ul class="flaglist">' +
      fl.map(function (f) {
        return '<li class="' + (f.lvl === 'red' ? 'is-red' : 'is-amber') + '">' + esc(f[LANG]) + '</li>';
      }).join('') +
      '</ul><p class="q-hint">' + esc(t(T.alert.staffNote)) + '</p>';
  }

  function nIn(k, lab, unit, min, max, step) {
    return '<label class="nf"><span>' + esc(lab) + '</span><div class="in-row">' +
      '<input class="in in-num" type="number" inputmode="decimal" data-n="' + k + '" value="' +
      esc(N[k] == null ? '' : N[k]) + '"' +
      (min != null ? ' min="' + min + '"' : '') + (max != null ? ' max="' + max + '"' : '') +
      (step ? ' step="' + step + '"' : '') + '/>' +
      '<span class="in-unit">' + esc(unit) + '</span></div></label>';
  }
  function nSel(k, lab, pairs) {
    return '<label class="nf"><span>' + esc(lab) + '</span><select class="in" data-n="' + k + '">' +
      '<option value="">' + esc(LANG === 'en' ? '— not done' : '— tidak dibuat') + '</option>' +
      pairs.map(function (p) {
        return '<option value="' + esc(p[0]) + '"' + (N[k] === p[0] ? ' selected' : '') + '>' +
               esc(p[1]) + '</option>';
      }).join('') + '</select></label>';
  }

  function baseUrl() {
    try { return location.origin + location.pathname.replace(/\/index\.html$/, '/'); }
    catch (e) { return ''; }
  }

  /* ════════════════════════════════════════════════════════════
     GUIDELINE TAB
     ════════════════════════════════════════════════════════════ */

  var ASKS = [
    L('Apakah sasaran HbA1c untuk saya dan bagaimana ia dipilih?',
      'What HbA1c target applies to me and how is it chosen?'),
    L('Berapa banyak nasi yang patut saya makan pada satu hidangan?',
      'How much rice should I eat at one meal?'),
    L('Apa yang patut saya buat jika gula saya jatuh rendah?',
      'What should I do if my sugar drops low?'),
    L('Bolehkah saya berpuasa jika saya mengambil insulin?',
      'May I fast if I am taking insulin?'),
    L('Berapa kerap kaki dan mata saya patut diperiksa?',
      'How often should my feet and eyes be checked?'),
    L('Berapa banyak berat badan yang perlu saya turunkan untuk memberi kesan?',
      'How much weight do I need to lose for it to make a difference?'),
    L('Senaman apa yang sesuai dan berapa banyak?',
      'What exercise is suitable and how much of it?'),
    L('Apa tanda-tanda kerosakan buah pinggang daripada kencing manis?',
      'What are the signs of kidney damage from diabetes?')
  ];

  function renderGuide() {
    /* A link, not an embed. NotebookLM sends frame-ancestors that
       refuse to render inside another page, so an <iframe> here
       would show every patient an empty grey box and teach them
       the tool is broken. The link opens the real thing. */
    var url = CFG.notebookUrl || '#';
    var h = '<div class="card"><h2>' + esc(t(T.guide.h)) + '</h2>' +
      '<p class="big">' + esc(t(T.guide.p)) + '</p>' +
      '<p>' + esc(t(T.guide.why)) + '</p>' +
      '<a class="btn btn-go btn-big" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' +
        esc(t(T.guide.open)) + ' \u2197</a>' +
      '<p class="q-hint">' + esc(t(T.guide.openNew)) + '</p>' +
      '<p class="q-hint">' + esc(t(T.guide.signin)) + '</p>' +
    '</div>';

    h += '<div class="card"><h3>' + esc(t(T.guide.askH)) + '</h3>' +
      '<p>' + esc(t(T.guide.askP)) + '</p><div class="asks">' +
      ASKS.map(function (a, i) {
        return '<button type="button" class="ask" data-ask="' + i + '">' + esc(t(a)) + '</button>';
      }).join('') + '</div></div>';

    h += '<div class="card"><h3>' + esc(t(T.guide.limitH)) + '</h3><ul class="plain">' +
      '<li>' + esc(t(T.guide.limit1)) + '</li>' +
      '<li>' + esc(t(T.guide.limit2)) + '</li>' +
      '<li><b>' + esc(t(T.guide.limit3)) + '</b></li></ul></div>';

    h += '<div class="card"><h3>' + esc(t(T.guide.docsH)) + '</h3><ul class="refs">' +
      '<li><a href="' + esc(CPG.refs.t2dm.url) + '" target="_blank" rel="noopener noreferrer">' +
        esc(t(CPG.refs.t2dm.full)) + '</a></li>' +
      '<li><a href="' + esc(CPG.refs.obes.url) + '" target="_blank" rel="noopener noreferrer">' +
        esc(t(CPG.refs.obes.full)) + '</a></li></ul></div>';
    return h;
  }

  /* ════════════════════════════════════════════════════════════
     QUIZ TAB
     ════════════════════════════════════════════════════════════ */

  function renderQuiz() {
    if (!Q.started) {
      return '<div class="card"><h2>' + esc(t(T.quiz.h)) + '</h2>' +
        '<p class="big">' + esc(t(T.quiz.p)) + '</p>' +
        '<button type="button" class="btn btn-go btn-big" data-quiz="start">' +
          esc(t(T.quiz.start)) + '</button></div>';
    }
    if (Q.idx >= QUIZ.length) return quizResultHtml();

    var item = QUIZ[Q.idx], picked = Q.answers[Q.idx];
    var h = '<div class="card card-quiz">' +
      '<p class="sec-n">' + esc(t(T.quiz.q)) + ' ' + (Q.idx + 1) + ' ' +
        esc(t(T.nav.of)) + ' ' + QUIZ.length + '</p>' +
      '<h2 class="qz-q">' + esc(t(item.q)) + '</h2><div class="opts">';
    item.opts.forEach(function (o, i) {
      var cls = 'opt';
      if (picked != null) {
        if (i === item.ans) cls += ' qz-right';
        else if (i === picked) cls += ' qz-wrong';
        cls += ' qz-done';
      }
      h += '<button type="button" class="' + cls + '" data-pick="' + i + '"' +
        (picked != null ? ' disabled' : '') + '>' +
        '<span class="opt-mark" aria-hidden="true"></span>' +
        '<span class="opt-txt">' + esc(t(o)) + '</span></button>';
    });
    h += '</div>';
    if (picked != null) {
      var right = picked === item.ans;
      h += '<div class="qz-why ' + (right ? 'is-ok' : 'is-no') + '">' +
        '<p class="qz-verdict">' + (right ? '✓ ' + esc(t(T.quiz.correct))
                                          : '→ ' + esc(t(T.quiz.wrong))) + '</p>' +
        '<p>' + esc(t(item.why)) + '</p>' +
        '<p class="qz-src">' + esc(t(T.quiz.src)) + ': ' +
          esc(item.src === 'OBES' ? CPG.refs.obes.short : CPG.refs.t2dm.short) + '</p></div>' +
        '<button type="button" class="btn btn-go" data-quiz="next">' +
          esc(Q.idx === QUIZ.length - 1 ? t(T.quiz.finish) : t(T.quiz.next)) + ' →</button>';
    }
    h += '</div>';
    return h;
  }

  function wrongTopics() {
    var out = [];
    QUIZ.forEach(function (it, i) {
      if (Q.answers[i] != null && Q.answers[i] !== it.ans) out.push(it.topic);
    });
    return out;
  }

  function quizResultHtml() {
    var n = 0;
    QUIZ.forEach(function (it, i) { if (Q.answers[i] === it.ans) n++; });
    var band = n >= 7 ? T.quiz.band.hi : n >= 4 ? T.quiz.band.mid : T.quiz.band.lo;
    var wrong = wrongTopics();
    var h = '<div class="card card-done"><h2>' +
      esc(fill(t(T.quiz.scoreH), { n: n, t: QUIZ.length })) + '</h2>' +
      '<p class="big">' + esc(t(band)) + '</p>';
    if (wrong.length) {
      h += '<h3>' + esc(LANG === 'en' ? 'Worth asking the doctor about'
                                      : 'Berbaloi ditanya kepada doktor') + '</h3><ul class="plain">' +
        wrong.map(function (w) { return '<li>' + esc(t(w)) + '</li>'; }).join('') + '</ul>' +
        '<label class="opt' + (Q.carry ? ' on' : '') + '"><input type="checkbox" data-carry="1"' +
          (Q.carry ? ' checked' : '') + '/><span class="opt-mark is-box" aria-hidden="true"></span>' +
          '<span class="opt-txt">' + esc(t(T.quiz.carry)) + '</span></label>' +
        (Q.carry ? '<p class="q-good">' + esc(t(T.quiz.carryOn)) + '</p>' : '');
    }
    h += '<button type="button" class="btn btn-sub" data-quiz="again">' +
        esc(t(T.quiz.again)) + '</button>' +
      '<button type="button" class="btn btn-go" data-tab="summary">' +
        esc(t(T.sum.h)) + ' →</button></div>';
    return h;
  }

  /* ════════════════════════════════════════════════════════════
     SUMMARY TAB
     ════════════════════════════════════════════════════════════ */

  function summaryText(mask) {
    return Summary.text(S, N, LANG, {
      maskIc: !!mask,
      appVersion: CFG.version || '',
      quizTopics: Q.carry ? wrongTopics() : []
    });
  }

  function renderSummary() {
    var cm = Summary.completeness(S);
    if (!cm.done) {
      return '<div class="card"><h2>' + esc(t(T.sum.h)) + '</h2>' +
        '<p class="big">' + esc(t(T.sum.empty)) + '</p>' +
        '<button type="button" class="btn btn-go" data-tab="patient">' +
          esc(t(T.welcome.start)) + ' →</button></div>';
    }
    var h = '<div class="card"><h2>' + esc(t(T.sum.h)) + '</h2>' +
      '<p>' + esc(t(T.sum.p)) + '</p>';
    if (cm.blankSections) {
      h += '<p class="warnbox">' + esc(fill(t(T.sum.incomplete), { n: cm.blankSections })) + '</p>';
    }
    if (CPG.unverified > 0) {
      h += '<p class="warnbox is-hard">' + esc(fill(t(T.sum.unverified), { n: CPG.unverified })) + '</p>';
    }
    h += '<h3>' + esc(t(T.sum.staffH)) + '</h3><p>' + esc(t(T.sum.staffP)) + '</p>' +
      '<div class="btns">' +
        '<button type="button" class="btn btn-go" data-sum="copy">📋 ' + esc(t(T.sum.copy)) + '</button>' +
        '<button type="button" class="btn" data-sum="txt">⬇ ' + esc(t(T.sum.txt)) + '</button>' +
        '<button type="button" class="btn" data-sum="pdf">🖨 ' + esc(t(T.sum.pdf)) + '</button>' +
      '</div>' +
      '<p class="q-hint">' + esc(t(T.sum.pdfHow)) + '</p>' +
      '<p class="q-hint" id="sumMsg" role="status"></p>' +
      '<label class="opt' + (UI.showIc ? ' on' : '') + '"><input type="checkbox" data-showic="1"' +
        (UI.showIc ? ' checked' : '') + '/><span class="opt-mark is-box" aria-hidden="true"></span>' +
        '<span class="opt-txt">' + esc(LANG === 'en'
          ? 'Show the full IC number on screen' : 'Tunjuk nombor KP penuh di skrin') + '</span></label>' +
      (UI.showIc ? '' : '<p class="q-hint">' + esc(t(T.sum.icMasked)) + '</p>') +
      '</div>';

    h += '<div class="card"><pre class="note" id="noteBox">' +
      esc(summaryText(!UI.showIc)) + '</pre></div>';
    return h;
  }

  /* ── Red-flag banner, shown on every tab ─────────────────── */
  function bannerHtml() {
    if (UI.ackFlags) return '';
    var reds = Summary.flags(S, N).filter(function (f) { return f.lvl === 'red'; });
    if (!reds.length) return '';
    return '<div class="alert" role="alert"><div class="alert-in">' +
      '<p class="alert-h">⚠ ' + esc(t(T.alert.h)) + '</p>' +
      '<p>' + esc(t(T.alert.p)) + '</p><ul>' +
        reds.map(function (f) { return '<li>' + esc(f[LANG]) + '</li>'; }).join('') + '</ul>' +
      '<p class="alert-ed">' + esc(t(T.alert.ed)) + ' — <b>' + CPG.emergency.number + '</b></p>' +
      '<button type="button" class="btn btn-ack" data-ack="1">' + esc(t(T.alert.ack)) + '</button>' +
      '</div></div>';
  }

  /* ════════════════════════════════════════════════════════════
     SHELL
     ════════════════════════════════════════════════════════════ */

  var TABS = ['patient', 'nurse', 'guide', 'quiz', 'summary'];

  /* Replacing #main's innerHTML blurs whatever had focus, and a
     blur can fire a `change` that would call render() again from
     inside the first one -- which throws, because the node being
     removed is already gone. Guarding here is the belt; not
     re-rendering on every keystroke at all (see refreshDerived) is
     the braces. */
  var rendering = false;

  function render() {
    if (rendering) return;
    rendering = true;
    try { renderNow(); } finally { rendering = false; }
  }

  function renderNow() {
    document.documentElement.lang = LANG === 'en' ? 'en' : 'ms';

    $('#appTitle').textContent = t(T.app.title);
    $('#appSub').textContent = t(T.app.sub);
    $('#langBtn').textContent = t(T.app.langBtn);
    $('#clearBtn').textContent = t(T.nav.clear);
    $('#saveChip').textContent = t(T.nav.saved);

    var cm = Summary.completeness(S);
    var pr = $('#progress');
    pr.hidden = UI.sec < 0 || !UI.consent;
    $('#progBar').style.width = cm.pct + '%';
    $('#progTxt').textContent = cm.pct + '% ' + t(T.nav.progress);

    $('#tabs').innerHTML = TABS.map(function (k) {
      return '<button type="button" class="tab' + (UI.tab === k ? ' on' : '') +
        '" data-tab="' + k + '" aria-current="' + (UI.tab === k ? 'page' : 'false') + '">' +
        '<span class="tab-t">' + esc(t(T.tabs[k])) + '</span>' +
        '<span class="tab-h">' + esc(t(T.tabHint[k])) + '</span></button>';
    }).join('');

    $('#banner').innerHTML = bannerHtml();

    var main = $('#main');
    main.innerHTML =
      UI.tab === 'patient' ? renderPatient() :
      UI.tab === 'nurse'   ? renderNurse()   :
      UI.tab === 'guide'   ? renderGuide()   :
      UI.tab === 'quiz'    ? renderQuiz()    : renderSummary();

    $('#footNot').textContent = t(T.foot.not);
    $('#footGround').textContent = t(T.foot.ground);

    /* QR codes are drawn after the markup exists. */
    $$('[data-qr]').forEach(function (fig) {
      if (fig.querySelector('svg')) return;
      fig.insertAdjacentHTML('afterbegin', qrSvg(baseUrl()));
    });

    /* Scroll to the top only when the patient has actually moved --
       a new section or a new tab. Doing it on every render would
       yank the page back up each time an option is tapped, which
       on a long section means losing your place with every answer. */
    if (UI.scrollNext) {
      UI.scrollNext = false;
      main.scrollIntoView({ block: 'start' });
    }
  }

  /* ── Targeted updates ─────────────────────────────────────
     Called while a text or number field is being typed into. It
     refreshes everything that is derived from the answers --
     the banner, the progress bar, the computed read-outs, the
     glucose chart -- and touches no input, so the caret stays
     where the patient put it. */
  function refreshDerived(src) {
    var cm = Summary.completeness(S);
    var bar = $('#progBar'), txt = $('#progTxt');
    if (bar) bar.style.width = cm.pct + '%';
    if (txt) txt.textContent = cm.pct + '% ' + t(T.nav.progress);

    var bn = $('#banner');
    if (bn) {
      var want = bannerHtml();
      if (bn.innerHTML !== want) bn.innerHTML = want;
    }

    /* The IC read-back, under the field being typed into. */
    if (src && src.getAttribute && src.getAttribute('data-f') === 'ic') {
      var q = src.closest('.q');
      if (q) {
        var p = CPGcalc.ic(S.ic);
        var old = q.querySelector('.q-good, .q-bad');
        if (old) old.parentNode.removeChild(old);
        var note = '';
        if (S.ic && !p.ok && p.why !== 'empty') {
          note = '<p class="q-bad">' + esc(t(T.f.icBad[p.why] || T.f.icBad.length)) + '</p>';
        } else if (p.ok) {
          note = '<p class="q-good">' + esc(fill(t(T.f.icOk), {
            dob: p.dob, age: p.age,
            sex: p.sex === 'M' ? t(T.f.male) : t(T.f.female)
          })) + '</p>';
        }
        if (note) src.insertAdjacentHTML('afterend', note);
      }
    }

    /* Computed read-outs that are not inputs: BMI, the BP mean. */
    $$('.q[data-qid]').forEach(function (q) {
      var id = q.getAttribute('data-qid'), f = fieldById(id);
      if (!f || f.type !== 'calc') return;
      var box = q.querySelector('.q-in');
      if (box) box.innerHTML = inputHtml(f, S[id]);
    });

    /* The counter's read-outs. */
    var nbp = $('#nurseBp');    if (nbp) nbp.innerHTML = nurseBpHtml();
    var nbody = $('#nurseBody'); if (nbody) nbody.innerHTML = nurseBodyHtml();
    var nflg = $('#nurseFlags'); if (nflg) nflg.innerHTML = nurseFlagsHtml();

    /* Charts and figures. */
    var gd = $('#gluDerived');
    if (gd) gd.innerHTML = gluDerivedHtml(S.gluLog || []);
    var sd = $('#stepDerived');
    if (sd) sd.innerHTML = stepDerivedHtml(S.stepsLog || []);

    /* A glucose row's own colour band. */
    if (src && src.getAttribute && src.getAttribute('data-glu') != null) {
      var row = src.closest('.log-row');
      if (row) {
        var i = +src.getAttribute('data-glu'), r = (S.gluLog || [])[i] || {};
        var band = CPGcalc.glucoseBand(r.v, r.ctx);
        row.className = 'log-row' + (band ? ' b-' + band : '');
      }
    }
  }

  function fieldById(id) {
    for (var i = 0; i < SCHEMA.length; i++) {
      for (var j = 0; j < SCHEMA[i].fields.length; j++) {
        if (SCHEMA[i].fields[j].id === id) return SCHEMA[i].fields[j];
      }
    }
    return null;
  }

  /* Same QR renderer as the hospital's printed posters: inline SVG
     paths, so there is no image host and nothing to fetch. */
  function qrSvg(text) {
    try {
      var qr = qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      var n = qr.getModuleCount(), q = 2, dim = n + q * 2, d = '';
      for (var r = 0; r < n; r++) {
        for (var c = 0; c < n; c++) {
          if (qr.isDark(r, c)) d += 'M' + (c + q) + ' ' + (r + q) + 'h1v1h-1z';
        }
      }
      return '<svg viewBox="0 0 ' + dim + ' ' + dim + '" shape-rendering="crispEdges" ' +
        'role="img" aria-label="QR"><rect width="' + dim + '" height="' + dim +
        '" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
    } catch (e) { return ''; }
  }

  /* ── Events ───────────────────────────────────────────────
     Two listeners, not one. `input` fires on every keystroke, so
     it only ever writes the value and refreshes what is derived
     from it. `change` fires when a choice is made or a field is
     left, and that is the only point at which the page is allowed
     to re-render -- which is what keeps the caret in place while
     somebody types a weight, and what stops a re-entrant render
     when the blur that the re-render itself caused fires another
     change event. */
  function onEdit(e) {
    var el = e.target;
    if (!el || !el.getAttribute) return;
    if (writeValue(el) === null) return;
    save();
    refreshDerived(el);
  }

  function onCommit(e) {
    var el = e.target;
    if (!el || !el.getAttribute) return;
    if (writeValue(el) === null) return;
    save();
    /* A radio, a checkbox or a select is a discrete choice: there
       is no caret to lose, and the answer may open or close a whole
       section, so the page is rebuilt.

       Counter observations rebuild too. `change` only fires once
       the nurse has left the field, so nothing is being typed at
       that moment, and the blood-pressure mean, the BMI band and
       the waist comparison all have to be recomputed together
       against their CPG thresholds.

       Everything else was typed by a patient and is refreshed in
       place, so the caret stays where they put it. */
    var discrete = el.type === 'radio' || el.type === 'checkbox' ||
                   el.tagName === 'SELECT';
    /* ...but never a counter field, for the reason given above
       nurseBpHtml(). Those refresh in place instead. */
    if (el.getAttribute('data-n') != null) discrete = false;
    if (discrete) render(); else refreshDerived(el);
  }

  /* Writes one control's value into state. Returns the key it
     wrote, or null if the control is not one of ours. */
  function writeValue(el) {
    var k;

    if ((k = el.getAttribute('data-f'))) {
      if (el.getAttribute('data-multi')) {
        var arr = (S[k] || []).slice();
        var i = arr.indexOf(el.value);
        if (el.checked && i < 0) arr.push(el.value);
        if (!el.checked && i >= 0) arr.splice(i, 1);
        /* "None of these" is exclusive, in both directions: picking
           it clears the rest, and picking anything else clears it. */
        if (el.checked && (el.value === 'none' || el.value === 'na')) arr = [el.value];
        else if (el.checked) arr = arr.filter(function (v) { return v !== 'none' && v !== 'na'; });
        S[k] = arr;
      } else {
        S[k] = el.value;
      }
      /* Date of birth, age and sex are derived from the IC rather
         than asked, so they must be recomputed -- or cleared -- on
         every edit, including a part-typed one. */
      if (k === 'ic') {
        var p = CPGcalc.ic(S.ic);
        if (p.ok) { S.sex = p.sex; S.age = p.age; S.dob = p.dob; }
        else { delete S.sex; delete S.age; delete S.dob; }
      }
      return k;
    }

    if ((k = el.getAttribute('data-n'))) { N[k] = el.value; return k; }

    var gi = el.getAttribute('data-glu');
    if (gi != null) {
      var rows = (S.gluLog || []).slice();
      rows[+gi] = rows[+gi] || {};
      rows[+gi][el.getAttribute('data-k')] = el.value;
      S.gluLog = rows;
      return 'gluLog';
    }

    var si = el.getAttribute('data-step');
    if (si != null) {
      var sr = (S.stepsLog || []).slice();
      sr[+si] = sr[+si] || {};
      sr[+si].v = el.value;
      S.stepsLog = sr;
      return 'stepsLog';
    }

    if (el.getAttribute('data-carry') != null) { Q.carry = el.checked; return 'carry'; }
    if (el.getAttribute('data-showic') != null) { UI.showIc = el.checked; return 'showIc'; }

    return null;
  }

  function onClick(e) {
    var el = e.target.closest ? e.target.closest('[data-tab],[data-go],[data-consent],[data-start],' +
      '[data-fresh],[data-gate],[data-lock],[data-now],[data-gluadd],[data-gludel],[data-ask],' +
      '[data-quiz],[data-pick],[data-sum],[data-ack],[data-printqr],[data-scale],#langBtn,#clearBtn') : null;
    if (!el) return;
    var a = function (n) { return el.getAttribute(n); };

    if (el.id === 'langBtn') { LANG = LANG === 'ms' ? 'en' : 'ms'; save(); render(); return; }
    if (el.id === 'clearBtn') {
      if (confirm(t(T.nav.clearAsk))) { wipe(); render(); alert(t(T.nav.cleared)); }
      return;
    }
    if (a('data-tab')) { UI.tab = a('data-tab'); UI.sec = Math.max(UI.sec, 0);
      UI.scrollNext = true; save(); render(); return; }
    if (a('data-consent')) { UI.consent = true; UI.sec = -1; UI.scrollNext = true; save(); render(); return; }
    if (a('data-start')) { UI.sec = Math.max(0, UI.sec); UI.scrollNext = true; save(); render(); return; }
    if (a('data-fresh')) {
      if (confirm(t(T.nav.clearAsk))) { wipe(); UI.consent = true; UI.sec = 0; save(); render(); }
      return;
    }
    if (a('data-go')) {
      var secs = sections();
      var dir = a('data-go');
      if (dir === 'prev') UI.sec = Math.max(0, UI.sec - 1);
      else if (dir === 'back-last') UI.sec = secs.length - 1;
      else UI.sec = Math.min(secs.length, UI.sec + 1);
      UI.scrollNext = true;
      save(); render();
      return;
    }
    if (a('data-scale')) {
      S[a('data-scale')] = el.value; save(); render(); return;
    }
    if (a('data-gluadd')) {
      var rows = (S.gluLog || []).slice();
      var d = new Date(), p2 = function (n) { return (n < 10 ? '0' : '') + n; };
      rows.push({ d: d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()),
                  v: '', ctx: 'fasting' });
      S.gluLog = rows; save(); render();
      var ins = $$('[data-glu][data-k="v"]');
      if (ins.length) ins[ins.length - 1].focus();
      return;
    }
    if (a('data-gludel')) {
      var r2 = (S.gluLog || []).slice();
      r2.splice(+a('data-gludel'), 1);
      S.gluLog = r2; save(); render(); return;
    }
    if (a('data-gate')) {
      var code = ($('#gateCode') || {}).value || '';
      if (code.trim().toLowerCase() === String(CFG.nurseCode || '').toLowerCase()) {
        UI.nurse = true; render();
      } else {
        var bad = $('#gateBad'); if (bad) bad.hidden = false;
      }
      return;
    }
    if (a('data-lock')) { UI.nurse = false; render(); return; }
    if (a('data-now')) {
      var d2 = new Date(), q2 = function (n) { return (n < 10 ? '0' : '') + n; };
      N.at = d2.getFullYear() + '-' + q2(d2.getMonth() + 1) + '-' + q2(d2.getDate()) +
             'T' + q2(d2.getHours()) + ':' + q2(d2.getMinutes());
      save(); render(); return;
    }
    if (a('data-printqr')) { document.body.classList.add('print-qr'); window.print();
      setTimeout(function () { document.body.classList.remove('print-qr'); }, 500); return; }
    if (a('data-ask') != null) {
      var txt = t(ASKS[+a('data-ask')]);
      copy(txt, el, t(T.guide.copied));
      return;
    }
    if (a('data-quiz')) {
      var m = a('data-quiz');
      if (m === 'start') { Q.started = true; Q.idx = 0; Q.answers = []; }
      if (m === 'next') Q.idx++;
      if (m === 'again') { Q.idx = 0; Q.answers = []; Q.started = true; }
      save(); render(); return;
    }
    if (a('data-pick') != null) {
      if (Q.answers[Q.idx] == null) { Q.answers[Q.idx] = +a('data-pick'); save(); render(); }
      return;
    }
    if (a('data-ack')) { UI.ackFlags = true; render(); return; }
    if (a('data-sum')) {
      var mode = a('data-sum');
      if (mode === 'copy') copy(summaryText(false), null, t(T.sum.copied), t(T.sum.copyFail));
      if (mode === 'txt') download(summaryText(false));
      if (mode === 'pdf') { document.body.classList.add('print-note'); window.print();
        setTimeout(function () { document.body.classList.remove('print-note'); }, 500); }
      return;
    }
  }

  function msg(s) { var el = $('#sumMsg'); if (el) el.textContent = s; }

  function copy(text, btn, okMsg, failMsg) {
    var done = function () {
      if (btn) { var o = btn.textContent; btn.textContent = okMsg;
                 setTimeout(function () { btn.textContent = o; }, 1200); }
      else msg(okMsg);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { legacy(); });
    } else legacy();

    function legacy() {
      /* execCommand is deprecated but is the only path left on an
         older clinic tablet or over plain http, where the async
         clipboard API is unavailable. */
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed'; ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) done(); else msg(failMsg || okMsg);
      } catch (err) { msg(failMsg || okMsg); }
    }
  }

  function download(text) {
    var nm = String(S.name || 'pesakit').replace(/[^\wÀ-ɏ -]/g, '').trim().replace(/\s+/g, '_');
    var d = new Date(), p2 = function (n) { return (n < 10 ? '0' : '') + n; };
    var fname = 'prakonsultasi_' + (nm || 'pesakit') + '_' +
      d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate()) + '_' +
      p2(d.getHours()) + p2(d.getMinutes()) + '.txt';
    try {
      var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = fname;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      msg(fname);
    } catch (e) { msg(t(T.sum.copyFail)); }
  }

  /* ── Boot ─────────────────────────────────────────────────── */
  function init() {
    load();
    document.addEventListener('input', onEdit, false);
    document.addEventListener('change', onCommit, false);
    document.addEventListener('click', onClick, false);
    UI.scrollNext = false;
    render();
    /* Exposed for the test harness, which drives the real page
       rather than a mock of it. */
    window.DMPC = {
      state: function () { return S; }, nurse: function () { return N; },
      summary: function () { return summaryText(false); },
      flags: function () { return Summary.flags(S, N); },
      gaps: function () { return Summary.gaps(S, N, LANG); },
      completeness: function () { return Summary.completeness(S); },
      sections: function () { return sections().map(function (s) { return s.id; }); },
      set: function (k, v) { S[k] = v; save(); render(); },
      setN: function (k, v) { N[k] = v; save(); render(); },
      go: function (tab) { UI.tab = tab; UI.consent = true; if (UI.sec < 0) UI.sec = 0; render(); },
      refresh: function () { refreshDerived(null); },
      gotoSection: function (i) { UI.sec = i; UI.consent = true; render(); },
      unlock: function () { UI.nurse = true; render(); },
      lang: function (l) { LANG = l; render(); },
      wipe: function () { wipe(); render(); },
      cpgUnverified: CPG.unverified,
      schemaSize: SCHEMA.reduce(function (n, s) { return n + s.fields.length; }, 0)
    };
  }

  return { init: init };
})();

document.addEventListener('DOMContentLoaded', App.init);
</script>
