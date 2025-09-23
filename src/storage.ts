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
          let eventPoint = new Point("stalker_session_event")
            .tag("type", "event")
            .tag("name", event.name)
            .tag("parent_session_name", session.name)
            .floatField("duration", event.duration)
            .timestamp(event.time);

          if (event.payload) {
            for (const [key, value] of Object.entries(event.payload)) {
              eventPoint = eventPoint.floatField(key, value);
            }
          }
          return eventPoint;
        });
        return acc.concat(sessionPoint, ...eventPoints);
      }, [] as Point[]);
      await writeApi.writePoints(points);
      await writeApi.close();
    },
  };
}

function sessionsToRows(sessions: StalkerSession[]): {
  header: string[];
  rows: (string | number | null)[][];
} {
  const header = [
    "time",
    "duration",
    "sessionName",
    "eventName",
    "eventStartTime",
    "eventDuration",
  ];

  const rows = sessions
    .reduce((acc, session) => {
      const eventPoints = session.events.map((event) => {
        let eventRow = [
          event.time,
          event.duration,
          session.name,
          event.name,
          event.duration,
          ...Array(header.length - 5).fill(null),
        ];

        if (event.payload) {
          for (const [key, value] of Object.entries(event.payload)) {
            const columnIndex = header.indexOf(key);
            if (columnIndex === -1) {
              header.push(key);
              eventRow.push(value);
            } else {
              eventRow[columnIndex] = value;
            }
          }
        }
        return eventRow;
      });
      return [...acc, ...eventPoints];
    }, [] as string[][])
    .map((row) => [
      ...(row ? row : []),
      ...Array(header.length - row.length).fill(null),
    ]);
  return { header, rows };
}

export function tableStorage(): Storage {
  return {
    saveSessions: async (sessions: StalkerSession[]) => {
      const { header, rows } = sessionsToRows(sessions);
      console.table(
        rows.map((row) =>
          Object.fromEntries(header.map((col, i) => [col, row[i]])),
        ),
      );
    },
  };
}

export type CsvOptions = {
  sep: string;
  header: boolean;
  newline: string;
  quote: string;
  callback?: (csv: string) => void;
};

export const defaultCsvOptions: CsvOptions = {
  sep: ",",
  header: true,
  newline: "\n",
  quote: '"',
};

export function csvStorage(options: Partial<CsvOptions>): Storage {
  const csvOptions = { ...defaultCsvOptions, ...options };
  return {
    saveSessions: async (sessions: StalkerSession[]) => {
      const { header, rows } = sessionsToRows(sessions);
      const csv = rows.map((row) =>
        row
          .map((cell) => `${csvOptions.quote}${cell}${csvOptions.quote}`)
          .join(options.sep),
      );
      if (csvOptions.header) {
        csv.unshift(
          header
            .map((col) => `${csvOptions.quote}${col}${csvOptions.quote}`)
            .join(csvOptions.sep),
        );
      }
      if (csvOptions.callback) {
        csvOptions.callback(csv.join(csvOptions.newline));
      } else {
        console.log(csv.join(csvOptions.newline));
      }
    },
  };
}
