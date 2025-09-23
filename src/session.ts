export interface StalkerEvent {
  name: string;
  time: number;
  duration: number;
  payload?: Record<string, number>;
}

export interface StalkerSession {
  name: string;
  startTime: number;
  endTime?: number;
  events: StalkerEvent[];
  skipped: boolean;

  addEvent(name: string, payload?: Record<string, number>): void;
  endSession(): void;
  discardSession(): void;
  getDuration(): number;
}

function now(): number {
  return Date.now();
}

export function createSkippedSession(name: string): StalkerSession {
  return {
    name,
    startTime: 0,
    events: [],
    skipped: true,
    addEvent: () => {},
    endSession: () => {},
    discardSession: () => {},
    getDuration: () => 0,
  };
}

export function createSession(
  name: string,
  onEnd: (session: StalkerSession) => void,
): StalkerSession {
  let discarded = false;
  const session: StalkerSession = {
    name,
    startTime: now(),
    events: [],
    skipped: false,
    addEvent: (name: string, payload?: Record<string, number>) => {
      if (discarded) {
        console.warn("Session was already discarded");
        return;
      }
      const time = now();
      if (session.events.length > 0) {
        session.events[session.events.length - 1].duration =
          time - session.events[session.events.length - 1].time;
      }
      session.events.push({ name, time, duration: 0, payload });
    },
    endSession: () => {
      if (discarded) {
        console.warn("Session was already discarded");
        return;
      }
      session.endTime = now();
      onEnd(session);
    },
    discardSession: () => {
      discarded = true;
    },
    getDuration: () => {
      if (discarded) {
        console.warn("Session was already discarded");
        return;
      }
      if (!session.endTime) {
        throw new Error("Session not ended");
      }
      return session.endTime - session.startTime;
    },
  };

  return session;
}
