
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
      <header className="gradient-header-bg py-4 px-4 sm:px-6 flex items-center justify-between shadow-md animate-slide-down">
        {showLogo && (
          <div className="animate-fade-in">
            <Logo variant="light" />
          </div>
        )}
        <div className="flex items-center gap-2 sm:gap-3 animate-fade-in">
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </header>
      <main className="container mx-auto px-4 py-6 sm:py-8 fade-in max-w-[1200px]">
        {children}
      </main>
      <footer className="container mx-auto p-4 text-center text-sm text-muted-foreground max-w-[1200px] animate-fade-in">
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
