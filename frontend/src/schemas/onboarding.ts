import { z } from 'zod';

export const stepOneSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  emailAddress: z.email('Please enter a valid email address'),
  contactEmail: z.email('Please enter a valid contact email'),
  fullName: z.string().min(2, 'Full name is required'),
  websiteUrl: z.url('Please enter a valid URL').nonempty('Website URL is required'),
});

export const onboardingSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  emailAddress: z.email('Please enter a valid email address'),
  contactEmail: z.email('Please enter a valid contact email'),
  companyAddress: z.string().max(500, 'Address is too long').optional(),
  password: z.string().min(5, 'Password must be at least 5 characters').optional(),
  fullName: z.string().min(2, 'Full name is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  websiteUrl: z.url('Please enter a valid URL').nonempty('Website URL is required'),
});
