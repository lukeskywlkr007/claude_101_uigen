import { test, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

const mockSignJWTInstance = {
  setProtectedHeader: vi.fn().mockReturnThis(),
  setExpirationTime: vi.fn().mockReturnThis(),
  setIssuedAt: vi.fn().mockReturnThis(),
  sign: vi.fn(() => Promise.resolve("mock-token")),
};

const mockSignJWT = vi.fn(() => mockSignJWTInstance);
const mockJwtVerify = vi.fn();

vi.mock("jose", () => ({
  SignJWT: mockSignJWT,
  jwtVerify: mockJwtVerify,
}));

// Import after mocks are set up
const { createSession, getSession, deleteSession, verifySession } = await import("../auth");

beforeEach(() => {
  vi.clearAllMocks();
  mockSignJWT.mockReturnValue(mockSignJWTInstance);
  mockSignJWTInstance.sign.mockResolvedValue("mock-token");
});

// createSession

test("createSession sets cookie with correct name and httpOnly flag", async () => {
  await createSession("user-1", "user@example.com");

  expect(mockCookieStore.set).toHaveBeenCalledOnce();
  const [name, token, options] = mockCookieStore.set.mock.calls[0];
  expect(name).toBe("auth-token");
  expect(token).toBe("mock-token");
  expect(options.httpOnly).toBe(true);
});

test("createSession sets expiry ~7 days from now", async () => {
  const before = Date.now();
  await createSession("user-1", "user@example.com");
  const after = Date.now();

  const [, , options] = mockCookieStore.set.mock.calls[0];
  const expiry: Date = options.expires;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  expect(expiry.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
  expect(expiry.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
});

// getSession

test("getSession returns null when no cookie exists", async () => {
  mockCookieStore.get.mockReturnValue(undefined);

  const result = await getSession();

  expect(result).toBeNull();
  expect(mockJwtVerify).not.toHaveBeenCalled();
});

test("getSession returns SessionPayload when token is valid", async () => {
  const payload = { userId: "user-1", email: "user@example.com", expiresAt: new Date() };
  mockCookieStore.get.mockReturnValue({ value: "valid-token" });
  mockJwtVerify.mockResolvedValue({ payload });

  const result = await getSession();

  expect(result).toEqual(payload);
});

test("getSession returns null when jwtVerify throws", async () => {
  mockCookieStore.get.mockReturnValue({ value: "expired-token" });
  mockJwtVerify.mockRejectedValue(new Error("Token expired"));

  const result = await getSession();

  expect(result).toBeNull();
});

// deleteSession

test("deleteSession deletes the auth-token cookie", async () => {
  await deleteSession();

  expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
});

// verifySession

test("verifySession returns null when request has no auth cookie", async () => {
  const request = { cookies: { get: vi.fn().mockReturnValue(undefined) } } as any;

  const result = await verifySession(request);

  expect(result).toBeNull();
  expect(mockJwtVerify).not.toHaveBeenCalled();
});

test("verifySession returns SessionPayload when token is valid", async () => {
  const payload = { userId: "user-1", email: "user@example.com", expiresAt: new Date() };
  const request = { cookies: { get: vi.fn().mockReturnValue({ value: "valid-token" }) } } as any;
  mockJwtVerify.mockResolvedValue({ payload });

  const result = await verifySession(request);

  expect(result).toEqual(payload);
});

test("verifySession returns null when jwtVerify throws", async () => {
  const request = { cookies: { get: vi.fn().mockReturnValue({ value: "bad-token" }) } } as any;
  mockJwtVerify.mockRejectedValue(new Error("Invalid token"));

  const result = await verifySession(request);

  expect(result).toBeNull();
});
