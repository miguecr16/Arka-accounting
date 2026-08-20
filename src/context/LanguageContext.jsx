import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem('arka_language');
      return saved === 'es' || saved === 'en' ? saved : 'en';
    } catch {
      return 'en';
    }
  });

  const setLanguage = (lang) => {
    const validLang = lang === 'es' ? 'es' : 'en';
    setLanguageState(validLang);
    try {
      localStorage.setItem('arka_language', validLang);
    } catch (err) {
      console.warn('Could not save language to localStorage:', err);
    }
  };

  /**
   * Translates a dot-notated key (e.g. 'dashboard.totalCompanyProfit').
   * If key is missing, returns the fallback string or the key itself.
   */
  const t = (path, fallback = '') => {
    if (!path) return fallback;
    const keys = path.split('.');
    let current = translations[language];

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        // Fallback to english if missing in current language
        let enCurrent = translations['en'];
        for (const enKey of keys) {
          if (enCurrent && typeof enCurrent === 'object' && enKey in enCurrent) {
            enCurrent = enCurrent[enKey];
          } else {
            return fallback || path;
          }
        }
        return typeof enCurrent === 'string' ? enCurrent : (fallback || path);
      }
    }

    return typeof current === 'string' ? current : (fallback || path);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
