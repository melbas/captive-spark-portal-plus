
import React, { ReactNode } from 'react';
import Logo from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { ThemeProvider } from './ThemeProvider';
import LanguageSelector from './LanguageSelector';
import { LanguageProvider } from './LanguageContext';
import { useLanguage } from './LanguageContext';

interface LayoutProps {
  children: ReactNode;
  withGradientBg?: boolean;
  showLogo?: boolean;
}

// Fix: Properly type LayoutContent component
const LayoutContent: React.FC<LayoutProps> = ({ 
  children, 
  withGradientBg = true,
  showLogo = true
}) => {
  const { t } = useLanguage();
  
  return (
    <div className={`min-h-screen ${withGradientBg ? 'gradient-bg' : ''} pb-16`}>
      <header className="py-4 px-6 flex items-center justify-between">
        {showLogo && <Logo />}
        <div className="flex items-center gap-3">
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="container mx-auto p-4 text-center text-sm text-foreground/70">
        <p>© 2025 WIFI Senegal. {t("allRightsReserved")}</p>
      </footer>
    </div>
  );
};

const Layout: React.FC<LayoutProps> = (props) => {
  return (
    <ThemeProvider defaultTheme="system">
      <LanguageProvider>
        <LayoutContent {...props} />
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default Layout;
