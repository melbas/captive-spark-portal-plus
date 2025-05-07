
import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Country codes for interface
export interface CountryCode {
  code: string;
  name: string;
  flag: string;
  example: string;
}

// Common country codes with examples
export const countryCodes: CountryCode[] = [
  { code: "+221", name: "Senegal", flag: "🇸🇳", example: "77 123 45 67" },
  { code: "+225", name: "Côte d'Ivoire", flag: "🇨🇮", example: "07 12 34 56" },
  { code: "+223", name: "Mali", flag: "🇲🇱", example: "76 12 34 56" },
  { code: "+224", name: "Guinea", flag: "🇬🇳", example: "62 12 34 56" },
  { code: "+229", name: "Benin", flag: "🇧🇯", example: "97 12 34 56" },
  { code: "+226", name: "Burkina Faso", flag: "🇧🇫", example: "70 12 34 56" },
  { code: "+227", name: "Niger", flag: "🇳🇪", example: "90 12 34 56" },
  { code: "+228", name: "Togo", flag: "🇹🇬", example: "90 12 34 56" },
  { code: "+220", name: "Gambia", flag: "🇬🇲", example: "7 123 45 67" },
  { code: "+245", name: "Guinea-Bissau", flag: "🇬🇼", example: "95 567 89 01" },
  { code: "+234", name: "Nigeria", flag: "🇳🇬", example: "803 123 4567" },
  { code: "+233", name: "Ghana", flag: "🇬🇭", example: "24 123 4567" },
  { code: "+237", name: "Cameroon", flag: "🇨🇲", example: "6 71 23 45 67" },
  { code: "+235", name: "Chad", flag: "🇹🇩", example: "63 12 34 56" },
  { code: "+241", name: "Gabon", flag: "🇬🇦", example: "06 12 34 56" },
  { code: "+240", name: "Equatorial Guinea", flag: "🇬🇶", example: "222 12 34 56" },
  { code: "+236", name: "Central African Republic", flag: "🇨🇫", example: "70 12 34 56" },
  { code: "+33", name: "France", flag: "🇫🇷", example: "6 12 34 56 78" },
  { code: "+1", name: "USA/Canada", flag: "🇺🇸", example: "555 123 4567" },
  { code: "+44", name: "United Kingdom", flag: "🇬🇧", example: "7911 123456" },
  { code: "+34", name: "Spain", flag: "🇪🇸", example: "612 345 678" },
];

interface CountryCodeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const CountryCodeSelector: React.FC<CountryCodeSelectorProps> = ({ 
  value, 
  onChange,
  className
}) => {
  // Find the currently selected country
  const selectedCountry = countryCodes.find(country => country.code === value) || countryCodes[0];

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`w-[110px] ${className || ''}`}>
        <SelectValue>
          <div className="flex items-center">
            <span className="mr-1">{selectedCountry.flag}</span>
            <span>{selectedCountry.code}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {countryCodes.map((country) => (
          <SelectItem key={country.code} value={country.code}>
            <div className="flex items-center">
              <span className="mr-2">{country.flag}</span>
              <span className="mr-2">{country.code}</span>
              <span className="text-xs text-muted-foreground truncate">{country.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CountryCodeSelector;
