import { StalkerSession } from "./session";
import { InfluxDB, Point } from "@influxdata/influxdb-client-browser";

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

export function influxdb2Storage(
  client: InfluxDB,
  org: string,
  bucket: string,
): Storage {
  return {
    saveSessions: async (sessions: StalkerSession[]) => {
      const writeApi = client.getWriteApi(org, bucket, "ms");
      const points = sessions.reduce((acc, session) => {
        const sessionPoint = new Point("stalker_session")
          .tag("type", "session")
          .tag("name", session.name)
          .floatField("duration", session.getDuration())
          .timestamp(session.startTime);
        const eventPoints = session.events.map((event) => {
          const eventPoint = new Point("stalker_session_event")
            .tag("type", "event")
            .tag("name", event.name)
            .tag("parent_session_name", session.name)
            .floatField("duration", event.time - session.startTime)
            .timestamp(event.time);
          return eventPoint;
        });
        return acc.concat(sessionPoint, ...eventPoints);
      }, [] as Point[]);
      await writeApi.writePoints(points);
      await writeApi.close();
    },
  };
}
