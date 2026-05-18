'use client';

import { useState } from 'react';
import {
  useLoginMutation,
  useInitialize2FAMutation,
  useVerify2FASetupMutation,
} from '@/redux/actions/auth';
import { loginSchema, verify2FASchema } from '@/schemas/auth';
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import TwoFACodeInput from './TwoFACodeInput';
import TwoFASetup from './TwoFASetup';
import { is2FARequired, is2FASetupRequired, isLoginSuccess } from '@/types/auth.types';

const LoginType = {
  CREDENTIAL: 'credentials',
  TWO_FA_CODE: '2fa-code',
  TWO_FA_SETUP: '2fa-setup',
} as const;

type LoginType = (typeof LoginType)[keyof typeof LoginType];

const Login = () => {
  const router = useRouter();
  const [login, { isLoading: isLoginLoading }] = useLoginMutation();
  const [initialize2FA, { isLoading: isInitLoading }] = useInitialize2FAMutation();
  const [verify2FASetup, { isLoading: isVerifyLoading }] = useVerify2FASetupMutation();

  // Current step in the login flow
  const [step, setStep] = useState<LoginType>(LoginType.CREDENTIAL);

  // Form data persisted across steps
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // QR code for 2FA setup
  const [qrCode, setQrCode] = useState<string>('');

  // Form state
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [twoFAError, setTwoFAError] = useState<string>('');

  const isLoading = isLoginLoading || isInitLoading || isVerifyLoading;

  // Handle initial login with credentials
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = loginSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      const newErrors: Record<string, string> = {};
      Object.entries(fieldErrors).forEach(([key, val]) => {
        if (val && val.length) newErrors[key] = val[0];
      });
      setErrors(newErrors);
      return;
    }

    try {
      const response = await login(formData).unwrap();
      const data = response?.data;

      if (!data) {
        toast.error('Login failed - no response data');
        return;
      }

      // Check response type and handle accordingly
      if (isLoginSuccess(data)) {
        // Success! Redirect to dashboard
        toast.success('Login successful!');
        router.push('/dashboard');
      } else if (is2FARequired(data)) {
        // User needs to enter 2FA code
        setStep(LoginType.TWO_FA_CODE);
      } else if (is2FASetupRequired(data)) {
        // User needs to set up 2FA - fetch QR code
        await handleInitialize2FA();
      }
    } catch (err: unknown) {
      const error = err as { data?: { message?: string }; message?: string };
      toast.error(error.data?.message ?? error.message ?? 'Login failed');
    }
  };

  // Initialize 2FA setup - get QR code
  const handleInitialize2FA = async () => {
    try {
      const response = await initialize2FA({
        email: formData.email,
        password: formData.password,
      }).unwrap();

      if (response?.data?.qrCode) {
        setQrCode(response.data.qrCode);
        setStep('2fa-setup');
      } else {
        toast.error('Failed to generate QR code');
      }
    } catch (err: unknown) {
      const error = err as { data?: { message?: string }; message?: string };
      toast.error(error.data?.message ?? error.message ?? 'Failed to initialize 2FA');
    }
  };

  // Handle 2FA code submission (for users with 2FA already set up)
  const handleTwoFACode = async (code: string) => {
    setTwoFAError('');

    try {
      const response = await login({
        email: formData.email,
        password: formData.password,
        code,
      }).unwrap();

      const data = response?.data;

      if (data && isLoginSuccess(data)) {
        toast.success('Login successful!');
        router.push('/dashboard');
      } else {
        setTwoFAError('Invalid verification code');
      }
    } catch (err: unknown) {
      const error = err as { data?: { message?: string }; message?: string };
      setTwoFAError(error.data?.message ?? error.message ?? 'Verification failed');
    }
  };

  // Handle 2FA setup verification (complete setup)
  const handleVerify2FASetup = async (code: string) => {
    setTwoFAError('');

    // Validate code format
    const validation = verify2FASchema.safeParse({
      email: formData.email,
      password: formData.password,
      code,
    });

    if (!validation.success) {
      const codeError = validation.error.flatten().fieldErrors.code?.[0];
      setTwoFAError(codeError ?? 'Invalid code format');
      return;
    }

    try {
      const response = await verify2FASetup({
        email: formData.email,
        password: formData.password,
        code,
      }).unwrap();

      const data = response?.data;

      if (data && isLoginSuccess(data)) {
        toast.success('2FA setup complete! Welcome!');
        router.push('/dashboard');
      } else {
        setTwoFAError('Verification failed. Please try again.');
      }
    } catch (err: unknown) {
      const error = err as { data?: { message?: string }; message?: string };
      setTwoFAError(error.data?.message ?? error.message ?? 'Setup verification failed');
    }
  };

  // Reset to credentials step
  const handleBack = () => {
    setStep('credentials');
    setTwoFAError('');
    setQrCode('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Render appropriate step
  const renderStep = () => {
    switch (step) {
      case '2fa-code':
        return (
          <TwoFACodeInput
            email={formData.email}
            isLoading={isLoading}
            onSubmit={handleTwoFACode}
            onBack={handleBack}
            error={twoFAError}
          />
        );

      case '2fa-setup':
        return (
          <TwoFASetup
            email={formData.email}
            qrCode={qrCode}
            isLoading={isLoading}
            onSubmit={handleVerify2FASetup}
            onBack={handleBack}
            error={twoFAError}
          />
        );

      default:
        return (
          <Card className="border-border/50 shadow-2xl backdrop-blur-xl bg-card/80">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
              <CardDescription>Enter your credentials to access your account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="name@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      className={`pl-10 ${errors.email ? 'border-destructive focus-visible:ring-destructive/20' : ''}`}
                      disabled={isLoading}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs font-medium text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      className={`pl-10 pr-10 ${errors.password ? 'border-destructive focus-visible:ring-destructive/20' : ''}`}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs font-medium text-destructive">{errors.password}</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="remember" />
                    <label
                      htmlFor="remember"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Remember me
                    </label>
                  </div>
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-primary hover:underline underline-offset-4"
                  >
                    Forgot password?
                  </Link>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 text-center">
              <div className="text-sm text-muted-foreground">
                Don&apos;t have a tenant account?{' '}
                <Link
                  href="/#register"
                  className="text-primary font-medium hover:underline underline-offset-4"
                >
                  Register
                </Link>
              </div>
            </CardFooter>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-black/5 [mask-image:radial-gradient(ellipse_at_center,white,transparent)] dark:bg-grid-white/5 pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">{renderStep()}</div>
    </div>
  );
};

export default Login;
