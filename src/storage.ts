import { InfluxDBClient } from "@influxdata/influxdb3-client";
import { StalkerSession } from "./session";

export interface Storage {
  saveSessions(sessions: StalkerSession[]): Promise<void>;
}

export function mockStorage(): Storage & { savedSessions: StalkerSession[] } {
  const savedSessions: StalkerSession[] = [];

  return {
    savedSessions,
    saveSessions: async (sessions: StalkerSession[]) => {
      savedSessions.push(...sessions);
    },
  };
}

export function influxdbStorage(client: InfluxDBClient): Storage {
  return {
    saveSessions: async (sessions: StalkerSession[]) => {
      const points = sessions
        .map(
          (session) =>
            `stalker_session,name=${session.name} duration=${session.getDuration()} ${session.startTime * 1000}\n${session.events
              .map(
                (event, index) =>
                  `stalker_session_event,session_name=${session.name},event_name=${event.name} duration=${
                    (index === session.events.length - 1
                      ? session.endTime
                      : session.events[index + 1].time) - event.time
                  } ${event.time * 1000}`,
              )
              .join("\n")}`,
        )
        .join("\n");
      await client.write(points);
    },
  };
}
