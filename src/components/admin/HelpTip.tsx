import { Info } from 'lucide-react';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/**
 * Aide contextuelle réutilisable : infobulle/encart en français simple,
 * sans jargon. Chaque page et chaque champ technique peut en embarquer un.
 *
 * <HelpTip title="Le lien du portail" text="C'est l'adresse que vos clients tapent..." />
 * Variante encart : <HelpTip variant="banner" ... />
 */
interface HelpTipProps {
  title: string;
  text: string;
  /** 'tip' = petite icône ℹ️ à côté d'un titre de champ ; 'banner' = encart visible en haut de page. */
  variant?: 'tip' | 'banner';
  className?: string;
}

export default function HelpTip({ title, text, variant = 'tip', className }: HelpTipProps) {
  if (variant === 'banner') {
    return (
      <div
        className={cn(
          'flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-4 text-sm',
          className,
        )}
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" />
        <div>
          <p className="font-semibold text-foreground">{title}</p>
          <p className="mt-1 leading-relaxed text-muted-foreground">{text}</p>
        </div>
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Aide : ${title}`}
          className={cn(
            'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
            'text-muted-foreground/70 transition-colors hover:text-brand-primary',
            className,
          )}
        >
          <Info className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-72 text-sm">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-1 leading-relaxed text-muted-foreground">{text}</p>
      </PopoverContent>
    </Popover>
  );
}
