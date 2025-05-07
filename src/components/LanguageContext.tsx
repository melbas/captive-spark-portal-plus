
import React, { createContext, useState, useContext, useEffect, ReactNode } from "react";

// Define available languages
export type Language = "en" | "fr" | "es";

// Define translations interface
export interface Translations {
  [key: string]: {
    en: string;
    fr: string;
    es: string;
  };
}

// Define translations
export const translations: Translations = {
  connectToWifi: {
    en: "Connect to our high-speed WiFi network",
    fr: "Connectez-vous à notre réseau WiFi haut débit",
    es: "Conéctese a nuestra red WiFi de alta velocidad"
  },
  watchVideo: {
    en: "Watch Video for More Time",
    fr: "Regarder une vidéo pour plus de temps",
    es: "Ver video para más tiempo"
  },
  playGame: {
    en: "Play Game",
    fr: "Jouer",
    es: "Jugar"
  },
  rewards: {
    en: "Rewards",
    fr: "Récompenses",
    es: "Recompensas"
  },
  profile: {
    en: "Profile",
    fr: "Profil",
    es: "Perfil"
  },
  buyTime: {
    en: "Buy Time",
    fr: "Acheter du temps",
    es: "Comprar tiempo"
  },
  inviteFriends: {
    en: "Invite Friends",
    fr: "Inviter des amis",
    es: "Invitar amigos"
  },
  administration: {
    en: "Administration",
    fr: "Administration",
    es: "Administración"
  },
  termsOfService: {
    en: "Terms of Service",
    fr: "Conditions d'utilisation",
    es: "Términos de servicio"
  },
  privacyPolicy: {
    en: "Privacy Policy",
    fr: "Politique de confidentialité",
    es: "Política de privacidad"
  },
  portal: {
    en: "SparkWiFi Portal",
    fr: "Portail SparkWiFi",
    es: "Portal SparkWiFi"
  },
  byConnecting: {
    en: "By connecting to our network, you agree to our",
    fr: "En vous connectant à notre réseau, vous acceptez nos",
    es: "Al conectarse a nuestra red, acepta nuestros"
  },
  and: {
    en: "and",
    fr: "et",
    es: "y"
  },
  loading: {
    en: "Loading...",
    fr: "Chargement...",
    es: "Cargando..."
  },
  reset: {
    en: "Reset",
    fr: "Réinitialiser",
    es: "Reiniciar"
  },
  demoMac: {
    en: "Demo MAC:",
    fr: "MAC démo :",
    es: "MAC demo:"
  }
};

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
};

// Create context
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Create provider
export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Try to get language from localStorage or default to English
  const [language, setLanguage] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem("wifi-portal-language");
    return (savedLanguage as Language) || "en";
  });

  // Save language preference to localStorage
  useEffect(() => {
    localStorage.setItem("wifi-portal-language", language);
  }, [language]);

  // Translation function
  const t = (key: string): string => {
    if (!translations[key]) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
    return translations[key][language];
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use the language context
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
