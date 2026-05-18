import { z } from 'zod';

export const jobMetricSchema = z.object({
  title: z.string().min(1, { message: 'Metric title is required' }),
  description: z.string().min(1, { message: 'Metric description is required' }),
  status: z.boolean({ error: 'Metric status is required' }),
});

const scoringSchema = z
  .object({
    min: z.number().int().min(1, { message: 'Minimum score must be at least 1' }),
    max: z.number().int().min(1, { message: 'Maximum score must be at least 1' }),
    anchors: z.record(z.string(), z.string()),
  })
  .refine((data) => data.max > data.min, {
    message: 'Maximum score must be greater than minimum score',
    path: ['max'],
  });
// fixed here

export const jobChecklistSchema = z.object({
  criterion: z.string().min(10, { message: 'Criterion must be at least 10 characters' }),
  category: z.string().min(1, { message: 'Category is required' }),
  scoring: scoringSchema,
  enabled: z.boolean().optional().default(true),
});

export const interviewRoundSchema = z.object({
  roundNumber: z.number().int().min(1),
  roundName: z.string().min(1, { message: 'Round name is required' }),
  interviewType: z.union([z.literal(0), z.literal(1)]),
  checkLists: z.array(jobChecklistSchema).optional().default([]),
  defaultInterviewerId: z.string().optional(),
  isOptional: z.boolean().default(false),
});

export const createJobSchema = z.object({
  title: z.string().min(1, { message: 'Job title is required' }),
  jobStatus: z
    .number({ error: 'Job status is required' })
    .int({ message: 'Job status must be an integer' }),
  domainId: z.string().min(1, { message: 'Domain is required' }),
  start: z.date().optional(),
  end: z.date().optional(),
  metrics: z.array(jobMetricSchema).min(1, { message: 'Add at least one metric' }),
  interviewPipeline: z.array(interviewRoundSchema).optional().default([]),
});

export type CreateJobPayload = z.infer<typeof createJobSchema>;
