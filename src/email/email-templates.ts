import type { EmailMessage } from './email-sender';

interface PasswordResetEmailOptions {
  to: string;
  resetUrl: string;
}

const htmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => htmlEntities[character]);
}

function validateResetUrl(resetUrl: string): void {
  try {
    const url = new URL(resetUrl);
    if (url.protocol === 'https:' || url.protocol === 'http:') return;
  } catch {
    // Invalid URLs are reported with the same error as unsupported protocols.
  }
  throw new Error('Invalid password reset URL.');
}

export function renderWelcomeEmail(to: string): EmailMessage {
  return {
    to,
    subject: 'Welcome to ArtworkApp',
    text: 'Welcome to ArtworkApp. Your account has been created.',
    html: '<p>Welcome to ArtworkApp. Your account has been created.</p>',
  };
}

function renderPasswordResetText(resetUrl: string): string {
  return `Use this link to reset your password: ${resetUrl}\n\nIf you did not request this, you can ignore this email.`;
}

function buildPasswordResetHtml(safeUrl: string): string {
  return `<p>Use this link to reset your password:</p><p><a href="${safeUrl}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`;
}

function renderPasswordResetHtml(resetUrl: string): string {
  const safeUrl = escapeHtml(resetUrl);
  return buildPasswordResetHtml(safeUrl);
}

function assemblePasswordResetMessage(
  to: string,
  text: string,
  html: string,
): EmailMessage {
  return { to, subject: 'Reset your ArtworkApp password', text, html };
}

function createPasswordResetMessage(
  options: PasswordResetEmailOptions,
): EmailMessage {
  const text = renderPasswordResetText(options.resetUrl);
  const html = renderPasswordResetHtml(options.resetUrl);
  return assemblePasswordResetMessage(options.to, text, html);
}

export function renderPasswordResetEmail(
  options: PasswordResetEmailOptions,
): EmailMessage {
  validateResetUrl(options.resetUrl);
  return createPasswordResetMessage(options);
}

export function renderPasswordChangedEmail(to: string): EmailMessage {
  return {
    to,
    subject: 'Your ArtworkApp password was changed',
    text: 'Your ArtworkApp password was changed. If you did not make this change, contact support.',
    html: '<p>Your ArtworkApp password was changed. If you did not make this change, contact support.</p>',
  };
}
