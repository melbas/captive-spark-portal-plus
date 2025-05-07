
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
    en: "Watch Video",
    fr: "Regarder une vidéo",
    es: "Ver vídeo"
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
    en: "Portal",
    fr: "Portail",
    es: "Portal"
  },
  phoneNumber: {
    en: "Phone Number",
    fr: "Numéro de téléphone",
    es: "Número de teléfono"
  },
  emailAddress: {
    en: "Email Address",
    fr: "Adresse e-mail",
    es: "Correo electrónico"
  },
  verificationCode: {
    en: "Verification Code",
    fr: "Code de vérification",
    es: "Código de verificación"
  },
  sendCode: {
    en: "Send Code",
    fr: "Envoyer le code",
    es: "Enviar código"
  },
  verify: {
    en: "Verify",
    fr: "Vérifier",
    es: "Verificar"
  },
  goBack: {
    en: "Go Back",
    fr: "Retour",
    es: "Volver"
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
    return (savedLanguage as Language) || "fr"; // Default to French
  });

  // Save language preference to localStorage
  useEffect(() => {
    localStorage.setItem("wifi-portal-language", language);
  }, [language]);

  // Translation function
  const t = (key: string): string => {
    if (translations[key]) {
      return translations[key][language] || key;
    }
    return key; // Fallback to the key itself if translation not found
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Hook for easy access to the language context
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
