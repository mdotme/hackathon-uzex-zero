import type { Dict } from "./ru";

export const uz: Dict = {
  welcome: (name: string) =>
    `Assalomu alaykum, <b>${name}</b>! 👋\nMen tovar-xomaşyo birjasi bitimlari böyiça AI-yordamchiman`,
  chooseLang: "Tilni tanlang:",
  langSaved: "Til saqlandi ✅",
  askPrompt:
    "Birja bitimlari haqida savol bering — javob berishga harakat qilaman",
  busy: "Biroz kuting, oldingi sörovni bajaryapman…",
  error: "Nimadir xato ketdi, qaytadan urinib köring",
  thinking: "🔎 Birja ma'lumotlaridan javob qidiryapman…",
  unverified:
    "Javobni ma'lumotlar bilan tasdiqlay olmadim: unda sörov natijalarida yöq raqamlar bor edi. Savolni boşqaça berib köring.",
  agentFailed:
    "Javob olib bölmadi. Qaytadan urinib köring yoki savolni boşqaça bering.",
  offTopic:
    "Men faqat birja bitimlari haqidagi savollarga javob beraman: tovarlar, narxlar, hajmlar, kompaniyalar, brokerlar. Bu savolga ma'lumotlarda javob yöq.",
  rateLimited: (minutes: number) =>
    `Juda köp savol berildi. ${minutes} daqiqadan keyin qayta urinib köring.`,
  overloaded: "Hozir sörovlar köp. Bir daqiqadan keyin urinib köring.",
  btnHelp: "❓ Yordam",
  btnLanguage: "🌐 Tilni özgartiriş",
  help:
    "Men tovar-xomaşyo birjasi bitimlari haqidagi savollarga javob beraman. Masalan:\n\n" +
    "• 2025-yilda nechta bitim tuzilgan?\n" +
    "• Bitimlar summasi böyiça top-5 tovar\n" +
    "• Oxirgi oyda sementning örtaça narxi",
  btnCredits: "👨‍💻 Jamoa",
  creditsTitle: "👨‍💻 <b>Dasturçilar jamoasi</b>\nUZEX AI Hackathon 2026",
};
