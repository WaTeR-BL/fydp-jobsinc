import { createLocalId } from '@/lib/helpers';
import {
  InterviewerProfile,
  InterviewerSummary,
  ReservedSlot,
  SlotDraft,
  SlotPayload,
} from './types';

export const createSlotDraft = (): SlotDraft => ({
  id: createLocalId('slot'),
  date: '',
  startHour: '09:00',
  durationMinutes: 60,
  reserved: false,
});

/** Build ISO start/end from the structured slot fields. Returns null if date is missing. */
export const slotToStartEnd = (slot: SlotDraft): { startTime: string; endTime: string } | null => {
  if (!slot.date || !slot.startHour) return null;
  const start = new Date(`${slot.date}T${slot.startHour}:00`);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + slot.durationMinutes * 60_000);
  return { startTime: start.toISOString(), endTime: end.toISOString() };
};

export const toIsoString = (value: string): string => {
  if (!value) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString();
};

export const formatDateTime = (value?: string): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const buildSlotPayload = (slots: SlotDraft[]): SlotPayload[] =>
  slots
    .map((slot) => {
      const times = slotToStartEnd(slot);
      if (!times) return null;
      return { ...times, reserved: slot.reserved };
    })
    .filter(Boolean) as SlotPayload[];

export const validateSlots = (slots: SlotDraft[]): string | null => {
  if (!slots.length) return 'Add at least one time slot.';

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  minDate.setHours(0, 0, 0, 0);

  for (const slot of slots) {
    if (!slot.date || !slot.startHour) {
      return 'Each slot needs a date and start time.';
    }
    const times = slotToStartEnd(slot);
    if (!times) return 'Please enter valid date and time values.';
    const start = new Date(times.startTime);
    if (start < minDate) {
      return 'Slots must be scheduled from tomorrow onward.';
    }
  }

  const resolved = slots
    .map((s) => slotToStartEnd(s)!)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  for (let i = 0; i < resolved.length - 1; i += 1) {
    const currentEnd = new Date(resolved[i].endTime);
    const nextStart = new Date(resolved[i + 1].startTime);
    if (currentEnd > nextStart) {
      return `Time slots ${i + 1} and ${i + 2} overlap.`;
    }
  }

  return null;
};

export const normalizeInterviewerProfile = (payload: unknown): InterviewerProfile => {
  if (!payload) return null;

  const response = payload as Record<string, any>;
  const data = response?.data ?? response;

  if (!data || typeof data !== 'object') return null;

  // Check if it's a "not found" response
  if (data.message === 'Interviewer not found' || !data.interviewerId) {
    return null;
  }

  return {
    interviewerId: String(data.interviewerId ?? data._id ?? ''),
    tenantId: String(data.tenantId ?? ''),
    userId: String(data.userId ?? ''),
    timeSlots: Array.isArray(data.timeSlots)
      ? data.timeSlots.map((slot: any) => ({
          timeSlotId: String(slot.timeSlotId ?? slot._id ?? ''),
          startTime: slot.startTime ?? '',
          endTime: slot.endTime ?? '',
          selected: Boolean(slot.selected),
          reserved: Boolean(slot.reserved),
        }))
      : [],
  };
};

export const normalizeReservedSlots = (payload: unknown): ReservedSlot[] => {
  if (!payload) return [];
  const response = payload as Record<string, any>;
  const data = response?.data ?? response;
  if (!Array.isArray(data)) return [];
  return data
    .filter((slot: any) => slot && !slot.isDeleted && !slot.selected)
    .map((slot: any) => ({
      timeSlotId: String(slot.timeSlotId ?? slot._id ?? ''),
      startTime: slot.startTime ?? '',
      endTime: slot.endTime ?? '',
    }))
    .filter((slot) => slot.timeSlotId);
};

export const normalizeInterviewers = (payload: unknown): InterviewerSummary[] => {
  if (!payload) return [];

  const response = payload as Record<string, any>;
  const data = response?.data ?? response;

  if (!Array.isArray(data)) return [];

  return data
    .map((item: Record<string, any>) => ({
      interviewerId: String(item?.interviewerId ?? item?._id ?? item?.id ?? ''),
      tenantId: item?.tenantId ? String(item.tenantId) : undefined,
      userId: item?.userId ? String(item.userId) : undefined,
      timeSlotsCount: Array.isArray(item?.timeSlots) ? item.timeSlots.length : 0,
    }))
    .filter((item) => item.interviewerId);
};
