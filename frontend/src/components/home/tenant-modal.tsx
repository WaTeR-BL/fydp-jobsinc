'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Building2, Loader2, XCircle, ImagePlus, X } from 'lucide-react';
import { useTenantOnboardingMutation } from '@/redux/actions/onboarding';
import { useVerifyEmailMutation, useVerifyUrlMutation } from '@/redux/actions/verification';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { onboardingSchema } from '@/schemas/onboarding';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const stepCount = 1;
const steps = [
  {
    title: 'Company Profile',
    description: 'Introduce your business so we can tailor the workspace.',
    icon: Building2,
  },
];

const TenantOnboardingForm = () => {
  const router = useRouter();
  const step = 1;
  const [formData, setFormData] = useState({
    companyName: '',
    emailAddress: '',
    contactEmail: '',
    companyAddress: '',
    password: '',
    fullName: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    websiteUrl: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tenantOnboarding, { isLoading, isSuccess, isError }] = useTenantOnboardingMutation();

  const [emailVerification, setEmailVerification] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
  }>({ status: 'idle' });
  const [verifyEmail] = useVerifyEmailMutation();

  const [urlVerification, setUrlVerification] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
  }>({ status: 'idle' });
  const [verifyUrl] = useVerifyUrlMutation();

  const [contactEmailVerification, setContactEmailVerification] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
  }>({ status: 'idle' });

  const timezoneOptions = useMemo(
    () => [
      'UTC',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Anchorage',
      'Pacific/Honolulu',
      'America/Toronto',
      'America/Vancouver',
      'America/Sao_Paulo',
      'America/Mexico_City',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Europe/Moscow',
      'Europe/Istanbul',
      'Asia/Dubai',
      'Asia/Kolkata',
      'Asia/Singapore',
      'Asia/Shanghai',
      'Asia/Tokyo',
      'Asia/Seoul',
      'Asia/Karachi',
      'Australia/Sydney',
      'Australia/Melbourne',
      'Pacific/Auckland',
      'Africa/Cairo',
      'Africa/Johannesburg',
    ],
    []
  );

  useEffect(() => {
    if (isSuccess) {
      toast.success('Account created! Please log in to complete your subscription.');
      router.push('/login');
    }
  }, [isSuccess, router]);

  const emailDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contactEmailDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runEmailVerification = useCallback(
    async (email: string) => {
      if (!email) {
        setEmailVerification({ status: 'idle' });
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setEmailVerification({ status: 'error', message: 'Invalid email format' });
        return;
      }
      setEmailVerification({ status: 'loading' });
      try {
        const res = await verifyEmail({ email }).unwrap();
        if (res?.data?.valid === false) {
          setEmailVerification({
            status: 'error',
            message: res.data.reason || 'Email verification failed',
          });
        } else {
          setEmailVerification({ status: 'success', message: 'Email verified' });
        }
      } catch (error: any) {
        setEmailVerification({
          status: 'error',
          message: error?.data?.message || error?.message || 'Email verification failed',
        });
      }
    },
    [verifyEmail]
  );

  const runContactEmailVerification = useCallback(
    async (email: string) => {
      if (!email) {
        setContactEmailVerification({ status: 'idle' });
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setContactEmailVerification({ status: 'error', message: 'Invalid email format' });
        return;
      }
      setContactEmailVerification({ status: 'loading' });
      try {
        const res = await verifyEmail({ email }).unwrap();
        if (res?.data?.valid === false) {
          setContactEmailVerification({
            status: 'error',
            message: res.data.reason || 'Email verification failed',
          });
        } else {
          setContactEmailVerification({ status: 'success', message: 'Email verified' });
        }
      } catch (error: any) {
        setContactEmailVerification({
          status: 'error',
          message: error?.data?.message || error?.message || 'Email verification failed',
        });
      }
    },
    [verifyEmail]
  );

  const runUrlVerification = useCallback(
    async (url: string) => {
      if (!url) {
        setUrlVerification({ status: 'idle' });
        return;
      }
      try {
        new URL(url);
      } catch {
        setUrlVerification({ status: 'error', message: 'Invalid URL format' });
        return;
      }
      setUrlVerification({ status: 'loading' });
      try {
        const res = await verifyUrl({ url }).unwrap();
        if (res?.data?.valid === false) {
          setUrlVerification({
            status: 'error',
            message: res.data.reason || 'URL verification failed',
          });
        } else {
          setUrlVerification({ status: 'success', message: 'Website verified' });
        }
      } catch (error: any) {
        setUrlVerification({
          status: 'error',
          message: error?.data?.message || error?.message || 'URL verification failed',
        });
      }
    },
    [verifyUrl]
  );

  const handleEmailBlur = () => {
    if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current);
    runEmailVerification(formData.emailAddress.trim());
  };

  const handleContactEmailBlur = () => {
    if (contactEmailDebounceRef.current) clearTimeout(contactEmailDebounceRef.current);
    runContactEmailVerification(formData.contactEmail.trim());
  };

  const handleUrlBlur = () => {
    if (urlDebounceRef.current) clearTimeout(urlDebounceRef.current);
    runUrlVerification(formData.websiteUrl.trim());
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'emailAddress') {
      setEmailVerification({ status: 'idle' });
      if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current);
      emailDebounceRef.current = setTimeout(() => runEmailVerification(value.trim()), 600);
    } else if (name === 'contactEmail') {
      setContactEmailVerification({ status: 'idle' });
      if (contactEmailDebounceRef.current) clearTimeout(contactEmailDebounceRef.current);
      contactEmailDebounceRef.current = setTimeout(
        () => runContactEmailVerification(value.trim()),
        600
      );
    } else if (name === 'websiteUrl') {
      setUrlVerification({ status: 'idle' });
      if (urlDebounceRef.current) clearTimeout(urlDebounceRef.current);
      urlDebounceRef.current = setTimeout(() => runUrlVerification(value.trim()), 600);
    }
  };

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const isFormIncomplete =
    !formData.companyName ||
    !formData.emailAddress ||
    !formData.contactEmail ||
    !formData.fullName ||
    !formData.websiteUrl ||
    !logoFile ||
    emailVerification.status !== 'success' ||
    contactEmailVerification.status !== 'success' ||
    urlVerification.status !== 'success';

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (!logoFile) {
      toast.error('Company logo is required.');
      setIsSubmitting(false);
      return;
    }

    const parsed = onboardingSchema.safeParse({
      companyName: formData.companyName.trim(),
      emailAddress: formData.emailAddress.trim(),
      contactEmail: formData.contactEmail.trim(),
      companyAddress: formData.companyAddress.trim() || undefined,
      password: formData.password || undefined,
      fullName: formData.fullName.trim(),
      timezone: formData.timezone,
      websiteUrl: formData.websiteUrl.trim(),
    });

    if (!parsed.success) {
      const messages = parsed.error.issues.map((issue) => issue.message).filter(Boolean);
      toast.error(messages[0] ?? 'Please fix the errors and try again.');
      setIsSubmitting(false);
      return;
    }

    try {
      const submitFormData = new FormData();
      submitFormData.append('companyName', parsed.data.companyName);
      submitFormData.append('emailAddress', parsed.data.emailAddress);
      submitFormData.append('contactEmail', parsed.data.contactEmail);
      if (parsed.data.companyAddress) {
        submitFormData.append('companyAddress', parsed.data.companyAddress);
      }
      if (parsed.data.password) {
        submitFormData.append('password', parsed.data.password);
      }
      submitFormData.append('fullName', parsed.data.fullName);
      submitFormData.append('timezone', parsed.data.timezone);
      submitFormData.append('websiteUrl', parsed.data.websiteUrl);
      submitFormData.append('logo', logoFile);

      await tenantOnboarding(submitFormData).unwrap();
    } catch (error: any) {
      const serverMessage = error?.data?.message || error?.message;
      toast.error(serverMessage || 'Onboarding failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressValue = (step / stepCount) * 100;

  return (
    <section id="register" className="relative w-full py-24 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-background to-background"
      />
      <div className="absolute inset-0 bg-grid-black/5 [mask-image:radial-gradient(ellipse_at_center,white,transparent)] dark:bg-grid-white/5 pointer-events-none" />

      <div className="container mx-auto px-4 md:px-6 max-w-5xl relative z-10">
        <Card className="border-border/50 shadow-2xl backdrop-blur-2xl bg-card/60 overflow-hidden">
          <CardHeader className="space-y-8 pb-8 border-b border-border/50 bg-muted/20">
            <div className="flex flex-col gap-4 text-center md:text-left">
              <div className="space-y-2">
                <CardTitle className="text-3xl md:text-4xl font-bold tracking-tight">
                  Create Your Tenant Account
                </CardTitle>
                <CardDescription className="text-lg text-muted-foreground max-w-2xl">
                  Complete onboarding in under two minutes. You can choose your plan on the
                  subscription page after login.
                </CardDescription>
              </div>
            </div>

            {/* <div className="flex flex-col gap-6">
              <div className="relative">
                <Progress value={progressValue} className="h-2 bg-muted" />
                <div
                  className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
                  style={{ backgroundSize: '200% 100%' }}
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                {steps.map(({ title, description, icon: Icon }, index) => {
                  const current = index + 1;
                  const isActive = current === step;
                  return (
                    <div
                      key={title}
                      className={cn(
                        'flex items-start gap-4 rounded-xl border p-5 transition-all duration-300',
                        isActive
                          ? 'border-primary bg-primary/5 shadow-md ring-1 ring-primary/20'
                          : 'border-transparent bg-card/50 hover:bg-card/80'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-300 shadow-sm',
                          isActive
                            ? 'border-primary text-primary scale-110'
                            : 'border-muted-foreground/30 text-muted-foreground bg-background'
                        )}
                      >
                        {current}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                          <Icon
                            className={cn('h-5 w-5', isActive ? 'text-primary' : 'text-muted-foreground')}
                          />
                          {title}
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div> */}
          </CardHeader>

          <CardContent className="p-6 md:p-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-base">
                    Company Name
                  </Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="Acme Inc."
                    required
                    className="h-12 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emailAddress" className="text-base">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Input
                      id="emailAddress"
                      name="emailAddress"
                      type="email"
                      value={formData.emailAddress}
                      onChange={handleChange}
                      onBlur={handleEmailBlur}
                      placeholder="name@company.com"
                      required
                      className={cn(
                        'h-12 text-base pr-10',
                        emailVerification.status === 'error' &&
                          'border-destructive focus-visible:ring-destructive',
                        emailVerification.status === 'success' &&
                          'border-green-500 focus-visible:ring-green-500'
                      )}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {emailVerification.status === 'loading' && (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      )}
                      {emailVerification.status === 'success' && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {emailVerification.status === 'error' && (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                  </div>
                  {emailVerification.status === 'error' && emailVerification.message && (
                    <p className="text-sm text-destructive">{emailVerification.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-base">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Jane Doe"
                    required
                    className="h-12 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail" className="text-base">
                    Contact Email
                  </Label>
                  <div className="relative">
                    <Input
                      id="contactEmail"
                      name="contactEmail"
                      type="email"
                      value={formData.contactEmail}
                      onChange={handleChange}
                      onBlur={handleContactEmailBlur}
                      placeholder="contact@company.com"
                      required
                      className={cn(
                        'h-12 text-base pr-10',
                        contactEmailVerification.status === 'error' &&
                          'border-destructive focus-visible:ring-destructive',
                        contactEmailVerification.status === 'success' &&
                          'border-green-500 focus-visible:ring-green-500'
                      )}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {contactEmailVerification.status === 'loading' && (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      )}
                      {contactEmailVerification.status === 'success' && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {contactEmailVerification.status === 'error' && (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                  </div>
                  {contactEmailVerification.status === 'error' &&
                    contactEmailVerification.message && (
                      <p className="text-sm text-destructive">{contactEmailVerification.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-base">
                    Password
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a secure password"
                    className="h-12 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone" className="text-base">
                    Timezone
                  </Label>
                  <select
                    id="timezone"
                    name="timezone"
                    value={formData.timezone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, timezone: e.target.value }))}
                    required
                    className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {timezoneOptions.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="websiteUrl" className="text-base">
                    Company Website
                  </Label>
                  <div className="relative">
                    <Input
                      id="websiteUrl"
                      name="websiteUrl"
                      type="url"
                      value={formData.websiteUrl}
                      onChange={handleChange}
                      onBlur={handleUrlBlur}
                      placeholder="https://www.acme.com"
                      required
                      className={cn(
                        'h-12 text-base pr-10',
                        urlVerification.status === 'error' &&
                          'border-destructive focus-visible:ring-destructive',
                        urlVerification.status === 'success' &&
                          'border-green-500 focus-visible:ring-green-500'
                      )}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {urlVerification.status === 'loading' && (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      )}
                      {urlVerification.status === 'success' && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {urlVerification.status === 'error' && (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                  </div>
                  {urlVerification.status === 'error' && urlVerification.message && (
                    <p className="text-sm text-destructive">{urlVerification.message}</p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="companyAddress" className="text-base">
                    Company Address
                  </Label>
                  <Textarea
                    id="companyAddress"
                    name="companyAddress"
                    value={formData.companyAddress}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Street, City, Country"
                    className="resize-none text-base min-h-[100px]"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="logo" className="text-base">
                    Company Logo
                  </Label>
                  <div className="relative">
                    {logoPreview ? (
                      <div className="relative inline-block">
                        <Image
                          src={logoPreview}
                          alt="Logo preview"
                          width={96}
                          height={96}
                          unoptimized
                          className="h-24 w-24 object-contain rounded-lg border border-border bg-background p-2"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-destructive-foreground hover:bg-destructive/90 transition-colors"
                          aria-label="Remove logo"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label
                        htmlFor="logo"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer bg-card/50 hover:bg-card/80 transition-colors"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <ImagePlus className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            <span className="font-semibold text-primary">Click to upload</span> or
                            drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            PNG, JPG, GIF up to 5MB
                          </p>
                        </div>
                        <input
                          id="logo"
                          name="logo"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                  size="lg"
                  disabled={isSubmitting || isLoading || isFormIncomplete}
                >
                  {isSubmitting || isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </div>
            </form>

            {isError && (
              <div className="mt-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive text-center font-medium animate-shake">
                Something went wrong. Please try again.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default TenantOnboardingForm;
