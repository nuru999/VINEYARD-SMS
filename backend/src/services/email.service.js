const nodemailer = require('nodemailer');

function toInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function getEmailConfig() {
  const host = process.env.EMAIL_HOST || process.env.SMTP_HOST;
  const port = toInt(process.env.EMAIL_PORT || process.env.SMTP_PORT, 587);
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.SMTP_USER;

  if (!host || !port || !user || !pass || !from) {
    return null;
  }

  return {
    from,
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    }),
  };
}

async function sendMail({ to, subject, text, html }) {
  const cfg = getEmailConfig();
  if (!cfg) {
    console.warn('[email.service] Email not configured. Skipping sendMail().');
    return { skipped: true };
  }

  if (!to) throw new Error('Email "to" is required');
  if (!subject) throw new Error('Email "subject" is required');

  const info = await cfg.transporter.sendMail({
    from: cfg.from,
    to,
    subject,
    text,
    html,
  });

  return { skipped: false, messageId: info?.messageId };
}

async function sendAccountCreatedEmail({ to, firstName, role, schoolName, loginUrl }) {
  const safeFirstName = firstName ? String(firstName) : 'there';
  const safeRole = role ? String(role) : 'teacher';
  const safeSchoolName = schoolName ? String(schoolName) : 'your school';
  const safeLoginUrl = loginUrl || process.env.FRONTEND_URL || 'http://localhost:5174';

  const subject = 'Your Vineyard SMS account is ready';
  const text = [
    `Hi ${safeFirstName},`,
    '',
    `Your ${safeRole} account has been created successfully for ${safeSchoolName}.`,
    '',
    `You can log in here: ${safeLoginUrl}/login`,
    '',
    'Thank you,',
    'VINEYARD SMS Team',
  ].join('\n');

  // Keep HTML simple for broad SMTP compatibility.
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <p>Hi <strong>${safeFirstName}</strong>,</p>
      <p>Your <strong>${safeRole}</strong> account has been created successfully for <strong>${safeSchoolName}</strong>.</p>
      <p>You can log in here:</p>
      <p><a href="${safeLoginUrl}/login">${safeLoginUrl}/login</a></p>
      <p>Thank you,<br/>VINEYARD SMS Team</p>
    </div>
  `;

  try {
    return await sendMail({ to, subject, text, html });
  } catch (err) {
    // Account creation should not fail due to email issues.
    console.error('[email.service] Failed to sendAccountCreatedEmail:', err.message);
    return { skipped: true, error: err.message };
  }
}

module.exports = {
  sendMail,
  sendAccountCreatedEmail,
};

