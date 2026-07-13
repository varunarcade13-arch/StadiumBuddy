// ─── Supported Languages ────────────────────────────────────────────────────────

import type { SupportedLanguage } from "@/types/chat.types";

export interface LanguageConfig {
  readonly code: SupportedLanguage;
  readonly name: string;
  readonly nativeName: string;
  readonly rtl: boolean;
  readonly flag: string;
}

export const SUPPORTED_LANGUAGES: readonly LanguageConfig[] = [
  { code: "en", name: "English", nativeName: "English", rtl: false, flag: "🇺🇸" },
  { code: "es", name: "Spanish", nativeName: "Español", rtl: false, flag: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", rtl: false, flag: "🇫🇷" },
  { code: "ar", name: "Arabic", nativeName: "العربية", rtl: true, flag: "🇸🇦" },
  { code: "pt", name: "Portuguese", nativeName: "Português", rtl: false, flag: "🇧🇷" },
  { code: "de", name: "German", nativeName: "Deutsch", rtl: false, flag: "🇩🇪" },
  { code: "zh", name: "Chinese", nativeName: "中文", rtl: false, flag: "🇨🇳" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", rtl: false, flag: "🇮🇳" },
  { code: "ja", name: "Japanese", nativeName: "日本語", rtl: false, flag: "🇯🇵" },
  { code: "ko", name: "Korean", nativeName: "한국어", rtl: false, flag: "🇰🇷" },
] as const;

export const DEFAULT_LANGUAGE: SupportedLanguage = "en";

/** Get language config by code */
export function getLanguageConfig(code: SupportedLanguage): LanguageConfig {
  return (
    SUPPORTED_LANGUAGES.find((l) => l.code === code) ??
    (SUPPORTED_LANGUAGES[0] as LanguageConfig)
  );
}
