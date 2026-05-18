import { z } from 'zod';

//create user schema
export const createUserSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { message: 'Name is required' })
      .max(120, { message: 'Name must be 120 characters or fewer' }),
    emailAddress: z.email({ message: 'Invalid email address' }),
    password: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters' })
      .max(72, { message: 'Password must be 72 characters or fewer' }),
    confirmPassword: z.string().min(1, { message: 'Confirm your password' }),
    role: z.enum(['ADMIN', 'MANAGER', 'INTERVIEWER'] as const, {
      message: 'Select a role',
    }),
    timezone: z.string().min(1, { message: 'Timezone is required' }),
    enable2FA: z.boolean(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export type CreateUserFormValues = z.infer<typeof createUserSchema>;
