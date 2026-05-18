import { z } from 'zod';

// Base login schema (email + password)
export const loginSchema = z.object({
  email: z.email({ message: 'Invalid email address' }),
  password: z.string().min(5, { message: 'Password must be at least 5 characters' }),
});

// Login with optional 2FA code
export const loginWithCodeSchema = loginSchema.extend({
  code: z
    .string()
    .length(6, { message: '2FA code must be exactly 6 digits' })
    .regex(/^\d+$/, { message: '2FA code must contain only numbers' })
    .optional(),
});

// 2FA initialization (same as base login)
export const initialize2FASchema = loginSchema;

// 2FA verification (requires code)
export const verify2FASchema = loginSchema.extend({
  code: z
    .string()
    .length(6, { message: '2FA code must be exactly 6 digits' })
    .regex(/^\d+$/, { message: '2FA code must contain only numbers' }),
});

// Type exports for form data
export type LoginFormData = z.infer<typeof loginSchema>;
export type LoginWithCodeFormData = z.infer<typeof loginWithCodeSchema>;
export type Initialize2FAFormData = z.infer<typeof initialize2FASchema>;
export type Verify2FAFormData = z.infer<typeof verify2FASchema>;
