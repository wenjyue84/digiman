import React, { useState, createContext, useContext, ReactNode } from 'react';

// Static imports for Vite tree-shaking
import enTranslations from './en.json';
import msTranslations from './ms.json';
import zhCnTranslations from './zh-cn.json';
import esTranslations from './es.json';
import jaTranslations from './ja.json';
import koTranslations from './ko.json';

// Supported languages
export const SUPPORTED_LANGUAGES = {
  en: 'English',
  ms: 'Bahasa Malaysia',
  'zh-cn': '简体中文',
  es: 'Español',
  ja: '日本語',
  ko: '한국어'
} as const;

export type Language = keyof typeof SUPPORTED_LANGUAGES;

// Translation keys for the guest check-in form
export interface Translations {
  // Header and welcome
  welcomeTitle: string;
  completeCheckIn: string;
  assignedUnit: string;
  prefilledInfo: string;

  // Personal Information Section
  personalInfo: string;
  fullNameLabel: string;
  fullNamePlaceholder: string;
  contactNumberLabel: string;
  contactNumberPlaceholder: string;
  genderLabel: string;
  genderPlaceholder: string;
  male: string;
  female: string;
  nationalityLabel: string;
  nationalityPlaceholder: string;

  // Identity Documents Section
  identityDocs: string;
  identityDocsDesc: string;
  icNumberLabel: string;
  icNumberPlaceholder: string;
  passportNumberLabel: string;
  passportNumberPlaceholder: string;
  icPhotoLabel: string;
  icPhotoDesc: string;
  passportPhotoLabel: string;
  passportPhotoDesc: string;
  chooseFile: string;

  // Payment Section
  paymentMethod: string;
  paymentMethodPlaceholder: string;
  cash: string;
  card: string;
  onlineTransfer: string;
  paymentNote: string;

  // Buttons and Actions
  completeCheckInBtn: string;
  completingCheckIn: string;
  editInfo: string;

  // Success Page
  goodDay: string;
  welcomeHostel: string;
  address: string;
  hostelPhotos: string;
  googleMaps: string;
  checkInVideo: string;
  checkInTime: string;
  checkOutTime: string;
  doorPassword: string;
  unitNumber: string;
  accessCard: string;
  importantReminders: string;
  noCardWarning: string;
  noSmoking: string;
  cctvWarning: string;
  infoEditable: string;
  editUntil: string;
  editMyInfo: string;
  linkExpired: string;
  linkExpiresIn: string;
  assistance: string;
  enjoyStay: string;

  // Loading and Error States
  validatingLink: string;
  invalidLink: string;
  invalidLinkDesc: string;
  expiredLink: string;
  expiredLinkDesc: string;
  error: string;
  validationError: string;
  checkInFailed: string;
  checkInSuccess: string;
  checkInSuccessDesc: string;

  // Language Switcher
  selectLanguage: string;
  currentLanguage: string;

  // Print and Email
  printCheckInSlip: string;
  saveAsPdf: string;
  sendToEmail: string;
  sendCheckInSlipEmail: string;
  enterEmailForSlip: string;
  emailAddress: string;
  sendEmail: string;
  cancel: string;
  invalidEmail: string;
  pleaseEnterValidEmail: string;
  emailSent: string;
  checkInSlipSentTo: string;

  // Helper tips (Self Check-in guidance)
  tipsTitle: string;
  tipHaveDocument: string;
  tipPhoneFormat: string;
  tipGenderPrivacy: string;
  tipLanguageSwitch: string;

  photoTipsTitle: string;
  photoTipLighting: string;
  photoTipGlare: string;
  photoTipSize: string;

  // Inline field hints
  nameHint: string;
  phoneHint: string;
  genderHint: string;
  nationalityHint: string;
  icHint: string;
  passportHint: string;
  photoHint: string;
  emergencyContactHint: string;
  emergencyPhoneHint: string;
  notesHint: string;
  paymentMethodHint: string;
  cashDescriptionHint: string;

  // FAQ (Accordion)
  faqNeedHelp: string;
  faqIntro: string;
  faqIcVsPassportQ: string;
  faqIcVsPassportA: string;
  faqPhotoUploadQ: string;
  faqPhotoUploadA: string;
  faqPhoneFormatQ: string;
  faqPhoneFormatA: string;
  faqGenderWhyQ: string;
  faqGenderWhyA: string;
  faqPrivacyQ: string;
  faqPrivacyA: string;
  faqEditAfterQ: string;
  faqEditAfterA: string;

  // Common additional notes quick-select
  commonNotesTitle: string;
  commonNoteLateArrival: string;
  commonNoteBottomUnit: string;
  commonNoteArriveEarly: string;
  commonNoteQuietArea: string;
  commonNoteExtraBedding: string;
}

// Translation dictionary — static imports keyed by language
const translations: Record<Language, Translations> = {
  en: enTranslations as Translations,
  ms: msTranslations as Translations,
  'zh-cn': zhCnTranslations as Translations,
  es: esTranslations as Translations,
  ja: jaTranslations as Translations,
  ko: koTranslations as Translations
};

// I18n context
interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

export const I18nContext = createContext<I18nContextType>({
  language: 'en',
  setLanguage: () => {},
  t: enTranslations as Translations
});

// I18n hook
export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

// I18n Provider component props
interface I18nProviderProps {
  children: ReactNode;
}

// Detect initial language from localStorage or browser settings
function detectInitialLanguage(): Language {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('hostel-language');
    if (stored && Object.keys(SUPPORTED_LANGUAGES).includes(stored)) {
      return stored as Language;
    }
    // Auto-detect from browser/system language (e.g., 'ms-MY' -> 'ms', 'zh-CN' -> 'zh-cn')
    const navLangRaw = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
    const normalized = navLangRaw.toLowerCase();
    const candidates: string[] = [normalized];
    const base = normalized.split('-')[0];
    if (base && base !== normalized) candidates.push(base);
    for (const cand of candidates) {
      if ((SUPPORTED_LANGUAGES as any)[cand]) {
        return cand as Language;
      }
      // Special-case mappings for Chinese variants
      if (cand === 'zh' || cand === 'zh-hans' || cand === 'zh-my' || cand === 'zh-sg') {
        return 'zh-cn';
      }
    }
  }
  return 'en';
}

// I18n Provider component factory function
export const createI18nProvider = () => {
  return React.memo(({ children }: I18nProviderProps) => {
    const [language, setLanguageState] = useState<Language>(detectInitialLanguage);

    const setLanguage = (lang: Language) => {
      setLanguageState(lang);
      if (typeof window !== 'undefined') {
        localStorage.setItem('hostel-language', lang);
      }
    };

    const t = translations[language];

    return React.createElement(
      I18nContext.Provider,
      { value: { language, setLanguage, t } },
      children
    );
  });
};

// Export translation function for direct usage
export const getTranslations = (lang: Language): Translations => {
  return translations[lang] || translations.en;
};
