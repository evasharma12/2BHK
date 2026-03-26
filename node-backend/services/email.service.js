const nodemailer = require('nodemailer');

function buildTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 8000,
  });
}

async function sendSupportQueryNotification({ queryId, queryText, email, phone, userId }) {
  const to = process.env.SUPPORT_NOTIFICATION_TO;
  if (!to) return { skipped: true, reason: 'SUPPORT_NOTIFICATION_TO not configured' };

  const transporter = buildTransporter();
  if (!transporter) return { skipped: true, reason: 'SMTP config missing' };

  await transporter.sendMail({
    from: process.env.SUPPORT_NOTIFICATION_FROM || process.env.SMTP_USER,
    to,
    subject: 'Customer Care Query from 2BHK application',
    text: [
      'Hello Team,',
      '',
      'A new customer care query has been submitted from the 2BHK application.',
      '',
      'Submission Details:',
      `- Query ID: ${queryId}`,
      `- User ID: ${userId || 'anonymous'}`,
      `- Email: ${email || 'not provided'}`,
      `- Phone: ${phone || 'not provided'}`,
      `- Submitted At: ${new Date().toISOString()}`,
      '',
      'Customer Query:',
      queryText,
      '',
      'Please follow up with the user as soon as possible.',
      '',
      'Regards,',
      '2BHK System',
    ].join('\n'),
  });

  return { sent: true };
}

async function sendFeedbackNotification({ feedbackId, feedbackText, email, phone, userId }) {
  const to = process.env.SUPPORT_NOTIFICATION_TO;
  if (!to) return { skipped: true, reason: 'SUPPORT_NOTIFICATION_TO not configured' };

  const transporter = buildTransporter();
  if (!transporter) return { skipped: true, reason: 'SMTP config missing' };

  await transporter.sendMail({
    from: process.env.SUPPORT_NOTIFICATION_FROM || process.env.SMTP_USER,
    to,
    subject: 'Product Feedback from 2BHK application',
    text: [
      'Hello Team,',
      '',
      'A new feedback submission has been received from the 2BHK application.',
      '',
      'Submission Details:',
      `- Feedback ID: ${feedbackId}`,
      `- User ID: ${userId || 'anonymous'}`,
      `- Email: ${email || 'not provided'}`,
      `- Phone: ${phone || 'not provided'}`,
      `- Submitted At: ${new Date().toISOString()}`,
      '',
      'Feedback:',
      feedbackText,
      '',
      'Please review and prioritize if action is required.',
      '',
      'Regards,',
      '2BHK System',
    ].join('\n'),
  });

  return { sent: true };
}

module.exports = {
  sendSupportQueryNotification,
  sendFeedbackNotification,
};
