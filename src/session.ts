export interface StalkerEvent {
  name: string;
  time: number;
}

export interface StalkerSession {
  name: string;
  startTime: number;
  endTime?: number;
  events: StalkerEvent[];
  skipped: boolean;

  addEvent(name: string): void;
  endSession(): void;
  getDuration(): number;
}

function now(): number {
  if (typeof window !== "undefined") {
    return window.performance.now();
  }
  return Date.now() * 1000 * 1000;
}

export function createSkippedSession(name: string): StalkerSession {
  return {
    name,
    startTime: 0,
    events: [],
    skipped: true,
    addEvent: () => {},
    endSession: () => {},
    getDuration: () => 0,
  };
}

export function createSession(
  name: string,
  onEnd: (session: StalkerSession) => void,
): StalkerSession {
  const session: StalkerSession = {
    name,
    startTime: now(),
    events: [],
    skipped: false,
    addEvent: (name: string) => {
      session.events.push({ name, time: now() });
    },
    endSession: () => {
      session.endTime = now();
      onEnd(session);
    },
    getDuration: () => {
      if (!session.endTime) {
        throw new Error("Session not ended");
      }
      return session.endTime - session.startTime;
    },
  };

  return session;
}
