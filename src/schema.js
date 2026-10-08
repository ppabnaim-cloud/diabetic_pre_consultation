<script>
/* ============================================================
   PRA-KONSULTASI DIABETIK — QUESTION SCHEMA

   The questionnaire is data, not markup. Every question is one
   object here, carrying its own wording in both languages, its
   options, the condition under which it is asked, and the rule
   that decides whether an answer should raise a flag. app.js
   renders this; summary.js reads it. Adding a question means
   adding one object and nothing else.

   FIELD SHAPE
     id     unique key; also the storage key and the summary key
     type   render and validation behaviour (see app.js renderers)
     q      the question, L(ms, en)
     hint   small print under the question
     opts   [{ v, l }] for radio / checks / select
     unit   printed after a number box
     min    numeric floor, used for validation only
     max    numeric ceiling
     when   fn(S) -> show this question for this patient
     flag   fn(value, S) -> { lvl:'red'|'amber', ms, en } or null
     sum    how the summary labels it; defaults to `q`
     key    a question the summary really wants an answer to; the
            form nudges once but never blocks, because the consent
            text promises that every question may be skipped and a
            form that breaks that promise is worse than a blank

   CLINICAL DESIGN NOTES
     - Red flags are deliberately over-inclusive. The cost of a
       false alarm here is a nurse spending a minute; the cost of
       a miss is a patient sitting in a waiting room with an acute
       coronary syndrome. Every red flag is phrased as "tell the
       staff", never as a diagnosis.
     - Drugs are asked by the names patients actually recognise,
       brand and generic together. Asking a patient which drug
       class they are on produces fiction. The hypoglycaemia
       section opens on insulin or a sulphonylurea, and also when
       the patient does not know what they take, because not
       knowing is not a reason to skip the hypo questions.
     - Screening intervals are asked as bands, not dates. A date
       a patient half-remembers is worse data than a band they
       are confident about.
     - Nothing here asks the patient to interpret anything. Every
       question is about what they did, felt, or were told.
   ============================================================ */

function opt(v, ms, en) { return { v: v, l: L(ms, en) }; }

var YN  = [opt('yes', 'Ya', 'Yes'), opt('no', 'Tidak', 'No')];
var YNU = [opt('yes', 'Ya', 'Yes'), opt('no', 'Tidak', 'No'),
           opt('dk', 'Tidak pasti', 'Not sure')];

/* How recently something was done. Shared by all five screening
   questions so the bands cannot drift apart between them. */
var RECENCY = [
  opt('lt6',   'Dalam 6 bulan lepas', 'Within the last 6 months'),
  opt('6to12', '6 hingga 12 bulan lepas', '6 to 12 months ago'),
  opt('1to2',  'Lebih setahun, kurang dua tahun', 'More than a year, less than two'),
  opt('gt2',   'Lebih dua tahun lepas', 'More than two years ago'),
  opt('never', 'Belum pernah', 'Never'),
  opt('dk',    'Saya tidak ingat', 'I do not remember')
];

/* How often, for dietary frequency questions. */
var FREQ = [
  opt('never', 'Tidak pernah', 'Never'),
  opt('rare',  'Sekali-sekala', 'Now and then'),
  opt('wk1',   '1 hingga 2 kali seminggu', '1 to 2 times a week'),
  opt('wk3',   '3 hingga 5 kali seminggu', '3 to 5 times a week'),
  opt('daily', 'Setiap hari', 'Every day'),
  opt('dailyPlus', 'Lebih sekali sehari', 'More than once a day')
];

/* Patient is on insulin, on a sulphonylurea, or does not know what
   they take. Any of the three opens the hypoglycaemia section. */
function onHypoRisk(S) {
  var d = S.drugs || [];
  return d.indexOf('insulin') >= 0 || d.indexOf('su') >= 0 ||
         d.indexOf('dk') >= 0 || S.inject === 'yes';
}
function onInsulin(S) { return (S.drugs || []).indexOf('insulin') >= 0 || S.inject === 'yes'; }

function isFemale(S) { return S.sex === 'F'; }

var SCHEMA = [

  /* ══ A. About you ═══════════════════════════════════════════ */
  {
    id: 'about',
    icon: '🪪',
    title: L('Tentang anda', 'About you'),
    lead: L('Supaya ringkasan ini sampai ke fail yang betul.',
            'So that this summary reaches the right file.'),
    fields: [
      { id: 'name', type: 'text', key: true,
        q: L('Nama penuh, seperti dalam kad pengenalan', 'Full name, as on your IC'),
        sum: L('Nama', 'Name') },

      { id: 'ic', type: 'ic', key: true,
        q: L('Nombor kad pengenalan', 'IC number'),
        hint: L('Tarikh lahir, umur dan jantina diambil daripada nombor ini, jadi anda tidak perlu menaipnya.',
                'Date of birth, age and sex are taken from this number, so you need not type them.'),
        sum: L('No. KP', 'IC number') },

      { id: 'mrn', type: 'text',
        q: L('Nombor rekod perubatan (RN), jika anda tahu', 'Medical record number (RN), if you know it'),
        hint: L('Tertulis pada kad klinik anda.', 'It is printed on your clinic card.'),
        sum: L('No. RN', 'RN') },

      { id: 'phone', type: 'tel',
        q: L('Nombor telefon', 'Telephone number'),
        sum: L('Telefon', 'Telephone') },

      { id: 'race', type: 'select',
        q: L('Bangsa', 'Race'),
        opts: [
          opt('melayu', 'Melayu', 'Malay'),
          opt('cina', 'Cina', 'Chinese'),
          opt('india', 'India', 'Indian'),
          opt('bumiSbh', 'Bumiputera Sabah', 'Bumiputera Sabah'),
          opt('bumiSwk', 'Bumiputera Sarawak', 'Bumiputera Sarawak'),
          opt('orangAsli', 'Orang Asli', 'Orang Asli'),
          opt('lain', 'Lain-lain', 'Other')
        ],
        sum: L('Bangsa', 'Race') },

      { id: 'raceOther', type: 'text', when: function (S) { return S.race === 'lain'; },
        q: L('Sila nyatakan bangsa', 'Please state your race'), sum: L('Bangsa (lain)', 'Race (other)') },

      { id: 'religion', type: 'select',
        q: L('Agama', 'Religion'),
        hint: L('Ditanya kerana ia mempengaruhi nasihat berpuasa dan pilihan makanan.',
                'Asked because it affects advice about fasting and food choices.'),
        opts: [
          opt('islam', 'Islam', 'Islam'),
          opt('buddha', 'Buddha', 'Buddhism'),
          opt('kristian', 'Kristian', 'Christianity'),
          opt('hindu', 'Hindu', 'Hinduism'),
          opt('sikh', 'Sikh', 'Sikhism'),
          opt('lain', 'Lain-lain', 'Other'),
          opt('none', 'Tiada', 'None')
        ],
        sum: L('Agama', 'Religion') },

      { id: 'lang', type: 'select',
        q: L('Bahasa yang paling anda selesa', 'The language you are most comfortable in'),
        opts: [
          opt('ms', 'Bahasa Malaysia', 'Malay'),
          opt('en', 'English', 'English'),
          opt('zh', 'Cina', 'Chinese'),
          opt('ta', 'Tamil', 'Tamil'),
          opt('lain', 'Lain-lain', 'Other')
        ],
        sum: L('Bahasa pilihan', 'Preferred language') },

      { id: 'marital', type: 'select',
        q: L('Status perkahwinan', 'Marital status'),
        opts: [
          opt('single', 'Bujang', 'Single'),
          opt('married', 'Berkahwin', 'Married'),
          opt('widow', 'Balu / kematian pasangan', 'Widowed'),
          opt('div', 'Bercerai / berpisah', 'Divorced or separated')
        ],
        sum: L('Status perkahwinan', 'Marital status') },

      { id: 'livesWith', type: 'select',
        q: L('Anda tinggal dengan siapa?', 'Who do you live with?'),
        hint: L('Penting jika gula anda pernah jatuh terlalu rendah.',
                'This matters if your sugar has ever dropped too low.'),
        opts: [
          opt('alone', 'Saya tinggal sendiri', 'I live alone'),
          opt('spouse', 'Pasangan', 'My spouse'),
          opt('family', 'Anak atau keluarga', 'Children or family'),
          opt('carer', 'Penjaga berbayar', 'A paid carer'),
          opt('inst', 'Rumah penjagaan', 'A care home')
        ],
        sum: L('Tinggal dengan', 'Lives with') },

      { id: 'work', type: 'select',
        q: L('Pekerjaan sekarang', 'Present occupation'),
        opts: [
          opt('employed', 'Bekerja', 'Employed'),
          opt('self', 'Bekerja sendiri', 'Self-employed'),
          opt('shift', 'Bekerja syif atau malam', 'Shift or night work'),
          opt('unemployed', 'Tidak bekerja', 'Not working'),
          opt('retired', 'Pencen', 'Retired'),
          opt('home', 'Menjaga rumah', 'Looking after the home'),
          opt('student', 'Pelajar', 'Student')
        ],
        hint: L('Kerja syif ditanya kerana ia mengubah waktu makan dan waktu ubat.',
                'Shift work is asked because it changes meal times and medicine times.'),
        sum: L('Pekerjaan', 'Occupation') },

      { id: 'educ', type: 'select',
        q: L('Pendidikan tertinggi', 'Highest education'),
        hint: L('Ditanya supaya penerangan diberi pada tahap yang sesuai, bukan untuk menilai sesiapa.',
                'Asked so that explanations are pitched correctly, not to judge anyone.'),
        opts: [
          opt('none', 'Tiada persekolahan formal', 'No formal schooling'),
          opt('primary', 'Sekolah rendah', 'Primary school'),
          opt('secondary', 'Sekolah menengah', 'Secondary school'),
          opt('tertiary', 'Kolej atau universiti', 'College or university')
        ],
        sum: L('Pendidikan', 'Education') },

      { id: 'filledBy', type: 'radio',
        q: L('Siapa yang mengisi borang ini?', 'Who is filling in this form?'),
        opts: [
          opt('self', 'Pesakit sendiri', 'The patient'),
          opt('family', 'Keluarga atau penjaga', 'Family or carer'),
          opt('staff', 'Kakitangan klinik membantu', 'Clinic staff helping')
        ],
        sum: L('Diisi oleh', 'Completed by') }
    ]
  },

  /* ══ B. Your diabetes ═══════════════════════════════════════ */
  {
    id: 'dm',
    icon: '🩸',
    title: L('Kencing manis anda', 'Your diabetes'),
    lead: L('Sejarah dan ubat-ubatan.', 'The history and the medicines.'),
    fields: [
      { id: 'dxYear', type: 'num', min: 1930, max: 2100,
        q: L('Tahun anda mula diberitahu ada kencing manis', 'The year you were first told you had diabetes'),
        hint: L('Anggaran sudah cukup.', 'An approximation is fine.'),
        sum: L('Tahun diagnosis', 'Year of diagnosis') },

      { id: 'dmType', type: 'radio',
        q: L('Jenis kencing manis yang diberitahu kepada anda', 'The type of diabetes you were told you have'),
        opts: [
          opt('t2', 'Jenis 2', 'Type 2'),
          opt('t1', 'Jenis 1', 'Type 1'),
          opt('gdm', 'Semasa mengandung', 'In pregnancy'),
          opt('dk', 'Tidak diberitahu', 'I was not told')
        ],
        sum: L('Jenis', 'Type') },

      { id: 'tabs', type: 'radio',
        q: L('Adakah anda makan pil atau ubat untuk kencing manis?', 'Do you take tablets or medicine for diabetes?'),
        opts: YN, sum: L('Ubat makan', 'Oral medicine') },

      { id: 'inject', type: 'radio',
        q: L('Adakah anda mengambil suntikan untuk kencing manis?', 'Do you take injections for diabetes?'),
        opts: YN, sum: L('Suntikan', 'Injection') },

      { id: 'drugs', type: 'checks',
        q: L('Ubat kencing manis yang anda ambil', 'The diabetes medicines you take'),
        hint: L('Nama jenama dan nama generik disenaraikan bersama. Jika anda bawa ubat, tunjukkan kepada jururawat dan pilih pilihan terakhir.',
                'Brand and generic names are listed together. If you brought your medicines, show them to the nurse and choose the last option.'),
        opts: [
          opt('metformin', 'Metformin · Glucophage', 'Metformin · Glucophage'),
          opt('su', 'Gliclazide · Diamicron · Glibenclamide · Daonil', 'Gliclazide · Diamicron · Glibenclamide · Daonil'),
          opt('dpp4', 'Sitagliptin · Januvia · Linagliptin · Trajenta', 'Sitagliptin · Januvia · Linagliptin · Trajenta'),
          opt('sglt2', 'Empagliflozin · Jardiance · Dapagliflozin · Forxiga', 'Empagliflozin · Jardiance · Dapagliflozin · Forxiga'),
          opt('tzd', 'Pioglitazone · Actos', 'Pioglitazone · Actos'),
          opt('agi', 'Acarbose · Glucobay', 'Acarbose · Glucobay'),
          opt('glp1', 'Suntikan Trulicity · Ozempic · Victoza', 'Trulicity · Ozempic · Victoza injection'),
          opt('insulin', 'Insulin — Actrapid · Mixtard · Novomix · Lantus · Levemir · Tresiba', 'Insulin — Actrapid · Mixtard · Novomix · Lantus · Levemir · Tresiba'),
          opt('dk', 'Saya tidak tahu namanya — saya bawa ubat saya', 'I do not know the names — I brought my medicines')
        ],
        sum: L('Ubat kencing manis', 'Diabetes medicines') },

      { id: 'otherMeds', type: 'checks',
        q: L('Ubat lain yang anda ambil', 'Other medicines you take'),
        opts: [
          opt('bp', 'Ubat darah tinggi', 'Blood pressure medicine'),
          opt('statin', 'Ubat kolesterol · Simvastatin · Atorvastatin', 'Cholesterol medicine · Simvastatin · Atorvastatin'),
          opt('aspirin', 'Aspirin', 'Aspirin'),
          opt('warfarin', 'Warfarin atau pencair darah lain', 'Warfarin or another blood thinner'),
          opt('trad', 'Ubat tradisional, herba atau suplemen', 'Traditional medicine, herbs or supplements'),
          opt('none', 'Tiada yang lain', 'None of these')
        ],
        sum: L('Ubat lain', 'Other medicines') },

      { id: 'adherence', type: 'radio',
        q: L('Dalam dua minggu lepas, berapa kali anda terlupa atau terlepas ubat kencing manis?',
             'In the last two weeks, how often did you forget or miss your diabetes medicine?'),
        hint: L('Jawapan jujur lebih berguna daripada jawapan yang sempurna. Ini bukan untuk memarahi sesiapa.',
                'An honest answer is more useful than a perfect one. This is not to scold anyone.'),
        opts: [
          opt('none', 'Tidak pernah terlepas', 'Never missed'),
          opt('few', '1 hingga 3 kali', '1 to 3 times'),
          opt('many', 'Lebih 3 kali', 'More than 3 times'),
          opt('stopped', 'Saya berhenti mengambilnya', 'I stopped taking it')
        ],
        flag: function (v) {
          if (v === 'stopped') return { lvl: 'amber',
            ms: 'Pesakit telah berhenti mengambil ubat kencing manis.',
            en: 'Patient has stopped taking diabetes medicine.' };
          return null;
        },
        sum: L('Kepatuhan ubat', 'Medication adherence') },

      { id: 'adherenceWhy', type: 'checks',
        when: function (S) { return S.adherence === 'few' || S.adherence === 'many' || S.adherence === 'stopped'; },
        q: L('Apa yang menyukarkan?', 'What made it difficult?'),
        opts: [
          opt('forget', 'Terlupa', 'I forget'),
          opt('side', 'Kesan sampingan', 'Side effects'),
          opt('many', 'Terlalu banyak pil', 'Too many tablets'),
          opt('cost', 'Kos atau tiada stok', 'Cost, or it was out of stock'),
          opt('better', 'Saya rasa sudah sihat', 'I felt well already'),
          opt('fear', 'Saya bimbang tentang ubat itu', 'I am worried about the medicine'),
          opt('fast', 'Sukar ketika berpuasa', 'Hard while fasting'),
          opt('other', 'Sebab lain', 'Another reason')
        ],
        sum: L('Halangan ubat', 'Barriers to medicine') },

      { id: 'hba1cKnown', type: 'radio',
        q: L('Adakah anda tahu bacaan HbA1c terakhir anda?', 'Do you know your last HbA1c reading?'),
        hint: L('HbA1c ialah ujian darah yang menunjukkan purata gula tiga bulan.',
                'HbA1c is the blood test that shows your average sugar over three months.'),
        opts: YN, sum: L('Tahu HbA1c', 'Knows HbA1c') },

      { id: 'hba1c', type: 'num', unit: '%', min: 3, max: 20, step: '0.1',
        when: function (S) { return S.hba1cKnown === 'yes'; },
        q: L('Bacaan HbA1c terakhir', 'Last HbA1c reading'),
        sum: L('HbA1c terakhir (dilapor pesakit)', 'Last HbA1c (patient-reported)') },

      { id: 'hba1cWhen', type: 'month',
        when: function (S) { return S.hba1cKnown === 'yes'; },
        q: L('Bulan ujian itu dibuat', 'The month that test was done'),
        sum: L('Bulan HbA1c', 'HbA1c month') },

      { id: 'smoke', type: 'radio',
        q: L('Adakah anda merokok atau vape?', 'Do you smoke or vape?'),
        opts: [
          opt('never', 'Tidak pernah', 'Never'),
          opt('ex', 'Sudah berhenti', 'I have stopped'),
          opt('cig', 'Ya, rokok', 'Yes, cigarettes'),
          opt('vape', 'Ya, vape', 'Yes, vape'),
          opt('both', 'Ya, kedua-duanya', 'Yes, both')
        ],
        flag: function (v) {
          if (v === 'cig' || v === 'vape' || v === 'both') return { lvl: 'amber',
            ms: 'Masih merokok atau vape — nasihat berhenti merokok diperlukan.',
            en: 'Still smoking or vaping — cessation advice indicated.' };
          return null;
        },
        sum: L('Merokok', 'Smoking') },

      { id: 'smokeQuit', type: 'radio',
        when: function (S) { return ['cig', 'vape', 'both'].indexOf(S.smoke) >= 0; },
        q: L('Adakah anda ingin berhenti?', 'Would you like to stop?'),
        opts: [
          opt('now', 'Ya, saya mahu mula sekarang', 'Yes, I would like to start now'),
          opt('soon', 'Ya, tetapi belum sekarang', 'Yes, but not yet'),
          opt('no', 'Tidak', 'No')
        ],
        sum: L('Kesediaan berhenti merokok', 'Readiness to stop smoking') },

      { id: 'alcohol', type: 'radio',
        q: L('Adakah anda minum alkohol?', 'Do you drink alcohol?'),
        opts: [opt('no', 'Tidak', 'No'), opt('rare', 'Sekali-sekala', 'Now and then'),
               opt('weekly', 'Setiap minggu', 'Every week'), opt('daily', 'Setiap hari', 'Every day')],
        sum: L('Alkohol', 'Alcohol') },

      { id: 'family', type: 'checks',
        q: L('Dalam keluarga terdekat, siapa yang ada penyakit ini?', 'In your close family, who has these conditions?'),
        opts: [
          opt('dm', 'Kencing manis', 'Diabetes'),
          opt('cvd', 'Sakit jantung atau strok sebelum umur 60', 'Heart attack or stroke before age 60'),
          opt('renal', 'Buah pinggang gagal', 'Kidney failure'),
          opt('blind', 'Hilang penglihatan kerana kencing manis', 'Lost sight from diabetes'),
          opt('amp', 'Kaki dipotong kerana kencing manis', 'An amputation from diabetes'),
          opt('none', 'Tiada', 'None')
        ],
        sum: L('Sejarah keluarga', 'Family history') },

      { id: 'admissions', type: 'radio',
        q: L('Dalam setahun lepas, pernahkah anda dimasukkan ke hospital kerana kencing manis?',
             'In the last year, were you admitted to hospital because of diabetes?'),
        hint: L('Termasuk gula terlalu tinggi, gula terlalu rendah, atau luka kaki.',
                'This includes sugar being too high, sugar being too low, or a foot wound.'),
        opts: [opt('no', 'Tidak', 'No'), opt('once', 'Sekali', 'Once'),
               opt('more', 'Lebih sekali', 'More than once')],
        flag: function (v) {
          if (v === 'more') return { lvl: 'amber',
            ms: 'Lebih daripada satu kemasukan hospital berkaitan diabetes dalam setahun.',
            en: 'More than one diabetes-related admission in the past year.' };
          return null;
        },
        sum: L('Kemasukan hospital setahun lepas', 'Admissions in the last year') }
    ]
  },

  /* ══ C. How you feel now ════════════════════════════════════ */
  {
    id: 'sx',
    icon: '🌡️',
    title: L('Bagaimana keadaan anda sekarang', 'How you feel now'),
    lead: L('Gejala yang biasa datang apabila gula tinggi.',
            'The symptoms that commonly come when sugar is high.'),
    fields: [
      { id: 'osmotic', type: 'checks',
        q: L('Dalam empat minggu lepas, pernahkah anda rasa perkara ini?',
             'In the last four weeks, have you had any of these?'),
        opts: [
          opt('thirst', 'Dahaga yang tidak hilang', 'Thirst that does not go away'),
          opt('urine', 'Kerap kencing, terutama waktu malam', 'Passing urine often, especially at night'),
          opt('weight', 'Berat badan turun tanpa dirancang', 'Losing weight without trying'),
          opt('tired', 'Letih yang luar biasa', 'Unusual tiredness'),
          opt('blur', 'Penglihatan kabur datang dan pergi', 'Blurred vision that comes and goes'),
          opt('itch', 'Gatal atau jangkitan kulat berulang', 'Itching or repeated fungal infections'),
          opt('slowHeal', 'Luka lambat sembuh', 'Wounds healing slowly'),
          opt('none', 'Tiada satu pun', 'None of these')
        ],
        sum: L('Gejala gula tinggi', 'Osmotic symptoms') },

      { id: 'sick', type: 'checks',
        q: L('Hari ini, adakah anda rasa salah satu daripada ini?',
             'Today, do you have any of these?'),
        hint: L('Soalan ini penting. Jawab dengan teliti.', 'This question matters. Please answer it carefully.'),
        opts: [
          opt('vomit', 'Muntah berulang', 'Vomiting again and again'),
          opt('abdo', 'Sakit perut yang kuat', 'Bad stomach pain'),
          opt('drowsy', 'Sangat mengantuk atau sukar fokus', 'Very drowsy or hard to focus'),
          opt('breath', 'Sesak nafas ketika duduk diam', 'Breathless while sitting still'),
          opt('fever', 'Demam', 'Fever'),
          opt('none', 'Tiada satu pun', 'None of these')
        ],
        flag: function (v) {
          var a = v || [];
          var hit = ['vomit', 'abdo', 'drowsy', 'breath'].filter(function (k) { return a.indexOf(k) >= 0; });
          if (hit.length) return { lvl: 'red',
            ms: 'Gejala hari ini yang tidak boleh ditunggu: muntah, sakit perut, mengantuk atau sesak nafas. Perlu dinilai sekarang, bukan selepas menunggu.',
            en: 'Symptoms today that should not wait: vomiting, abdominal pain, drowsiness or breathlessness. Needs assessment now, not after a wait.' };
          return null;
        },
        sum: L('Gejala akut hari ini', 'Acute symptoms today') },

      { id: 'weightChange', type: 'radio',
        q: L('Berat badan anda dalam enam bulan lepas', 'Your weight over the last six months'),
        opts: [
          opt('up', 'Naik', 'Gone up'),
          opt('same', 'Lebih kurang sama', 'About the same'),
          opt('downTry', 'Turun, dan saya sengaja cuba', 'Gone down, and I was trying'),
          opt('downNo', 'Turun, tetapi saya tidak cuba', 'Gone down, but I was not trying')
        ],
        flag: function (v) {
          if (v === 'downNo') return { lvl: 'amber',
            ms: 'Berat badan turun tanpa dirancang — perlu dinilai.',
            en: 'Unintentional weight loss — warrants assessment.' };
          return null;
        },
        sum: L('Perubahan berat 6 bulan', 'Weight change over 6 months') }
    ]
  },

  /* ══ D. Heart, brain and circulation ════════════════════════ */
  {
    id: 'macro',
    icon: '❤️',
    title: L('Jantung, otak dan saluran darah', 'Heart, brain and blood vessels'),
    lead: L('Kencing manis memberi tekanan kepada saluran darah besar. Soalan ini mencari tanda awal.',
            'Diabetes puts strain on the large blood vessels. These questions look for early signs.'),
    fields: [
      { id: 'chest', type: 'radio',
        q: L('Adakah anda pernah rasa sakit, tekanan atau berat di dada?',
             'Have you had pain, pressure or heaviness in your chest?'),
        hint: L('Termasuk rasa seperti ditekan, dihimpit, atau sakit yang menjalar ke lengan, rahang atau belakang.',
                'This includes a squeezing or pressing feeling, or pain spreading to the arm, jaw or back.'),
        opts: [
          opt('no', 'Tidak pernah', 'Never'),
          opt('oldExert', 'Ya, bila berjalan atau bersenam — sudah lama begitu', 'Yes, when walking or exerting — it has been like that a long time'),
          opt('newExert', 'Ya, bila berjalan atau bersenam — baru atau makin kerap', 'Yes, when walking or exerting — new, or getting more frequent'),
          opt('rest', 'Ya, walaupun ketika duduk diam', 'Yes, even while sitting still'),
          opt('now', 'Ya, saya rasa sekarang', 'Yes, I have it right now')
        ],
        flag: function (v) {
          if (v === 'now' || v === 'rest') return { lvl: 'red',
            ms: 'Sakit dada ketika rehat atau ketika ini. Perlu dinilai sekarang.',
            en: 'Chest pain at rest or present now. Needs assessment now.' };
          if (v === 'newExert') return { lvl: 'red',
            ms: 'Sakit dada semasa aktiviti yang baru atau makin kerap. Perlu dinilai sebelum pesakit pulang.',
            en: 'New or increasing exertional chest pain. Needs assessment before the patient goes home.' };
          if (v === 'oldExert') return { lvl: 'amber',
            ms: 'Sakit dada stabil semasa aktiviti.', en: 'Stable exertional chest pain.' };
          return null;
        },
        sum: L('Sakit dada', 'Chest pain') },

      { id: 'breathless', type: 'radio',
        q: L('Adakah anda sesak nafas lebih mudah daripada dahulu?',
             'Do you become breathless more easily than before?'),
        opts: [
          opt('no', 'Tidak', 'No'),
          opt('hills', 'Hanya bila cepat atau mendaki', 'Only when hurrying or going uphill'),
          opt('flat', 'Bila berjalan biasa di atas rata', 'When walking normally on the flat'),
          opt('rest', 'Walaupun ketika duduk diam', 'Even while sitting still')
        ],
        flag: function (v) {
          if (v === 'rest') return { lvl: 'red',
            ms: 'Sesak nafas ketika rehat.', en: 'Breathless at rest.' };
          if (v === 'flat') return { lvl: 'amber',
            ms: 'Sesak nafas apabila berjalan di atas rata.', en: 'Breathless on walking on the flat.' };
          return null;
        },
        sum: L('Sesak nafas', 'Breathlessness') },

      { id: 'orthopnoea', type: 'checks',
        q: L('Ketika tidur, adakah perkara ini berlaku?', 'When you sleep, do any of these happen?'),
        opts: [
          opt('pillows', 'Saya perlu bantal tinggi atau duduk untuk bernafas', 'I need high pillows or to sit up to breathe'),
          opt('wake', 'Saya terjaga tiba-tiba kerana sesak nafas', 'I wake suddenly short of breath'),
          opt('swell', 'Kaki saya bengkak', 'My legs swell'),
          opt('palp', 'Jantung berdenyut kuat atau tidak sekata', 'My heart pounds or beats unevenly'),
          opt('none', 'Tiada satu pun', 'None of these')
        ],
        flag: function (v) {
          var a = v || [];
          if (a.indexOf('wake') >= 0 || a.indexOf('pillows') >= 0) return { lvl: 'red',
            ms: 'Sesak nafas ketika berbaring atau terjaga kerana sesak — tanda kegagalan jantung yang mungkin.',
            en: 'Orthopnoea or paroxysmal nocturnal dyspnoea — possible cardiac failure.' };
          if (a.indexOf('swell') >= 0 || a.indexOf('palp') >= 0) return { lvl: 'amber',
            ms: 'Kaki bengkak atau denyutan tidak sekata dilaporkan.',
            en: 'Leg swelling or irregular palpitations reported.' };
          return null;
        },
        sum: L('Gejala waktu malam', 'Nocturnal cardiac symptoms') },

      { id: 'stroke', type: 'checks',
        q: L('Pernahkah perkara ini berlaku secara mengejut, walaupun hanya beberapa minit?',
             'Have any of these happened suddenly, even for only a few minutes?'),
        opts: [
          opt('weak', 'Lemah atau kebas sebelah badan', 'Weakness or numbness on one side'),
          opt('speech', 'Pertuturan menjadi pelat atau sukar bercakap', 'Slurred speech or trouble speaking'),
          opt('face', 'Mulut atau muka terjuih sebelah', 'The mouth or face drooping on one side'),
          opt('vision1', 'Penglihatan hilang pada satu mata', 'Loss of sight in one eye'),
          opt('balance', 'Hilang imbangan secara mengejut', 'Sudden loss of balance'),
          opt('none', 'Tiada satu pun', 'None of these')
        ],
        flag: function (v) {
          var a = (v || []).filter(function (k) { return k !== 'none'; });
          if (a.length) return { lvl: 'red',
            ms: 'Gejala neurologi mengejut dilaporkan — kemungkinan TIA atau strok. Perlu dinilai sekarang.',
            en: 'Sudden neurological symptoms reported — possible TIA or stroke. Needs assessment now.' };
          return null;
        },
        sum: L('Gejala neurologi mengejut', 'Sudden neurological symptoms') },

      { id: 'claudication', type: 'radio',
        q: L('Adakah kaki anda sakit atau kejang bila berjalan, dan baik bila berhenti?',
             'Do your legs ache or cramp when you walk, and settle when you stop?'),
        opts: [
          opt('no', 'Tidak', 'No'),
          opt('far', 'Selepas jauh berjalan', 'After walking a long way'),
          opt('short', 'Selepas sedikit sahaja berjalan', 'After only a short walk'),
          opt('rest', 'Kaki saya sakit walaupun ketika rehat atau malam', 'My legs hurt even at rest or at night')
        ],
        flag: function (v) {
          if (v === 'rest') return { lvl: 'red',
            ms: 'Sakit kaki ketika rehat — kemungkinan iskemia kritikal anggota.',
            en: 'Rest pain in the legs — possible critical limb ischaemia.' };
          if (v === 'short') return { lvl: 'amber',
            ms: 'Klaudikasi jarak dekat.', en: 'Short-distance claudication.' };
          return null;
        },
        sum: L('Klaudikasi', 'Claudication') },

      { id: 'knownCvd', type: 'checks',
        q: L('Pernahkah doktor memberitahu anda mempunyai salah satu daripada ini?',
             'Has a doctor ever told you that you have any of these?'),
        opts: [
          opt('mi', 'Serangan jantung', 'A heart attack'),
          opt('angina', 'Angina', 'Angina'),
          opt('stent', 'Stent atau pembedahan pintasan jantung', 'A stent or heart bypass surgery'),
          opt('hf', 'Jantung lemah atau gagal jantung', 'A weak heart or heart failure'),
          opt('stroke', 'Strok', 'A stroke'),
          opt('af', 'Denyutan jantung tidak sekata', 'An irregular heartbeat'),
          opt('pvd', 'Saluran darah kaki tersumbat', 'Blocked blood vessels in the legs'),
          opt('none', 'Tiada', 'None')
        ],
        sum: L('Penyakit kardiovaskular diketahui', 'Known cardiovascular disease') }
    ]
  },

  /* ══ E. Eyes, kidneys, nerves and feet ══════════════════════ */
  {
    id: 'micro',
    icon: '👁️',
    title: L('Mata, buah pinggang, saraf dan kaki', 'Eyes, kidneys, nerves and feet'),
    lead: L('Bahagian halus badan yang kencing manis boleh rosakkan sebelum anda rasa apa-apa.',
            'The fine parts of the body that diabetes can damage before you feel anything.'),
    fields: [
      { id: 'eyeSx', type: 'checks',
        q: L('Penglihatan anda', 'Your eyesight'),
        opts: [
          opt('blurStable', 'Kabur, tetapi sudah lama begitu', 'Blurred, but it has been that way a while'),
          opt('blurNew', 'Makin kabur dalam beberapa bulan lepas', 'Getting more blurred over the last few months'),
          opt('sudden', 'Hilang penglihatan secara mengejut', 'Sudden loss of sight'),
          opt('floaters', 'Bintik hitam atau benang terapung yang baru', 'New black spots or floating threads'),
          opt('curtain', 'Seperti ada tirai menutup penglihatan', 'Like a curtain coming across my sight'),
          opt('pain', 'Sakit mata atau mata merah', 'Eye pain or a red eye'),
          opt('none', 'Tiada masalah', 'No problem')
        ],
        flag: function (v) {
          var a = v || [];
          if (a.indexOf('sudden') >= 0 || a.indexOf('curtain') >= 0) return { lvl: 'red',
            ms: 'Kehilangan penglihatan mengejut atau tirai penglihatan — rujukan mata segera.',
            en: 'Sudden visual loss or a curtain across vision — urgent ophthalmology referral.' };
          if (a.indexOf('floaters') >= 0) return { lvl: 'red',
            ms: 'Bintik terapung baharu — kemungkinan pendarahan vitreus. Perlu penilaian mata segera.',
            en: 'New floaters — possible vitreous haemorrhage. Needs prompt ophthalmic assessment.' };
          if (a.indexOf('blurNew') >= 0) return { lvl: 'amber',
            ms: 'Penglihatan makin kabur — saringan retina diperlukan.',
            en: 'Worsening blurred vision — retinal screening indicated.' };
          return null;
        },
        sum: L('Gejala mata', 'Eye symptoms') },

      { id: 'eyeScreen', type: 'radio',
        q: L('Bila kali terakhir mata anda diperiksa untuk kencing manis?',
             'When were your eyes last examined for diabetes?'),
        hint: L('Pemeriksaan di mana titisan dimasukkan dan gambar retina diambil, bukan hanya ujian cermin mata.',
                'The examination where drops are put in and a picture of the retina is taken, not just a spectacle test.'),
        opts: RECENCY, sum: L('Saringan mata terakhir', 'Last eye screening') },

      { id: 'renalSx', type: 'checks',
        q: L('Air kencing dan bengkak', 'Urine and swelling'),
        opts: [
          opt('frothy', 'Air kencing berbuih', 'Frothy urine'),
          opt('swell', 'Bengkak kaki atau muka', 'Swelling of the legs or face'),
          opt('less', 'Kencing jauh lebih sedikit', 'Passing much less urine'),
          opt('blood', 'Darah dalam air kencing', 'Blood in the urine'),
          opt('burn', 'Pedih atau sakit bila kencing', 'Burning or pain on passing urine'),
          opt('none', 'Tiada', 'None')
        ],
        flag: function (v) {
          var a = v || [];
          if (a.indexOf('less') >= 0 || a.indexOf('blood') >= 0) return { lvl: 'amber',
            ms: 'Pengurangan jumlah kencing atau hematuria dilaporkan.',
            en: 'Reduced urine output or haematuria reported.' };
          return null;
        },
        sum: L('Gejala buah pinggang', 'Renal symptoms') },

      { id: 'renalScreen', type: 'radio',
        q: L('Bila kali terakhir air kencing anda diuji untuk protein, atau darah diuji untuk fungsi buah pinggang?',
             'When was your urine last tested for protein, or your blood for kidney function?'),
        opts: RECENCY, sum: L('Saringan buah pinggang terakhir', 'Last renal screening') },

      { id: 'neuroSx', type: 'checks',
        q: L('Kaki dan tangan anda', 'Your feet and hands'),
        opts: [
          opt('numb', 'Kebas', 'Numbness'),
          opt('tingle', 'Rasa berpuntir atau seperti dicucuk peniti', 'Tingling or pins and needles'),
          opt('burn', 'Rasa terbakar, terutama waktu malam', 'Burning, especially at night'),
          opt('pain', 'Sakit yang mengganggu tidur', 'Pain that disturbs sleep'),
          opt('noFeel', 'Saya tidak dapat rasa lantai dengan baik', 'I cannot feel the floor properly'),
          opt('weak', 'Kaki terasa lemah atau tidak stabil', 'My legs feel weak or unsteady'),
          opt('none', 'Tiada', 'None')
        ],
        flag: function (v) {
          var a = v || [];
          if (a.indexOf('noFeel') >= 0 || a.indexOf('numb') >= 0) return { lvl: 'amber',
            ms: 'Kehilangan rasa pada kaki — kaki berisiko. Pemeriksaan kaki dan nasihat penjagaan kaki diperlukan.',
            en: 'Loss of sensation in the feet — foot at risk. Foot examination and foot-care advice indicated.' };
          return null;
        },
        sum: L('Gejala saraf', 'Neuropathic symptoms') },

      { id: 'autonomic', type: 'checks',
        q: L('Perkara lain yang kadangkala datang bersama kencing manis lama',
             'Other things that sometimes come with longstanding diabetes'),
        opts: [
          opt('dizzy', 'Pening bila bangun dari duduk atau baring', 'Dizziness on standing up'),
          opt('full', 'Cepat rasa kenyang atau loya selepas makan', 'Feeling full quickly, or nausea after eating'),
          opt('bowel', 'Cirit-birit atau sembelit berulang', 'Repeated diarrhoea or constipation'),
          opt('sweat', 'Berpeluh luar biasa atau tidak berpeluh sama sekali', 'Unusual sweating, or no sweating at all'),
          opt('bladder', 'Sukar mengosongkan pundi kencing', 'Difficulty emptying the bladder'),
          opt('none', 'Tiada', 'None')
        ],
        sum: L('Gejala autonomik', 'Autonomic symptoms') },

      { id: 'ed', type: 'radio',
        when: function (S) { return S.sex === 'M'; },
        q: L('Adakah anda menghadapi masalah ereksi?', 'Do you have difficulty with erections?'),
        hint: L('Ditanya kerana ia biasa dalam kencing manis, boleh dirawat, dan kadangkala tanda awal masalah saluran darah. Anda boleh melangkau soalan ini.',
                'Asked because it is common in diabetes, is treatable, and is sometimes an early sign of blood-vessel disease. You may skip this question.'),
        opts: [opt('no', 'Tidak', 'No'), opt('some', 'Kadang-kadang', 'Sometimes'),
               opt('yes', 'Ya, selalu', 'Yes, usually'), opt('skip', 'Saya tidak mahu jawab', 'I would rather not answer')],
        sum: L('Fungsi ereksi', 'Erectile function') },

      { id: 'footNow', type: 'checks',
        q: L('Kaki anda hari ini', 'Your feet today'),
        hint: L('Jika anda tidak pasti, tanggalkan kasut dan lihat tapak kaki, termasuk celah kuku dan celah jari.',
                'If you are not sure, take off your shoes and look at the soles, including around the nails and between the toes.'),
        opts: [
          opt('ulcer', 'Luka terbuka atau luka yang tidak sembuh', 'An open wound or a wound that will not heal'),
          opt('black', 'Bahagian hitam atau kebiruan', 'A black or bluish area'),
          opt('redHot', 'Merah, bengkak atau panas', 'Red, swollen or hot'),
          opt('smell', 'Ada bau atau nanah', 'A smell or discharge'),
          opt('callus', 'Kulit keras atau tebal', 'Hard or thick skin'),
          opt('crack', 'Kulit kering atau pecah', 'Dry or cracked skin'),
          opt('nail', 'Kuku tebal, kuning atau tumbuh ke dalam', 'Thick, yellow or ingrowing nails'),
          opt('shape', 'Bentuk kaki berubah', 'The shape of the foot has changed'),
          opt('none', 'Tiada satu pun', 'None of these')
        ],
        flag: function (v) {
          var a = v || [];
          var urgent = ['ulcer', 'black', 'redHot', 'smell'].filter(function (k) { return a.indexOf(k) >= 0; });
          if (urgent.length) return { lvl: 'red',
            ms: 'Kaki diabetik aktif — luka, kawasan hitam, radang atau nanah. Perlu dilihat hari ini, bukan ditemujanji semula.',
            en: 'Active diabetic foot — wound, black area, inflammation or discharge. Needs to be seen today, not rebooked.' };
          if (a.indexOf('shape') >= 0) return { lvl: 'amber',
            ms: 'Perubahan bentuk kaki dilaporkan.', en: 'Change in foot shape reported.' };
          return null;
        },
        sum: L('Keadaan kaki hari ini', 'Foot findings today') },

      { id: 'footCare', type: 'checks',
        q: L('Penjagaan kaki anda', 'How you look after your feet'),
        opts: [
          opt('look', 'Saya melihat kaki saya setiap hari', 'I look at my feet every day'),
          opt('shoes', 'Saya memakai kasut tertutup di luar rumah', 'I wear closed shoes outside the house'),
          opt('barefoot', 'Saya selalu berkaki ayam', 'I often go barefoot'),
          opt('hotWater', 'Saya mencelup kaki dalam air panas', 'I soak my feet in hot water'),
          opt('selfCut', 'Saya memotong kulit keras sendiri', 'I cut away hard skin myself'),
          opt('noReach', 'Saya tidak dapat melihat atau mencapai kaki saya', 'I cannot see or reach my feet')
        ],
        flag: function (v) {
          var a = v || [];
          var risky = ['barefoot', 'hotWater', 'selfCut', 'noReach'].filter(function (k) { return a.indexOf(k) >= 0; });
          if (risky.length) return { lvl: 'amber',
            ms: 'Amalan penjagaan kaki berisiko — pendidikan kaki diperlukan.',
            en: 'Risky foot-care practice — foot-care education indicated.' };
          return null;
        },
        sum: L('Amalan penjagaan kaki', 'Foot-care practice') },

      { id: 'footScreen', type: 'radio',
        q: L('Bila kali terakhir seseorang memeriksa kaki anda di klinik?',
             'When did someone last examine your feet at a clinic?'),
        opts: RECENCY, sum: L('Pemeriksaan kaki terakhir', 'Last foot examination') },

      { id: 'amputation', type: 'radio',
        q: L('Pernahkah mana-mana bahagian kaki anda dipotong?', 'Have you ever had any part of a foot or leg removed?'),
        opts: YN, sum: L('Sejarah amputasi', 'Previous amputation') },

      { id: 'lipidScreen', type: 'radio',
        q: L('Bila kali terakhir kolesterol anda diuji?', 'When was your cholesterol last tested?'),
        opts: RECENCY, sum: L('Profil lipid terakhir', 'Last lipid profile') },

      { id: 'dentalScreen', type: 'radio',
        q: L('Bila kali terakhir anda ke klinik pergigian?', 'When did you last visit a dental clinic?'),
        opts: RECENCY, sum: L('Pemeriksaan pergigian terakhir', 'Last dental examination') },

      { id: 'dentalSx', type: 'checks',
        q: L('Gusi dan gigi anda', 'Your gums and teeth'),
        opts: [
          opt('bleed', 'Gusi berdarah bila memberus', 'Gums bleed when I brush'),
          opt('loose', 'Gigi longgar', 'Loose teeth'),
          opt('pain', 'Sakit gigi', 'Toothache'),
          opt('none', 'Tiada', 'None')
        ],
        sum: L('Gejala pergigian', 'Dental symptoms') }
    ]
  },

  /* ══ F. What you eat ════════════════════════════════════════ */
  {
    id: 'diet',
    icon: '🍚',
    title: L('Apa yang anda makan', 'What you eat'),
    lead: L('Jawab tentang minggu biasa, bukan minggu terbaik anda. Tiada siapa akan memarahi anda.',
            'Answer for an ordinary week, not your best week. Nobody will scold you.'),
    fields: [
      { id: 'meals', type: 'radio',
        q: L('Berapa kali anda makan besar dalam sehari?', 'How many main meals do you eat in a day?'),
        opts: [opt('1', 'Satu', 'One'), opt('2', 'Dua', 'Two'),
               opt('3', 'Tiga', 'Three'), opt('4', 'Lebih tiga', 'More than three'),
               opt('irregular', 'Tidak tentu', 'It varies')],
        sum: L('Makan besar sehari', 'Main meals per day') },

      { id: 'rice', type: 'radio',
        q: L('Berapa banyak nasi, mi atau bihun pada satu hidangan?',
             'How much rice, noodles or similar at one meal?'),
        hint: L('Satu senduk nasi lebih kurang separuh cawan.', 'One scoop of rice is about half a cup.'),
        opts: [
          opt('0', 'Saya tidak makan nasi atau mi', 'I do not eat rice or noodles'),
          opt('1', 'Satu senduk', 'One scoop'),
          opt('2', 'Dua senduk', 'Two scoops'),
          opt('3', 'Tiga senduk', 'Three scoops'),
          opt('4', 'Empat senduk atau lebih', 'Four scoops or more'),
          opt('full', 'Saya penuhkan pinggan', 'I fill the plate')
        ],
        sum: L('Kuantiti karbohidrat sehidangan', 'Carbohydrate quantity per meal') },

      { id: 'plate', type: 'radio',
        q: L('Bila anda melihat pinggan anda, berapa banyak sayur di atasnya?',
             'When you look at your plate, how much of it is vegetables?'),
        hint: L('CPG menggalakkan kaedah pinggan: separuh pinggan sayur.',
                'The CPG encourages the plate method: half the plate as vegetables.'),
        opts: [
          opt('half', 'Lebih kurang separuh', 'About half'),
          opt('quarter', 'Lebih kurang satu perempat', 'About a quarter'),
          opt('little', 'Sedikit sahaja', 'Only a little'),
          opt('none', 'Hampir tiada', 'Almost none')
        ],
        sum: L('Bahagian sayur dalam pinggan', 'Vegetable share of the plate') },

      { id: 'veg', type: 'radio',
        q: L('Berapa hidangan sayur sehari?', 'How many servings of vegetables a day?'),
        opts: [opt('0', 'Tiada', 'None'), opt('1', 'Satu', 'One'),
               opt('2', 'Dua', 'Two'), opt('3', 'Tiga atau lebih', 'Three or more')],
        sum: L('Hidangan sayur', 'Vegetable servings') },

      { id: 'fruit', type: 'radio',
        q: L('Berapa hidangan buah sehari?', 'How many servings of fruit a day?'),
        opts: [opt('0', 'Tiada', 'None'), opt('1', 'Satu', 'One'),
               opt('2', 'Dua', 'Two'), opt('3', 'Tiga atau lebih', 'Three or more')],
        sum: L('Hidangan buah', 'Fruit servings') },

      { id: 'sugarDrink', type: 'radio',
        q: L('Minuman manis — teh tarik, kopi bergula, air sirap, minuman tin',
             'Sweet drinks — teh tarik, sweetened coffee, cordial, canned drinks'),
        opts: FREQ,
        flag: function (v) {
          if (v === 'daily' || v === 'dailyPlus') return { lvl: 'amber',
            ms: 'Minuman bergula setiap hari — sasaran pemakanan yang paling mudah diubah.',
            en: 'Sugar-sweetened drinks daily — the most tractable dietary target.' };
          return null;
        },
        sum: L('Minuman bergula', 'Sweetened drinks') },

      { id: 'sugarAdd', type: 'radio',
        q: L('Adakah anda menambah gula, susu pekat manis atau madu ke dalam minuman?',
             'Do you add sugar, sweetened condensed milk or honey to drinks?'),
        opts: [opt('no', 'Tidak', 'No'), opt('less', 'Ya, sedikit', 'Yes, a little'),
               opt('yes', 'Ya, seperti biasa', 'Yes, as usual'),
               opt('subst', 'Saya guna pemanis tiruan', 'I use an artificial sweetener')],
        sum: L('Tambah gula', 'Added sugar') },

      { id: 'fried', type: 'radio',
        q: L('Makanan bergoreng atau bersantan', 'Fried food or food cooked in coconut milk'),
        opts: FREQ, sum: L('Bergoreng atau bersantan', 'Fried or coconut-milk food') },

      { id: 'outside', type: 'radio',
        q: L('Makan di luar atau makanan bungkus', 'Eating out or buying cooked food'),
        opts: FREQ, sum: L('Makan di luar', 'Eating out') },

      { id: 'supper', type: 'radio',
        q: L('Makan lewat malam atau selepas makan malam', 'Eating late at night or after dinner'),
        opts: FREQ, sum: L('Makan lewat malam', 'Late-night eating') },

      { id: 'salt', type: 'radio',
        q: L('Adakah anda menambah garam, kicap atau sos di meja?',
             'Do you add salt, soy sauce or sauces at the table?'),
        opts: [opt('no', 'Tidak pernah', 'Never'), opt('some', 'Kadang-kadang', 'Sometimes'),
               opt('yes', 'Hampir setiap hidangan', 'Almost every meal')],
        sum: L('Garam di meja', 'Salt at the table') },

      { id: 'cook', type: 'radio',
        q: L('Siapa yang memasak di rumah anda?', 'Who does the cooking in your home?'),
        hint: L('Nasihat pemakanan perlu sampai kepada orang yang memasak.',
                'Dietary advice has to reach the person who cooks.'),
        opts: [
          opt('self', 'Saya sendiri', 'I do'),
          opt('spouse', 'Pasangan saya', 'My spouse'),
          opt('family', 'Anak atau keluarga lain', 'A child or another relative'),
          opt('helper', 'Pembantu rumah', 'A domestic helper'),
          opt('buy', 'Kami beli makanan', 'We buy our food')
        ],
        sum: L('Siapa memasak', 'Who cooks') },

      { id: 'dietitian', type: 'radio',
        q: L('Pernahkah anda berjumpa pakar diet?', 'Have you ever seen a dietitian?'),
        opts: [opt('never', 'Belum pernah', 'Never'),
               opt('once', 'Sekali, lama dahulu', 'Once, a long time ago'),
               opt('recent', 'Dalam setahun lepas', 'Within the last year')],
        sum: L('Rujukan pakar diet', 'Dietitian contact') },

      { id: 'fasting', type: 'radio',
        q: L('Adakah anda berpuasa, atau berhasrat untuk berpuasa?', 'Do you fast, or do you plan to fast?'),
        hint: L('Puasa mengubah waktu ubat dan risiko gula rendah. Doktor perlu tahu lebih awal.',
                'Fasting changes medicine timing and the risk of low sugar. The doctor needs to know in advance.'),
        opts: [
          opt('no', 'Tidak', 'No'),
          opt('ramadan', 'Ya, pada bulan Ramadan', 'Yes, during Ramadan'),
          opt('regular', 'Ya, secara tetap sepanjang tahun', 'Yes, regularly through the year'),
          opt('intermittent', 'Ya, puasa berkala untuk berat badan', 'Yes, intermittent fasting for weight')
        ],
        flag: function (v, S) {
          if (v !== 'no' && v && onHypoRisk(S)) return { lvl: 'amber',
            ms: 'Berpuasa sambil mengambil insulin atau sulfonilurea — pelarasan ubat dan nasihat pra-puasa diperlukan.',
            en: 'Fasting while on insulin or a sulphonylurea — medication adjustment and pre-fasting advice needed.' };
          return null;
        },
        sum: L('Amalan berpuasa', 'Fasting practice') },

      { id: 'foodSecurity', type: 'radio',
        q: L('Dalam tiga bulan lepas, pernahkah makanan di rumah tidak cukup kerana kekangan wang?',
             'In the last three months, has there been not enough food at home because money was short?'),
        opts: YNU,
        flag: function (v) {
          if (v === 'yes') return { lvl: 'amber',
            ms: 'Ketidakcukupan makanan dilaporkan — nasihat diet perlu disesuaikan dan rujukan kerja sosial perlu dipertimbangkan.',
            en: 'Food insecurity reported — dietary advice must be adapted and social work referral considered.' };
          return null;
        },
        sum: L('Kecukupan makanan', 'Food security') }
    ]
  },

  /* ══ G. Sugar readings at home ══════════════════════════════ */
  {
    id: 'smbg',
    icon: '🩹',
    title: L('Bacaan gula di rumah', 'Sugar readings at home'),
    lead: L('Jika anda ada buku rekod atau alat meter, keluarkannya sekarang. Ini bahagian yang paling berguna kepada doktor.',
            'If you have a logbook or a meter, take it out now. This is the part most useful to the doctor.'),
    fields: [
      { id: 'hasMeter', type: 'radio',
        q: L('Adakah anda ada alat penguji gula di rumah?', 'Do you have a sugar meter at home?'),
        opts: [
          opt('yes', 'Ya, dan saya menggunakannya', 'Yes, and I use it'),
          opt('yesUnused', 'Ya, tetapi saya jarang guna', 'Yes, but I rarely use it'),
          opt('no', 'Tidak', 'No')
        ],
        flag: function (v, S) {
          if ((v === 'no' || v === 'yesUnused') && onInsulin(S)) return { lvl: 'amber',
            ms: 'Mengambil insulin tanpa pemantauan gula di rumah. CPG mengesyorkan pemantauan sendiri bagi pesakit insulin.',
            en: 'On insulin without home glucose monitoring. The CPG recommends self-monitoring for patients on insulin.' };
          return null;
        },
        sum: L('Alat meter di rumah', 'Home meter') },

      { id: 'noMeterWhy', type: 'checks',
        when: function (S) { return S.hasMeter === 'no' || S.hasMeter === 'yesUnused'; },
        q: L('Apa yang menghalang?', 'What gets in the way?'),
        opts: [
          opt('cost', 'Jalur ujian mahal', 'The test strips are expensive'),
          opt('pain', 'Sakit mencucuk jari', 'Pricking the finger hurts'),
          opt('how', 'Saya tidak tahu cara guna', 'I do not know how to use it'),
          opt('why', 'Saya tidak tahu apa gunanya', 'I do not see the point'),
          opt('broken', 'Alat saya rosak', 'My meter is broken'),
          opt('strips', 'Saya tiada jalur ujian', 'I have no test strips'),
          opt('afraid', 'Saya takut melihat bacaannya', 'I am afraid of what it will show')
        ],
        sum: L('Halangan pemantauan', 'Barriers to monitoring') },

      { id: 'smbgFreq', type: 'radio',
        when: function (S) { return S.hasMeter === 'yes' || S.hasMeter === 'yesUnused'; },
        q: L('Berapa kerap anda menguji gula?', 'How often do you test your sugar?'),
        opts: [
          opt('multi', 'Lebih sekali sehari', 'More than once a day'),
          opt('daily', 'Sekali sehari', 'Once a day'),
          opt('wk', 'Beberapa kali seminggu', 'A few times a week'),
          opt('mo', 'Beberapa kali sebulan', 'A few times a month'),
          opt('rare', 'Jarang sekali', 'Very rarely')
        ],
        sum: L('Kekerapan ujian sendiri', 'Self-monitoring frequency') },

      { id: 'gluLog', type: 'glucose',
        when: function (S) { return S.hasMeter === 'yes' || S.hasMeter === 'yesUnused'; },
        q: L('Masukkan bacaan daripada buku rekod anda', 'Enter the readings from your logbook'),
        hint: L('Mulakan dengan yang paling baru. Tiga atau empat bacaan sudah membantu; empat belas lebih baik.',
                'Start with the most recent. Three or four readings already help; fourteen is better.'),
        sum: L('Bacaan gula di rumah', 'Home glucose readings') },

      { id: 'gluPattern', type: 'checks',
        when: function (S) { return S.hasMeter === 'yes' || S.hasMeter === 'yesUnused'; },
        q: L('Apa yang anda perasan tentang bacaan anda?', 'What have you noticed about your readings?'),
        opts: [
          opt('highAm', 'Paling tinggi pagi sebelum sarapan', 'Highest in the morning before breakfast'),
          opt('highPm', 'Paling tinggi selepas makan', 'Highest after meals'),
          opt('highNight', 'Paling tinggi waktu malam', 'Highest at night'),
          opt('swing', 'Naik turun dengan banyak', 'They swing up and down a lot'),
          opt('lowAm', 'Kadangkala terlalu rendah pagi', 'Sometimes too low in the morning'),
          opt('steady', 'Agak stabil', 'Fairly steady'),
          opt('dk', 'Saya tidak perasan apa-apa corak', 'I have not noticed any pattern')
        ],
        sum: L('Corak yang pesakit perasan', 'Pattern the patient notices') }
    ]
  },

  /* ══ H. Moving about ════════════════════════════════════════ */
  {
    id: 'activity',
    icon: '👞',
    title: L('Pergerakan anda', 'Moving about'),
    lead: L('Pergerakan menurunkan gula pada hari ia dilakukan. Jumlah minggu penting, dan jurang antara hari juga penting.',
            'Movement lowers sugar on the day it is done. The weekly total matters, and so does the gap between days.'),
    fields: [
      { id: 'exMin', type: 'num', unit: L('minit/minggu', 'minutes/week'), min: 0, max: 2000,
        q: L('Berapa minit dalam seminggu anda bergerak cukup kuat untuk nafas menjadi lebih cepat?',
             'How many minutes a week do you move briskly enough to breathe faster?'),
        hint: L('Berjalan pantas, berkebun berat, berbasikal, berenang. CPG mengesyorkan sekurang-kurangnya ' +
                CPG.activity.minPerWeek + ' minit seminggu.',
                'Brisk walking, heavy gardening, cycling, swimming. The CPG recommends at least ' +
                CPG.activity.minPerWeek + ' minutes a week.'),
        flag: function (v) {
          var n = parseFloat(v);
          if (!isNaN(n) && n < CPG.activity.minPerWeek) return { lvl: 'amber',
            ms: 'Aktiviti fizikal di bawah ' + CPG.activity.minPerWeek + ' minit/minggu yang disyorkan CPG.',
            en: 'Physical activity below the CPG-recommended ' + CPG.activity.minPerWeek + ' minutes/week.' };
          return null;
        },
        sum: L('Aktiviti sederhana', 'Moderate activity') },

      { id: 'exDays', type: 'radio',
        q: L('Pada berapa hari dalam seminggu?', 'On how many days of the week?'),
        hint: L('CPG meminta jangan lebih ' + CPG.activity.maxGapDays +
                ' hari berturut-turut tanpa aktiviti.',
                'The CPG asks for no more than ' + CPG.activity.maxGapDays +
                ' consecutive days without activity.'),
        opts: [opt('0', 'Tiada', 'None'), opt('1', 'Satu', 'One'), opt('2', 'Dua', 'Two'),
               opt('3', 'Tiga', 'Three'), opt('4', 'Empat', 'Four'),
               opt('5', 'Lima atau lebih', 'Five or more')],
        flag: function (v) {
          if (v === '0' || v === '1' || v === '2') return { lvl: 'amber',
            ms: 'Aktiviti pada dua hari atau kurang — jurang melebihi ' + CPG.activity.maxGapDays +
                ' hari berturut-turut yang disyorkan CPG.',
            en: 'Activity on two days or fewer — gaps exceed the CPG-recommended maximum of ' +
                CPG.activity.maxGapDays + ' consecutive days.' };
          return null;
        },
        sum: L('Hari aktif seminggu', 'Active days per week') },

      { id: 'resistance', type: 'radio',
        q: L('Adakah anda melakukan latihan menguatkan otot?', 'Do you do any muscle-strengthening exercise?'),
        hint: L('Mengangkat berat, getah rintangan, bangun dari kerusi berulang kali. CPG mengesyorkan ' +
                CPG.activity.resistanceSessions + ' sesi seminggu.',
                'Weights, resistance bands, repeated standing from a chair. The CPG recommends ' +
                CPG.activity.resistanceSessions + ' sessions a week.'),
        opts: [opt('no', 'Tidak', 'No'), opt('1', 'Sekali seminggu', 'Once a week'),
               opt('2', 'Dua kali seminggu', 'Twice a week'),
               opt('3', 'Tiga kali atau lebih', 'Three times or more')],
        sum: L('Latihan rintangan', 'Resistance training') },

      { id: 'sitting', type: 'radio',
        q: L('Berapa lama anda duduk tanpa bangun?', 'How long do you sit without getting up?'),
        hint: L('CPG meminta memecahkan masa duduk setiap ' + CPG.activity.sedentaryBreakMin + ' minit.',
                'The CPG asks for sitting to be broken every ' + CPG.activity.sedentaryBreakMin + ' minutes.'),
        opts: [
          opt('lt30', 'Kurang 30 minit', 'Less than 30 minutes'),
          opt('30to60', '30 hingga 60 minit', '30 to 60 minutes'),
          opt('1to2', 'Satu hingga dua jam', 'One to two hours'),
          opt('gt2', 'Lebih dua jam', 'More than two hours')
        ],
        sum: L('Masa duduk berterusan', 'Uninterrupted sitting') },

      { id: 'stepsTrack', type: 'radio',
        q: L('Adakah telefon atau jam anda mengira langkah?', 'Does your phone or watch count your steps?'),
        opts: YN, sum: L('Mengira langkah', 'Tracks steps') },

      { id: 'stepsTypical', type: 'num', unit: L('langkah/hari', 'steps/day'), min: 0, max: 60000,
        when: function (S) { return S.stepsTrack === 'yes'; },
        q: L('Lebih kurang berapa langkah sehari pada hari biasa?',
             'Roughly how many steps on an ordinary day?'),
        sum: L('Langkah harian biasa', 'Typical daily steps') },

      { id: 'stepsLog', type: 'steps',
        when: function (S) { return S.stepsTrack === 'yes'; },
        q: L('Purata langkah bagi setiap minggu', 'Average steps for each week'),
        hint: L('Buka aplikasi kesihatan pada telefon anda dan lihat paparan mingguan.',
                'Open the health app on your phone and look at the weekly view.'),
        sum: L('Trend langkah mingguan', 'Weekly step trend') },

      { id: 'exBarrier', type: 'checks',
        q: L('Apa yang menghalang anda daripada bergerak lebih?', 'What stops you moving more?'),
        opts: [
          opt('pain', 'Sakit sendi atau sakit belakang', 'Joint pain or back pain'),
          opt('breath', 'Sesak nafas', 'Breathlessness'),
          opt('chest', 'Sakit dada', 'Chest pain'),
          opt('foot', 'Masalah kaki', 'Foot problems'),
          opt('time', 'Tiada masa', 'No time'),
          opt('place', 'Tiada tempat yang selamat', 'Nowhere safe to walk'),
          opt('fear', 'Takut gula jatuh rendah', 'Fear my sugar will drop'),
          opt('fall', 'Takut jatuh', 'Fear of falling'),
          opt('motiv', 'Sukar bermula', 'Hard to get started'),
          opt('none', 'Tiada halangan', 'Nothing stops me')
        ],
        sum: L('Halangan aktiviti', 'Barriers to activity') }
    ]
  },

  /* ══ I. Low sugar — insulin and sulphonylurea only ══════════ */
  {
    id: 'hypo',
    icon: '⚠️',
    title: L('Gula terlalu rendah', 'Sugar dropping too low'),
    lead: L('Bahagian ini untuk pesakit yang mengambil insulin atau ubat yang boleh menurunkan gula terlalu rendah. Ini perkara paling penting yang doktor perlu tahu hari ini.',
            'This section is for patients on insulin or on a medicine that can drive sugar too low. This is the most important thing the doctor needs to know today.'),
    when: onHypoRisk,
    fields: [
      { id: 'hypoKnow', type: 'radio',
        q: L('Adakah sesiapa pernah menerangkan kepada anda apa itu gula rendah dan apa yang perlu dibuat?',
             'Has anyone explained to you what low sugar is and what to do about it?'),
        opts: YNU,
        flag: function (v) {
          if (v === 'no' || v === 'dk') return { lvl: 'amber',
            ms: 'Pesakit berisiko hipoglisemia tetapi belum pernah diajar mengenalinya atau merawatnya.',
            en: 'Patient at risk of hypoglycaemia but never taught to recognise or treat it.' };
          return null;
        },
        sum: L('Pendidikan hipoglisemia', 'Hypoglycaemia education') },

      { id: 'hypoCount', type: 'radio',
        q: L('Dalam empat minggu lepas, berapa kali gula anda jatuh terlalu rendah?',
             'In the last four weeks, how many times did your sugar drop too low?'),
        hint: L('Kira juga kali yang anda rasa gejalanya walaupun tidak diuji.',
                'Count the times you felt the symptoms even if you did not test.'),
        opts: [
          opt('0', 'Tidak pernah', 'Never'),
          opt('1to2', '1 hingga 2 kali', '1 to 2 times'),
          opt('3to5', '3 hingga 5 kali', '3 to 5 times'),
          opt('gt5', 'Lebih 5 kali', 'More than 5 times'),
          opt('dk', 'Saya tidak pasti', 'I am not sure')
        ],
        flag: function (v) {
          if (v === 'gt5') return { lvl: 'red',
            ms: 'Hipoglisemia lebih lima kali dalam empat minggu — rejimen perlu disemak sebelum pesakit pulang.',
            en: 'More than five hypoglycaemic episodes in four weeks — regimen needs review before the patient leaves.' };
          if (v === '3to5') return { lvl: 'amber',
            ms: 'Hipoglisemia berulang — semakan rejimen diperlukan.',
            en: 'Recurrent hypoglycaemia — regimen review indicated.' };
          return null;
        },
        sum: L('Episod hipoglisemia dalam 4 minggu', 'Hypoglycaemic episodes in 4 weeks') },

      { id: 'hypoLowest', type: 'num', unit: 'mmol/L', min: 0.5, max: 15, step: '0.1',
        when: function (S) { return S.hypoCount && S.hypoCount !== '0'; },
        q: L('Bacaan paling rendah yang anda lihat, jika anda mengujinya',
             'The lowest reading you saw, if you tested'),
        hint: L('CPG membahagikan gula rendah kepada tahap: bawah ' + CPG.hypo.l1.lt +
                ' mmol/L, dan bawah ' + CPG.hypo.l2.lt + ' mmol/L yang lebih serius.',
                'The CPG divides low sugar into levels: below ' + CPG.hypo.l1.lt +
                ' mmol/L, and below ' + CPG.hypo.l2.lt + ' mmol/L which is more serious.'),
        flag: function (v) {
          var n = parseFloat(v);
          if (!isNaN(n) && n > 0 && n < CPG.hypo.l2.lt) return { lvl: 'red',
            ms: 'Hipoglisemia Tahap 2 direkod (bawah ' + CPG.hypo.l2.lt + ' mmol/L).',
            en: 'Level 2 hypoglycaemia recorded (below ' + CPG.hypo.l2.lt + ' mmol/L).' };
          return null;
        },
        sum: L('Bacaan hipoglisemia terendah', 'Lowest hypoglycaemic reading') },

      { id: 'hypoHelp', type: 'radio',
        when: function (S) { return S.hypoCount && S.hypoCount !== '0'; },
        q: L('Pernahkah anda perlukan bantuan orang lain kerana gula rendah?',
             'Have you ever needed another person’s help because of low sugar?'),
        hint: L('Contohnya seseorang memberi anda gula, atau anda dibawa ke hospital, atau anda hilang kesedaran.',
                'For example someone gave you sugar, or you were taken to hospital, or you lost consciousness.'),
        opts: [
          opt('no', 'Tidak', 'No'),
          opt('yes4wk', 'Ya, dalam empat minggu lepas', 'Yes, in the last four weeks'),
          opt('yesYear', 'Ya, tetapi lebih lama daripada itu', 'Yes, but longer ago than that'),
          opt('uncons', 'Ya, dan saya hilang kesedaran atau mendapat sawan', 'Yes, and I lost consciousness or had a fit')
        ],
        flag: function (v) {
          if (v === 'yes4wk' || v === 'uncons') return { lvl: 'red',
            ms: 'Hipoglisemia Tahap 3 (teruk, memerlukan bantuan orang lain). Rejimen perlu diubah hari ini dan nasihat memandu diberi.',
            en: 'Level 3 (severe) hypoglycaemia requiring assistance. Regimen needs changing today and driving advice given.' };
          if (v === 'yesYear') return { lvl: 'amber',
            ms: 'Sejarah hipoglisemia teruk — mempengaruhi pemilihan sasaran HbA1c.',
            en: 'History of severe hypoglycaemia — bears on the choice of HbA1c target.' };
          return null;
        },
        sum: L('Hipoglisemia teruk (Tahap 3)', 'Severe hypoglycaemia (Level 3)') },

      { id: 'hypoWarn', type: 'radio',
        q: L('Adakah anda dapat rasa gejala sebelum gula anda jatuh terlalu rendah?',
             'Can you feel the warning symptoms before your sugar goes too low?'),
        hint: L('Berpeluh, menggigil, berdebar, lapar mengejut, keliru.',
                'Sweating, shaking, pounding heart, sudden hunger, confusion.'),
        opts: [
          opt('always', 'Ya, selalu', 'Yes, always'),
          opt('sometimes', 'Kadang-kadang sahaja', 'Only sometimes'),
          opt('never', 'Tidak — saya tidak rasa apa-apa sampai ia sudah sangat rendah', 'No — I feel nothing until it is already very low'),
          opt('changed', 'Dahulu saya rasa, sekarang tidak lagi', 'I used to feel it, now I do not')
        ],
        flag: function (v) {
          if (v === 'never' || v === 'changed') return { lvl: 'red',
            ms: 'Hilang kesedaran awal hipoglisemia. Sasaran gula perlu dilonggarkan dan nasihat memandu diberi.',
            en: 'Impaired awareness of hypoglycaemia. Glycaemic target should be relaxed and driving advice given.' };
          return null;
        },
        sum: L('Kesedaran awal hipoglisemia', 'Hypoglycaemia awareness') },

      { id: 'hypoNight', type: 'radio',
        q: L('Adakah anda terjaga malam dengan berpeluh, mimpi buruk, atau sakit kepala pagi?',
             'Do you wake at night sweating, with bad dreams, or with a morning headache?'),
        opts: YNU,
        flag: function (v) {
          if (v === 'yes') return { lvl: 'amber',
            ms: 'Gejala mencadangkan hipoglisemia nokturnal — pertimbang ujian gula waktu malam.',
            en: 'Symptoms suggesting nocturnal hypoglycaemia — consider overnight glucose testing.' };
          return null;
        },
        sum: L('Gejala hipoglisemia nokturnal', 'Nocturnal hypoglycaemia symptoms') },

      { id: 'hypoAction', type: 'checks',
        q: L('Apa yang anda buat apabila gula anda jatuh rendah?', 'What do you do when your sugar drops low?'),
        hint: L('Pilih apa yang anda benar-benar buat, bukan apa yang sepatutnya.',
                'Choose what you actually do, not what you are supposed to do.'),
        opts: [
          opt('glucose', 'Makan gula, gula-gula atau jus manis', 'Take sugar, sweets or sweet juice'),
          opt('recheck', 'Uji semula selepas ' + CPG.hypo.rule15.recheck_min + ' minit', 'Test again after ' + CPG.hypo.rule15.recheck_min + ' minutes'),
          opt('meal', 'Terus makan sepinggan penuh', 'Eat a whole meal straight away'),
          opt('lie', 'Baring dan tunggu ia hilang', 'Lie down and wait for it to pass'),
          opt('skipDose', 'Saya tinggalkan dos insulin seterusnya', 'I skip my next insulin dose'),
          opt('nothing', 'Saya tidak buat apa-apa', 'I do nothing'),
          opt('dk', 'Saya tidak tahu apa perlu dibuat', 'I do not know what to do')
        ],
        flag: function (v) {
          var a = v || [];
          if (a.indexOf('nothing') >= 0 || a.indexOf('dk') >= 0 || a.indexOf('lie') >= 0) return { lvl: 'red',
            ms: 'Pesakit tidak merawat hipoglisemia dengan betul. Ajar peraturan ' + CPG.hypo.rule15.carb_g +
                ' gram karbohidrat dan uji semula selepas ' + CPG.hypo.rule15.recheck_min + ' minit sebelum pulang.',
            en: 'Patient does not treat hypoglycaemia correctly. Teach the ' + CPG.hypo.rule15.carb_g +
                ' g carbohydrate rule with a recheck after ' + CPG.hypo.rule15.recheck_min + ' minutes before discharge.' };
          return null;
        },
        sum: L('Tindakan ketika hipoglisemia', 'Action taken for hypoglycaemia') },

      { id: 'hypoCarry', type: 'radio',
        q: L('Adakah anda membawa gula atau gula-gula bersama anda?', 'Do you carry sugar or sweets with you?'),
        opts: [opt('always', 'Selalu', 'Always'), opt('sometimes', 'Kadang-kadang', 'Sometimes'),
               opt('never', 'Tidak pernah', 'Never')],
        sum: L('Membawa karbohidrat', 'Carries carbohydrate') },

      { id: 'drives', type: 'radio',
        q: L('Adakah anda memandu, menunggang motosikal, atau mengendalikan jentera?',
             'Do you drive, ride a motorcycle, or operate machinery?'),
        opts: YN,
        flag: function (v, S) {
          if (v === 'yes' && (S.hypoWarn === 'never' || S.hypoWarn === 'changed')) return { lvl: 'red',
            ms: 'Memandu dengan hilang kesedaran awal hipoglisemia. Nasihat memandu mesti diberi dan direkod hari ini.',
            en: 'Driving with impaired hypoglycaemia awareness. Driving advice must be given and recorded today.' };
          if (v === 'yes' && (S.hypoHelp === 'yes4wk' || S.hypoHelp === 'uncons')) return { lvl: 'red',
            ms: 'Memandu selepas hipoglisemia teruk baru-baru ini. Nasihat memandu mesti diberi dan direkod hari ini.',
            en: 'Driving after recent severe hypoglycaemia. Driving advice must be given and recorded today.' };
          if (v === 'yes') return { lvl: 'amber',
            ms: 'Memandu sambil berisiko hipoglisemia — periksa gula sebelum memandu.',
            en: 'Drives while at risk of hypoglycaemia — check glucose before driving.' };
          return null;
        },
        sum: L('Memandu atau mengendalikan jentera', 'Drives or operates machinery') },

      /* Insulin technique — only for those actually injecting. */
      { id: 'insRegimen', type: 'radio', when: onInsulin,
        q: L('Berapa kali sehari anda menyuntik insulin?', 'How many times a day do you inject insulin?'),
        opts: [opt('1', 'Sekali', 'Once'), opt('2', 'Dua kali', 'Twice'),
               opt('3', 'Tiga kali', 'Three times'), opt('4', 'Empat kali atau lebih', 'Four times or more'),
               opt('dk', 'Saya tidak pasti', 'I am not sure')],
        sum: L('Kekerapan suntikan insulin', 'Insulin injection frequency') },

      { id: 'insMissed', type: 'radio', when: onInsulin,
        q: L('Dalam dua minggu lepas, berapa kali anda terlepas suntikan?',
             'In the last two weeks, how many injections did you miss?'),
        opts: [opt('0', 'Tiada', 'None'), opt('1to3', '1 hingga 3', '1 to 3'),
               opt('gt3', 'Lebih 3', 'More than 3')],
        sum: L('Suntikan terlepas', 'Missed injections') },

      { id: 'insSite', type: 'checks', when: onInsulin,
        q: L('Tentang tempat suntikan anda', 'About your injection sites'),
        opts: [
          opt('rotate', 'Saya menukar tempat setiap kali', 'I move the site each time'),
          opt('same', 'Saya suntik di tempat yang sama', 'I inject in the same place'),
          opt('lump', 'Ada benjolan atau kulit mengeras di tempat suntikan', 'There are lumps or hardened skin where I inject'),
          opt('bruise', 'Lebam atau berdarah', 'Bruising or bleeding'),
          opt('painful', 'Suntikan menyakitkan', 'The injections hurt')
        ],
        flag: function (v) {
          var a = v || [];
          if (a.indexOf('lump') >= 0 || a.indexOf('same') >= 0) return { lvl: 'amber',
            ms: 'Lipohipertrofi atau tempat suntikan tidak ditukar — penyerapan insulin tidak boleh diramal. Periksa tempat suntikan.',
            en: 'Lipohypertrophy or non-rotation of sites — insulin absorption is unpredictable. Inspect the injection sites.' };
          return null;
        },
        sum: L('Tempat suntikan', 'Injection sites') },

      { id: 'insStore', type: 'radio', when: onInsulin,
        q: L('Di mana anda menyimpan insulin yang belum dibuka?', 'Where do you keep the insulin you have not started?'),
        opts: [
          opt('fridge', 'Dalam peti sejuk', 'In the refrigerator'),
          opt('freezer', 'Dalam bahagian ais', 'In the freezer compartment'),
          opt('room', 'Di suhu bilik', 'At room temperature'),
          opt('hot', 'Berhampiran tingkap atau tempat panas', 'Near a window or somewhere warm'),
          opt('dk', 'Saya tidak pasti', 'I am not sure')
        ],
        flag: function (v) {
          if (v === 'freezer' || v === 'hot') return { lvl: 'amber',
            ms: 'Penyimpanan insulin tidak betul — keberkesanan mungkin hilang. Ajar penyimpanan.',
            en: 'Incorrect insulin storage — potency may be lost. Teach storage.' };
          return null;
        },
        sum: L('Penyimpanan insulin', 'Insulin storage') },

      { id: 'insNeedle', type: 'radio', when: onInsulin,
        q: L('Berapa kali anda guna satu jarum sebelum membuangnya?',
             'How many times do you use one needle before discarding it?'),
        opts: [opt('1', 'Sekali sahaja', 'Once only'), opt('few', '2 hingga 5 kali', '2 to 5 times'),
               opt('many', 'Lebih 5 kali', 'More than 5 times')],
        sum: L('Penggunaan semula jarum', 'Needle reuse') }
    ]
  },

  /* ══ J. Weight and sleep ════════════════════════════════════ */
  {
    id: 'weight',
    icon: '⚖️',
    title: L('Berat badan dan tidur', 'Weight and sleep'),
    lead: L('Berat badan dan kencing manis berjalan bersama. Menurunkan sedikit berat memberi faedah besar kepada gula.',
            'Weight and diabetes travel together. Losing even a little weight does a great deal for the sugar.'),
    fields: [
      { id: 'wt', type: 'num', unit: 'kg', min: 20, max: 300, step: '0.1',
        q: L('Berat badan anda sekarang', 'Your weight now'),
        hint: L('Jika anda tidak tahu, jururawat akan menimbang anda di kaunter.',
                'If you do not know, the nurse will weigh you at the counter.'),
        sum: L('Berat (dilapor pesakit)', 'Weight (patient-reported)') },

      { id: 'ht', type: 'num', unit: 'cm', min: 100, max: 220,
        q: L('Tinggi anda', 'Your height'),
        sum: L('Tinggi (dilapor pesakit)', 'Height (patient-reported)') },

      { id: 'bmiCalc', type: 'calc',
        q: L('Indeks jisim badan anda', 'Your body mass index'),
        hint: L('Dikira daripada berat dan tinggi, menggunakan julat Asia dalam CPG Obesiti.',
                'Calculated from your weight and height, using the Asian ranges in the Obesity CPG.'),
        sum: L('BMI (daripada nilai pesakit)', 'BMI (from patient-reported values)') },

      { id: 'wtMax', type: 'num', unit: 'kg', min: 20, max: 300, step: '0.1',
        q: L('Berat paling tinggi yang pernah anda capai', 'The highest weight you have ever been'),
        sum: L('Berat tertinggi', 'Highest weight') },

      { id: 'wtTried', type: 'checks',
        q: L('Apa yang pernah anda cuba untuk menurunkan berat?', 'What have you tried in order to lose weight?'),
        opts: [
          opt('diet', 'Mengurangkan makan', 'Eating less'),
          opt('exercise', 'Bersenam', 'Exercising'),
          opt('dietitian', 'Berjumpa pakar diet', 'Seeing a dietitian'),
          opt('slimming', 'Produk kurus atau herba', 'Slimming products or herbs'),
          opt('drug', 'Ubat penurun berat daripada doktor', 'Weight-loss medicine from a doctor'),
          opt('surgery', 'Pembedahan', 'Surgery'),
          opt('none', 'Belum pernah cuba', 'I have not tried')
        ],
        flag: function (v) {
          if ((v || []).indexOf('slimming') >= 0) return { lvl: 'amber',
            ms: 'Menggunakan produk kurus atau herba — tanya nama produk dan kandungannya.',
            en: 'Using slimming products or herbs — ask what they are and what is in them.' };
          return null;
        },
        sum: L('Percubaan menurunkan berat', 'Weight-loss attempts') },

      { id: 'wtReady', type: 'scale', min: 0, max: 10,
        q: L('Sejauh mana anda bersedia bekerja untuk menurunkan berat sekarang?',
             'How ready are you to work on your weight right now?'),
        hint: L('0 bermakna belum bersedia sama sekali, 10 bermakna sangat bersedia. Jawapan jujur membantu doktor menawarkan perkara yang betul.',
                '0 means not ready at all, 10 means very ready. An honest answer helps the doctor offer the right thing.'),
        sum: L('Kesediaan untuk berubah (0–10)', 'Readiness to change (0–10)') },

      { id: 'wtGoal', type: 'text',
        q: L('Jika anda boleh ubah satu perkara tentang berat atau makanan anda, apa agaknya?',
             'If you could change one thing about your weight or your food, what would it be?'),
        sum: L('Matlamat pesakit sendiri', 'Patient’s own goal') },

      /* Obstructive sleep apnoea — the obesity CPG asks for it to be
         looked for, and a waiting room is a good place to ask. */
      { id: 'osa', type: 'checks',
        q: L('Tidur anda', 'Your sleep'),
        opts: [
          opt('snore', 'Saya berdengkur kuat', 'I snore loudly'),
          opt('stop', 'Seseorang pernah melihat saya berhenti bernafas ketika tidur', 'Someone has seen me stop breathing in my sleep'),
          opt('choke', 'Saya terjaga tercungap atau tersedak', 'I wake up gasping or choking'),
          opt('sleepy', 'Saya mengantuk pada waktu siang walaupun cukup tidur', 'I am sleepy in the daytime even after enough sleep'),
          opt('drive', 'Saya pernah hampir terlelap ketika memandu', 'I have nearly fallen asleep while driving'),
          opt('headache', 'Saya bangun dengan sakit kepala', 'I wake with a headache'),
          opt('none', 'Tiada satu pun', 'None of these')
        ],
        flag: function (v) {
          var a = v || [];
          if (a.indexOf('drive') >= 0) return { lvl: 'red',
            ms: 'Hampir terlelap ketika memandu — nasihat memandu dan saringan apnea tidur segera.',
            en: 'Near-miss falling asleep while driving — driving advice and prompt sleep apnoea assessment.' };
          if (a.indexOf('stop') >= 0 || a.indexOf('choke') >= 0 ||
              (a.indexOf('snore') >= 0 && a.indexOf('sleepy') >= 0)) return { lvl: 'amber',
            ms: 'Gejala mencadangkan apnea tidur obstruktif — saringan disyorkan oleh CPG Obesiti.',
            en: 'Symptoms suggesting obstructive sleep apnoea — screening recommended by the Obesity CPG.' };
          return null;
        },
        sum: L('Gejala apnea tidur', 'Sleep apnoea symptoms') },

      { id: 'sleepHours', type: 'radio',
        q: L('Berapa jam anda tidur pada waktu malam?', 'How many hours do you sleep at night?'),
        opts: [opt('lt5', 'Kurang 5 jam', 'Less than 5'), opt('5to6', '5 hingga 6 jam', '5 to 6'),
               opt('7to8', '7 hingga 8 jam', '7 to 8'), opt('gt8', 'Lebih 8 jam', 'More than 8')],
        sum: L('Jam tidur', 'Hours of sleep') },

      { id: 'joints', type: 'radio',
        q: L('Adakah sakit sendi menghalang anda bergerak?', 'Does joint pain stop you moving?'),
        opts: [opt('no', 'Tidak', 'No'), opt('some', 'Sedikit', 'A little'),
               opt('lots', 'Ya, dengan banyak', 'Yes, a great deal')],
        sum: L('Sakit sendi menghadkan pergerakan', 'Joint pain limiting movement') }
    ]
  },

  /* ══ K. Mood, support and prevention ═══════════════════════ */
  {
    id: 'psych',
    icon: '🧠',
    title: L('Perasaan, sokongan dan pencegahan', 'Mood, support and prevention'),
    lead: L('Menjaga kencing manis adalah kerja harian. Bagaimana anda menanggungnya penting sama seperti bacaan gula.',
            'Looking after diabetes is daily work. How you are bearing it matters as much as the sugar readings.'),
    fields: [
      { id: 'mood1', type: 'radio',
        q: L('Dalam dua minggu lepas, berapa kerap anda rasa sedih, murung atau hilang harapan?',
             'Over the last two weeks, how often have you felt down, depressed or hopeless?'),
        opts: [
          opt('0', 'Tidak pernah', 'Not at all'),
          opt('1', 'Beberapa hari', 'Several days'),
          opt('2', 'Lebih separuh hari', 'More than half the days'),
          opt('3', 'Hampir setiap hari', 'Nearly every day')
        ],
        sum: L('Perasaan murung (2 minggu)', 'Low mood (2 weeks)') },

      { id: 'mood2', type: 'radio',
        q: L('Dalam dua minggu lepas, berapa kerap anda kurang minat atau kurang keseronokan dalam melakukan sesuatu?',
             'Over the last two weeks, how often have you had little interest or pleasure in doing things?'),
        opts: [
          opt('0', 'Tidak pernah', 'Not at all'),
          opt('1', 'Beberapa hari', 'Several days'),
          opt('2', 'Lebih separuh hari', 'More than half the days'),
          opt('3', 'Hampir setiap hari', 'Nearly every day')
        ],
        flag: function (v, S) {
          var a = parseInt(S.mood1 || '0', 10), b = parseInt(v || '0', 10);
          if (a >= 2 || b >= 2) return { lvl: 'amber',
            ms: 'Saringan mood positif — CPG menasihatkan penilaian psikologi dalam penjagaan diabetes.',
            en: 'Positive mood screen — the CPG advises psychological assessment as part of diabetes care.' };
          return null;
        },
        sum: L('Kurang minat (2 minggu)', 'Anhedonia (2 weeks)') },

      { id: 'distress', type: 'radio',
        q: L('Adakah menjaga kencing manis terasa membebankan anda?',
             'Does looking after your diabetes feel like a burden to you?'),
        opts: [
          opt('no', 'Tidak', 'No'),
          opt('some', 'Sedikit', 'A little'),
          opt('lots', 'Ya, dengan banyak', 'Yes, a great deal'),
          opt('overwhelmed', 'Saya rasa tidak mampu lagi', 'I feel I cannot cope with it any more')
        ],
        flag: function (v) {
          if (v === 'overwhelmed') return { lvl: 'red',
            ms: 'Pesakit menyatakan tidak mampu lagi menguruskan diabetesnya — bincang hari ini.',
            en: 'Patient states they can no longer cope with their diabetes — discuss today.' };
          if (v === 'lots') return { lvl: 'amber',
            ms: 'Tekanan diabetes yang tinggi dilaporkan.', en: 'High diabetes-related distress reported.' };
          return null;
        },
        sum: L('Tekanan berkaitan diabetes', 'Diabetes-related distress') },

      { id: 'support', type: 'radio',
        q: L('Adakah ada seseorang yang membantu anda menjaga kencing manis?',
             'Is there someone who helps you look after your diabetes?'),
        opts: [opt('yes', 'Ya', 'Yes'), opt('some', 'Sedikit', 'A little'),
               opt('no', 'Tidak, saya uruskan sendiri', 'No, I manage alone')],
        sum: L('Sokongan di rumah', 'Support at home') },

      { id: 'access', type: 'checks',
        q: L('Adakah perkara ini menyukarkan anda datang ke klinik atau mendapatkan ubat?',
             'Do any of these make it hard to come to clinic or to get your medicines?'),
        opts: [
          opt('transport', 'Pengangkutan', 'Transport'),
          opt('cost', 'Kos', 'Cost'),
          opt('work', 'Tidak boleh cuti kerja', 'Cannot take leave from work'),
          opt('carer', 'Saya menjaga orang lain', 'I am caring for someone else'),
          opt('walk', 'Sukar berjalan jauh', 'Difficulty walking far'),
          opt('queue', 'Masa menunggu terlalu lama', 'The wait is too long'),
          opt('none', 'Tiada', 'None')
        ],
        sum: L('Halangan mendapat rawatan', 'Barriers to care') },

      { id: 'vaccine', type: 'checks',
        q: L('Suntikan pencegahan yang anda sudah terima', 'Preventive vaccinations you have had'),
        opts: [
          opt('flu', 'Influenza, dalam setahun lepas', 'Influenza, within the last year'),
          opt('pneumo', 'Pneumokokal', 'Pneumococcal'),
          opt('covid', 'COVID-19', 'COVID-19'),
          opt('none', 'Tiada', 'None'),
          opt('dk', 'Saya tidak ingat', 'I do not remember')
        ],
        sum: L('Imunisasi', 'Immunisation') },

      { id: 'pregnancy', type: 'radio', when: isFemale,
        q: L('Adakah anda mengandung, atau merancang untuk mengandung?',
             'Are you pregnant, or planning to become pregnant?'),
        hint: L('Penting kerana beberapa ubat kencing manis dan kolesterol perlu ditukar sebelum mengandung.',
                'Important because some diabetes and cholesterol medicines must be changed before pregnancy.'),
        opts: [
          opt('no', 'Tidak', 'No'),
          opt('planning', 'Saya merancang untuk mengandung', 'I am planning to'),
          opt('pregnant', 'Saya mengandung sekarang', 'I am pregnant now'),
          opt('maybe', 'Mungkin, saya tidak merancang mana-mana', 'Possibly, I am not planning either way'),
          opt('na', 'Tidak berkenaan', 'Not applicable')
        ],
        flag: function (v) {
          if (v === 'pregnant') return { lvl: 'red',
            ms: 'Mengandung dengan diabetes — semak ubat hari ini dan rujuk perkhidmatan obstetrik.',
            en: 'Pregnant with diabetes — review medicines today and refer to the obstetric service.' };
          if (v === 'planning' || v === 'maybe') return { lvl: 'amber',
            ms: 'Kemungkinan mengandung — semak keselamatan ubat sebelum mengandung.',
            en: 'Possible pregnancy — review pre-conception medicine safety.' };
          return null;
        },
        sum: L('Kehamilan', 'Pregnancy') }
    ]
  },

  /* ══ L. What you want from today ═══════════════════════════ */
  {
    id: 'agenda',
    icon: '🗨️',
    title: L('Apa yang anda mahu daripada hari ini', 'What you want from today'),
    lead: L('Bahagian ini yang paling banyak mengubah perjumpaan anda dengan doktor. Masa doktor terhad, jadi beritahu apa yang paling penting kepada anda.',
            'This section changes your consultation more than any other. The doctor’s time is short, so say what matters most to you.'),
    fields: [
      { id: 'topics', type: 'checks',
        q: L('Apa yang anda mahu bincangkan hari ini?', 'What would you like to discuss today?'),
        opts: [
          opt('sugar', 'Bacaan gula saya', 'My sugar readings'),
          opt('meds', 'Ubat saya — bilangan, kesan sampingan, atau mengurangkannya', 'My medicines — how many, side effects, or reducing them'),
          opt('insulin', 'Sama ada saya perlu insulin, atau boleh berhenti', 'Whether I need insulin, or could stop it'),
          opt('food', 'Apa yang patut saya makan', 'What I should be eating'),
          opt('weight', 'Berat badan saya', 'My weight'),
          opt('feet', 'Kaki saya', 'My feet'),
          opt('eyes', 'Mata saya', 'My eyes'),
          opt('kidney', 'Buah pinggang saya', 'My kidneys'),
          opt('lows', 'Gula rendah', 'Low sugar'),
          opt('tired', 'Rasa letih', 'Feeling tired'),
          opt('sex', 'Masalah seksual', 'Sexual problems'),
          opt('mood', 'Perasaan saya', 'How I am feeling in myself'),
          opt('fasting', 'Berpuasa', 'Fasting'),
          opt('work', 'Kerja, memandu atau perjalanan', 'Work, driving or travel'),
          opt('mc', 'Surat atau sijil', 'A letter or a certificate'),
          opt('cost', 'Kos rawatan', 'The cost of treatment')
        ],
        sum: L('Topik yang pesakit mahu bincang', 'Topics the patient wants to discuss') },

      { id: 'oneThing', type: 'textarea',
        q: L('Jika doktor hanya ada masa untuk satu perkara, apa yang anda mahu ia jadi?',
             'If the doctor only has time for one thing, what do you want it to be?'),
        hint: L('Tulis dalam perkataan anda sendiri. Satu atau dua baris sudah cukup.',
                'Write it in your own words. One or two lines is enough.'),
        sum: L('Keutamaan utama pesakit', 'Patient’s single priority') },

      { id: 'worry', type: 'textarea',
        q: L('Adakah ada perkara yang membimbangkan anda yang belum ditanya di sini?',
             'Is there anything worrying you that has not been asked about here?'),
        sum: L('Kebimbangan lain', 'Other concerns') },

      { id: 'question', type: 'textarea',
        q: L('Soalan yang anda mahu tanya doktor', 'A question you want to ask the doctor'),
        hint: L('Menulisnya sekarang bermakna anda tidak akan terlupa ketika di dalam bilik.',
                'Writing it now means you will not forget it once you are in the room.'),
        sum: L('Soalan pesakit', 'Patient’s question') }
    ]
  }
];
</script>
