
import React, { ReactNode } from 'react';
import Logo from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { ThemeProvider } from './ThemeProvider';

interface LayoutProps {
  children: ReactNode;
  withGradientBg?: boolean;
  showLogo?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  withGradientBg = true,
  showLogo = true
}) => {
  return (
    <ThemeProvider defaultTheme="system">
      <div className={`min-h-screen ${withGradientBg ? 'gradient-bg' : ''}`}>
        <header className="py-4 px-6 flex items-center justify-between">
          {showLogo && <Logo />}
          <ThemeToggle />
        </header>
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
        <footer className="container mx-auto p-4 text-center text-sm text-foreground/70">
          <p>© 2025 SparkWiFi Portal. All rights reserved.</p>
        </footer>
      </div>
    </ThemeProvider>
  );
};

export default Layout;
