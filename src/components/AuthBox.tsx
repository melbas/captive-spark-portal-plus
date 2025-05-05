
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { CheckCircle, ArrowRight, Mail, Phone } from 'lucide-react';

interface AuthBoxProps {
  onAuth: (method: string, data: any) => void;
}

const AuthBox: React.FC<AuthBoxProps> = ({ onAuth }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  
  const handleSendOtp = (method: 'sms' | 'email') => {
    // In a real implementation, this would call an API endpoint to send the OTP
    if (method === 'sms' && !phoneNumber) {
      toast.error("Please enter a valid phone number");
      return;
    }
    
    if (method === 'email' && !email) {
      toast.error("Please enter a valid email address");
      return;
    }
    
    toast.success(`Verification code sent to your ${method === 'sms' ? 'phone' : 'email'}`);
    setIsVerifying(true);
  };
  
  const handleVerifyOtp = () => {
    if (!otp) {
      toast.error("Please enter the verification code");
      return;
    }
    
    // Simulate OTP verification - in production, this would verify against a backend
    if (otp === '1234') { // Demo code
      toast.success("Verification successful");
      onAuth('otp', { phoneNumber, email, otp });
    } else {
      toast.error("Invalid verification code");
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto glass-card animate-fade-in">
      {!isVerifying ? (
        <Tabs defaultValue="sms" className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Connect to Wi-Fi</CardTitle>
            <CardDescription className="text-center">
              Choose your preferred verification method
            </CardDescription>
            <TabsList className="grid w-full grid-cols-2 mt-4">
              <TabsTrigger value="sms">SMS</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent>
            <TabsContent value="sms" className="animate-slide-in">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                    <Input 
                      id="phone" 
                      placeholder="+221 xx xxx xx xx" 
                      className="pl-10" 
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => handleSendOtp('sms')}
                >
                  Send Code <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="email" className="animate-slide-in">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="your@email.com" 
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => handleSendOtp('email')}
                >
                  Send Code <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      ) : (
        <div className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Verify Code</CardTitle>
            <CardDescription className="text-center">
              Enter the verification code sent to your {phoneNumber || email}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <Input 
                id="otp" 
                placeholder="Enter code" 
                className="text-center text-lg tracking-widest"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
              <p className="text-xs text-center text-muted-foreground">
                Use code <span className="font-bold">1234</span> for demo
              </p>
            </div>
            <Button 
              className="w-full" 
              onClick={handleVerifyOtp}
            >
              Verify <CheckCircle className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
          <CardFooter>
            <Button 
              variant="link" 
              className="w-full" 
              onClick={() => setIsVerifying(false)}
            >
              Go Back
            </Button>
          </CardFooter>
        </div>
      )}
    </Card>
  );
};

export default AuthBox;
