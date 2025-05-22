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

// Define translation categories
export enum TranslationCategory {
  GENERAL = "general",
  AUTH = "auth",
  WIFI = "wifi",
  REWARDS = "rewards",
  GAMES = "games",
  PROFILE = "profile",
  LEGAL = "legal",
  PAYMENT = "payment",
  ADS = "ads",
  SUPPORT = "support"
}

// Define grouped translations with categories
export const translations: Record<string, Translations> = {
  // General UI elements
  [TranslationCategory.GENERAL]: {
    welcome: {
      en: "Welcome",
      fr: "Bienvenue",
      es: "Bienvenido"
    },
    loading: {
      en: "Loading...",
      fr: "Chargement...",
      es: "Cargando..."
    },
    continue: {
      en: "Continue",
      fr: "Continuer",
      es: "Continuar"
    },
    goBack: {
      en: "Go Back",
      fr: "Retour",
      es: "Volver"
    },
    error: {
      en: "Error",
      fr: "Erreur",
      es: "Error"
    },
    tryAgain: {
      en: "Please try again",
      fr: "Veuillez réessayer",
      es: "Por favor, inténtelo de nuevo"
    },
    fillRequired: {
      en: "Please fill in all required fields",
      fr: "Veuillez remplir tous les champs obligatoires",
      es: "Por favor, rellene todos los campos obligatorios"
    },
    success: {
      en: "Success",
      fr: "Succès",
      es: "Éxito"
    },
    cancel: {
      en: "Cancel",
      fr: "Annuler",
      es: "Cancelar"
    },
    submit: {
      en: "Submit",
      fr: "Soumettre",
      es: "Enviar"
    },
    reset: {
      en: "Reset",
      fr: "Réinitialiser",
      es: "Resetear"
    },
    and: {
      en: "and",
      fr: "et",
      es: "y"
    },
    portal: {
      en: "WiFi Portal",
      fr: "Portail WiFi",
      es: "Portal WiFi"
    },
    demoMac: {
      en: "Demo MAC:",
      fr: "MAC de démo:",
      es: "MAC de demostración:"
    },
    retry: {
      en: "Retry",
      fr: "Réessayer",
      es: "Reintentar"
    },
    allRightsReserved: {
      en: "All rights reserved.",
      fr: "Tous droits réservés.",
      es: "Todos los derechos reservados."
    },
  },

  // Authentication related
  [TranslationCategory.AUTH]: {
    connectToWifi: {
      en: "Connect to our high-speed WiFi network",
      fr: "Connectez-vous à notre réseau WiFi haut débit",
      es: "Conéctese a nuestra red WiFi de alta velocidad"
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
    chooseVerification: {
      en: "Choose your preferred verification method",
      fr: "Choisissez votre méthode de vérification préférée",
      es: "Elija su método de verificación preferido"
    },
    localFormat: {
      en: "your local format",
      fr: "votre format local",
      es: "su formato local"
    },
    example: {
      en: "Example",
      fr: "Exemple",
      es: "Ejemplo"
    },
    verificationCodeSent: {
      en: "Verification code sent to your",
      fr: "Code de vérification envoyé à votre",
      es: "Código de verificación enviado a su"
    },
    toPhone: {
      en: "phone",
      fr: "téléphone",
      es: "teléfono"
    },
    toEmail: {
      en: "email",
      fr: "email",
      es: "correo electrónico"
    },
    enterValidCode: {
      en: "Please enter a valid verification code",
      fr: "Veuillez entrer un code de vérification valide",
      es: "Por favor, introduzca un código de verificación válido"
    },
    verificationSuccessful: {
      en: "Verification successful",
      fr: "Vérification réussie",
      es: "Verificación exitosa"
    },
    invalidCode: {
      en: "Invalid verification code",
      fr: "Code de vérification invalide",
      es: "Código de verificación no válido"
    },
    useCodeForDemo: {
      en: "Use code",
      fr: "Utilisez le code",
      es: "Use el código"
    },
    enterCodeSentTo: {
      en: "Enter the verification code sent to",
      fr: "Entrez le code de vérification envoyé à",
      es: "Introduzca el código de verificación enviado a"
    },
    countryCode: {
      en: "Country Code",
      fr: "Indicatif du pays",
      es: "Código de país"
    },
    selectCountry: {
      en: "Select Country",
      fr: "Sélectionner le pays",
      es: "Seleccionar país"
    },
    phoneVerification: {
      en: "Phone Verification",
      fr: "Vérification par téléphone",
      es: "Verificación por teléfono"
    },
    emailVerification: {
      en: "Email Verification",
      fr: "Vérification par e-mail",
      es: "Verificación por correo electrónico"
    },
    registerSuccess: {
      en: "Registration successful",
      fr: "Inscription réussie",
      es: "Registro exitoso"
    },
    validPhone: {
      en: "Please enter a valid phone number",
      fr: "Veuillez entrer un numéro de téléphone valide",
      es: "Por favor, introduzca un número de teléfono válido"
    },
    validEmail: {
      en: "Please enter a valid email address",
      fr: "Veuillez entrer une adresse email valide", 
      es: "Por favor, introduzca una dirección de correo electrónico válida"
    },
  },

  // WiFi related
  [TranslationCategory.WIFI]: {
    accessGranted: {
      en: "Access Granted",
      fr: "Accès accordé",
      es: "Acceso concedido"
    },
    youHave: {
      en: "You have",
      fr: "Vous avez",
      es: "Tiene"
    },
    ofWifiAccess: {
      en: "of WiFi access",
      fr: "d'accès WiFi",
      es: "de acceso WiFi"
    },
    buyTime: {
      en: "Buy Time",
      fr: "Acheter du temps",
      es: "Comprar tiempo"
    },
    extendTime: {
      en: "Extend Time",
      fr: "Prolonger le temps",
      es: "Extender tiempo"
    },
    minutes: {
      en: "minutes",
      fr: "minutes",
      es: "minutos"
    },
    remaining: {
      en: "remaining",
      fr: "restantes",
      es: "restantes"
    },
    watchVideo: {
      en: "Watch Video",
      fr: "Regarder une vidéo",
      es: "Ver vídeo"
    },
    watchTheVideo: {
      en: "Watch the video to continue",
      fr: "Regardez la vidéo pour continuer",
      es: "Ver el video para continuar"
    },
  },

  // Rewards and games
  [TranslationCategory.REWARDS]: {
    rewards: {
      en: "Rewards",
      fr: "Récompenses",
      es: "Recompensas"
    },
    playGame: {
      en: "Play Game",
      fr: "Jouer",
      es: "Jugar"
    },
    submitAnswer: {
      en: "Submit Answer",
      fr: "Soumettre la réponse",
      es: "Enviar respuesta"
    },
  },

  // Games related
  [TranslationCategory.GAMES]: {
    gameResults: {
      en: "Game Results",
      fr: "Résultats du jeu",
      es: "Resultados del juego"
    },
    yourScore: {
      en: "Your Score",
      fr: "Votre score",
      es: "Tu puntuación"
    },
    playAgain: {
      en: "Play Again",
      fr: "Rejouer",
      es: "Jugar de nuevo"
    },
    gameInstructions: {
      en: "Game Instructions",
      fr: "Instructions du jeu",
      es: "Instrucciones del juego"
    },
    startGame: {
      en: "Start Game",
      fr: "Commencer le jeu",
      es: "Iniciar juego"
    },
  },

  // Profile related
  [TranslationCategory.PROFILE]: {
    profile: {
      en: "Profile",
      fr: "Profil",
      es: "Perfil"
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
    connectionHistory: {
      en: "Connection History",
      fr: "Historique de connexion",
      es: "Historial de conexión"
    },
    userPoints: {
      en: "Your Points",
      fr: "Vos points",
      es: "Sus puntos"
    },
    userLevel: {
      en: "Your Level",
      fr: "Votre niveau",
      es: "Su nivel"
    },
    basic: {
      en: "Basic",
      fr: "Basique",
      es: "Básico"
    },
    silver: {
      en: "Silver",
      fr: "Argent",
      es: "Plata"
    },
    gold: {
      en: "Gold",
      fr: "Or",
      es: "Oro"
    },
    platinum: {
      en: "Platinum",
      fr: "Platine", 
      es: "Platino"
    },
  },

  // Legal related
  [TranslationCategory.LEGAL]: {
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
    byConnecting: {
      en: "By connecting to our network, you agree to our",
      fr: "En vous connectant à notre réseau, vous acceptez nos",
      es: "Al conectarse a nuestra red, acepta nuestros"
    },
  },
  
  // Payment related
  [TranslationCategory.PAYMENT]: {
    buyWifiTime: {
      en: "Buy WiFi Time",
      fr: "Acheter du temps WiFi",
      es: "Comprar tiempo WiFi"
    },
    choosePackageAndPay: {
      en: "Choose a package and pay to get more WiFi time",
      fr: "Choisissez un forfait et payez pour obtenir plus de temps WiFi",
      es: "Elija un paquete y pague para obtener más tiempo WiFi"
    },
    mostPopular: {
      en: "Most Popular",
      fr: "Plus populaire",
      es: "Más popular"
    },
    select: {
      en: "Select",
      fr: "Sélectionner",
      es: "Seleccionar"
    },
    selectedPackage: {
      en: "Selected Package",
      fr: "Forfait sélectionné",
      es: "Paquete seleccionado"
    },
    changePackage: {
      en: "Change Package",
      fr: "Changer de forfait",
      es: "Cambiar paquete"
    },
    paymentMethod: {
      en: "Payment Method",
      fr: "Méthode de paiement",
      es: "Método de pago"
    },
    mobileMoney: {
      en: "Mobile Money",
      fr: "Mobile Money",
      es: "Dinero Móvil"
    },
    creditCard: {
      en: "Credit Card",
      fr: "Carte bancaire",
      es: "Tarjeta de crédito"
    },
    selectProvider: {
      en: "Select Provider",
      fr: "Sélectionner l'opérateur",
      es: "Seleccionar proveedor"
    },
    enterPhoneNumber: {
      en: "Enter your phone number",
      fr: "Entrez votre numéro de téléphone",
      es: "Ingrese su número de teléfono"
    },
    cardNumber: {
      en: "Card Number",
      fr: "Numéro de carte",
      es: "Número de tarjeta"
    },
    expiryDate: {
      en: "Expiry Date",
      fr: "Date d'expiration",
      es: "Fecha de vencimiento"
    },
    nameOnCard: {
      en: "Name on Card",
      fr: "Nom sur la carte",
      es: "Nombre en la tarjeta"
    },
    fullName: {
      en: "First Name LAST NAME",
      fr: "Prénom NOM",
      es: "Nombre APELLIDO"
    },
    pay: {
      en: "Pay",
      fr: "Payer",
      es: "Pagar"
    },
    processing: {
      en: "Processing...",
      fr: "Traitement en cours...",
      es: "Procesando..."
    },
    selectPackage: {
      en: "Please select a package",
      fr: "Veuillez sélectionner un forfait",
      es: "Por favor seleccione un paquete"
    },
    paymentSuccess: {
      en: "Payment successful! Your WiFi time has been added.",
      fr: "Paiement réussi! Votre temps WiFi a été ajouté.",
      es: "¡Pago exitoso! Se ha añadido su tiempo WiFi."
    },
    securePayment: {
      en: "Secure Payment",
      fr: "Paiement sécurisé",
      es: "Pago seguro"
    },
    paymentSecurityInfo: {
      en: "All your payment information is secure. We do not store your card details.",
      fr: "Toutes vos informations de paiement sont sécurisées. Nous ne stockons pas vos données de carte bancaire.",
      es: "Toda su información de pago está segura. No almacenamos los datos de su tarjeta."
    },
  },
  
  // Advertisement related
  [TranslationCategory.ADS]: {
    advertisement: {
      en: "Advertisement",
      fr: "Publicité",
      es: "Publicidad"
    },
    learnMore: {
      en: "Learn More",
      fr: "En savoir plus",
      es: "Más información"
    },
    sponsoredContent: {
      en: "Sponsored Content",
      fr: "Contenu sponsorisé",
      es: "Contenido patrocinado"
    },
    specialOffer: {
      en: "Special Offer",
      fr: "Offre spéciale",
      es: "Oferta especial"
    },
  },
  
  // Support related
  [TranslationCategory.SUPPORT]: {
    whatsappSupport: {
      en: "WhatsApp Support",
      fr: "Support WhatsApp",
      es: "Soporte WhatsApp"
    },
    contactSupport: {
      en: "Contact Support",
      fr: "Contacter le support",
      es: "Contactar soporte"
    },
    whatsappDefaultMessage: {
      en: "Hello, I need help with my WiFi connection.",
      fr: "Bonjour, j'ai besoin d'aide avec ma connexion WiFi.",
      es: "Hola, necesito ayuda con mi conexión WiFi."
    },
  },
};

// Flatten all translations into a single object for easy access
const flattenedTranslations: Translations = Object.values(translations).reduce((acc, categoryTranslations) => {
  return { ...acc, ...categoryTranslations };
}, {});

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
    if (flattenedTranslations[key]) {
      return flattenedTranslations[key][language] || key;
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
