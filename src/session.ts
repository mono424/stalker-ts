export interface StalkerEvent {
  name: string;
  time: number;
}

export interface StalkerSession {
  name: string;
  startTime: number;
  endTime?: number;
  events: StalkerEvent[];

  addEvent(name: string): void;
  endSession(): void;
  getDuration(): number;
}

export function createSession(
  name: string,
  onEnd: (session: StalkerSession) => void,
): StalkerSession {
  const session: StalkerSession = {
    name,
    startTime: window.performance.now(),
    events: [],
    addEvent: (name: string) => {
      session.events.push({ name, time: window.performance.now() });
    },
    endSession: () => {
      session.endTime = window.performance.now();
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
