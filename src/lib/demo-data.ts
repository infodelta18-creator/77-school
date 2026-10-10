import heroSchool from "@/assets/hero-school.jpg";
import heroClassroom from "@/assets/hero-classroom.jpg";
import heroAchievements from "@/assets/hero-achievements.jpg";

export const heroSlides = [
  {
    image: heroSchool,
    eyebrow: "215-sonli maktab",
    title: "Kelajak sari bilim bilan",
    description:
      "215-sonli umumiy o‘rta ta’lim maktabi — sifatli ta’lim, zamonaviy bilim va yuksak tarbiya maskani.",
  },
  {
    image: heroClassroom,
    eyebrow: "Zamonaviy ta’lim",
    title: "Zamonaviy bilim — mustahkam kelajak",
    description:
      "Yangi IT xonalari, laboratoriyalar va zamonaviy o‘quv qo‘llanmalari orqali o‘quvchilarga sifatli ta’lim beramiz.",
  },
  {
    image: heroAchievements,
    eyebrow: "Yutuqlarimiz",
    title: "O‘quvchilarimizning yutuqlari — g‘ururimiz",
    description:
      "Respublika va xalqaro miqyosdagi fan olimpiadalari, sport va ijodiy tanlovlar g‘oliblari bilan faxrlanamiz.",
  },
];

export const quickAccess = [
  { icon: "GraduationCap", title: "Qabul", desc: "1-sinfga qabul jarayonlari", href: "/ota-onalar-uchun" },
  { icon: "CalendarClock", title: "Dars jadvali", desc: "Sinflar bo‘yicha jadval", href: "/oquvchilar-uchun" },
  { icon: "FileText", title: "Hujjatlar", desc: "Rasmiy hujjatlar bazasi", href: "/hujjatlar" },
  { icon: "Users", title: "To‘garaklar", desc: "Fan va ijodiy to‘garaklar", href: "/oquvchilar-uchun" },
  { icon: "Mails", title: "Virtual qabulxona", desc: "Onlayn murojaat yuboring", href: "/virtual-qabulxona" },
  { icon: "Phone", title: "Bog‘lanish", desc: "Aloqa ma’lumotlari", href: "/boglanish" },
];

export const stats = [
  { label: "O‘quvchilar", value: 850, suffix: "+" },
  { label: "O‘qituvchilar", value: 65, suffix: "" },
  { label: "Sinflar", value: 32, suffix: "" },
  { label: "To‘garaklar", value: 15, suffix: "" },
];

export const news = [
  {
    slug: "fan-olimpiadasi-goliblari-taqdirlandi",
    title: "Fan olimpiadasi g‘oliblari taqdirlandi",
    excerpt:
      "Respublika fan olimpiadasi bosqichida maktabimiz o‘quvchilari yuqori natijalarni qo‘lga kiritdi.",
    date: "2026-09-05",
    category: "Yutuqlar",
    image: heroAchievements,
    featured: true,
  },
  {
    slug: "maktabimizda-ochiq-eshiklar-kuni-otkazildi",
    title: "Maktabimizda ochiq eshiklar kuni o‘tkazildi",
    excerpt:
      "Bo‘lajak birinchi sinf o‘quvchilarining ota-onalari uchun ochiq eshiklar kuni tashkil etildi.",
    date: "2026-08-28",
    category: "Maktab hayoti",
    image: heroSchool,
  },
  {
    slug: "sport-musobaqasida-oquvchilarimiz-golib-boldi",
    title: "Sport musobaqasida o‘quvchilarimiz g‘olib bo‘ldi",
    excerpt:
      "Tuman bo‘yicha o‘tkazilgan yengil atletika musobaqasida maktabimiz jamoasi 1-o‘rinni egalladi.",
    date: "2026-08-20",
    category: "Sport",
    image: heroClassroom,
  },
  {
    slug: "zamonaviy-it-xonasi-foydalanishga-topshirildi",
    title: "Zamonaviy IT xonasi foydalanishga topshirildi",
    excerpt:
      "Maktabimizda yangi kompyuter texnikasi bilan jihozlangan zamonaviy IT xonasi ochildi.",
    date: "2026-08-15",
    category: "Ta’lim",
    image: heroClassroom,
  },
  {
    slug: "kitobxonlik-haftaligi-boshlandi",
    title: "Kitobxonlik haftaligi boshlandi",
    excerpt:
      "An’anaviy kitobxonlik haftaligi doirasida qiziqarli tadbir va ko‘rgazmalar tashkil etildi.",
    date: "2026-08-10",
    category: "Tadbirlar",
    image: heroSchool,
  },
];

export const announcements = [
  {
    id: 1,
    date: "2026-09-10",
    title: "Ota-onalar yig‘ilishi",
    category: "Uchrashuv",
    importance: "Muhim",
    text: "12-sentabr kuni soat 15:00 da barcha sinflar uchun ota-onalar yig‘ilishi bo‘lib o‘tadi.",
  },
  {
    id: 2,
    date: "2026-09-01",
    title: "2026–2027 o‘quv yili uchun 1-sinfga qabul",
    category: "Qabul",
    importance: "Juda muhim",
    text: "Birinchi sinfga qabul jarayoni boshlandi. Kerakli hujjatlarni maktab qabulxonasiga topshiring.",
  },
  {
    id: 3,
    date: "2026-08-25",
    title: "Yakuniy nazorat ishlari jadvali",
    category: "Ta’lim",
    importance: "Oddiy",
    text: "9- va 11-sinflar uchun yakuniy nazorat ishlari jadvali e’lon qilindi.",
  },
  {
    id: 4,
    date: "2026-07-15",
    title: "Yozgi ta’til jadvali",
    category: "Ta’til",
    importance: "Oddiy",
    text: "Yozgi ta’til davri va navbatchilik jadvali bilan tanishib chiqing.",
  },
];

export const events = [
  { day: "12", month: "Sen", title: "Ota-onalar yig‘ilishi", location: "Aktzal", time: "15:00" },
  { day: "18", month: "Sen", title: "Sport musobaqasi", location: "Sport zali", time: "10:00" },
  { day: "01", month: "Okt", title: "Ustoz va murabbiylar kuni", location: "Aktzal", time: "12:00" },
  { day: "21", month: "Okt", title: "O‘zbek tili bayrami", location: "Maktab hovlisi", time: "11:00" },
];

export const teachersPreview = [
  { name: "Karimova Dilnoza", subject: "Matematika o‘qituvchisi", experience: "18 yil tajriba", category: "Oliy toifa" },
  { name: "Rasulov Bekzod", subject: "Informatika o‘qituvchisi", experience: "12 yil tajriba", category: "Birinchi toifa" },
  { name: "Ismoilova Mohira", subject: "Ingliz tili o‘qituvchisi", experience: "9 yil tajriba", category: "Oliy toifa" },
  { name: "Tursunov Akmal", subject: "Tarix o‘qituvchisi", experience: "22 yil tajriba", category: "Oliy toifa" },
];

export const achievements = [
  { year: "2026", title: "Respublika fan olimpiadasi", desc: "Matematika bo‘yicha 2-o‘rin", who: "Aliyev Sanjar, 10-sinf" },
  { year: "2026", title: "Viloyat sport musobaqasi", desc: "Yengil atletikada 1-o‘rin", who: "Maktab jamoasi" },
  { year: "2025", title: "IT tanlovi", desc: "Dasturlash bo‘yicha 3-o‘rin", who: "Yusupov Bekzod, 11-sinf" },
  { year: "2025", title: "Kitobxonlik tanlovi", desc: "Respublika bosqichi g‘olibi", who: "Sultonova Malika, 9-sinf" },
];

export const usefulLinks = [
  { title: "Maktabgacha va maktab ta’limi vazirligi", desc: "uzedu.uz", href: "https://uzedu.uz" },
  { title: "Yagona interaktiv davlat xizmatlari", desc: "my.gov.uz", href: "https://my.gov.uz" },
  { title: "ZiyoNET ta’lim tarmog‘i", desc: "ziyonet.uz", href: "https://ziyonet.uz" },
  { title: "Kundalik.com", desc: "Elektron kundalik", href: "https://kundalik.com" },
];
