/**
 * Behaviour gates for the pre-consultation page.
 *
 * These are the properties that cannot be checked by reading the
 * source, and that would each fail silently in a clinic:
 *
 *   - the page boots with no console error on a phone-sized screen,
 *     and nothing overflows it sideways;
 *   - an IC number yields the right date of birth, age and sex,
 *     including the century rollover;
 *   - the hypoglycaemia section appears for a patient on insulin
 *     and stays hidden for one on metformin alone -- the single
 *     most important conditional in the form;
 *   - a red-flag answer puts the banner on the screen, and the
 *     same flag reaches the doctor's note;
 *   - the nursing tab stays shut without the counter code;
 *   - the counter's blood pressure is measured against the CPG
 *     target, and BMI against the Asian cut-offs;
 *   - answers survive a reload;
 *   - the summary contains every section a doctor is promised, and
 *     masks the IC number on screen while leaving it whole in the
 *     downloaded file;
 *   - the quiz marks a known-correct answer correct.
 *
 * Run: npm test   (builds first, then this)
 */
'use strict';

const path = require('path');
const { chromium } = require('playwright');
const { server, PORT } = require('./serve.js');

const BASE = 'http://localhost:' + PORT + '/index.html';
const SHOTS = path.join(__dirname, 'shots');

let pass = 0;
const fails = [];

function ok(name, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fails.push(name + (detail ? ' — ' + detail : '')); console.log('  ✗ ' + name + (detail ? ' — ' + detail : '')); }
}

(async () => {
  await new Promise(r => server.listen(PORT, r));

  const browser = await chromium.launch({ executablePath: process.env.DMPC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const errors = [];

  /* A patient's phone, not a laptop. 360x740 is the floor this has
     to work on, and the narrow-screen rules in styles.html exist
     for exactly this viewport. */
  const ctx = await browser.newContext({
    viewport: { width: 360, height: 740 },
    deviceScaleFactor: 2
  });
  const page = await ctx.newPage();

  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.DMPC, null, { timeout: 10000 });

  console.log('\n  BOOT');
  ok('page boots with no console error', errors.length === 0, errors.slice(0, 3).join(' | '));
  const meta = await page.evaluate(() => ({
    schemaSize: window.DMPC.schemaSize,
    unverified: window.DMPC.cpgUnverified,
    title: document.title,
    lang: document.documentElement.lang
  }));
  ok('all questions loaded', meta.schemaSize >= 100, 'got ' + meta.schemaSize);
  ok('Malay is the default language', meta.lang === 'ms', meta.lang);
  ok('the unverified-value count is exposed', typeof meta.unverified === 'number');

  /* ── Consent gate ─────────────────────────────────────────── */
  console.log('\n  CONSENT');
  ok('the form is behind a consent step',
     await page.locator('[data-consent]').count() === 1);
  ok('the consent text says the data stays on the device',
     /peranti ini sahaja/i.test(await page.locator('.card-consent').innerText()));
  await page.click('[data-consent]');
  await page.click('[data-start]');
  ok('the first section opens', await page.locator('.sec').count() === 1);

  /* ── No sideways overflow on a narrow phone ──────────────── */
  console.log('\n  LAYOUT');
  const overflow = await page.evaluate(() => {
    const d = document.documentElement;
    return { sw: d.scrollWidth, cw: d.clientWidth };
  });
  ok('nothing overflows a 360px screen sideways',
     overflow.sw <= overflow.cw + 1, overflow.sw + ' > ' + overflow.cw);

  const tap = await page.evaluate(() => {
    const small = [];
    document.querySelectorAll('button, .opt, input, select, textarea').forEach(el => {
      /* The radio and checkbox inputs behind the option cards are
         deliberately 1px and transparent: the card is the target,
         and it is measured here in its place. */
      const cs = getComputedStyle(el);
      if (+cs.opacity === 0 || cs.visibility === 'hidden') return;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.height < 40) {
        small.push((el.className || el.tagName) + ' ' + Math.round(r.height) + 'px');
      }
    });
    return small;
  });
  ok('every visible control is at least 40px tall', tap.length === 0, tap.slice(0, 4).join(', '));

  /* ── IC parsing ───────────────────────────────────────────── */
  console.log('\n  IC NUMBER');
  await page.fill('#fld-ic', '600101145503');
  await page.waitForTimeout(120);
  let st = await page.evaluate(() => window.DMPC.state());
  ok('date of birth derived from the IC', st.dob === '1960-01-01', st.dob);
  ok('sex derived from the IC (odd last digit = male)', st.sex === 'M', st.sex);
  ok('age derived from the IC', st.age === 66, String(st.age));
  const icNote = await page.locator('.q-good').first().innerText();
  ok('the derived details are shown back to the patient', /1960-01-01/.test(icNote), icNote);

  await page.fill('#fld-ic', '991332145503');
  await page.waitForTimeout(120);
  ok('an impossible date is rejected',
     await page.locator('.q-bad').count() === 1);
  await page.fill('#fld-ic', '750615146002');
  await page.waitForTimeout(120);
  st = await page.evaluate(() => window.DMPC.state());
  ok('even last digit = female', st.sex === 'F', st.sex);

  /* ── The conditional that matters most ───────────────────── */
  console.log('\n  CONDITIONAL SECTIONS');
  await page.evaluate(() => window.DMPC.set('drugs', ['metformin']));
  let secs = await page.evaluate(() => window.DMPC.sections());
  ok('the hypoglycaemia section is hidden on metformin alone',
     secs.indexOf('hypo') < 0, secs.join(','));
  await page.evaluate(() => window.DMPC.set('drugs', ['metformin', 'insulin']));
  secs = await page.evaluate(() => window.DMPC.sections());
  ok('the hypoglycaemia section opens on insulin', secs.indexOf('hypo') >= 0);
  await page.evaluate(() => window.DMPC.set('drugs', ['su']));
  secs = await page.evaluate(() => window.DMPC.sections());
  ok('it opens on a sulphonylurea too', secs.indexOf('hypo') >= 0);
  await page.evaluate(() => window.DMPC.set('drugs', ['dk']));
  secs = await page.evaluate(() => window.DMPC.sections());
  ok('and when the patient does not know what they take',
     secs.indexOf('hypo') >= 0);

  /* ── Red flags reach the screen and the note ─────────────── */
  console.log('\n  RED FLAGS');
  await page.evaluate(() => {
    window.DMPC.set('chest', 'rest');
    window.DMPC.set('footNow', ['ulcer']);
  });
  await page.waitForTimeout(150);
  ok('the red banner appears', await page.locator('.alert').count() === 1);
  const alertTxt = await page.locator('.alert').innerText();
  ok('the banner tells the patient to speak to staff now',
     /kakitangan kaunter/i.test(alertTxt));
  ok('the banner carries the emergency number', /999/.test(alertTxt));
  const flags = await page.evaluate(() => window.DMPC.flags());
  ok('chest pain at rest is a red flag',
     flags.some(f => f.lvl === 'red' && /chest pain/i.test(f.en)));
  ok('an active foot wound is a red flag',
     flags.some(f => f.lvl === 'red' && /foot/i.test(f.en)));
  await page.click('[data-ack]');
  ok('the patient can acknowledge the banner',
     await page.locator('.alert').count() === 0);

  /* ── Weight, against the Asian cut-offs ──────────────────── */
  console.log('\n  ANTHROPOMETRY');
  await page.evaluate(() => { window.DMPC.set('wt', '92.5'); window.DMPC.set('ht', '165'); });
  const bmiBand = await page.evaluate(() => {
    const g = window.DMPC.gaps();
    return g.map(x => x.text).join(' || ');
  });
  ok('BMI 34.0 is called obesity on the Asian cut-offs',
     /BMI 34(\.0)?.*Obesity Class I|Obesiti Kelas I/.test(bmiBand), bmiBand.slice(0, 160));
  ok('the 5% and 10% weight targets are given in kilograms',
     /4\.6 kg/.test(bmiBand) && /9\.3 kg/.test(bmiBand), bmiBand.slice(0, 220));

  /* ── Typing must not be interrupted ──────────────────────
     Regression: the page used to re-render on every keystroke,
     which blurred the field being typed into. A patient entering
     a weight lost the caret after the first character, and a nurse
     tabbing between the two blood-pressure boxes lost the second
     number entirely because the box they tabbed into had already
     been replaced. Both are asserted here. */
  console.log('\n  TYPING');
  await page.evaluate(() => window.DMPC.gotoSection(
    window.DMPC.sections().indexOf('weight')));
  await page.waitForTimeout(150);
  await page.fill('#fld-wt', '');
  await page.click('#fld-wt');
  await page.type('#fld-wt', '92.5', { delay: 25 });
  const focusedId = await page.evaluate(() => document.activeElement && document.activeElement.id);
  ok('focus stays in the field while typing', focusedId === 'fld-wt', String(focusedId));
  ok('every character typed is kept',
     await page.inputValue('#fld-wt') === '92.5', await page.inputValue('#fld-wt'));
  await page.fill('#fld-ht', '');
  await page.click('#fld-ht');
  await page.type('#fld-ht', '165', { delay: 25 });
  await page.waitForTimeout(200);
  const bmiBox = await page.locator('.calc').first().innerText();
  ok('BMI recomputes without a full re-render', /34/.test(bmiBox), bmiBox.replace(/\n/g, ' '));

  /* ── Home glucose log and chart ──────────────────────────── */
  console.log('\n  HOME GLUCOSE');
  await page.evaluate(() => {
    window.DMPC.set('hasMeter', 'yes');
    window.DMPC.set('gluLog', [
      { d: '2026-10-01', v: 2.7, ctx: 'fasting' },
      { d: '2026-10-02', v: 6.1, ctx: 'fasting' },
      { d: '2026-10-03', v: 14.2, ctx: 'post2h' },
      { d: '2026-10-04', v: 3.6, ctx: 'night' }
    ]);
  });
  await page.evaluate(() => window.DMPC.gotoSection(
    window.DMPC.sections().indexOf('smbg')));
  await page.waitForTimeout(150);
  ok('the glucose chart is drawn as inline SVG',
     await page.locator('svg.chart').count() >= 1);
  ok('the CPG target band is shaded on the chart',
     await page.locator('svg.chart .c-band').count() === 1);
  ok('readings below 3.0 are marked as such',
     await page.locator('svg.chart .d-low2').count() === 1);
  const stats = await page.locator('.stats').innerText();
  ok('the percentage within the CPG band is computed',
     /25%/.test(stats), stats.replace(/\n/g, ' ').slice(0, 140));
  const gGaps = await page.evaluate(() => window.DMPC.gaps().map(g => g.text).join(' || '));
  ok('low home readings become a care gap',
     /below 3\.9|bawah 3\.9/i.test(gGaps) || /2 of 4|2 daripada 4/.test(gGaps),
     gGaps.slice(0, 200));

  /* ── Nursing tab ─────────────────────────────────────────── */
  console.log('\n  NURSING STATION');
  await page.evaluate(() => window.DMPC.go('nurse'));
  await page.waitForTimeout(120);
  ok('the nursing tab is gated', await page.locator('.card-gate').count() === 1);
  ok('the gate admits that it is not security',
     /bukan kawalan keselamatan/i.test(await page.locator('.card-gate').innerText()));
  await page.fill('#gateCode', 'wrong-code');
  await page.click('[data-gate]');
  await page.waitForTimeout(100);
  ok('a wrong code is refused', await page.locator('#gateBad:visible').count() === 1);
  await page.fill('#gateCode', 'jururawat');
  await page.click('[data-gate]');
  await page.waitForTimeout(150);
  ok('the correct code opens the tab', await page.locator('[data-n="sys1"]').count() === 1);

  await page.fill('[data-n="sys1"]', '168');
  await page.fill('[data-n="dia1"]', '96');
  await page.fill('[data-n="sys2"]', '172');
  await page.fill('[data-n="dia2"]', '98');
  await page.waitForTimeout(200);
  const calc = (await page.locator('.calc').allInnerTexts()).join(' | ');
  ok('the mean of the two blood pressures is shown', /170\/97/.test(calc), calc.slice(0, 160));
  ok('the mean is judged against the CPG target', /135\/75/.test(calc), calc.slice(0, 200));

  await page.fill('[data-n="rbg"]', '21.4');
  await page.waitForTimeout(200);
  const nflags = await page.evaluate(() => window.DMPC.flags());
  ok('a counter glucose above 20 raises a red flag',
     nflags.some(f => f.lvl === 'red' && /capillary glucose/i.test(f.en)));
  ok('a blood pressure of 170/97 does not reach the escalation threshold',
     !nflags.some(f => /at or above 180/.test(f.en)));
  await page.fill('[data-n="sys2"]', '186');
  await page.waitForTimeout(200);
  ok('a systolic of 186 does raise one',
     (await page.evaluate(() => window.DMPC.flags()))
       .some(f => f.lvl === 'red' && /180\/110/.test(f.en)));

  ok('the registration-counter QR code is rendered',
     await page.locator('.card-qr .qr svg').count() === 1);

  /* ── Quiz ────────────────────────────────────────────────── */
  console.log('\n  QUIZ');
  await page.evaluate(() => window.DMPC.go('quiz'));
  await page.click('[data-quiz="start"]');
  await page.waitForTimeout(120);
  ok('the first question is shown', await page.locator('.qz-q').count() === 1);
  /* Item 1 is the HbA1c question; option index 1 is correct. */
  await page.click('[data-pick="1"]');
  await page.waitForTimeout(120);
  ok('a correct answer is marked correct',
     await page.locator('.qz-why.is-ok').count() === 1);
  ok('the explanation cites one of the two guidelines',
     /CPG T2DM|CPG Obesity/.test(await page.locator('.qz-src').innerText()));
  await page.click('[data-quiz="next"]');
  await page.waitForTimeout(120);
  /* Item 2 is the hypoglycaemia question; index 0 is wrong. */
  await page.click('[data-pick="0"]');
  await page.waitForTimeout(120);
  ok('a wrong answer is marked wrong',
     await page.locator('.qz-why.is-no').count() === 1);
  ok('the right answer is still shown', await page.locator('.opt.qz-right').count() === 1);

  /* ── Summary ─────────────────────────────────────────────── */
  console.log('\n  SUMMARY');
  await page.evaluate(() => {
    window.DMPC.set('name', 'Pesakit Ujian');
    window.DMPC.set('ic', '600101145503');
    window.DMPC.set('oneThing', 'Kaki saya sakit waktu malam.');
    window.DMPC.go('summary');
  });
  await page.waitForTimeout(250);
  const onScreen = await page.locator('#noteBox').innerText();
  ok('the note is rendered on the summary tab', onScreen.length > 1500,
     String(onScreen.length));
  ok('the IC number is masked on screen', /600101-14-\*\*\*\*/.test(onScreen));
  ok('the full IC number is not on screen', !/600101145503/.test(onScreen));
  const forFile = await page.evaluate(() => window.DMPC.summary());
  ok('the downloadable copy carries the full IC number',
     /600101145503/.test(forFile));
  for (const needle of ['PERKARA YANG TIDAK BOLEH DITUNGGU', 'PENGENALAN',
                        'JURANG PENJAGAAN BERASASKAN CPG', 'CATATAN KAUNTER JURURAWAT',
                        'GAMBARAN GLISEMIK', 'DALAM KATA-KATA PESAKIT SENDIRI',
                        'ASAL SUMBER DAN BATASAN', 'TAMAT RINGKASAN']) {
    ok('the note contains "' + needle + '"', forFile.indexOf(needle) >= 0);
  }
  ok('the note states both guidelines in full',
     /Edisi ke-6/.test(forFile) && /Edisi ke-2/.test(forFile));
  ok('the note says it is not a medical device',
     /bukan peranti perubatan/i.test(forFile));
  ok('unanswered questions are marked, not left blank',
     /\(tidak dijawab\)/.test(forFile));
  ok('the patient’s own words are quoted',
     /Kaki saya sakit waktu malam/.test(forFile));
  ok('the copy, download and print controls are present',
     await page.locator('[data-sum="copy"]').count() === 1 &&
     await page.locator('[data-sum="txt"]').count() === 1 &&
     await page.locator('[data-sum="pdf"]').count() === 1);
  ok('the unverified-value notice is shown while any remain',
     meta.unverified === 0 || await page.locator('.warnbox.is-hard').count() === 1);

  /* ── Language ────────────────────────────────────────────── */
  console.log('\n  LANGUAGE');
  await page.click('#langBtn');
  await page.waitForTimeout(200);
  ok('the page switches to English',
     await page.evaluate(() => document.documentElement.lang) === 'en');
  const enNote = await page.evaluate(() => window.DMPC.summary());
  ok('the note switches to English', /IDENTIFICATION/.test(enNote));
  ok('no Malay heading is left in the English note', !/PENGENALAN/.test(enNote));
  await page.click('#langBtn');
  await page.waitForTimeout(150);

  /* ── Persistence ─────────────────────────────────────────── */
  console.log('\n  PERSISTENCE');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.DMPC, null, { timeout: 10000 });
  const after = await page.evaluate(() => window.DMPC.state());
  ok('answers survive a reload', after.name === 'Pesakit Ujian', JSON.stringify(after.name));
  ok('the glucose log survives a reload', (after.gluLog || []).length === 4);
  const nAfter = await page.evaluate(() => window.DMPC.nurse());
  ok('counter observations survive a reload', String(nAfter.rbg) === '21.4');

  /* ── Erase ───────────────────────────────────────────────── */
  console.log('\n  ERASE');
  page.on('dialog', d => d.accept());
  await page.click('#clearBtn');
  await page.waitForTimeout(250);
  const wiped = await page.evaluate(() => window.DMPC.state());
  ok('erase removes every answer', Object.keys(wiped).length === 0,
     JSON.stringify(Object.keys(wiped)).slice(0, 120));
  const lsAfter = await page.evaluate(() => {
    try { return localStorage.getItem('dmpc.v1.patient'); } catch (e) { return 'threw'; }
  });
  ok('erase clears the browser store too', lsAfter === null, String(lsAfter));

  /* ── Screenshots, for the eye ────────────────────────────── */
  require('fs').mkdirSync(SHOTS, { recursive: true });
  await page.evaluate(() => { window.DMPC.go('patient'); });
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(SHOTS, 'phone-start.png'), fullPage: true });
  await page.evaluate(() => window.DMPC.go('guide'));
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(SHOTS, 'phone-guide.png'), fullPage: true });

  const wide = await ctx.newPage();
  await wide.setViewportSize({ width: 1280, height: 900 });
  await wide.goto(BASE, { waitUntil: 'domcontentloaded' });
  await wide.waitForFunction(() => !!window.DMPC, null, { timeout: 10000 });
  await wide.evaluate(() => { window.DMPC.unlock(); window.DMPC.go('nurse'); });
  await wide.waitForTimeout(200);
  await wide.screenshot({ path: path.join(SHOTS, 'desktop-nurse.png'), fullPage: true });

  ok('no console error accumulated across the whole run',
     errors.length === 0, errors.slice(0, 3).join(' | '));

  await browser.close();
  server.close();

  console.log('\n  ' + pass + ' passed, ' + fails.length + ' failed');
  if (fails.length) {
    console.log('\n  FAILURES');
    fails.forEach(f => console.log('   • ' + f));
    console.log('');
    process.exit(1);
  }
  console.log('  screenshots in tests/shots/\n');
})().catch(e => {
  console.error('\n  TEST HARNESS ERROR: ' + (e && e.stack || e) + '\n');
  try { server.close(); } catch (_) {}
  process.exit(1);
});
