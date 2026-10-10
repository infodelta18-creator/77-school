import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export const LOCALES = ["uz", "ru", "en"] as const;
export type Locale = (typeof LOCALES)[number];

const LANGUAGE_STORAGE_KEY = "school.locale";

type TranslationKey =
  | "lang.uz"
  | "lang.ru"
  | "lang.en"
  | "nav.home"
  | "nav.about"
  | "nav.leadership"
  | "nav.teachers"
  | "nav.news"
  | "nav.announcements"
  | "nav.students"
  | "nav.parents"
  | "nav.documents"
  | "nav.gallery"
  | "nav.contact"
  | "header.trustPhone"
  | "header.accessibility"
  | "header.search"
  | "header.menuOpen"
  | "header.menuClose"
  | "header.mainNav"
  | "header.mobileNav"
  | "footer.officialSite"
  | "footer.quickLinks"
  | "footer.description"
  | "footer.forUsers"
  | "footer.contact"
  | "footer.aboutSchool"
  | "footer.news"
  | "footer.teachers"
  | "footer.documents"
  | "footer.gallery"
  | "footer.forStudents"
  | "footer.forParents"
  | "footer.reception"
  | "footer.virtualReception"
  | "footer.announcements"
  | "footer.rights"
  | "footer.regulations"
  | "footer.contactLink"
  | "about.pageTitle"
  | "about.breadcrumbHome"
  | "about.breadcrumbCurrent"
  | "about.pageDescription"
  | "about.historyEyebrow"
  | "about.historyTitle"
  | "about.missionTitle"
  | "about.visionTitle"
  | "about.infrastructureEyebrow"
  | "about.infrastructureTitle"
  | "about.infrastructureDescription"
  | "about.stats.foundedYear"
  | "about.stats.studentsCount"
  | "about.stats.teachersCount"
  | "about.stats.classroomsCount"
  | "about.loading"
  | "about.error"
  | "about.empty"
  | "home.hero.slide1.eyebrow"
  | "home.hero.slide1.title"
  | "home.hero.slide1.description"
  | "home.hero.slide2.eyebrow"
  | "home.hero.slide2.title"
  | "home.hero.slide2.description"
  | "home.hero.slide3.eyebrow"
  | "home.hero.slide3.title"
  | "home.hero.slide3.description"
  | "home.hero.about"
  | "home.hero.contact"
  | "home.hero.previous"
  | "home.hero.next"
  | "home.announcement.badge"
  | "home.announcement.text"
  | "home.announcement.cta"
  | "home.quickAccess.eyebrow"
  | "home.quickAccess.title"
  | "home.stats.students"
  | "home.stats.teachers"
  | "home.stats.classrooms"
  | "home.stats.clubs"
  | "home.news.eyebrow"
  | "home.news.title"
  | "home.news.viewAll"
  | "home.principal.eyebrow"
  | "home.principal.title"
  | "home.principal.quote"
  | "home.principal.cta"
  | "home.announcements.eyebrow"
  | "home.announcements.title"
  | "home.announcements.subtitle"
  | "home.events.eyebrow"
  | "home.events.title"
  | "home.events.subtitle"
  | "home.teachers.eyebrow"
  | "home.teachers.title"
  | "home.teachers.description"
  | "home.teachers.viewAll"
  | "home.achievements.eyebrow"
  | "home.achievements.title"
  | "home.gallery.eyebrow"
  | "home.gallery.title"
  | "home.gallery.viewAll"
  | "home.links.eyebrow"
  | "home.links.title"
  | "home.contact.eyebrow"
  | "home.contact.title"
  | "home.contact.callNow"
  | "home.contact.getDirections"
  | "home.contact.address"
  | "home.contact.phone"
  | "home.contact.email"
  | "home.contact.workingHours"
  | "home.contact.mapTitle"
  | "leadership.pageTitle"
  | "leadership.breadcrumbHome"
  | "leadership.description"
  | "leadership.loading"
  | "leadership.error"
  | "leadership.empty"
  | "leadership.receptionLabel"
  | "teachers.pageTitle"
  | "teachers.breadcrumbHome"
  | "teachers.description"
  | "teachers.loading"
  | "teachers.error"
  | "teachers.searchPlaceholder"
  | "teachers.allDepartments"
  | "teachers.noResults"
  | "teachers.subjectMissing"
  | "teachers.qualificationMissing"
  | "teachers.experience"
  | "teachers.experienceYears"
  | "teachers.qualification"
  | "contact.pageTitle"
  | "contact.breadcrumbHome"
  | "contact.description"
  | "contact.address"
  | "contact.phone"
  | "contact.email"
  | "contact.workingHours"
  | "contact.mapTitle"
  | "contact.formTitle"
  | "contact.formDescription"
  | "contact.successTitle"
  | "contact.successBody"
  | "contact.errorBody"
  | "contact.submit"
  | "contact.submitting"
  | "contact.field.name"
  | "contact.field.phone"
  | "contact.field.email"
  | "contact.field.subject"
  | "contact.field.message"
  | "contact.field.required"
  | "contact.validation.nameShort"
  | "contact.validation.nameLong"
  | "contact.validation.phoneInvalid"
  | "contact.validation.phoneLong"
  | "contact.validation.emailInvalid"
  | "contact.validation.emailLong"
  | "contact.validation.subjectShort"
  | "contact.validation.subjectLong"
  | "contact.validation.messageShort"
  | "contact.validation.messageLong"
  | "reception.pageTitle"
  | "reception.breadcrumbHome"
  | "reception.description"
  | "reception.successTitle"
  | "reception.successBody"
  | "reception.requestNumber"
  | "reception.errorBody"
  | "reception.submitting"
  | "reception.submit"
  | "reception.field.name"
  | "reception.field.phone"
  | "reception.field.email"
  | "reception.field.type"
  | "reception.field.subject"
  | "reception.field.message"
  | "reception.field.attachment"
  | "reception.field.consent"
  | "reception.field.website"
  | "reception.validation.nameShort"
  | "reception.validation.nameLong"
  | "reception.validation.phoneInvalid"
  | "reception.validation.phoneLong"
  | "reception.validation.emailInvalid"
  | "reception.validation.emailLong"
  | "reception.validation.subjectShort"
  | "reception.validation.subjectLong"
  | "reception.validation.messageShort"
  | "reception.validation.messageLong"
  | "reception.validation.attachmentType"
  | "reception.validation.attachmentSize"
  | "reception.validation.consent"
  | "reception.validation.type"
  | "reception.options.application"
  | "reception.options.complaint"
  | "reception.options.suggestion"
  | "reception.options.info"
  | "reception.privacy"
  | "reception.secure"
  | "announcements.pageTitle"
  | "announcements.breadcrumbHome"
  | "announcements.description"
  | "announcements.loading"
  | "announcements.error"
  | "announcements.empty"
  | "announcements.critical"
  | "announcements.important"
  | "announcements.normal"
  | "gallery.pageTitle"
  | "gallery.breadcrumbHome"
  | "gallery.description"
  | "gallery.loading"
  | "gallery.error"
  | "gallery.empty"
  | "gallery.albums"
  | "gallery.photos"
  | "gallery.albumEmpty"
  | "gallery.countLabel"
  | "gallery.close"
  | "gallery.recentPhotos"
  | "gallery.albumTitle"
  | "documents.pageTitle"
  | "documents.breadcrumbHome"
  | "documents.description"
  | "documents.searchPlaceholder"
  | "documents.allCategories"
  | "documents.loading"
  | "documents.error"
  | "documents.empty"
  | "documents.table.document"
  | "documents.table.category"
  | "documents.table.date"
  | "documents.table.type"
  | "documents.table.action"
  | "documents.download"
  | "documents.unknownCategory"
  | "students.pageTitle"
  | "students.breadcrumbHome"
  | "students.description"
  | "students.item.schedule.title"
  | "students.item.schedule.text"
  | "students.item.clubs.title"
  | "students.item.clubs.text"
  | "students.item.exams.title"
  | "students.item.exams.text"
  | "students.item.olympiads.title"
  | "students.item.olympiads.text"
  | "students.item.library.title"
  | "students.item.library.text"
  | "students.item.resources.title"
  | "students.item.resources.text"
  | "students.item.rules.title"
  | "students.item.rules.text"
  | "students.item.psychology.title"
  | "students.item.psychology.text"
  | "parents.pageTitle"
  | "parents.breadcrumbHome"
  | "parents.description"
  | "parents.item.guide.title"
  | "parents.item.guide.text"
  | "parents.item.admission.title"
  | "parents.item.admission.text"
  | "parents.item.docs.title"
  | "parents.item.docs.text"
  | "parents.item.meeting.title"
  | "parents.item.meeting.text"
  | "parents.item.uniform.title"
  | "parents.item.uniform.text"
  | "parents.item.safety.title"
  | "parents.item.safety.text"
  | "parents.card.title"
  | "parents.card.description"
  | "parents.card.cta"
  | "parents.faqTitle"
  | "parents.faq.q1"
  | "parents.faq.a1"
  | "parents.faq.q2"
  | "parents.faq.a2"
  | "parents.faq.q3"
  | "parents.faq.a3"
  | "parents.faq.q4"
  | "parents.faq.a4"
  | "news.pageTitle"
  | "news.breadcrumbHome"
  | "news.searchPlaceholder"
  | "news.loading"
  | "news.error"
  | "news.empty"
  | "news.readMore"
  | "news.share"
  | "news.copySuccess"
  | "news.copyError"
  | "news.relatedTitle"
  | "news.back"
  | "news.notFound"
  | "news.returnHome"
  | "common.backToTop";

type Dictionary = Partial<Record<TranslationKey, string>>;

const DICTIONARIES: Record<Locale, Dictionary> = {
  uz: {
    "lang.uz": "O‘zb",
    "lang.ru": "Рус",
    "lang.en": "Eng",
    "nav.home": "Bosh sahifa",
    "nav.about": "Maktab haqida",
    "nav.leadership": "Rahbariyat",
    "nav.teachers": "O‘qituvchilar",
    "nav.news": "Yangiliklar",
    "nav.announcements": "E’lonlar",
    "nav.students": "O‘quvchilar",
    "nav.parents": "Ota-onalar",
    "nav.documents": "Hujjatlar",
    "nav.gallery": "Galereya",
    "nav.contact": "Bog‘lanish",
    "header.trustPhone": "Ishonch telefoni",
    "header.accessibility": "Maxsus imkoniyatlar",
    "header.search": "Qidirish",
    "header.menuOpen": "Menyuni ochish",
    "header.menuClose": "Menyuni yopish",
    "header.mainNav": "Asosiy menyu",
    "header.mobileNav": "Mobil menyu",
    "footer.officialSite": "Rasmiy sayt",
    "footer.quickLinks": "Tezkor havolalar",
    "footer.description": "Maktabimizning rasmiy veb-sayti. Sifatli ta'lim, zamonaviy bilim va yuksak tarbiya maskani.",
    "footer.forUsers": "Foydalanuvchilar uchun",
    "footer.contact": "Aloqa",
    "footer.aboutSchool": "Maktab haqida",
    "footer.news": "Yangiliklar",
    "footer.teachers": "O‘qituvchilar",
    "footer.documents": "Hujjatlar",
    "footer.gallery": "Galereya",
    "footer.forStudents": "O‘quvchilar uchun",
    "footer.forParents": "Ota-onalar uchun",
    "footer.reception": "Qabul",
    "footer.virtualReception": "Virtual qabulxona",
    "footer.announcements": "E’lonlar",
    "footer.rights": "Barcha huquqlar himoyalangan.",
    "footer.regulations": "Nizom",
    "footer.contactLink": "Bog‘lanish",
    "about.pageTitle": "Maktab haqida",
    "about.breadcrumbHome": "Bosh sahifa",
    "about.breadcrumbCurrent": "Maktab haqida",
    "about.pageDescription": "Maktabimiz tarixi, missiyasi va rivojlanish yo‘nalishlari.",
    "about.historyEyebrow": "Tarix",
    "about.historyTitle": "Maktab tarixi",
    "about.missionTitle": "Missiya",
    "about.visionTitle": "Vizyon",
    "about.infrastructureEyebrow": "Ko‘rsatkichlar",
    "about.infrastructureTitle": "Maktab ko‘rsatkichlari",
    "about.infrastructureDescription": "Maktab faoliyati bo‘yicha asosiy raqamlar.",
    "about.stats.foundedYear": "Tashkil etilgan yil",
    "about.stats.studentsCount": "O‘quvchilar soni",
    "about.stats.teachersCount": "O‘qituvchilar soni",
    "about.stats.classroomsCount": "Sinfxonalar",
    "about.loading": "Yuklanmoqda...",
    "about.error": "Maktab haqida ma'lumotni yuklab bo'lmadi.",
    "about.empty": "Maktab haqida ma'lumot hali kiritilmagan.",
    "home.hero.slide1.eyebrow": "215-sonli maktab",
    "home.hero.slide1.title": "Kelajak sari bilim bilan",
    "home.hero.slide1.description": "sifatli ta’lim, zamonaviy bilim va yuksak tarbiya maskani.",
    "home.hero.slide2.eyebrow": "Zamonaviy ta’lim",
    "home.hero.slide2.title": "Zamonaviy bilim — mustahkam kelajak",
    "home.hero.slide2.description": "Yangi IT xonalari, laboratoriyalar va zamonaviy o‘quv qo‘llanmalari orqali o‘quvchilarga sifatli ta’lim beramiz.",
    "home.hero.slide3.eyebrow": "Yutuqlarimiz",
    "home.hero.slide3.title": "O‘quvchilarimizning yutuqlari — g‘ururimiz",
    "home.hero.slide3.description": "Respublika va xalqaro miqyosdagi fan olimpiadalari, sport va ijodiy tanlovlar g‘oliblari bilan faxrlanamiz.",
    "home.hero.about": "Maktab haqida",
    "home.hero.contact": "Bog‘lanish",
    "home.hero.previous": "Oldingi",
    "home.hero.next": "Keyingi",
    "home.announcement.badge": "Muhim e’lon",
    "home.announcement.text": "2026–2027 o‘quv yili uchun 1-sinfga qabul jarayonlari boshlandi.",
    "home.announcement.cta": "Batafsil",
    "home.quickAccess.eyebrow": "Tezkor kirish",
    "home.quickAccess.title": "Foydali xizmatlar",
    "home.news.eyebrow": "Yangiliklar",
    "home.news.title": "So‘nggi yangiliklar",
    "home.news.viewAll": "Barcha yangiliklar",
    "home.principal.eyebrow": "Direktor murojaati",
    "home.principal.title": "Ta’lim — kelajakning poydevori",
    "home.principal.quote": "«Aziz o‘quvchilar, hurmatli ota-onalar va qadrli ustozlar! Maktabimizning asosiy maqsadi — har bir o‘quvchiga sifatli ta’lim berish, uning iste’dodini yuzaga chiqarish va kelajak uchun mustahkam bilim poydevorini yaratishdir.»",
    "home.principal.cta": "Direktor haqida",
    "home.announcements.eyebrow": "E’lonlar",
    "home.announcements.title": "Rasmiy e’lonlar",
    "home.announcements.subtitle": "Rasmiy e’lonlar",
    "home.events.eyebrow": "Kalendar",
    "home.events.title": "Yaqinlashayotgan tadbirlar",
    "home.events.subtitle": "Yaqinlashayotgan tadbirlar",
    "home.teachers.eyebrow": "Jamoamiz",
    "home.teachers.title": "Bizning ustozlar",
    "home.teachers.description": "Yuqori malakali, tajribali va o‘z ishiga fidoyi pedagoglarimiz bilan tanishing.",
    "home.teachers.viewAll": "Barcha o‘qituvchilar",
    "home.achievements.eyebrow": "Yutuqlar",
    "home.achievements.title": "Bizning yutuqlarimiz",
    "home.gallery.eyebrow": "Galereya",
    "home.gallery.title": "Maktab hayoti",
    "home.gallery.viewAll": "Barcha rasmlar",
    "home.links.eyebrow": "Rasmiy",
    "home.links.title": "Foydali havolalar",
    "home.contact.eyebrow": "Aloqa",
    "home.contact.title": "Biz bilan bog‘laning",
    "home.contact.callNow": "Qo‘ng‘iroq qilish",
    "home.contact.getDirections": "Yo‘nalish olish",
    "home.contact.address": "Manzil",
    "home.contact.phone": "Telefon",
    "home.contact.email": "Elektron pochta",
    "home.contact.workingHours": "Ish vaqti",
    "home.contact.mapTitle": "Xarita",
  },
  ru: {
    "lang.uz": "O‘zb",
    "lang.ru": "Рус",
    "lang.en": "Eng",
    "nav.home": "Главная",
    "nav.about": "О школе",
    "nav.leadership": "Руководство",
    "nav.teachers": "Учителя",
    "nav.news": "Новости",
    "nav.announcements": "Объявления",
    "nav.students": "Ученикам",
    "nav.parents": "Родителям",
    "nav.documents": "Документы",
    "nav.gallery": "Галерея",
    "nav.contact": "Контакты",
    "header.trustPhone": "Телефон доверия",
    "header.accessibility": "Специальные возможности",
    "header.search": "Поиск",
    "header.menuOpen": "Открыть меню",
    "header.menuClose": "Закрыть меню",
    "header.mainNav": "Основное меню",
    "header.mobileNav": "Мобильное меню",
    "footer.officialSite": "Официальный сайт",
    "footer.quickLinks": "Быстрые ссылки",
    "footer.description": "Официальный сайт нашей школы. Качественное образование, современные знания и высокое воспитание.",
    "footer.forUsers": "Для пользователей",
    "footer.contact": "Контакты",
    "footer.aboutSchool": "О школе",
    "footer.news": "Новости",
    "footer.teachers": "Учителя",
    "footer.documents": "Документы",
    "footer.gallery": "Галерея",
    "footer.forStudents": "Ученикам",
    "footer.forParents": "Родителям",
    "footer.reception": "Прием",
    "footer.virtualReception": "Виртуальная приемная",
    "footer.announcements": "Объявления",
    "footer.rights": "Все права защищены.",
    "footer.regulations": "Положение",
    "footer.contactLink": "Контакты",
    "about.pageTitle": "О школе",
    "about.breadcrumbHome": "Главная",
    "about.breadcrumbCurrent": "О школе",
    "about.pageDescription": "История школы, миссия и направления развития.",
    "about.historyEyebrow": "История",
    "about.historyTitle": "История школы",
    "about.missionTitle": "Миссия",
    "about.visionTitle": "Видение",
    "about.infrastructureEyebrow": "Показатели",
    "about.infrastructureTitle": "Показатели школы",
    "about.infrastructureDescription": "Ключевые цифры о работе школы.",
    "about.stats.foundedYear": "Год основания",
    "about.stats.studentsCount": "Количество учеников",
    "about.stats.teachersCount": "Количество учителей",
    "about.stats.classroomsCount": "Классы",
    "about.loading": "Загрузка...",
    "about.error": "Не удалось загрузить информацию о школе.",
    "about.empty": "Информация о школе пока не заполнена.",
    "home.hero.slide1.eyebrow": "Школа №215",
    "home.hero.slide1.title": "Знания — на пути к будущему",
    "home.hero.slide1.description": "качественное образование, современные знания и высокое воспитание.",
    "home.hero.slide2.eyebrow": "Современное образование",
    "home.hero.slide2.title": "Современные знания — прочное будущее",
    "home.hero.slide2.description": "Мы обеспечиваем качественное образование учащихся с помощью новых IT-кабинетов, лабораторий и современных учебных материалов.",
    "home.hero.slide3.eyebrow": "Наши достижения",
    "home.hero.slide3.title": "Достижения наших учеников — наша гордость",
    "home.hero.slide3.description": "Мы гордимся победителями республиканских и международных олимпиад, спортивных и творческих конкурсов.",
    "home.hero.about": "О школе",
    "home.hero.contact": "Контакты",
    "home.hero.previous": "Назад",
    "home.hero.next": "Вперёд",
    "home.announcement.badge": "Важно",
    "home.announcement.text": "Начат приём в 1 класс на 2026–2027 учебный год.",
    "home.announcement.cta": "Подробнее",
    "home.quickAccess.eyebrow": "Быстрый доступ",
    "home.quickAccess.title": "Полезные услуги",
    "home.news.eyebrow": "Новости",
    "home.news.title": "Последние новости",
    "home.news.viewAll": "Все новости",
    "home.principal.eyebrow": "Обращение директора",
    "home.principal.title": "Образование — основа будущего",
    "home.principal.quote": "«Дорогие ученики, уважаемые родители и дорогие учителя! Главная цель нашей школы — дать каждому ученику качественное образование, раскрыть его талант и создать прочную основу знаний для будущего.»",
    "home.principal.cta": "О директоре",
    "home.announcements.eyebrow": "Объявления",
    "home.announcements.title": "Официальные объявления",
    "home.announcements.subtitle": "Официальные объявления",
    "home.events.eyebrow": "Календарь",
    "home.events.title": "Предстоящие мероприятия",
    "home.events.subtitle": "Предстоящие мероприятия",
    "home.teachers.eyebrow": "Наша команда",
    "home.teachers.title": "Наши учителя",
    "home.teachers.description": "Познакомьтесь с высококвалифицированными, опытными и преданными своему делу педагогами.",
    "home.teachers.viewAll": "Все учителя",
    "home.achievements.eyebrow": "Достижения",
    "home.achievements.title": "Наши достижения",
    "home.gallery.eyebrow": "Галерея",
    "home.gallery.title": "Жизнь школы",
    "home.gallery.viewAll": "Все фото",
    "home.links.eyebrow": "Официально",
    "home.links.title": "Полезные ссылки",
    "home.contact.eyebrow": "Контакты",
    "home.contact.title": "Свяжитесь с нами",
    "home.contact.callNow": "Позвонить",
    "home.contact.getDirections": "Получить направление",
    "home.contact.address": "Адрес",
    "home.contact.phone": "Телефон",
    "home.contact.email": "Электронная почта",
    "home.contact.workingHours": "Часы работы",
    "home.contact.mapTitle": "Карта",
  },
  en: {
    "lang.uz": "O‘zb",
    "lang.ru": "Рус",
    "lang.en": "Eng",
    "nav.home": "Home",
    "nav.about": "About School",
    "nav.leadership": "Leadership",
    "nav.teachers": "Teachers",
    "nav.news": "News",
    "nav.announcements": "Announcements",
    "nav.students": "Students",
    "nav.parents": "Parents",
    "nav.documents": "Documents",
    "nav.gallery": "Gallery",
    "nav.contact": "Contact",
    "header.trustPhone": "Trust phone",
    "header.accessibility": "Accessibility",
    "header.search": "Search",
    "header.menuOpen": "Open menu",
    "header.menuClose": "Close menu",
    "header.mainNav": "Main menu",
    "header.mobileNav": "Mobile menu",
    "footer.officialSite": "Official website",
    "footer.quickLinks": "Quick links",
    "footer.description": "The official website of our school. Quality education, modern knowledge, and high standards of upbringing.",
    "footer.forUsers": "For users",
    "footer.contact": "Contact",
    "footer.aboutSchool": "About School",
    "footer.news": "News",
    "footer.teachers": "Teachers",
    "footer.documents": "Documents",
    "footer.gallery": "Gallery",
    "footer.forStudents": "For students",
    "footer.forParents": "For parents",
    "footer.reception": "Reception",
    "footer.virtualReception": "Virtual reception",
    "footer.announcements": "Announcements",
    "footer.rights": "All rights reserved.",
    "footer.regulations": "Regulations",
    "footer.contactLink": "Contact",
    "about.pageTitle": "About School",
    "about.breadcrumbHome": "Home",
    "about.breadcrumbCurrent": "About School",
    "about.pageDescription": "School history, mission, and development directions.",
    "about.historyEyebrow": "History",
    "about.historyTitle": "School history",
    "about.missionTitle": "Mission",
    "about.visionTitle": "Vision",
    "about.infrastructureEyebrow": "Metrics",
    "about.infrastructureTitle": "School metrics",
    "about.infrastructureDescription": "Key figures about school operations.",
    "about.stats.foundedYear": "Founded year",
    "about.stats.studentsCount": "Students",
    "about.stats.teachersCount": "Teachers",
    "about.stats.classroomsCount": "Classrooms",
    "about.loading": "Loading...",
    "about.error": "Failed to load about-school content.",
    "about.empty": "About-school content is not available yet.",
    "home.hero.slide1.eyebrow": "School No. 215",
    "home.hero.slide1.title": "Knowledge on the path to the future",
    "home.hero.slide1.description": "quality education, modern knowledge, and high standards of upbringing.",
    "home.hero.slide2.eyebrow": "Modern education",
    "home.hero.slide2.title": "Modern knowledge — a strong future",
    "home.hero.slide2.description": "We provide quality education through new IT rooms, laboratories, and modern learning materials.",
    "home.hero.slide3.eyebrow": "Our achievements",
    "home.hero.slide3.title": "Our students’ achievements — our pride",
    "home.hero.slide3.description": "We are proud of winners of national and international science olympiads, sports, and creative competitions.",
    "home.hero.about": "About school",
    "home.hero.contact": "Contact",
    "home.hero.previous": "Previous",
    "home.hero.next": "Next",
    "home.announcement.badge": "Important announcement",
    "home.announcement.text": "Admissions for Grade 1 for the 2026–2027 academic year have begun.",
    "home.announcement.cta": "Read more",
    "home.quickAccess.eyebrow": "Quick access",
    "home.quickAccess.title": "Useful services",
    "home.news.eyebrow": "News",
    "home.news.title": "Latest news",
    "home.news.viewAll": "All news",
    "home.principal.eyebrow": "Principal message",
    "home.principal.title": "Education — the foundation of the future",
    "home.principal.quote": "«Dear students, respected parents, and esteemed teachers! The main goal of our school is to provide every student with quality education, uncover their talent, and create a solid foundation of knowledge for the future.»",
    "home.principal.cta": "About the principal",
    "home.announcements.eyebrow": "Announcements",
    "home.announcements.title": "Official announcements",
    "home.announcements.subtitle": "Official announcements",
    "home.events.eyebrow": "Calendar",
    "home.events.title": "Upcoming events",
    "home.events.subtitle": "Upcoming events",
    "home.teachers.eyebrow": "Our team",
    "home.teachers.title": "Our teachers",
    "home.teachers.description": "Meet our highly qualified, experienced, and devoted educators.",
    "home.teachers.viewAll": "All teachers",
    "home.achievements.eyebrow": "Achievements",
    "home.achievements.title": "Our achievements",
    "home.gallery.eyebrow": "Gallery",
    "home.gallery.title": "School life",
    "home.gallery.viewAll": "All photos",
    "home.links.eyebrow": "Official",
    "home.links.title": "Useful links",
    "home.contact.eyebrow": "Contact",
    "home.contact.title": "Get in touch",
    "home.contact.callNow": "Call now",
    "home.contact.getDirections": "Get directions",
    "home.contact.address": "Address",
    "home.contact.phone": "Phone",
    "home.contact.email": "Email",
    "home.contact.workingHours": "Working hours",
    "home.contact.mapTitle": "Map",
  },
};

function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

function getStoredLocale(): Locale | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (!raw || !isLocale(raw)) {
    return null;
  }

  return raw;
}

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("uz");

  useEffect(() => {
    const storedLocale = getStoredLocale();
    if (storedLocale) {
      setLocaleState(storedLocale);
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
    }
  }, [locale]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      setLocale: setLocaleState,
      t: (key) => DICTIONARIES[locale][key] ?? DICTIONARIES.uz[key] ?? key,
    }),
    [locale],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }

  return context;
}

export function getLocalizedValue(
  locale: Locale,
  values: { uz: string | null | undefined; ru: string | null | undefined; en: string | null | undefined },
) {
  const selected = locale === "ru" ? values.ru : locale === "en" ? values.en : values.uz;
  const selectedTrimmed = (selected ?? "").trim();

  if (selectedTrimmed) {
    return selectedTrimmed;
  }

  const uzTrimmed = (values.uz ?? "").trim();
  if (uzTrimmed) {
    return uzTrimmed;
  }

  return "";
}
