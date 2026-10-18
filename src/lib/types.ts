export type EventType = 'coil_change' | 'postpone' | 'refill';

export type CoilEvent = {
  id: string;
  type: EventType;
  occurredAt: string;
  amount?: number;
};

export type CoilState = {
  coilCount: number;
  initialCoilCount: number;
  deadline: string;
  currentCoilStartedAt: string;
  nextChangeAt: string;
  intervalDays: number;
  postponeUntil: string | null;
  events: CoilEvent[];
};
