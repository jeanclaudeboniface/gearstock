/**
 * EmailService - Centralized email sending using Resend
 * 
 * All transactional emails go through this service.
 * Configuration via environment variables:
 *   - RESEND_API_KEY: API key for Resend
 *   - EMAIL_FROM: Sender address (default: onboarding@resend.dev for sandbox)
 *   - APP_PUBLIC_URL: Frontend URL for links in emails
 */

const { Resend } = require('resend');

class EmailService {
  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('[EmailService] RESEND_API_KEY not set - emails will be logged but not sent');
      this.resend = null;
    } else {
      this.resend = new Resend(apiKey);
    }
    
    // Default to Resend sandbox sender if EMAIL_FROM not set
    this.from = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    this.appUrl = process.env.APP_PUBLIC_URL || 'http://localhost:5173';
  }

  /**
   * Sleep helper for retry delays
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Send an email via Resend with retry logic for rate limits
   * @private
   */
  async _send({ to, subject, html, text }) {
    const payload = {
      from: this.from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text
    };

    console.log('[EmailService] Attempting to send email:', { 
      from: this.from, 
      to: payload.to, 
      subject 
    });

    if (!this.resend) {
      console.log('[EmailService] Email would be sent:', { to, subject });
      console.log('[EmailService] HTML:', html);
      return { id: 'mock-' + Date.now(), mock: true };
    }

    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.resend.emails.send(payload);
        console.log('[EmailService] Email sent:', result);
        return result;
      } catch (error) {
        lastError = error;
        const statusCode = error?.statusCode || error?.status || 0;
        const errorMessage = error?.message || String(error);
        
        console.error(`[EmailService] Attempt ${attempt}/${maxRetries} failed:`, {
          statusCode,
          message: errorMessage,
          to: payload.to
        });

        // Check if it's a rate limit error (429) or temporary server error (5xx)
        if (statusCode === 429 || (statusCode >= 500 && statusCode < 600)) {
          if (attempt < maxRetries) {
            // Exponential backoff: 2s, 4s, 8s...
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`[EmailService] Rate limited or server error, retrying in ${delay}ms...`);
            await this._sleep(delay);
            continue;
          }
        }

        // For other errors (400, 401, 403, etc.), don't retry
        if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
          console.error('[EmailService] Non-retryable error:', errorMessage);
          break;
        }
      }
    }

    console.error('[EmailService] All retry attempts failed for:', payload.to);
    throw lastError;
  }

  /**
   * Send invite email with link to accept
   * @param {Object} params
   * @param {string} params.to - Recipient email
   * @param {string} params.garageName - Name of the garage/tenant
   * @param {string} params.role - Role being offered
   * @param {string} params.token - Raw invite token (not hashed)
   * @param {string} params.inviterName - Name of person who sent invite
   */
  async sendInviteEmail({ to, garageName, role, token, inviterName }) {
    const inviteUrl = `${this.appUrl}/invite/${token}`;
    
    const subject = `You've been invited to join ${garageName}`;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">You're Invited!</h1>
  </div>
  
  <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      ${inviterName ? `<strong>${inviterName}</strong> has invited you` : 'You have been invited'} to join <strong>${garageName}</strong> as a <strong>${role}</strong>.
    </p>
    
    <p style="font-size: 14px; color: #64748b; margin-bottom: 24px;">
      Click the button below to accept your invitation and set up your account.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${inviteUrl}" style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Accept Invitation
      </a>
    </div>
    
    <p style="font-size: 12px; color: #94a3b8; margin-top: 30px;">
      This invitation will expire in 7 days. If you didn't expect this email, you can safely ignore it.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
    
    <p style="font-size: 12px; color: #94a3b8; margin: 0;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${inviteUrl}" style="color: #3b82f6; word-break: break-all;">${inviteUrl}</a>
    </p>
  </div>
</body>
</html>
    `.trim();

    const text = `
You've been invited to join ${garageName}

${inviterName ? `${inviterName} has invited you` : 'You have been invited'} to join ${garageName} as a ${role}.

Accept your invitation here: ${inviteUrl}

This invitation will expire in 7 days.

If you didn't expect this email, you can safely ignore it.
    `.trim();

    return this._send({ to, subject, html, text });
  }

  /**
   * Send OTP verification code email
   * @param {Object} params
   * @param {string} params.to - Recipient email
   * @param {string} params.code - 6-digit OTP code
   * @param {string} params.garageName - Name of the garage for context
   */
  async sendOtpEmail({ to, code, garageName }) {
    const subject = 'Your verification code';
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px;">
    <h1 style="font-size: 20px; margin: 0 0 20px 0; color: #1e293b;">Verification Code</h1>
    
    <p style="font-size: 14px; color: #64748b; margin-bottom: 24px;">
      Use this code to verify your email and complete your registration for <strong>${garageName}</strong>.
    </p>
    
    <div style="background: #1e293b; padding: 20px; border-radius: 8px; text-align: center; margin: 24px 0;">
      <span style="font-family: 'SF Mono', Monaco, 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: white;">${code}</span>
    </div>
    
    <p style="font-size: 14px; color: #ef4444; font-weight: 500; text-align: center;">
      This code expires in 10 minutes.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
    
    <p style="font-size: 12px; color: #94a3b8; margin: 0;">
      If you didn't request this code, please ignore this email. Someone may have entered your email address by mistake.
    </p>
  </div>
</body>
</html>
    `.trim();

    const text = `
Your verification code is: ${code}

Use this code to verify your email and complete your registration for ${garageName}.

This code expires in 10 minutes.

If you didn't request this code, please ignore this email.
    `.trim();

    return this._send({ to, subject, html, text });
  }

  /**
   * Send password reset email
   * @param {Object} params
   * @param {string} params.to - Recipient email
   * @param {string} params.resetToken - Password reset token
   * @param {string} params.userName - User's name for personalization
   */
  async sendPasswordResetEmail({ to, resetToken, userName }) {
    const resetUrl = `${this.appUrl}/reset-password/${resetToken}`;
    
    const subject = 'Reset your password';
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px;">
    <h1 style="font-size: 20px; margin: 0 0 20px 0; color: #1e293b;">Password Reset</h1>
    
    <p style="font-size: 14px; color: #64748b; margin-bottom: 24px;">
      Hi${userName ? ` ${userName}` : ''}, we received a request to reset your password.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Reset Password
      </a>
    </div>
    
    <p style="font-size: 14px; color: #ef4444; font-weight: 500; text-align: center;">
      This link expires in 1 hour.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
    
    <p style="font-size: 12px; color: #94a3b8; margin: 0;">
      If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
    </p>
    
    <p style="font-size: 12px; color: #94a3b8; margin-top: 16px;">
      Link not working? Copy and paste this URL into your browser:<br>
      <a href="${resetUrl}" style="color: #3b82f6; word-break: break-all;">${resetUrl}</a>
    </p>
  </div>
</body>
</html>
    `.trim();

    const text = `
Password Reset

Hi${userName ? ` ${userName}` : ''}, we received a request to reset your password.

Reset your password here: ${resetUrl}

This link expires in 1 hour.

If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
    `.trim();

    return this._send({ to, subject, html, text });
  }
}

// Export singleton instance
module.exports = new EmailService();
