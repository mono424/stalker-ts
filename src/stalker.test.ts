import { stalker } from "./stalker";
import { mockStorage } from "./storage";

test("Simple Test", async () => {
  const storage = mockStorage();
  const s = stalker(storage);

  const session = s.startSession("test");
  session.addEvent("test");
  session.endSession();

  await s.flush();

  expect(storage.savedSessions).toHaveLength(1);
  expect(storage.savedSessions[0].name).toBe("test");
  expect(storage.savedSessions[0].getDuration()).toBeGreaterThanOrEqual(0);
  expect(storage.savedSessions[0].events).toHaveLength(1);
  expect(storage.savedSessions[0].events[0].name).toBe("test");
});

test("Simple Test with every", async () => {
  const storage = mockStorage();
  const s = stalker(storage);

  for (let i = 0; i < 12; i++) {
    const session = s.startSession("test", { every: 5 });
    session.addEvent("test");
    session.endSession();
  }

  await s.flush();

  expect(storage.savedSessions).toHaveLength(3);
});

test("Simple Stalk Sync Function Test", async () => {
  const storage = mockStorage();
  const s = stalker(storage);

  const testFn = s.stalk("test", () => {
    // pseudo expensive operation
    let sum = 0;
    for (let i = 0; i < 1000000; i++) {
      sum += Math.sqrt(Math.pow(i, 2));
    }
    return sum;
  });

  const result = await testFn();
  expect(result).toBe(499999500000);

  await s.flush();

  expect(storage.savedSessions).toHaveLength(1);
  expect(storage.savedSessions[0].name).toBe("test");
  expect(storage.savedSessions[0].events).toHaveLength(0);
  expect(storage.savedSessions[0].getDuration()).toBeGreaterThanOrEqual(
    10000000,
  );
});

test("Simple Stalk Async Function Test", async () => {
  const storage = mockStorage();
  const s = stalker(storage);

  const testFn = s.stalkAsync("test", async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    return 1;
  });

  const result = await testFn();
  expect(result).toBe(1);

  await s.flush();

  expect(storage.savedSessions).toHaveLength(1);
  expect(storage.savedSessions[0].name).toBe("test");
  expect(storage.savedSessions[0].events).toHaveLength(0);
  expect(storage.savedSessions[0].getDuration()).toBeGreaterThanOrEqual(
    5000000,
  );
});
