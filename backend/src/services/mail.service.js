import nodemailer from "nodemailer";
import dns from "node:dns/promises";

const RESEND_API_URL = "https://api.resend.com/emails";

const resolveSmtpHost = async (host) => {
  if (process.env.SMTP_FORCE_IPV4 === "false") {
    return host;
  }

  try {
    const addresses = await dns.resolve4(host);
    return addresses[0] || host;
  } catch (err) {
    console.warn(`SMTP IPv4 lookup failed for ${host}:`, err?.message || err);
    return host;
  }
};

const createTransport = async () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    throw new Error("Mail service not configured");
  }

  const resolvedHost = await resolveSmtpHost(host);

  return nodemailer.createTransport({
    host: resolvedHost,
    port,
    secure: port === 465,
    family: 4,
    tls: {
      servername: host,
    },
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 10000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS || 10000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 15000),
    auth: {
      user,
      pass,
    },
  });
};

const getDefaultFrom = () =>
  process.env.RESEND_FROM || process.env.SMTP_FROM || process.env.SMTP_USER;

const sendResendEmail = async ({ from, to, replyTo, subject, text, html }) => {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || !from || !to) {
    throw new Error("Mail service not configured");
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      reply_to: replyTo || undefined,
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Resend email failed (${response.status}): ${errorBody}`);
  }
};

const sendMail = async ({ to, replyTo, subject, text, html }) => {
  const from = getDefaultFrom();

  if (process.env.RESEND_API_KEY) {
    await sendResendEmail({ from, to, replyTo, subject, text, html });
    return;
  }

  const transporter = await createTransport();

  await transporter.sendMail({
    from,
    to,
    replyTo: replyTo || undefined,
    subject,
    text,
    html,
  });
};

export const sendResetPasswordEmail = async ({ username, email, resetUrl }) => {
  await sendMail({
    to: email,
    subject: "Red Tetris password reset",
    text: [
      `Hello ${username},`,
      "",
      "We received a request to reset your password.",
      `Use this link to choose a new password: ${resetUrl}`,
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: `
      <p>Hello ${username},</p>
      <p>We received a request to reset your password.</p>
      <p><a href="${resetUrl}">Click here to choose a new password</a></p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export const sendContactEmail = async ({ object, message, userEmail }) => {
  const to = process.env.CONTACT_EMAIL || process.env.SMTP_USER;

  await sendMail({
    to,
    replyTo: userEmail || undefined,
    subject: `Red Tetris contact: ${object}`,
    text: [
      "New Red Tetris contact message",
      "",
      `From: ${userEmail || "Unknown user email"}`,
      "",
      `Object: ${object}`,
      "",
      message,
    ].join("\n"),
    html: `
      <p><strong>New Red Tetris contact message</strong></p>
      <p><strong>From:</strong> ${escapeHtml(userEmail || "Unknown user email")}</p>
      <p><strong>Object:</strong> ${escapeHtml(object)}</p>
      <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
    `,
  });
};
