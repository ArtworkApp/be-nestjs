import {
  renderPasswordChangedEmail,
  renderPasswordResetEmail,
  renderWelcomeEmail,
} from './email-templates';

describe('email templates', () => {
  it('creates a welcome message with text and HTML content', () => {
    const message = renderWelcomeEmail('person@example.com');

    expect(message.to).toBe('person@example.com');
    expect(message.subject).toContain('Welcome');
    expect(message.text).toContain('ArtworkApp');
    expect(message.html).toContain('ArtworkApp');
  });

  it('includes the reset link in both formats and escapes HTML attributes', () => {
    const resetUrl =
      'https://app.example.com/reset-password?source=email&flow=reset#token=abc';
    const message = renderPasswordResetEmail({
      to: 'person@example.com',
      resetUrl,
    });

    expect(message.to).toBe('person@example.com');
    expect(message.text).toContain(resetUrl);
    expect(message.html).toContain('source=email&amp;flow=reset#token=abc');
    expect(message.html).toContain('href="https://app.example.com/');
  });

  it('rejects a reset link that is not an HTTP or HTTPS URL', () => {
    expect(() =>
      renderPasswordResetEmail({
        to: 'person@example.com',
        resetUrl: 'javascript:alert(1)',
      }),
    ).toThrow('Invalid password reset URL.');
  });

  it('creates a password-changed notice without a reset link', () => {
    const message = renderPasswordChangedEmail('person@example.com');

    expect(message.text).toMatch(/password/i);
    expect(message.html).toMatch(/password/i);
    expect(message.text).not.toMatch(/https?:\/\//);
    expect(message.html).not.toMatch(/href=/);
  });
});
