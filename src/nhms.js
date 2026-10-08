<script>
/* ============================================================
   NATIONAL PICTURE — NHMS 2023

   Every figure on the dashboard tab, with the infographic it was
   read from. Unlike src/cpg.js, THIS FILE IS VERIFIED: each
   number below was read directly off the published Key Findings
   booklet, not transcribed from memory, so each carries
   v: 'nhms' rather than v: 'verify'.

   SOURCE, and only this one:
     Institute for Public Health 2024. National Health and
     Morbidity Survey (NHMS) 2023: Non-communicable Diseases and
     Healthcare Demand — Key Findings. Ministry of Health
     Malaysia. ISBN 978-967-5340-91-8.
     MOH/S/IKU/221.24(IL)-e.  NMRR-22-00545-XAC.
     https://iku.nih.gov.my/nhms-2023

   The `ref` on each block names the infographic number and page
   in that booklet, so any figure on screen can be checked against
   the source in under a minute.

   WHY THIS IS IN A PRE-CONSULTATION APP
     A patient who has just answered forty questions about their
     own diabetes is, for those few minutes, more interested in
     diabetes than they will be all year. The national picture is
     what turns "my sugar is high" into "I am one of 1 in 6, and
     two in five of us do not even know". It is also the honest
     frame for the questions this app just asked: the survey says
     most Malaysian adults eat too little fruit and vegetables,
     do not reach the activity target, and have never been
     screened — so a patient answering the same way is not a
     failure, they are the norm the clinic exists to shift.

     Nothing here is used to generate the doctor's note. The
     dashboard is education; the summary is clinical. They do not
     mix.
   ============================================================ */

var NHMS = {

  source: {
    v: 'nhms',
    short: 'NHMS 2023',
    full: L(
      'Institute for Public Health 2024. Tinjauan Kebangsaan Kesihatan dan Morbiditi (NHMS) 2023: Penyakit Tidak Berjangkit dan Permintaan Penjagaan Kesihatan — Dapatan Utama. Kementerian Kesihatan Malaysia. ISBN 978-967-5340-91-8.',
      'Institute for Public Health 2024. National Health and Morbidity Survey (NHMS) 2023: Non-communicable Diseases and Healthcare Demand — Key Findings. Ministry of Health Malaysia. ISBN 978-967-5340-91-8.'),
    url: 'https://iku.nih.gov.my/nhms-2023',
    method: L(
      '13,616 responden dewasa, kadar maklum balas 83.2%, dikumpul 11 Julai hingga 29 September 2023 daripada 5,006 unit tempat tinggal yang dipilih secara rawak.',
      '13,616 adult respondents, 83.2% response rate, collected 11 July to 29 September 2023 from 5,006 randomly selected living quarters.')
  },

  /* ── The three headline tiles ──────────────────────────── */
  headline: {
    v: 'nhms', ref: 'Infographic 05, p.5',
    dm: { big: '15.6%', lead: L('1 dalam 6', '1 in 6'),
          note: L('orang dewasa di Malaysia menghidap diabetes',
                  'adults in Malaysia have diabetes') },
    unaware: { big: '2 — 5', lead: L('2 daripada 5', '2 in 5'),
               note: L('orang dewasa yang menghidap diabetes tidak tahu mereka menghidapinya',
                       'adults with diabetes do not know that they have it') },
    control: { big: '56%', lead: L('56%', '56%'),
               note: L('daripada mereka yang tahu mereka menghidap diabetes tidak mempunyai kawalan gula yang baik',
                       'of those who know they have diabetes do not have good blood sugar control') }
  },

  /* ── Awareness gap, by age ─────────────────────────────── */
  unaware: {
    v: 'nhms', ref: 'Infographic 05, p.5',
    young: { pct: 84, note: L('daripada dewasa berumur 18–29 tahun yang menghidap diabetes tidak tahu mereka menghidapinya',
                              'of adults aged 18–29 with diabetes do not know that they have it') },
    meter: L('2 daripada 5 orang yang tahu mereka menghidap diabetes mempunyai alat penguji gula di rumah.',
             '2 in 5 of those who know they have diabetes have a glucometer at home.')
  },

  /* ── The other NCDs that travel with diabetes ──────────── */
  ncd: {
    v: 'nhms', ref: 'Infographics 04, 06 and 07, pp.4, 6, 7',
    rows: [
      { k: 'ow',   pct: 54.4, l: L('Berlebihan berat atau obes', 'Overweight or obese') },
      { k: 'ab',   pct: 54.5, l: L('Obesiti abdomen (ukuran pinggang)', 'Abdominal obesity (waist)') },
      { k: 'mets', pct: 35.9, l: L('Sindrom metabolik', 'Metabolic syndrome') },
      { k: 'chol', pct: 33.3, l: L('Kolesterol tinggi', 'High cholesterol') },
      { k: 'htn',  pct: 29.2, l: L('Darah tinggi', 'High blood pressure') },
      { k: 'mafld',pct: 28.2, l: L('Lemak berlebihan dalam hati (MAFLD)', 'Fatty liver (MAFLD)') },
      { k: 'dm',   pct: 15.6, l: L('Diabetes', 'Diabetes') }
    ],
    combos: L('Hampir 2.3 juta orang dewasa di Malaysia hidup dengan tiga penyakit tidak berjangkit sekali gus, dan lebih setengah juta dengan empat.',
              'Almost 2.3 million adults in Malaysia live with three non-communicable diseases at once, and over half a million with four.')
  },

  /* ── Not knowing: the figure that justifies screening ──── */
  hidden: {
    v: 'nhms', ref: 'Infographics 05, 06 and 07, pp.5, 6, 7',
    rows: [
      { pct: 50, l: L('Kolesterol tinggi', 'High cholesterol'),
        note: L('1 daripada 2 tidak tahu', '1 in 2 do not know') },
      { pct: 41, l: L('Darah tinggi', 'High blood pressure'),
        note: L('11.9% daripada 29.2%', '11.9% of 29.2%') },
      { pct: 40, l: L('Diabetes', 'Diabetes'),
        note: L('2 daripada 5 tidak tahu', '2 in 5 do not know') }
    ],
    lead: L('Ketiga-tiga penyakit ini boleh berlaku tanpa sebarang gejala. Itulah sebabnya saringan penting, dan sebabnya borang ini wujud.',
            'All three can be present with no symptoms at all. That is why screening matters, and why this form exists.')
  },

  /* ── Weight, 2011 to 2023 ──────────────────────────────── */
  trend: {
    v: 'nhms', ref: 'Infographic 08, p.8',
    ow:  { l: L('Berlebihan berat atau obes (BMI ≥ 25.0)', 'Overweight or obese (BMI ≥ 25.0)'),
           pts: [{ y: 2011, v: 44.5 }, { y: 2015, v: 47.7 }, { y: 2019, v: 50.1 }, { y: 2023, v: 54.4 }] },
    ab:  { l: L('Obesiti abdomen (lelaki ≥ 90 cm, perempuan ≥ 80 cm)',
                'Abdominal obesity (men ≥ 90 cm, women ≥ 80 cm)'),
           pts: [{ y: 2011, v: 45.4 }, { y: 2015, v: 48.6 }, { y: 2019, v: 52.6 }, { y: 2023, v: 54.5 }] },
    smoke: { l: L('Merokok tembakau semasa', 'Current tobacco smoking'),
             pts: [{ y: 2011, v: 23.1 }, { y: 2015, v: 22.8 }, { y: 2019, v: 21.3 }, { y: 2023, v: 19.0 }],
             target: L('Sasaran Malaysia: 15% atau kurang menjelang 2025.',
                       'Malaysia’s target: 15% or less by 2025.') }
  },

  /* ── The habits this questionnaire asks about ──────────── */
  habits: {
    v: 'nhms', ref: 'Infographics 09, 10, 12 and 13, pp.9, 10, 12, 13',
    rows: [
      { pct: 95.1, l: L('Makan buah dan sayur tidak mencukupi setiap hari',
                        'Eat inadequate fruit and vegetables daily'),
        note: L('purata 2 hidangan, bukan 5 yang disyorkan', 'an average of 2 servings, not the recommended 5') },
      { pct: 84,   l: L('Tidak berjalan atau berbasikal dari satu tempat ke tempat lain',
                        'Do not walk or cycle from one place to another') },
      { pct: 84,   l: L('Tidak aktif dalam sukan, kecergasan atau riadah',
                        'Not active in sports, fitness or leisure') },
      { pct: 50,   l: L('Gaya hidup sedentari', 'Lead a sedentary lifestyle'),
        note: L('lebih 2 jam sehari duduk atau baring ketika jaga',
                'over 2 hours a day sitting or lying down while awake') },
      { pct: 40,   l: L('Tiada saringan kesihatan dalam 12 bulan lepas',
                        'No health screening in the past 12 months'),
        note: L('saringan diabetes, darah tinggi atau kolesterol',
                'screening for diabetes, hypertension or cholesterol') },
      { pct: 38,   l: L('Tidur kurang daripada 7 jam', 'Sleep less than 7 hours') },
      { pct: 33,   l: L('Tidak aktif secara fizikal', 'Not physically active') },
      { pct: 19,   l: L('Merokok tembakau', 'Smoke tobacco') }
    ]
  },

  /* Why people skip screening. Read beside the habits above,
     this is the single most useful thing on the dashboard for a
     clinic: the barrier is not cost or access, it is feeling
     well. */
  whySkip: {
    v: 'nhms', ref: 'Infographic 12, p.12',
    rows: [
      { pct: 90, l: L('Rasa sihat', 'Feeling healthy') },
      { pct: 84, l: L('Tiada gejala', 'No symptoms') },
      { pct: 39, l: L('Kekangan masa', 'Time constraint') }
    ],
    lead: L('Tiga sebab teratas orang ramai tidak membuat saringan kesihatan. Dua yang pertama adalah sebab yang sama — dan diabetes, darah tinggi dan kolesterol tinggi ketiga-tiganya boleh berlaku tanpa rasa sakit.',
            'The top three reasons people do not get screened. The first two are the same reason — and diabetes, high blood pressure and high cholesterol can all be present without feeling anything at all.')
  },

  /* ── Metabolic syndrome, by weight band ────────────────── */
  mets: {
    v: 'nhms', ref: 'Infographic 25',
    lead: L('2 daripada 5 orang dewasa (35.9%, atau 8.5 juta) mempunyai sindrom metabolik — tiga atau lebih daripada lima perkara ini: obesiti abdomen, darah tinggi, gula tinggi, trigliserida tinggi, HDL rendah.',
            '2 in 5 adults (35.9%, or 8.5 million) have metabolic syndrome — three or more of these five: abdominal obesity, high blood pressure, high blood sugar, high triglycerides, low HDL.'),
    byBmi: [
      { pct: 4,  l: L('Kurang berat', 'Underweight') },
      { pct: 11, l: L('Berat normal', 'Normal weight') },
      { pct: 40, l: L('Berlebihan berat', 'Overweight') },
      { pct: 56, l: L('Obes', 'Obese') }
    ],
    note: L('Orang yang kurang berat dan berat normal juga boleh mendapat sindrom metabolik.',
            'Underweight and normal-weight people can get metabolic syndrome too.')
  },

  /* ── Mental health, because the form screens for it ────── */
  mood: {
    v: 'nhms', ref: 'Infographic 15, p.15',
    lead: L('Satu juta orang di Malaysia berumur 16 tahun ke atas mengalami kemurungan — 4.6%, dan jumlahnya berganda dua antara 2019 dan 2023.',
            'One million people in Malaysia aged 16 and over have depression — 4.6%, and the number doubled between 2019 and 2023.'),
    helpline: { label: L('Talian HEAL', 'HEAL helpline'), number: '15555' }
  }
};
</script>
