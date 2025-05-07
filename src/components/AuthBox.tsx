
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { CheckCircle, ArrowRight, Mail, Phone } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/components/LanguageContext";
import { 
  InputOTP,
  InputOTPGroup,
  InputOTPSlot
} from "@/components/ui/input-otp";

interface AuthBoxProps {
  onAuth: (method: string, data: any) => void;
}

// Country codes for West African countries and other regions
interface CountryCode {
  code: string;
  name: string;
  flag: string;
  example: string;
}

const countryCodes: CountryCode[] = [
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

const AuthBox: React.FC<AuthBoxProps> = ({ onAuth }) => {
  const { t, language } = useLanguage();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState("+221"); // Senegal as default
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [authMethod, setAuthMethod] = useState<'sms' | 'email'>('sms');
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  
  // Get the current country example based on selected code
  const getCurrentCountryExample = () => {
    const country = countryCodes.find(c => c.code === countryCode);
    return country ? country.example : t("localFormat");
  };
  
  // Clear any error when the user types
  useEffect(() => {
    if (phoneNumber) setPhoneError('');
  }, [phoneNumber]);
  
  useEffect(() => {
    if (email) setEmailError('');
  }, [email]);
  
  // Basic validation functions
  const isValidPhoneNumber = (phone: string): boolean => {
    // Simple validation - phone should be numbers only and at least 6 digits
    // Remove spaces and other non-digit characters for validation
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length >= 6 && digitsOnly.length <= 15;
  };
  
  const isValidEmail = (email: string): boolean => {
    // Basic email validation
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
  
  const handleSendOtp = (method: 'sms' | 'email') => {
    // In a real implementation, this would call an API endpoint to send the OTP
    if (method === 'sms') {
      if (!phoneNumber) {
        setPhoneError(t('fillRequired'));
        return;
      }
      
      if (!isValidPhoneNumber(phoneNumber)) {
        setPhoneError(t('enterValidCode'));
        return;
      }
    }
    
    if (method === 'email') {
      if (!email) {
        setEmailError(t('fillRequired'));
        return;
      }
      
      if (!isValidEmail(email)) {
        setEmailError(t('enterValidCode'));
        return;
      }
    }
    
    setAuthMethod(method);
    toast.success(`${t("verificationCodeSent")} ${method === 'sms' ? t("toPhone") : t("toEmail")}`);
    setIsVerifying(true);
  };
  
  const handleVerifyOtp = () => {
    if (!otp || otp.length < 4) {
      toast.error(t("enterValidCode"));
      return;
    }
    
    // Simulate OTP verification - in production, this would verify against a backend
    if (otp === '1234') { // Demo code
      toast.success(t("verificationSuccessful"));
      onAuth('otp', { 
        phoneNumber: authMethod === 'sms' ? `${countryCode}${phoneNumber.replace(/\s/g, '')}` : undefined, 
        email: authMethod === 'email' ? email : undefined, 
        otp 
      });
    } else {
      toast.error(t("invalidCode"));
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto glass-card animate-fade-in">
      {!isVerifying ? (
        <Tabs defaultValue="sms" className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">{t("connectToWifi")}</CardTitle>
            <CardDescription className="text-center">
              {t("chooseVerification")}
            </CardDescription>
            <TabsList className="grid w-full grid-cols-2 mt-4">
              <TabsTrigger value="sms" className="flex items-center gap-2">
                <Phone className="h-4 w-4" /> SMS
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" /> Email
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent>
            <TabsContent value="sms" className="animate-slide-in">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">{t("phoneNumber")}</Label>
                  <div className="flex space-x-2">
                    <Select value={countryCode} onValueChange={setCountryCode}>
                      <SelectTrigger className="w-[110px]">
                        <SelectValue>
                          <div className="flex items-center">
                            <span className="mr-1">
                              {(countryCodes.find(c => c.code === countryCode) || { flag: '🌍' }).flag}
                            </span>
                            <span>{countryCode}</span>
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {countryCodes.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            <div className="flex items-center">
                              <span className="mr-2">{country.flag}</span>
                              <span className="mr-2">{country.code}</span>
                              <span className="text-xs text-muted-foreground">{country.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="relative flex-1">
                      <Input 
                        id="phone" 
                        placeholder={getCurrentCountryExample()}
                        className={`pl-2 ${phoneError ? 'border-red-500' : ''}`}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                      />
                    </div>
                  </div>
                  {phoneError && (
                    <p className="text-xs text-red-500">{phoneError}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t("example")}: {getCurrentCountryExample()}
                  </p>
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => handleSendOtp('sms')}
                >
                  {t("sendCode")} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="email" className="animate-slide-in">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("emailAddress")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="your@email.com" 
                      className={`pl-10 ${emailError ? 'border-red-500' : ''}`}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  {emailError && (
                    <p className="text-xs text-red-500">{emailError}</p>
                  )}
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => handleSendOtp('email')}
                >
                  {t("sendCode")} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      ) : (
        <div className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">{t("verificationCode")}</CardTitle>
            <CardDescription className="text-center">
              {authMethod === 'sms' 
                ? `${t("enterCodeSentTo")} ${countryCode} ${phoneNumber}` 
                : `${t("enterCodeSentTo")} ${email}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">{t("verificationCode")}</Label>
              <div className="flex justify-center">
                <InputOTP maxLength={4} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                {t("useCodeForDemo")} <span className="font-bold">1234</span>
              </p>
            </div>
            <Button 
              className="w-full" 
              onClick={handleVerifyOtp}
            >
              {t("verify")} <CheckCircle className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
          <CardFooter>
            <Button 
              variant="link" 
              className="w-full" 
              onClick={() => setIsVerifying(false)}
            >
              {t("goBack")}
            </Button>
          </CardFooter>
        </div>
      )}
    </Card>
  );
};

export default AuthBox;
