export interface StalkerEvent {
  name: string;
  time: number;
  duration: number;
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
      const time = now();
      if (session.events.length > 0) {
        session.events[session.events.length - 1].duration =
          time - session.events[session.events.length - 1].time;
      }
      session.events.push({ name, time, duration: 0 });
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
