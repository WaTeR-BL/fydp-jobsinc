'use client';

import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import Image from 'next/image';
import { ArrowLeft, Loader2, QrCode, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface TwoFASetupProps {
  email: string;
  qrCode: string; // Base64 image data
  isLoading: boolean;
  onSubmit: (code: string) => void;
  onBack: () => void;
  error?: string;
}

const TwoFASetup = ({ qrCode, isLoading, onSubmit, onBack, error }: TwoFASetupProps) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input after QR is displayed
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);

    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (digit && index === 5) {
      const code = newDigits.join('');
      if (code.length === 6) {
        onSubmit(code);
      }
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);

    if (pastedData.length > 0) {
      const newDigits = [...digits];
      for (let i = 0; i < pastedData.length && i < 6; i++) {
        newDigits[i] = pastedData[i];
      }
      setDigits(newDigits);

      const nextFocus = Math.min(pastedData.length, 5);
      inputRefs.current[nextFocus]?.focus();

      if (pastedData.length === 6) {
        onSubmit(pastedData);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length === 6) {
      onSubmit(code);
    }
  };

  return (
    <Card className="border-border/50 shadow-2xl backdrop-blur-xl bg-card/80">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Smartphone className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">
          Set Up Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Scan the QR code below with your authenticator app (e.g., Google Authenticator)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* QR Code Display */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative rounded-lg border-2 border-border bg-white p-4">
              {qrCode ? (
                <Image src={qrCode} alt="2FA QR Code" width={192} height={192} unoptimized />
              ) : (
                <div className="flex h-48 w-48 items-center justify-center">
                  <QrCode className="h-12 w-12 text-muted-foreground animate-pulse" />
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              After scanning, enter the 6-digit code from your app to verify setup
            </p>
          </div>

          {/* Code Input Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-center block">Enter verification code</Label>
              <div className="flex justify-center gap-2">
                {digits.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className={`h-12 w-12 text-center text-lg font-semibold ${
                      error ? 'border-destructive focus-visible:ring-destructive/20' : ''
                    }`}
                    disabled={isLoading}
                    autoComplete="one-time-code"
                  />
                ))}
              </div>
              {error && <p className="text-center text-xs font-medium text-destructive">{error}</p>}
            </div>

            <div className="space-y-3">
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || digits.join('').length !== 6}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying Setup...
                  </>
                ) : (
                  'Complete Setup'
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={onBack}
                disabled={isLoading}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
};

export default TwoFASetup;
