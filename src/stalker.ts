import { Storage } from "./storage";
import { createSession, StalkerSession } from "./session";

export interface Stalker {
  autoFlushInterval: number;

  startSession(name: string): StalkerSession;
  flush(): Promise<void>;
  dispose(): void;

  stalk<F extends Function>(name: string, fn: F): F;
  stalkAsync<F extends (...args: any[]) => Promise<any>>(
    name: string,
    fn: F,
  ): F;
}

export function stalker(storage: Storage, autoFlushInterval: number = 3000) {
  const unsafedSessions: StalkerSession[] = [];

  const flush = async () => {
    if (unsafedSessions.length === 0) return;
    const sessions = unsafedSessions.splice(0, unsafedSessions.length);
    await storage.saveSessions(sessions);
  };

  const startSession = (name: string) =>
    createSession(name, (session) => {
      unsafedSessions.push(session);
    });

  const stalk = <F extends (...args: any[]) => any>(name: string, fn: F): F =>
    ((...args: any[]) => {
      const session = startSession(name);
      const result = fn(...args);
      session.endSession();
      return result;
    }) as F;

  const stalkAsync = <F extends (...args: any[]) => Promise<any>>(
    name: string,
    fn: F,
  ): F =>
    (async (...args: any[]) => {
      const session = startSession(name);
      const result = await fn(...args);
      session.endSession();
      return result;
    }) as F;

  const interval = setInterval(flush, autoFlushInterval);

  const dispose = () => {
    clearInterval(interval);
  };

  return {
    autoFlushInterval,
    startSession,
    flush,
    dispose,
    stalk,
    stalkAsync,
  };
}
