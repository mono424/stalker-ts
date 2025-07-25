import { Storage } from "./storage";
import { createSession, createSkippedSession, StalkerSession } from "./session";

export interface StalkerSessionOptions {
  every: number;
}

export interface Stalker {
  autoFlushInterval: number;

  startSession(name: string, options?: StalkerSessionOptions): StalkerSession;
  flush(): Promise<void>;
  dispose(): void;

  stalkWithOptions<F extends Function>(
    name: string,
    options: StalkerSessionOptions | null,
    fn: F,
  ): F;
  stalkAsyncWithOptions<F extends (...args: any[]) => Promise<any>>(
    name: string,
    options: StalkerSessionOptions | null,
    fn: F,
  ): F;

  stalk<F extends Function>(name: string, fn: F): F;
  stalkAsync<F extends (...args: any[]) => Promise<any>>(
    name: string,
    fn: F,
  ): F;
}

export function stalker(storage: Storage, autoFlushInterval: number = 3000) {
  const sessionCounter = new Map<string, number>();
  const unsafedSessions: StalkerSession[] = [];

  const flush = async () => {
    if (unsafedSessions.length === 0) return;
    const sessions = unsafedSessions.splice(0, unsafedSessions.length);
    await storage.saveSessions(sessions);
  };

  const startSession = (name: string, options?: StalkerSessionOptions) => {
    const sCount = sessionCounter.get(name) || 0;
    const shouldSkip = options?.every && sCount % options.every !== 0;
    const session = shouldSkip
      ? createSkippedSession(name)
      : createSession(name, (session) => {
          unsafedSessions.push(session);
        });
    sessionCounter.set(name, sCount + 1);
    return session;
  };

  const stalkWithOptions = <F extends (...args: any[]) => any>(
    name: string,
    options: StalkerSessionOptions | null,
    fn: F,
  ): F =>
    ((...args: any[]) => {
      const session = startSession(name, options || undefined);
      const result = fn(...args);
      session.endSession();
      return result;
    }) as F;

  const stalkAsyncWithOptions = <F extends (...args: any[]) => Promise<any>>(
    name: string,
    options: StalkerSessionOptions | null,
    fn: F,
  ): F =>
    (async (...args: any[]) => {
      const session = startSession(name, options || undefined);
      const result = await fn(...args);
      session.endSession();
      return result;
    }) as F;

  const stalk = <F extends (...args: any[]) => any>(name: string, fn: F): F =>
    stalkWithOptions(name, null, fn);

  const stalkAsync = <F extends (...args: any[]) => Promise<any>>(
    name: string,
    fn: F,
  ): F => stalkAsyncWithOptions(name, null, fn);

  const interval = setInterval(flush, autoFlushInterval);

  const dispose = () => {
    clearInterval(interval);
  };

  return {
    autoFlushInterval,
    startSession,
    flush,
    dispose,
    stalkWithOptions,
    stalkAsyncWithOptions,
    stalk,
    stalkAsync,
  };
}
