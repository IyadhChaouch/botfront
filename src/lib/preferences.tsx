"use client";

// Shared client preferences for the Maghrebia Assistant frontend.
//
// Owns the two cross-page user preferences exposed in the redesign chrome
// (the header FR/العربية + theme toggles and the Settings → Préférences tab):
//
//   - `theme`  : "light" | "dark" | "system"  → drives the `data-theme`
//                attribute on <html>, which globals.css maps to the light/dark
//                Theme_Token sets. "system" defers to `prefers-color-scheme`.
//   - `locale` : "fr" | "ar"                  → drives `dir` (ltr/rtl) and
//                `lang` on <html> so the whole layout mirrors for Arabic.
//   - `textSize` / `reduceMotion` are reading-comfort preferences surfaced on
//     the Préférences tab.
//
// State is React Context only (no Redux/Zustand, Requirement 26.8) and is
// persisted to localStorage so a reload keeps the user's choice. A small inline
// script in `layout.tsx` applies the persisted theme/dir before paint to avoid
// a flash; this provider re-syncs on mount and on every change.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "light" | "dark" | "system";
export type Locale = "fr" | "ar";
export type TextSize = "sm" | "base" | "lg" | "xl";

export type Preferences = {
  theme: ThemeMode;
  locale: Locale;
  textSize: TextSize;
  reduceMotion: boolean;
};

export type PreferencesContextValue = Preferences & {
  /** The theme actually applied after resolving "system" against the OS. */
  resolvedTheme: "light" | "dark";
  setTheme: (theme: ThemeMode) => void;
  setLocale: (locale: Locale) => void;
  setTextSize: (size: TextSize) => void;
  setReduceMotion: (value: boolean) => void;
  /** Convenience flip used by the header toggle (light <-> dark). */
  toggleTheme: () => void;
};

const STORAGE_KEYS = {
  theme: "mgb-theme",
  locale: "mgb-locale",
  textSize: "mgb-text-size",
  reduceMotion: "mgb-reduce-motion",
} as const;

const DEFAULTS: Preferences = {
  theme: "system",
  locale: "fr",
  textSize: "base",
  reduceMotion: false,
};

const TEXT_SIZE_PX: Record<TextSize, string> = {
  sm: "15px",
  base: "16px",
  lg: "18px",
  xl: "20px",
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function prefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readStored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  return raw !== null && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(DEFAULTS.theme);
  const [locale, setLocaleState] = useState<Locale>(DEFAULTS.locale);
  const [textSize, setTextSizeState] = useState<TextSize>(DEFAULTS.textSize);
  const [reduceMotion, setReduceMotionState] = useState<boolean>(DEFAULTS.reduceMotion);
  const [systemDark, setSystemDark] = useState<boolean>(false);

  // Hydrate from localStorage once on the client (the inline script in the
  // document already applied the visual state; this keeps React state in sync).
  useEffect(() => {
    setThemeState(readStored(STORAGE_KEYS.theme, ["light", "dark", "system"] as const, DEFAULTS.theme));
    setLocaleState(readStored(STORAGE_KEYS.locale, ["fr", "ar"] as const, DEFAULTS.locale));
    setTextSizeState(
      readStored(STORAGE_KEYS.textSize, ["sm", "base", "lg", "xl"] as const, DEFAULTS.textSize),
    );
    setReduceMotionState(window.localStorage.getItem(STORAGE_KEYS.reduceMotion) === "true");
    setSystemDark(prefersDark());

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const resolvedTheme: "light" | "dark" =
    theme === "system" ? (systemDark ? "dark" : "light") : theme;

  // Apply theme to <html> and persist.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
    window.localStorage.setItem(STORAGE_KEYS.theme, theme);
  }, [theme]);

  // Apply locale (dir + lang) to <html> and persist.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    root.setAttribute("lang", locale);
    window.localStorage.setItem(STORAGE_KEYS.locale, locale);
  }, [locale]);

  // Apply reading-comfort preferences.
  useEffect(() => {
    document.documentElement.style.setProperty("--app-font-size", TEXT_SIZE_PX[textSize]);
    window.localStorage.setItem(STORAGE_KEYS.textSize, textSize);
  }, [textSize]);

  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reduceMotion);
    window.localStorage.setItem(STORAGE_KEYS.reduceMotion, String(reduceMotion));
  }, [reduceMotion]);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      theme,
      locale,
      textSize,
      reduceMotion,
      resolvedTheme,
      setTheme: setThemeState,
      setLocale: setLocaleState,
      setTextSize: setTextSizeState,
      setReduceMotion: setReduceMotionState,
      toggleTheme: () => setThemeState(resolvedTheme === "dark" ? "light" : "dark"),
    }),
    [theme, locale, textSize, reduceMotion, resolvedTheme],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

// Stable, no-op fallback used when a consumer renders outside a
// PreferencesProvider (e.g. an isolated component unit test). The provider is
// mounted app-wide in `layout.tsx`, so in production this fallback is never
// used; degrading gracefully here keeps the shared header/sidebar renderable in
// isolation without forcing every test to wrap in a provider.
const FALLBACK: PreferencesContextValue = {
  ...DEFAULTS,
  resolvedTheme: "light",
  setTheme: () => {},
  setLocale: () => {},
  setTextSize: () => {},
  setReduceMotion: () => {},
  toggleTheme: () => {},
};

export function usePreferences(): PreferencesContextValue {
  return useContext(PreferencesContext) ?? FALLBACK;
}

// ---------------------------------------------------------------------------
// Minimal bilingual dictionary for the application chrome (header, sidebar,
// settings navigation, and section titles). The conversational content itself
// is produced by the backend; this covers the static UI labels so the FR/AR
// toggle and RTL mirroring are meaningful.
// ---------------------------------------------------------------------------

type Dict = Record<string, string>;

const FR: Dict = {
  "brand.subtitle": "ASSISTANT",
  "nav.quickAccess": "ACCÈS RAPIDE",
  "nav.findAgency": "Trouver une agence",
  "nav.clientArea": "Espace client",
  "nav.settings": "Paramètres",
  "nav.assistant": "Assistant",
  "urgence.title": "Urgence 24/7",
  "urgence.subtitle": "Assistance & sinistres",
  "header.settings": "Paramètres",
  "header.theme": "Changer le thème",
  "settings.title": "Paramètres",
  "settings.section": "PARAMÈTRES",
  "settings.profil": "Profil",
  "settings.preferences": "Préférences",
  "settings.notifications": "Notifications",
  "settings.privacy": "Confidentialité & données",
  "settings.security": "Sécurité",
  // Auth views — titles
  "auth.login.title": "Connexion",
  "auth.register.title": "Créer un compte",
  // Auth views — field labels
  "auth.login.username": "Nom d'utilisateur",
  "auth.login.password": "Mot de passe",
  "auth.register.username": "Nom d'utilisateur",
  "auth.register.email": "Adresse e-mail",
  "auth.register.password": "Mot de passe",
  // Auth views — submit / pending / navigation controls
  "auth.login.submit": "Se connecter",
  "auth.login.pending": "Connexion en cours…",
  "auth.login.toRegister": "Créer un compte",
  "auth.register.submit": "S'inscrire",
  "auth.register.pending": "Création du compte…",
  "auth.register.toLogin": "J'ai déjà un compte",
  "auth.register.success": "Compte créé. Veuillez vous connecter.",
  // Auth — logout control
  "auth.logout": "Se déconnecter",
  // Auth — error messages
  "auth.error.invalidCredentials": "Nom d'utilisateur ou mot de passe incorrect.",
  "auth.error.alreadyExists": "Ce nom d'utilisateur ou cette adresse e-mail est déjà utilisé.",
  "auth.error.network": "Impossible de finaliser la requête. Vérifiez votre connexion et réessayez.",
  "auth.error.invalidData": "Les données saisies sont invalides.",
  "auth.error.badRequestDetail": "Requête invalide :",
  "auth.error.status": "La requête a échoué (code {status}).",
  // Auth — field-validation messages
  "auth.field.username.required": "Le nom d'utilisateur est requis.",
  "auth.field.username.length": "Le nom d'utilisateur a une longueur invalide.",
  "auth.field.email.required": "L'adresse e-mail est requise.",
  "auth.field.email.format": "L'adresse e-mail est invalide.",
  "auth.field.password.required": "Le mot de passe est requis.",
  "auth.field.password.length": "Le mot de passe doit contenir entre 8 et 128 caractères.",
  // Auth — split-screen brand panel
  "auth.brand.loginHeadline": "Votre conseiller assurance, à portée de message.",
  "auth.brand.loginSubtitle":
    "Connectez-vous pour retrouver vos conversations, vos devis et le suivi de vos réclamations.",
  "auth.brand.registerHeadline": "Rejoignez Maghrebia en moins d'une minute.",
  "auth.brand.feature.quotes": "Devis auto, santé et habitation",
  "auth.brand.feature.claims": "Suivi de vos réclamations",
  "auth.brand.feature.support": "Assistance 24/7 en un message",
  "auth.brand.secure": "Connexion chiffrée · vos données restent en Tunisie",
  "auth.brand.confidential": "Vos données restent confidentielles",
  // Auth — headings / segmented nav
  "auth.login.welcome": "Bon retour",
  "auth.login.welcomeSub": "Connectez-vous à votre espace Maghrebia.",
  "auth.register.subtitle": "Quelques informations pour commencer.",
  "auth.nav.login": "Connexion",
  "auth.nav.register": "Inscription",
  // Auth — login extras
  "auth.login.remember": "Rester connecté",
  "auth.login.forgot": "Oublié ?",
  "auth.login.or": "ou",
  "auth.login.agency": "Continuer via mon agence",
  "auth.login.noAccount": "Pas encore de compte ?",
  "auth.login.createAccount": "Créer un compte",
  // Auth — register extras
  "auth.register.haveAccount": "Déjà inscrit ?",
  "auth.register.toLoginInline": "Se connecter",
  "auth.register.terms":
    "J'accepte les conditions d'utilisation et la politique de confidentialité.",
  "auth.register.termsRequired": "Veuillez accepter les conditions pour continuer.",
  "auth.field.email.valid": "Adresse valide",
  // Auth — password field
  "auth.password.show": "Afficher le mot de passe",
  "auth.password.hide": "Masquer le mot de passe",
  "auth.password.strength.weak": "Faible",
  "auth.password.strength.fair": "Moyen",
  "auth.password.strength.good": "Bon",
  "auth.password.strength.strong": "Robuste",
  // Chat — history sidebar
  "chat.newConversation": "Nouvelle conversation",
  "chat.search": "Rechercher…",
  "chat.openHistory": "Ouvrir l'historique",
  "chat.closeHistory": "Fermer l'historique",
  "chat.untitled": "Conversation",
  "history.today": "AUJOURD'HUI",
  "history.yesterday": "HIER",
  "history.last7": "7 DERNIERS JOURS",
  "history.older": "PLUS ANCIEN",
  "chat.disclaimer":
    "Maghrebia Assistant peut faire des erreurs. Vérifiez les informations importantes.",
  // Chat — composer
  "chat.attach": "Joindre un fichier",
  "chat.voiceMode": "Mode vocal",
  // Voice mode
  "voice.status": "En écoute",
  "voice.listening": "Je vous écoute…",
  "voice.idle": "Appuyez sur le micro pour parler",
  "voice.back": "Retour au clavier",
  "voice.unsupported":
    "La reconnaissance vocale n'est pas prise en charge par ce navigateur.",
  "voice.mic": "Activer ou couper le micro",
  "voice.end": "Terminer",
  "voice.speaker": "Lecture audio des réponses",
};

const AR: Dict = {
  "brand.subtitle": "المساعد",
  "nav.quickAccess": "وصول سريع",
  "nav.findAgency": "البحث عن وكالة",
  "nav.clientArea": "فضاء العميل",
  "nav.settings": "الإعدادات",
  "nav.assistant": "المساعد",
  "urgence.title": "الطوارئ 24/7",
  "urgence.subtitle": "المساعدة والحوادث",
  "header.settings": "الإعدادات",
  "header.theme": "تغيير السمة",
  "settings.title": "الإعدادات",
  "settings.section": "الإعدادات",
  "settings.profil": "الملف الشخصي",
  "settings.preferences": "التفضيلات",
  "settings.notifications": "الإشعارات",
  "settings.privacy": "الخصوصية والبيانات",
  "settings.security": "الأمان",
  // Auth views — titles
  "auth.login.title": "تسجيل الدخول",
  "auth.register.title": "إنشاء حساب",
  // Auth views — field labels
  "auth.login.username": "اسم المستخدم",
  "auth.login.password": "كلمة المرور",
  "auth.register.username": "اسم المستخدم",
  "auth.register.email": "البريد الإلكتروني",
  "auth.register.password": "كلمة المرور",
  // Auth views — submit / pending / navigation controls
  "auth.login.submit": "تسجيل الدخول",
  "auth.login.pending": "جارٍ تسجيل الدخول…",
  "auth.login.toRegister": "إنشاء حساب",
  "auth.register.submit": "إنشاء الحساب",
  "auth.register.pending": "جارٍ إنشاء الحساب…",
  "auth.register.toLogin": "لدي حساب بالفعل",
  "auth.register.success": "تم إنشاء الحساب. يرجى تسجيل الدخول.",
  // Auth — logout control
  "auth.logout": "تسجيل الخروج",
  // Auth — error messages
  "auth.error.invalidCredentials": "اسم المستخدم أو كلمة المرور غير صحيحة.",
  "auth.error.alreadyExists": "اسم المستخدم أو البريد الإلكتروني مُستخدم بالفعل.",
  "auth.error.network": "تعذّر إكمال الطلب. تحقق من اتصالك وحاول مرة أخرى.",
  "auth.error.invalidData": "البيانات المُدخلة غير صالحة.",
  "auth.error.badRequestDetail": "طلب غير صالح:",
  "auth.error.status": "فشل الطلب (الرمز {status}).",
  // Auth — field-validation messages
  "auth.field.username.required": "اسم المستخدم مطلوب.",
  "auth.field.username.length": "طول اسم المستخدم غير صالح.",
  "auth.field.email.required": "البريد الإلكتروني مطلوب.",
  "auth.field.email.format": "البريد الإلكتروني غير صالح.",
  "auth.field.password.required": "كلمة المرور مطلوبة.",
  "auth.field.password.length": "يجب أن تتراوح كلمة المرور بين 8 و128 حرفًا.",
  // Auth — split-screen brand panel
  "auth.brand.loginHeadline": "مستشار التأمين الخاص بك، على بُعد رسالة.",
  "auth.brand.loginSubtitle":
    "سجّل الدخول لاستعادة محادثاتك وعروض الأسعار ومتابعة مطالباتك.",
  "auth.brand.registerHeadline": "انضم إلى مغربية في أقل من دقيقة.",
  "auth.brand.feature.quotes": "عروض أسعار للسيارات والصحة والمنزل",
  "auth.brand.feature.claims": "متابعة مطالباتك",
  "auth.brand.feature.support": "مساعدة على مدار الساعة برسالة واحدة",
  "auth.brand.secure": "اتصال مشفّر · تبقى بياناتك في تونس",
  "auth.brand.confidential": "تبقى بياناتك سرية",
  // Auth — headings / segmented nav
  "auth.login.welcome": "مرحبًا بعودتك",
  "auth.login.welcomeSub": "سجّل الدخول إلى مساحتك في مغربية.",
  "auth.register.subtitle": "بعض المعلومات للبدء.",
  "auth.nav.login": "تسجيل الدخول",
  "auth.nav.register": "إنشاء حساب",
  // Auth — login extras
  "auth.login.remember": "إبقَ متصلًا",
  "auth.login.forgot": "نسيت؟",
  "auth.login.or": "أو",
  "auth.login.agency": "المتابعة عبر وكالتي",
  "auth.login.noAccount": "ليس لديك حساب بعد؟",
  "auth.login.createAccount": "إنشاء حساب",
  // Auth — register extras
  "auth.register.haveAccount": "مسجّل بالفعل؟",
  "auth.register.toLoginInline": "تسجيل الدخول",
  "auth.register.terms": "أوافق على شروط الاستخدام وسياسة الخصوصية.",
  "auth.register.termsRequired": "يرجى قبول الشروط للمتابعة.",
  "auth.field.email.valid": "عنوان صالح",
  // Auth — password field
  "auth.password.show": "إظهار كلمة المرور",
  "auth.password.hide": "إخفاء كلمة المرور",
  "auth.password.strength.weak": "ضعيفة",
  "auth.password.strength.fair": "متوسطة",
  "auth.password.strength.good": "جيدة",
  "auth.password.strength.strong": "قوية",
  // Chat — history sidebar
  "chat.newConversation": "محادثة جديدة",
  "chat.search": "بحث…",
  "chat.openHistory": "فتح السجل",
  "chat.closeHistory": "إغلاق السجل",
  "chat.untitled": "محادثة",
  "history.today": "اليوم",
  "history.yesterday": "أمس",
  "history.last7": "آخر 7 أيام",
  "history.older": "أقدم",
  "chat.disclaimer":
    "قد يرتكب مساعد مغربية أخطاء. تحقق من المعلومات المهمة.",
  // Chat — composer
  "chat.attach": "إرفاق ملف",
  "chat.voiceMode": "الوضع الصوتي",
  // Voice mode
  "voice.status": "قيد الاستماع",
  "voice.listening": "أنا أستمع…",
  "voice.idle": "اضغط على الميكروفون للتحدث",
  "voice.back": "العودة إلى لوحة المفاتيح",
  "voice.unsupported": "التعرّف على الكلام غير مدعوم في هذا المتصفح.",
  "voice.mic": "تشغيل أو كتم الميكروفون",
  "voice.end": "إنهاء",
  "voice.speaker": "تشغيل صوت الردود",
};

const DICTS: Record<Locale, Dict> = { fr: FR, ar: AR };

/** Translate a chrome key for the active locale, falling back to the key. */
export function useT(): (key: string) => string {
  const { locale } = usePreferences();
  return useCallback((key: string) => DICTS[locale][key] ?? FR[key] ?? key, [locale]);
}
