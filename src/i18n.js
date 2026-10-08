<script>
/* ============================================================
   PRA-KONSULTASI DIABETIK — INTERFACE STRINGS

   Chrome only: buttons, tab names, banners, consent text, export
   labels. Question wording does not live here -- each question
   carries its own pair of languages in schema.js, beside its
   options and its flag rule, so a question cannot be reworded in
   Malay without the English in front of the person doing it.

   Bahasa Malaysia is the default and English is one tap away,
   matching the rest of this site. Written for a patient, not a
   clinician: short sentences, no abbreviations the public would
   not know, and no word that assumes secondary education.
   ============================================================ */
var T = {

  app: {
    title: L('Pra-Konsultasi Klinik Diabetik', 'Diabetes Clinic Pre-Consultation'),
    sub: L('Hospital Tengku Permaisuri Norashikin, Kajang',
           'Hospital Tengku Permaisuri Norashikin, Kajang'),
    langBtn: L('English', 'Bahasa Malaysia'),
    langFlag: L('EN', 'MY')
  },

  tabs: {
    patient: L('Soalan Anda', 'Your Questions'),
    nurse:   L('Kaunter Jururawat', 'Nursing Station'),
    guide:   L('Tanya Panduan', 'Ask the Guideline'),
    quiz:    L('Kuiz Ringkas', 'Short Quiz'),
    summary: L('Ringkasan', 'Summary')
  },

  tabHint: {
    patient: L('Diisi oleh pesakit sementara menunggu',
               'Completed by the patient while waiting'),
    nurse:   L('Untuk kakitangan sahaja', 'Staff only'),
    guide:   L('Jawapan berdasarkan CPG sahaja', 'Answers drawn from the CPGs only'),
    quiz:    L('Lapan soalan, tiada markah direkod', 'Eight questions, no mark is recorded'),
    summary: L('Untuk doktor muat naik ke HIS', 'For the doctor to upload to the HIS')
  },

  /* ── Opening screen ──────────────────────────────────────── */
  welcome: {
    h: L('Selamat datang. Mari gunakan masa menunggu ini.',
         'Welcome. Let us put this wait to use.'),
    p1: L('Sementara menunggu nama anda dipanggil, sila jawab beberapa soalan tentang kencing manis anda. Jawapan anda dicetak menjadi satu ringkasan untuk doktor anda.',
          'While you wait for your name to be called, please answer some questions about your diabetes. Your answers are printed as one summary for your doctor.'),
    p2: L('Ini menjadikan masa bersama doktor lebih bernilai. Doktor tidak perlu bertanya semula perkara asas, dan boleh terus membincangkan apa yang penting kepada anda.',
          'This makes your time with the doctor worth more. The doctor does not have to ask the basics again, and can go straight to what matters to you.'),
    time: L('Lebih kurang 10 hingga 15 minit. Anda boleh berhenti dan sambung semula.',
            'About 10 to 15 minutes. You may stop and continue later.'),
    start: L('Mula', 'Start'),
    resume: L('Sambung di mana saya berhenti', 'Continue where I left off'),
    fresh: L('Mula semula dari kosong', 'Start again from blank')
  },

  /* ── Consent and privacy ─────────────────────────────────── */
  consent: {
    h: L('Sebelum mula — tentang maklumat anda', 'Before you start — about your information'),
    local: L('Jawapan anda disimpan di dalam peranti ini sahaja. Tiada apa-apa dihantar ke internet atau ke mana-mana pelayan.',
             'Your answers are held on this device only. Nothing is sent over the internet or to any server.'),
    purpose: L('Ia digunakan untuk satu tujuan sahaja: mencetak ringkasan untuk doktor anda hari ini.',
               'It is used for one purpose only: to print a summary for your doctor today.'),
    erase: L('Tekan "Padam semua" bila-bila masa untuk membuang segala-galanya. Sila padam selepas ringkasan diberi kepada doktor.',
             'Press "Erase everything" at any time to remove it all. Please erase it once the summary has been given to the doctor.'),
    pdpa: L('Dikendalikan menurut Akta Perlindungan Data Peribadi 2010.',
            'Handled in accordance with the Personal Data Protection Act 2010.'),
    optional: L('Setiap soalan boleh dilangkau. Anda tidak perlu menjawab apa yang anda tidak mahu jawab.',
                'Every question may be skipped. You need not answer anything you would rather not.'),
    agree: L('Saya faham, dan saya bersetuju mengisi borang ini.',
             'I understand, and I agree to complete this form.'),
    notDoctor: L('Borang ini bukan diagnosis dan tidak menggantikan pemeriksaan doktor.',
                 'This form is not a diagnosis and does not replace examination by a doctor.')
  },

  /* ── Red-flag banner ─────────────────────────────────────── */
  alert: {
    h: L('Sila beritahu kakitangan kaunter SEKARANG',
         'Please tell the counter staff NOW'),
    p: L('Daripada jawapan anda, ada perkara yang tidak patut ditunggu. Tunjukkan skrin ini kepada jururawat atau kakitangan kaunter sekarang. Jangan tunggu nama anda dipanggil.',
         'From your answers, there is something that should not wait. Show this screen to a nurse or the counter staff now. Do not wait for your name to be called.'),
    ed: L('Jika anda rasa sangat tidak sihat, pergi ke Jabatan Kecemasan atau hubungi 999.',
          'If you feel very unwell, go to the Emergency Department or call 999.'),
    ack: L('Saya sudah beritahu kakitangan', 'I have told the staff'),
    staffNote: L('Dibangkitkan daripada jawapan pesakit. Tidak disaring oleh klinisian.',
                 'Raised from the patient’s answers. Not screened by a clinician.')
  },

  /* ── Navigation ──────────────────────────────────────────── */
  nav: {
    back: L('Kembali', 'Back'),
    next: L('Seterusnya', 'Next'),
    done: L('Siap — buat ringkasan', 'Finish — make the summary'),
    section: L('Bahagian', 'Section'),
    of: L('daripada', 'of'),
    progress: L('Siap', 'Complete'),
    skipped: L('dilangkau', 'skipped'),
    jump: L('Pergi ke bahagian', 'Go to section'),
    saved: L('Disimpan', 'Saved'),
    optionalTag: L('pilihan', 'optional'),
    clear: L('Padam semua', 'Erase everything'),
    clearAsk: L('Padam semua jawapan daripada peranti ini? Ini tidak boleh dibatalkan.',
                'Erase all answers from this device? This cannot be undone.'),
    cleared: L('Semua jawapan telah dipadam.', 'All answers have been erased.')
  },

  /* ── Shared field furniture ──────────────────────────────── */
  f: {
    yes: L('Ya', 'Yes'),
    no: L('Tidak', 'No'),
    unsure: L('Tidak pasti', 'Not sure'),
    none: L('Tiada', 'None'),
    choose: L('Pilih satu', 'Choose one'),
    chooseAll: L('Pilih semua yang berkenaan', 'Choose all that apply'),
    other: L('Lain-lain', 'Other'),
    otherSpec: L('Lain-lain — sila nyatakan', 'Other — please state'),
    dontKnow: L('Saya tidak tahu', 'I do not know'),
    add: L('Tambah', 'Add'),
    addReading: L('Tambah bacaan', 'Add a reading'),
    addWeek: L('Tambah minggu', 'Add a week'),
    remove: L('Buang', 'Remove'),
    empty: L('Belum ada apa-apa dimasukkan.', 'Nothing entered yet.'),
    icHelp: L('12 angka, tanpa tanda sengkang', '12 digits, no dashes'),
    icBad: {
      length: L('Kad pengenalan perlu 12 angka.', 'The IC number needs 12 digits.'),
      date: L('Enam angka pertama bukan tarikh yang sah.', 'The first six digits are not a valid date.'),
      age: L('Tarikh lahir itu memberi umur yang tidak munasabah.', 'That date of birth gives an implausible age.')
    },
    icOk: L('Lahir {dob} · umur {age} · {sex}', 'Born {dob} · age {age} · {sex}'),
    male: L('Lelaki', 'Male'),
    female: L('Perempuan', 'Female'),
    show: L('Tunjuk', 'Show'),
    hide: L('Sembunyi', 'Hide'),
    mmol: L('mmol/L', 'mmol/L'),
    today: L('Hari ini', 'Today'),
    checkNums: L('Angka itu memberi keputusan yang mustahil. Sila semak berat dan tinggi anda.',
                 'Those numbers give an impossible result. Please check your weight and height.')
  },

  /* ── Home glucose chart ──────────────────────────────────── */
  glu: {
    h: L('Bacaan gula di rumah', 'Home glucose readings'),
    when: L('Bila diambil', 'When it was taken'),
    date: L('Tarikh', 'Date'),
    value: L('Bacaan (mmol/L)', 'Reading (mmol/L)'),
    ctx: {
      fasting: L('Berpuasa, sebelum sarapan', 'Fasting, before breakfast'),
      preMeal: L('Sebelum makan', 'Before a meal'),
      post2h:  L('2 jam selepas makan', '2 h after a meal'),
      bed:     L('Sebelum tidur', 'Before bed'),
      night:   L('Tengah malam', 'Middle of the night'),
      symptom: L('Ketika tidak sihat', 'When feeling unwell')
    },
    stats: {
      n: L('Bacaan dimasukkan', 'Readings entered'),
      mean: L('Purata', 'Average'),
      inRange: L('Dalam sasaran CPG', 'Within the CPG target'),
      lo: L('Terendah', 'Lowest'),
      hi: L('Tertinggi', 'Highest'),
      below: L('Bacaan bawah {n} mmol/L', 'Readings below {n} mmol/L')
    },
    band: L('Kawasan berlorek ialah sasaran CPG', 'The shaded band is the CPG target'),
    noneYet: L('Masukkan bacaan daripada buku rekod atau alat meter anda. Walaupun tiga atau empat bacaan membantu doktor.',
               'Enter readings from your logbook or your meter. Even three or four readings help the doctor.')
  },

  /* ── Steps chart ─────────────────────────────────────────── */
  steps: {
    h: L('Langkah harian', 'Daily steps'),
    week: L('Minggu', 'Week'),
    avg: L('Purata langkah sehari', 'Average steps per day'),
    thisWeek: L('Minggu ini', 'This week'),
    wkAgo: L('{n} minggu lepas', '{n} weeks ago'),
    proxy: L('Langkah bukan sasaran CPG. CPG menetapkan minit senaman, dan langkah hanya dijadikan petunjuk kasar.',
             'Steps are not a CPG target. The CPG prescribes minutes of exercise; steps are used only as a rough indication.'),
    noneYet: L('Jika telefon atau jam anda mengira langkah, masukkan purata bagi setiap minggu.',
               'If your phone or watch counts steps, enter the average for each week.')
  },

  /* ── Nursing tab ─────────────────────────────────────────── */
  nurse: {
    gateH: L('Tab kakitangan', 'Staff tab'),
    gateP: L('Tab ini untuk kakitangan klinik. Masukkan kod kaunter.',
             'This tab is for clinic staff. Enter the counter code.'),
    gateNote: L('Kod ini hanya menghalang pesakit tersalah masuk. Ia bukan kawalan keselamatan: borang ini berjalan sepenuhnya di dalam pelayar, jadi sesiapa yang membuka kod sumber halaman boleh melihat kod kaunter. Jangan gunakan kod yang sama dengan mana-mana sistem lain.',
             'This code only keeps patients from wandering in. It is not a security control: this form runs entirely in the browser, so anyone who opens the page source can read the counter code. Do not reuse a code from any other system.'),
    code: L('Kod kaunter', 'Counter code'),
    enter: L('Masuk', 'Enter'),
    wrong: L('Kod salah.', 'That code is not right.'),
    lock: L('Kunci tab ini', 'Lock this tab'),
    h: L('Rekod kaunter jururawat', 'Nursing station record'),
    p: L('Diisi oleh jururawat selepas pesakit menyiapkan borang. Nilai di luar julat akan ditanda serta-merta.',
         'Completed by the nurse after the patient finishes the form. Values outside range are flagged at once.'),
    patientRef: L('Pesakit pada peranti ini', 'Patient on this device'),
    noPatient: L('Belum ada borang pesakit diisi pada peranti ini. Catatan masih boleh dimasukkan.',
                 'No patient form has been completed on this device. Observations may still be entered.'),
    bpMean: L('Purata dua bacaan', 'Mean of the two readings'),
    aboveTarget: L('Melebihi sasaran CPG {t}', 'Above the CPG target of {t}'),
    atTarget: L('Mencapai sasaran CPG {t}', 'At the CPG target of {t}'),
    flagged: L('Perlu perhatian segera', 'Needs attention now'),
    counterH: L('Pautan untuk kaunter pendaftaran', 'Link for the registration counter'),
    counterP: L('Imbas kod ini untuk membuka borang pada telefon pesakit. Cetak dan letakkan di kaunter pendaftaran.',
                'Scan this code to open the form on the patient’s phone. Print it and stand it on the registration counter.'),
    counterScan: L('Imbas untuk mula', 'Scan to begin'),
    print: L('Cetak kad kaunter', 'Print the counter card'),
    staffId: L('Direkod oleh', 'Recorded by'),
    footH: L('Pemeriksaan kaki', 'Foot examination'),
    right: L('Kanan', 'Right'),
    left: L('Kiri', 'Left')
  },

  /* ── Guideline tab ───────────────────────────────────────── */
  guide: {
    h: L('Tanya panduan rawatan', 'Ask the treatment guideline'),
    p: L('Ini ialah buku panduan rasmi yang doktor anda guna untuk merawat kencing manis dan berat badan di Malaysia. Anda boleh bertanya dalam Bahasa Malaysia atau English, dan jawapan diambil daripada dua dokumen itu sahaja.',
         'This is the official guidance your doctor uses to treat diabetes and weight in Malaysia. You may ask in Malay or English, and the answers are drawn from those two documents only.'),
    why: L('Kerana ia hanya membaca dua dokumen itu, jawapannya jauh lebih kecil kemungkinan untuk mencipta fakta palsu berbanding chatbot biasa. Namun ia masih sebuah mesin: sahkan apa-apa yang penting dengan doktor anda.',
           'Because it reads only those two documents, its answers are far less likely to invent a fact than an ordinary chatbot. It is still a machine: check anything important with your doctor.'),
    open: L('Buka panduan', 'Open the guideline'),
    openNew: L('Terbuka dalam tab baharu', 'Opens in a new tab'),
    signin: L('Jika ia meminta anda log masuk Google, anda masih boleh membaca panduan itu. Jika tidak mahu log masuk, tanya doktor anda soalan itu.',
              'If it asks you to sign in to Google, you can still read the guideline. If you would rather not sign in, ask your doctor the question instead.'),
    docsH: L('Dua dokumen itu', 'The two documents'),
    askH: L('Soalan yang berguna untuk ditanya', 'Questions worth asking'),
    askP: L('Tekan untuk menyalin, kemudian tampal ke dalam panduan.',
            'Tap to copy, then paste it into the guideline.'),
    copied: L('Disalin', 'Copied'),
    limitH: L('Apa yang alat ini tidak boleh buat', 'What this tool cannot do'),
    limit1: L('Ia tidak tahu apa-apa tentang anda — bukan ubat anda, bukan keputusan ujian anda.',
              'It knows nothing about you — not your medicines, not your results.'),
    limit2: L('Ia tidak boleh memberi diagnosis, menukar ubat, atau memberi nasihat khusus untuk anda.',
              'It cannot diagnose, change a medicine, or give advice specific to you.'),
    limit3: L('Ia tidak boleh membantu dalam keadaan kecemasan. Untuk itu, hubungi 999.',
              'It cannot help in an emergency. For that, call 999.')
  },

  /* ── Quiz ────────────────────────────────────────────────── */
  quiz: {
    h: L('Kuiz ringkas tentang kencing manis', 'A short quiz about diabetes'),
    p: L('Lapan soalan. Tiada markah disimpan dan tiada siapa diberitahu. Tujuannya satu sahaja: memberi anda perkara untuk ditanya kepada doktor nanti.',
         'Eight questions. No mark is kept and nobody is told. It has one purpose: to give you something to ask the doctor about.'),
    start: L('Mula kuiz', 'Start the quiz'),
    q: L('Soalan', 'Question'),
    correct: L('Betul', 'Correct'),
    wrong: L('Belum betul', 'Not quite'),
    why: L('Sebabnya', 'Why'),
    src: L('Sumber', 'Source'),
    next: L('Soalan seterusnya', 'Next question'),
    finish: L('Lihat keputusan', 'See the result'),
    scoreH: L('Anda jawab {n} daripada {t} dengan betul', 'You answered {n} of {t} correctly'),
    again: L('Cuba lagi', 'Try again'),
    band: {
      hi: L('Bagus. Anda sudah tahu asasnya — tanya doktor tentang perkara yang lebih mendalam.',
            'Well done. You know the basics — ask the doctor about the deeper things.'),
      mid: L('Permulaan yang baik. Bawa soalan yang anda tersilap itu kepada doktor.',
             'A good start. Take the ones you got wrong to the doctor.'),
      lo: L('Tidak mengapa. Perkara ini memang jarang diterangkan dengan jelas. Tanya doktor hari ini.',
            'That is all right. These things are rarely explained clearly. Ask the doctor today.')
    },
    carry: L('Masukkan topik yang saya tersilap ke dalam ringkasan doktor',
             'Put the topics I got wrong into the doctor’s summary'),
    carryOn: L('Topik itu akan dicetak pada ringkasan.',
               'Those topics will be printed on the summary.')
  },

  /* ── Summary tab ─────────────────────────────────────────── */
  sum: {
    h: L('Ringkasan untuk doktor', 'Summary for the doctor'),
    p: L('Tunjukkan skrin ini kepada doktor anda, atau serahkan salinan bercetak.',
         'Show this screen to your doctor, or hand over a printed copy.'),
    staffH: L('Untuk kakitangan', 'For staff'),
    staffP: L('Salin teks ke dalam HIS, atau cetak sebagai PDF untuk dilampirkan.',
              'Copy the text into the HIS, or print to PDF to attach.'),
    copy: L('Salin teks', 'Copy the text'),
    copied: L('Teks disalin ke papan klip', 'The text is copied to the clipboard'),
    copyFail: L('Tidak dapat menyalin. Tandakan teks di bawah dan salin secara manual.',
                'Could not copy. Select the text below and copy it manually.'),
    txt: L('Muat turun .txt', 'Download .txt'),
    pdf: L('Cetak / simpan PDF', 'Print / save as PDF'),
    pdfHow: L('Dalam dialog cetakan, pilih "Simpan sebagai PDF" sebagai pencetak.',
              'In the print dialog, choose "Save as PDF" as the printer.'),
    empty: L('Borang pesakit belum diisi. Ringkasan akan muncul di sini setelah ada jawapan.',
             'The patient form has not been completed. The summary will appear here once there are answers.'),
    incomplete: L('Borang belum siap sepenuhnya — {n} bahagian masih kosong. Ringkasan masih boleh digunakan dan menyatakan apa yang tidak dijawab.',
                  'The form is not fully complete — {n} sections are still blank. The summary can still be used and states what was not answered.'),
    unverified: L('{n} nilai klinikal di dalam aplikasi ini belum disahkan semula terhadap PDF CPG. Jangan gunakan ringkasan ini untuk keputusan klinikal sebelum pengesahan itu dibuat.',
                  '{n} clinical values in this application have not been re-checked against the CPG PDFs. Do not use this summary for a clinical decision until that check is done.'),
    icMasked: L('Kad pengenalan ditutup di skrin. Salinan penuh ada di dalam fail yang dimuat turun.',
                'The IC number is masked on screen. The full number is in the downloaded file.')
  },

  foot: {
    not: L('Aplikasi ini bukan peranti perubatan. Ia tidak membuat diagnosis dan tidak memberi rawatan.',
           'This application is not a medical device. It does not diagnose and it does not treat.'),
    ground: L('Semua kandungan klinikal diambil daripada dua CPG Kementerian Kesihatan Malaysia yang disenaraikan, dan tiada sumber lain.',
              'All clinical content is drawn from the two Ministry of Health Malaysia CPGs listed, and from no other source.'),
    build: L('Binaan', 'Build')
  }
};
</script>
