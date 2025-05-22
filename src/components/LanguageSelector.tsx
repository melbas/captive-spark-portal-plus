
import React from 'react';
import { Button } from '@/components/ui/button';
import { LanguageType, useLanguage } from './LanguageContext';

export interface LanguageSelectorProps {
  className?: string;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className }) => {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'fr' : 'en');
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className={className}
    >
      {language.toUpperCase()}
    </Button>
  );
};

export default LanguageSelector;
