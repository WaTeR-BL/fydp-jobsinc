export type SlotDraft = {
  id: string;
  date: string; // YYYY-MM-DD
  startHour: string; // "HH:mm" e.g. "09:00"
  durationMinutes: number; // 15 | 30 | 45 | ... | 120
  reserved: boolean;
};

export type SlotPayload = {
  startTime: string;
  endTime: string;
  reserved: boolean;
};

export type TimeSlot = {
  timeSlotId: string;
  startTime: string;
  endTime: string;
  selected: boolean;
  reserved?: boolean;
};

export type ReservedSlot = {
  timeSlotId: string;
  startTime: string;
  endTime: string;
};

export type InterviewerProfile = {
  interviewerId: string;
  tenantId: string;
  userId: string;
  timeSlots: TimeSlot[];
} | null;

export type InterviewerSummary = {
  interviewerId: string;
  tenantId?: string;
  userId?: string;
  timeSlotsCount?: number;
};

export type OnboardingStep = 'google-init' | 'create-profile' | 'complete';
