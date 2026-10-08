<script>
/* ============================================================
   PRA-KONSULTASI DIABETIK — SHORT QUIZ

   Eight questions, pitched at a member of the public with no
   medical training. Every answer and every explanation comes from
   the two CPGs, and every number is read from CPG.* rather than
   typed here, so a correction in cpg.js corrects the quiz too.

   The quiz is not an assessment. No mark is stored, nothing is
   reported, and the patient is told so. Its purpose is to leave
   the patient holding a question for the doctor, which is why
   every item carries a `topic` -- the subjects a patient got
   wrong can be carried onto the doctor's summary, with consent,
   as a teaching list. That is the only output.

   Writing rules followed here:
     - one idea per question;
     - distractors are the things patients actually believe, not
       absurd options, because an absurd option teaches nothing;
     - explanations say what to do, not what the evidence grade is;
     - nothing asks the patient to do arithmetic.
   ============================================================ */

var QUIZ = [

  {
    id: 'q_hba1c',
    topic: L('Apa itu HbA1c', 'What HbA1c means'),
    q: L('Ujian darah "HbA1c" memberitahu doktor tentang apa?',
         'What does the blood test "HbA1c" tell the doctor?'),
    opts: [
      L('Paras gula anda pada saat darah diambil', 'Your sugar level at the moment the blood was taken'),
      L('Purata gula anda sepanjang kira-kira tiga bulan lepas', 'Your average sugar over roughly the last three months'),
      L('Berapa banyak gula yang anda makan minggu lepas', 'How much sugar you ate last week'),
      L('Sama ada buah pinggang anda rosak', 'Whether your kidneys are damaged')
    ],
    ans: 1,
    why: L('HbA1c menunjukkan purata gula lebih kurang tiga bulan, bukan bacaan hari itu. Sebab itulah ia tidak berubah walaupun anda berpuasa sehari sebelum ujian. Bacaan jari di rumah menunjukkan saat itu; HbA1c menunjukkan corak keseluruhan.',
            'HbA1c shows your average sugar over about three months, not the reading on the day. That is why it does not change even if you fast the day before the test. A fingerprick at home shows the moment; HbA1c shows the whole pattern.'),
    src: 'T2DM'
  },

  {
    id: 'q_hypo',
    topic: L('Rawatan gula rendah', 'Treating low sugar'),
    q: L('Gula anda jatuh rendah dan anda rasa menggigil dan berpeluh. Anda masih boleh menelan. Apa yang patut anda buat dahulu?',
         'Your sugar has dropped low and you feel shaky and sweaty. You can still swallow. What should you do first?'),
    opts: [
      L('Baring dan tunggu ia hilang', 'Lie down and wait for it to pass'),
      L('Terus makan sepinggan nasi penuh', 'Eat a full plate of rice straight away'),
      L('Ambil kira-kira ' + CPG.hypo.rule15.carb_g + ' gram gula cepat — contohnya tiga biji gula-gula atau setengah gelas air manis — kemudian uji semula selepas ' + CPG.hypo.rule15.recheck_min + ' minit',
        'Take about ' + CPG.hypo.rule15.carb_g + ' grams of fast sugar — three sweets or half a glass of a sweet drink — then test again after ' + CPG.hypo.rule15.recheck_min + ' minutes'),
      L('Suntik insulin untuk membetulkannya', 'Inject insulin to correct it')
    ],
    ans: 2,
    why: L('Panduan menetapkan kira-kira ' + CPG.hypo.rule15.carb_g + ' gram karbohidrat yang cepat diserap, kemudian uji semula selepas ' +
            CPG.hypo.rule15.recheck_min + ' minit, dan ulang jika masih rendah. Nasi terlalu perlahan untuk saat itu. Insulin akan menurunkan gula lagi dan itu berbahaya. Menunggu sambil baring juga berbahaya kerana anda mungkin hilang kesedaran.',
           'The guideline sets about ' + CPG.hypo.rule15.carb_g + ' grams of rapidly absorbed carbohydrate, then a repeat test after ' +
            CPG.hypo.rule15.recheck_min + ' minutes, and the same again if it is still low. Rice is too slow for that moment. Insulin would push the sugar lower still, which is dangerous. Lying down and waiting is also dangerous, because you may lose consciousness.'),
    src: 'T2DM'
  },

  {
    id: 'q_eyes',
    topic: L('Saringan mata', 'Eye screening'),
    q: L('Penglihatan anda nampak baik. Berapa kerap mata anda patut diperiksa untuk kerosakan kencing manis?',
         'Your eyesight seems fine. How often should your eyes be examined for diabetes damage?'),
    opts: [
      L('Hanya apabila penglihatan mula kabur', 'Only when the vision starts to blur'),
      L('Sekali setiap ' + CPG.screening.eye.months + ' bulan, walaupun penglihatan nampak baik',
        'Once every ' + CPG.screening.eye.months + ' months, even when the sight seems fine'),
      L('Sekali setiap lima tahun', 'Once every five years'),
      L('Hanya jika anda mengambil insulin', 'Only if you are on insulin')
    ],
    ans: 1,
    why: L('Retinopati diabetik merosakkan mata tanpa menyebabkan apa-apa gejala sampai kerosakan itu sukar dipulihkan. Itulah sebabnya panduan meminta pemeriksaan retina setiap ' +
            CPG.screening.eye.months + ' bulan bermula ' + CPG.screening.eye.at.ms +
            ', bukan menunggu penglihatan berubah. Menunggu sampai kabur bermakna menunggu terlalu lama.',
           'Diabetic retinopathy damages the eye without causing any symptom until the damage is hard to reverse. That is why the guideline asks for a retinal examination every ' +
            CPG.screening.eye.months + ' months starting ' + CPG.screening.eye.at.en +
            ', rather than waiting for the vision to change. Waiting for blurring means waiting too long.'),
    src: 'T2DM'
  },

  {
    id: 'q_activity',
    topic: L('Berapa banyak senaman', 'How much exercise'),
    q: L('Berapa banyak pergerakan sederhana — berjalan pantas sehingga nafas lebih cepat — yang disyorkan dalam seminggu?',
         'How much moderate movement — brisk walking, enough to breathe faster — is recommended in a week?'),
    opts: [
      L('Kira-kira 30 minit seminggu', 'About 30 minutes a week'),
      L('Kira-kira ' + CPG.activity.minPerWeek + ' minit seminggu', 'About ' + CPG.activity.minPerWeek + ' minutes a week'),
      L('Kira-kira 10 jam seminggu', 'About 10 hours a week'),
      L('Senaman tidak mempengaruhi gula', 'Exercise does not affect sugar')
    ],
    ans: 1,
    why: L('Sasarannya kira-kira ' + CPG.activity.minPerWeek + ' minit seminggu — lebih kurang 30 minit pada lima hari. Satu perkara lagi yang sama penting: jangan biarkan lebih ' +
            CPG.activity.maxGapDays + ' hari berturut-turut tanpa bergerak, kerana kesan menurunkan gula hanya bertahan beberapa hari. Panduan juga meminta latihan menguatkan otot ' +
            CPG.activity.resistanceSessions + ' kali seminggu.',
           'The target is about ' + CPG.activity.minPerWeek + ' minutes a week — roughly 30 minutes on five days. One thing matters just as much: do not let more than ' +
            CPG.activity.maxGapDays + ' days pass in a row without moving, because the sugar-lowering effect only lasts a few days. The guideline also asks for muscle-strengthening exercise ' +
            CPG.activity.resistanceSessions + ' times a week.'),
    src: 'T2DM'
  },

  {
    id: 'q_plate',
    topic: L('Kaedah pinggan', 'The plate method'),
    q: L('Menggunakan kaedah pinggan, berapa banyak pinggan anda sepatutnya sayur?',
         'Using the plate method, how much of your plate should be vegetables?'),
    opts: [
      L('Kira-kira satu perempat', 'About a quarter'),
      L('Kira-kira separuh', 'About half'),
      L('Sayur tidak penting selagi anda mengurangkan nasi', 'Vegetables do not matter as long as you cut the rice'),
      L('Keseluruhan pinggan', 'The whole plate')
    ],
    ans: 1,
    why: L('Kaedah pinggan membahagikan hidangan: kira-kira separuh pinggan sayur, satu perempat untuk sumber protein seperti ikan, ayam atau kacang, dan satu perempat untuk nasi atau mi. Ini mengurangkan karbohidrat tanpa menimbang apa-apa dan tanpa mengira kalori. Ia juga bermakna anda tidak perlu makan kurang — anda makan berbeza.',
            'The plate method divides the meal: about half the plate as vegetables, a quarter for a protein such as fish, chicken or pulses, and a quarter for rice or noodles. It cuts carbohydrate without weighing anything and without counting calories. It also means you need not eat less — you eat differently.'),
    src: 'T2DM'
  },

  {
    id: 'q_symptoms',
    topic: L('Tinggi berbanding rendah', 'High versus low sugar'),
    q: L('Antara berikut, yang mana tanda gula TERLALU RENDAH, bukan terlalu tinggi?',
         'Which of these is a sign that sugar is TOO LOW, rather than too high?'),
    opts: [
      L('Dahaga yang tidak hilang dan kerap kencing', 'Thirst that will not go away, and passing urine often'),
      L('Berpeluh sejuk, menggigil dan berdebar secara mengejut', 'Cold sweating, shaking and a pounding heart, coming on suddenly'),
      L('Luka yang lambat sembuh', 'A wound that heals slowly'),
      L('Penglihatan kabur yang berlarutan berbulan-bulan', 'Blurred vision over several months')
    ],
    ans: 1,
    why: L('Gula rendah datang dengan cepat: berpeluh, menggigil, berdebar, lapar mengejut, keliru. Gula tinggi datang dengan perlahan: dahaga, kerap kencing, letih, luka lambat sembuh. Perbezaan ini penting kerana rawatannya bertentangan. Jika anda tidak pasti dan ada alat meter, uji dahulu; jika tiada alat dan anda rasa gejala rendah, rawat seperti rendah.',
            'Low sugar comes on quickly: sweating, shaking, pounding heart, sudden hunger, confusion. High sugar comes on slowly: thirst, passing urine often, tiredness, slow-healing wounds. The difference matters because the treatments are opposite. If you are unsure and have a meter, test first; if you have no meter and feel the low symptoms, treat it as low.'),
    src: 'T2DM'
  },

  {
    id: 'q_feet',
    topic: L('Penjagaan kaki', 'Foot care'),
    q: L('Yang mana amalan penjagaan kaki yang BETUL bagi penghidap kencing manis?',
         'Which is the CORRECT foot-care practice for someone with diabetes?'),
    opts: [
      L('Mencelup kaki dalam air panas untuk melembutkan kulit keras', 'Soaking the feet in hot water to soften hard skin'),
      L('Memotong kulit keras dan kalus sendiri dengan pisau', 'Cutting away hard skin and callus yourself with a blade'),
      L('Melihat seluruh kaki setiap hari, termasuk tapak dan celah jari', 'Looking at the whole foot every day, including the sole and between the toes'),
      L('Berkaki ayam di dalam rumah supaya kaki boleh bernafas', 'Going barefoot indoors so the feet can breathe')
    ],
    ans: 2,
    why: L('Apabila saraf kaki rosak, kaki berhenti memberi amaran. Luka boleh terbentuk tanpa rasa sakit sama sekali, jadi mata mesti menggantikan rasa: lihat kaki setiap hari, termasuk tapak dan celah jari, dan gunakan cermin atau minta bantuan jika anda tidak dapat melihatnya. Air panas boleh melecurkan kaki yang kebas tanpa anda sedar. Memotong kalus sendiri membuka luka. Berkaki ayam, walaupun di dalam rumah, ialah cara kaki yang kebas terluka.',
            'When the nerves in the foot are damaged, the foot stops giving warnings. A wound can form with no pain at all, so the eyes must do the work the feeling used to do: look at the feet every day, soles and between the toes included, using a mirror or asking for help if you cannot see them. Hot water can scald a numb foot without your knowing. Cutting callus yourself opens a wound. Going barefoot, even indoors, is how a numb foot gets injured.'),
    src: 'T2DM'
  },

  {
    id: 'q_waist',
    topic: L('Ukuran pinggang', 'Waist measurement'),
    q: L('Bagi orang Asia, pinggang dianggap terlalu besar bermula pada ukuran mana?',
         'For Asians, a waist is counted as too large starting from which measurement?'),
    opts: [
      L('Lelaki ' + CPG.waist.male + ' cm, perempuan ' + CPG.waist.female + ' cm',
        'Men ' + CPG.waist.male + ' cm, women ' + CPG.waist.female + ' cm'),
      L('Lelaki 102 cm, perempuan 88 cm', 'Men 102 cm, women 88 cm'),
      L('Ukuran pinggang tidak penting selagi berat badan normal', 'Waist does not matter as long as the weight is normal'),
      L('Sama bagi semua orang di seluruh dunia', 'The same for everybody worldwide')
    ],
    ans: 0,
    why: L('Panduan obesiti Malaysia menggunakan nilai Asia, yang lebih rendah daripada nilai antarabangsa: ' +
            CPG.waist.male + ' cm bagi lelaki dan ' + CPG.waist.female +
            ' cm bagi perempuan. Sebabnya, pada berat badan yang sama, orang Asia cenderung menyimpan lebih banyak lemak di sekeliling organ dalam perut, dan lemak itulah yang paling kuat kaitannya dengan kencing manis dan penyakit jantung. Atas sebab yang sama, obesiti dikira bermula pada BMI ' +
            CPG.bmi.obeseFrom + ' dan bukan 30.',
           'The Malaysian obesity guideline uses the Asian values, which are lower than the international ones: ' +
            CPG.waist.male + ' cm for men and ' + CPG.waist.female +
            ' cm for women. The reason is that at the same body weight, Asians tend to carry more fat around the organs inside the abdomen, and it is that fat which is most strongly tied to diabetes and heart disease. For the same reason, obesity is counted from a BMI of ' +
            CPG.bmi.obeseFrom + ' rather than 30.'),
    src: 'OBES'
  }
];
</script>
