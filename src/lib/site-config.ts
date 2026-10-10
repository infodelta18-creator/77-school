// Central config so the site is reusable across schools.
export const siteConfig = {
  schoolName: "215-sonli umumiy o‘rta ta’lim maktabi",
  shortName: "215-maktab",
  schoolNumber: "215",
  country: "O‘zbekiston Respublikasi",
  city: "Toshkent shahri",
  district: "Chilonzor tumani",
  address: "Toshkent shahri, Chilonzor tumani",
  phone: "+998 71 000-00-00",
  trustLine: "+998 71 000-00-01",
  email: "info@215maktab.uz",
  workingHours: "Dushanba – Shanba, 08:00 – 18:00",
  ministry: "Maktabgacha va maktab ta’limi vazirligi",
  socials: {
    telegram: "https://t.me/",
    facebook: "https://facebook.com/",
    youtube: "https://youtube.com/",
    instagram: "https://instagram.com/",
  },
  principal: {
    fullName: "Abdullayev Anvar Akmalovich",
    title: "Direktor",
  },
} as const;

export type Locale = "uz" | "ru" | "en";
