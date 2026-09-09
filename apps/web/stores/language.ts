import { create } from "zustand";

export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

export const POPULAR_LANGUAGES: Language[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "sw", name: "Swahili", nativeName: "Kiswahili" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "zh-CN", name: "Chinese (Simplified)", nativeName: "中文 (简体)" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
];

export const ALL_LANGUAGES: Language[] = [
  { code: "af", name: "Afrikaans", nativeName: "Afrikaans" },
  { code: "sq", name: "Albanian", nativeName: "Shqip" },
  { code: "am", name: "Amharic", nativeName: "አማርኛ" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "hy", name: "Armenian", nativeName: "Հայերեն" },
  { code: "as", name: "Assamese", nativeName: "অসমীয়া" },
  { code: "ay", name: "Aymara", nativeName: "Aymar aru" },
  { code: "az", name: "Azerbaijani", nativeName: "Azərbaycan dili" },
  { code: "bm", name: "Bambara", nativeName: "Bamanankan" },
  { code: "eu", name: "Basque", nativeName: "Euskara" },
  { code: "be", name: "Belarusian", nativeName: "Беларуская" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা" },
  { code: "bho", name: "Bhojpuri", nativeName: "भोजपुरी" },
  { code: "bs", name: "Bosnian", nativeName: "Bosanski" },
  { code: "bg", name: "Bulgarian", nativeName: "Български" },
  { code: "ca", name: "Catalan", nativeName: "Català" },
  { code: "ceb", name: "Cebuano", nativeName: "Cebuano" },
  { code: "ny", name: "Chichewa", nativeName: "ChiCheŵa" },
  { code: "zh-CN", name: "Chinese (Simplified)", nativeName: "中文 (简体)" },
  { code: "zh-TW", name: "Chinese (Traditional)", nativeName: "中文 (繁體)" },
  { code: "co", name: "Corsican", nativeName: "Corsu" },
  { code: "hr", name: "Croatian", nativeName: "Hrvatski" },
  { code: "cs", name: "Czech", nativeName: "Čeština" },
  { code: "da", name: "Danish", nativeName: "Dansk" },
  { code: "dv", name: "Dhivehi", nativeName: "ދިވެހި" },
  { code: "doi", name: "Dogri", nativeName: "डोगरी" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands" },
  { code: "en", name: "English", nativeName: "English" },
  { code: "eo", name: "Esperanto", nativeName: "Esperanto" },
  { code: "et", name: "Estonian", nativeName: "Eesti" },
  { code: "ee", name: "Ewe", nativeName: "Eʋegbe" },
  { code: "tl", name: "Filipino (Tagalog)", nativeName: "Filipino" },
  { code: "fi", name: "Finnish", nativeName: "Suomi" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "fy", name: "Frisian", nativeName: "Frysk" },
  { code: "gl", name: "Galician", nativeName: "Galego" },
  { code: "ka", name: "Georgian", nativeName: "ქართული" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "el", name: "Greek", nativeName: "Ελληνικά" },
  { code: "gn", name: "Guarani", nativeName: "Avañe'ẽ" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી" },
  { code: "ht", name: "Haitian Creole", nativeName: "Kreyòl ayisyen" },
  { code: "ha", name: "Hausa", nativeName: "Hausa" },
  { code: "haw", name: "Hawaiian", nativeName: "ʻŌlelo Hawaiʻi" },
  { code: "iw", name: "Hebrew", nativeName: "עברית" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "hmn", name: "Hmong", nativeName: "Hmoob" },
  { code: "hu", name: "Hungarian", nativeName: "Magyar" },
  { code: "is", name: "Icelandic", nativeName: "Íslenska" },
  { code: "ig", name: "Igbo", nativeName: "Asụsụ Igbo" },
  { code: "ilo", name: "Ilocano", nativeName: "Ilokano" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia" },
  { code: "ga", name: "Irish", nativeName: "Gaeilge" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "jw", name: "Javanese", nativeName: "Basa Jawa" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "kk", name: "Kazakh", nativeName: "Қазақ тілі" },
  { code: "km", name: "Khmer", nativeName: "ភាសាខ្មែរ" },
  { code: "rw", name: "Kinyarwanda", nativeName: "Ikinyarwanda" },
  { code: "gom", name: "Konkani", nativeName: "कोंकणी" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "kri", name: "Krio", nativeName: "Krio" },
  { code: "ku", name: "Kurdish (Kurmanji)", nativeName: "Kurdî" },
  { code: "ckb", name: "Kurdish (Sorani)", nativeName: "کوردی" },
  { code: "ky", name: "Kyrgyz", nativeName: "Кыргызча" },
  { code: "lo", name: "Lao", nativeName: "ພາສາລາວ" },
  { code: "la", name: "Latin", nativeName: "Latina" },
  { code: "lv", name: "Latvian", nativeName: "Latviešu" },
  { code: "ln", name: "Lingala", nativeName: "Lingála" },
  { code: "lt", name: "Lithuanian", nativeName: "Lietuvių" },
  { code: "lg", name: "Luganda", nativeName: "Oluganda" },
  { code: "lb", name: "Luxembourgish", nativeName: "Lëtzebuergesch" },
  { code: "mk", name: "Macedonian", nativeName: "Македонски" },
  { code: "mai", name: "Maithili", nativeName: "मैथिली" },
  { code: "mg", name: "Malagasy", nativeName: "Malagasy" },
  { code: "ms", name: "Malay", nativeName: "Bahasa Melayu" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം" },
  { code: "mt", name: "Maltese", nativeName: "Malti" },
  { code: "mi", name: "Maori", nativeName: "Te Reo Māori" },
  { code: "mr", name: "Marathi", nativeName: "मराठी" },
  { code: "mni-Mtei", name: "Meiteilon (Manipuri)", nativeName: "মৈতৈলোন্" },
  { code: "lus", name: "Mizo", nativeName: "Mizo ṭawng" },
  { code: "mn", name: "Mongolian", nativeName: "Монгол" },
  { code: "my", name: "Myanmar (Burmese)", nativeName: "မြန်မာစာ" },
  { code: "ne", name: "Nepali", nativeName: "नेपाली" },
  { code: "nso", name: "Northern Sotho", nativeName: "Sepedi" },
  { code: "no", name: "Norwegian", nativeName: "Norsk" },
  { code: "or", name: "Odia (Oriya)", nativeName: "ଓଡ଼ିଆ" },
  { code: "om", name: "Oromo", nativeName: "Oromoo" },
  { code: "ps", name: "Pashto", nativeName: "پښتو" },
  { code: "fa", name: "Persian", nativeName: "فارسی" },
  { code: "pl", name: "Polish", nativeName: "Polski" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
  { code: "qu", name: "Quechua", nativeName: "Runa Simi" },
  { code: "ro", name: "Romanian", nativeName: "Română" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "sm", name: "Samoan", nativeName: "Gagana faʻa Sāmoa" },
  { code: "sa", name: "Sanskrit", nativeName: "संस्कृतम्" },
  { code: "gd", name: "Scots Gaelic", nativeName: "Gàidhlig" },
  { code: "sr", name: "Serbian", nativeName: "Српски" },
  { code: "st", name: "Sesotho", nativeName: "Sesotho" },
  { code: "sn", name: "Shona", nativeName: "chiShona" },
  { code: "sd", name: "Sindhi", nativeName: "سنڌي" },
  { code: "si", name: "Sinhala", nativeName: "සිංහල" },
  { code: "sk", name: "Slovak", nativeName: "Slovenčina" },
  { code: "sl", name: "Slovenian", nativeName: "Slovenščina" },
  { code: "so", name: "Somali", nativeName: "Soomaaliga" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "su", name: "Sundanese", nativeName: "Basa Sunda" },
  { code: "sw", name: "Swahili", nativeName: "Kiswahili" },
  { code: "sv", name: "Swedish", nativeName: "Svenska" },
  { code: "tg", name: "Tajik", nativeName: "Тоҷикӣ" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "tt", name: "Tatar", nativeName: "Татар" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" },
  { code: "th", name: "Thai", nativeName: "ไทย" },
  { code: "ti", name: "Tigrinya", nativeName: "ትግርኛ" },
  { code: "ts", name: "Tsonga", nativeName: "Xitsonga" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe" },
  { code: "tk", name: "Turkmen", nativeName: "Türkmen dili" },
  { code: "ak", name: "Twi", nativeName: "Twi" },
  { code: "uk", name: "Ukrainian", nativeName: "Українська" },
  { code: "ur", name: "Urdu", nativeName: "اردو" },
  { code: "ug", name: "Uyghur", nativeName: "ئۇيغۇرچە" },
  { code: "uz", name: "Uzbek", nativeName: "Oʻzbekcha" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt" },
  { code: "cy", name: "Welsh", nativeName: "Cymraeg" },
  { code: "xh", name: "Xhosa", nativeName: "isiXhosa" },
  { code: "yi", name: "Yiddish", nativeName: "ייִדיש" },
  { code: "yo", name: "Yoruba", nativeName: "Yorùbá" },
  { code: "zu", name: "Zulu", nativeName: "isiZulu" },
];

export const SUPPORTED_LANGUAGES: Language[] = ALL_LANGUAGES;

const STORAGE_KEY = "kainook_language";
const COOKIE_NAME = "googtrans";

function getInitialLanguage(): string {
  if (typeof window === "undefined") return "en";
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
      return saved;
    }
    const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
    if (match && match[1]) {
      const parts = decodeURIComponent(match[1]).split("/");
      const lang = parts[parts.length - 1];
      if (lang && SUPPORTED_LANGUAGES.some((l) => l.code === lang)) {
        return lang;
      }
    }
  } catch {
    // Fallback
  }
  return "en";
}

interface LanguageState {
  currentLanguage: string;
  setLanguage: (langCode: string) => void;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  currentLanguage: "en",
  setLanguage: (langCode: string) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, langCode);

        // Update googtrans cookie for Google Translate
        const cookieValue = `/auto/${langCode}`;
        const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();

        document.cookie = `${COOKIE_NAME}=${cookieValue}; expires=${expires}; path=/;`;

        const hostParts = window.location.hostname.split(".");
        if (hostParts.length > 1) {
          const rootDomain = "." + hostParts.slice(-2).join(".");
          document.cookie = `${COOKIE_NAME}=${cookieValue}; expires=${expires}; path=/; domain=${rootDomain};`;
        }

        // Programmatically trigger Google Translate select combo if present
        const select = document.querySelector<HTMLSelectElement>(".goog-te-combo");
        if (select) {
          select.value = langCode;
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }
      } catch (err) {
        console.error("Failed to update language:", err);
      }
    }
    set({ currentLanguage: langCode });
  },
}));

if (typeof window !== "undefined") {
  const initial = getInitialLanguage();
  if (initial !== "en") {
    useLanguageStore.setState({ currentLanguage: initial });
  }
}
