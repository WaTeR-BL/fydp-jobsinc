import { z } from 'zod';

export const createDomainSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  description: z
    .string()
    .trim()
    .max(500, { message: 'Description must be 500 characters or less' })
    .optional(),
  tags: z
    .array(z.string().min(1, { message: 'Tag must not be empty' }))
    .max(20, { message: 'Use at most 20 tags' })
    .optional(),
  status: z.boolean({ error: 'Status is required' }),
});

export type CreateDomainPayload = z.infer<typeof createDomainSchema>;
