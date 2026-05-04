import nodemailer from "nodemailer";

const createTransport = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    throw new Error("Mail service not configured");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    family: 4,
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 10000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS || 10000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 15000),
    auth: {
      user,
      pass,
    },
  });
};

export const sendResetPasswordEmail = async ({ username, email, resetUrl }) => {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const transporter = createTransport();

  await transporter.sendMail({
    from,
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
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const to = process.env.CONTACT_EMAIL || process.env.SMTP_USER;
  const transporter = createTransport();

  await transporter.sendMail({
    from,
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
