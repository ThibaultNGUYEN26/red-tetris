import crypto from "crypto";

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const USERNAME_PATTERN = /^[a-zA-Z0-9]{1,15}$/;
const SESSION_COOKIE_NAME = "red_tetris_session";
const DEV_SESSION_SECRET = "red-tetris-dev-session-secret";
const ALLOWED_COOKIE_SAME_SITE = new Set(["lax", "strict", "none"]);

const isTestRuntime = () =>
  process.env.NODE_ENV === "test" ||
  process.env.VITEST === "true" ||
  Boolean(process.env.VITEST_WORKER_ID);

const isDevRuntime = () => process.env.NODE_ENV === "development";

const allowsTestIdentityFallback = () =>
  (isTestRuntime() || isDevRuntime()) &&
  process.env.DISABLE_AUTH_TEST_FALLBACK !== "true" &&
  process.env.DISABLE_DEV_AUTH_FALLBACK !== "true";

const getSecret = () => {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production");
  }
  return DEV_SESSION_SECRET;
};

export function assertSessionSecret() {
  getSecret();
}

const encode = (value) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

const decode = (value) =>
  JSON.parse(Buffer.from(value, "base64url").toString("utf8"));

const decodeCookieValue = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
};

const sign = (payload) =>
  crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64url");

export function createSessionToken(user) {
  const username = user?.username;
  if (!USERNAME_PATTERN.test(username || "")) {
    throw new Error("Invalid session user");
  }

  const payload = encode({
    sub: String(user.id ?? username),
    username,
    iat: Date.now(),
    exp: Date.now() + TOKEN_TTL_MS,
  });

  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token) {
  if (typeof token !== "string" || !token.includes(".")) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const session = decode(payload);
    if (!USERNAME_PATTERN.test(session?.username || "")) return null;
    if (!Number.isFinite(session?.exp) || session.exp < Date.now()) return null;
    return {
      id: session.sub,
      username: session.username,
    };
  } catch {
    return null;
  }
}

export function getBearerToken(req) {
  const header = req?.headers?.authorization || req?.headers?.Authorization || "";
  if (!header.startsWith("Bearer ")) return "";
  return header.slice("Bearer ".length).trim();
}

export function getCookieValue(cookieHeader = "", name = SESSION_COOKIE_NAME) {
  return String(cookieHeader)
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1) || "";
}

export function getCookieToken(req) {
  const token = getCookieValue(req?.headers?.cookie, SESSION_COOKIE_NAME);
  return token ? decodeCookieValue(token) : "";
}

function getSessionCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  const defaultSameSite = isProduction ? "none" : "lax";
  const configuredSameSite = String(process.env.COOKIE_SAME_SITE || defaultSameSite).toLowerCase();
  const sameSite = ALLOWED_COOKIE_SAME_SITE.has(configuredSameSite)
    ? configuredSameSite
    : "lax";
  const effectiveSameSite = !isProduction && sameSite === "none" ? "lax" : sameSite;

  return {
    httpOnly: true,
    secure: isProduction || effectiveSameSite === "none",
    sameSite: effectiveSameSite,
    path: "/",
  };
}

export function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE_NAME, token, {
    ...getSessionCookieOptions(),
    maxAge: TOKEN_TTL_MS,
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    ...getSessionCookieOptions(),
  });
}

export function requireAuth(req, res, next) {
  const user = authenticateRequest(req);
  if (user) {
    req.auth = user;
    next();
    return;
  }

  res.status(401).json({ error: "Authentication required" });
}

export function authenticateRequest(req) {
  const user = verifySessionToken(getCookieToken(req) || getBearerToken(req));
  if (user) return user;

  if (allowsTestIdentityFallback()) {
    const username =
      req?.body?.username ||
      req?.body?.host ||
      req?.params?.username ||
      req?.query?.username;
    if (USERNAME_PATTERN.test(username || "")) {
      return { username };
    }
  }

  return null;
}

export function rejectUnauthenticated(res) {
  res.status(401).json({ error: "Authentication required" });
}

export function resolveSocketUser(socket, payload = {}) {
  if (!payload?.username) {
    return { ok: false, error: "Missing username" };
  }

  if (!USERNAME_PATTERN.test(payload.username)) {
    return { ok: false, error: "Invalid username" };
  }

  const cookieToken = getCookieValue(socket?.handshake?.headers?.cookie, SESSION_COOKIE_NAME);
  const tokenUser = verifySessionToken(
    (cookieToken ? decodeCookieValue(cookieToken) : "") ||
      payload?.authToken ||
      socket?.handshake?.auth?.token
  );
  if (tokenUser) {
    socket.data.username = tokenUser.username;
    return { ok: true, username: tokenUser.username };
  }

  if (allowsTestIdentityFallback()) {
    return { ok: true, username: payload.username };
  }

  if (USERNAME_PATTERN.test(socket?.data?.username || "")) {
    return { ok: true, username: socket.data.username };
  }

  return { ok: false, error: "Authentication required" };
}

export { SESSION_COOKIE_NAME, USERNAME_PATTERN };
