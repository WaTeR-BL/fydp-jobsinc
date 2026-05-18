'use client';

import { useEffect, useState } from 'react';
import { useApplicantLoginMutation } from '@/redux/actions/auth';
import { loginSchema } from '@/schemas/auth';
import { Eye, EyeOff, Loader2, Lock, Mail, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ApplicantLogin = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [applicantLogin, { isLoading }] = useApplicantLoginMutation();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
    const email = searchParams.get('email');
    if (email) {
      setFormData((prev) => ({ ...prev, email: decodeURIComponent(email) }));
    }
  }, [searchParams]);

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      const response = await applicantLogin(formData).unwrap();
      const data = response?.data;

      if (data?.accessToken) {
        toast.success('Login successful!');
        router.push('/applicant/interview');
      } else {
        toast.error('Login failed - no response data');
      }
    } catch (err: unknown) {
      const error = err as { data?: { message?: string }; message?: string };
      toast.error(error.data?.message ?? error.message ?? 'Login failed');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-black/5 [mask-image:radial-gradient(ellipse_at_center,white,transparent)] dark:bg-grid-white/5 pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        <Card className="border-border/50 shadow-2xl backdrop-blur-xl bg-card/80">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold tracking-tight">Applicant Login</CardTitle>
            <CardDescription>Sign in to access your interview portal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 mb-4">
              <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                Please use the password that was sent to your email.
              </p>
            </div>

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
                    placeholder="Enter your password"
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
        </Card>
      </div>
    </div>
  );
};

export default ApplicantLogin;
