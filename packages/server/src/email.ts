import { Resend } from "resend";
import { config } from "./config";

// Initialize Resend only if API key is provided
const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  // Skip email sending in development if no API key
  if (!resend) {
    console.log("[Email] Skipped (no API key):", options.subject, "to", options.to);
    return true; // Return true to not block development
  }

  try {
    const { data, error } = await resend.emails.send({
      from: config.emailFrom,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {
      console.error("Email send error:", error);
      return false;
    }

    console.log("Email sent successfully:", data?.id);
    return true;
  } catch (error) {
    console.error("Email service error:", error);
    return false;
  }
}

export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string
): Promise<boolean> {
  const verificationUrl = `${config.appUrl}/auth/verify-email?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email - E.A.T.</title>
    </head>
    <body style="font-family: 'Inter', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700;">E.A.T.</h1>
          <p style="color: #dcfce7; margin: 10px 0 0; font-size: 14px;">Ecology Agriculture Trade</p>
        </div>

        <div style="padding: 40px 30px;">
          <h2 style="color: #18181b; margin: 0 0 20px; font-size: 24px;">Welcome, ${name}!</h2>
          <p style="color: #52525b; line-height: 1.6; margin: 0 0 20px;">
            Thank you for joining the E.A.T. community! To complete your registration and start connecting with fellow nature lovers, gardeners, and farmers, please verify your email address.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="display: inline-block; background-color: #22c55e; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Verify Email Address
            </a>
          </div>

          <p style="color: #71717a; font-size: 14px; line-height: 1.6;">
            If the button above doesn't work, copy and paste this link into your browser:
          </p>
          <p style="color: #22c55e; font-size: 14px; word-break: break-all;">
            ${verificationUrl}
          </p>

          <p style="color: #71717a; font-size: 14px; margin-top: 30px;">
            This link will expire in 24 hours. If you didn't create an account with E.A.T., you can safely ignore this email.
          </p>
        </div>

        <div style="background-color: #f4f4f5; padding: 20px 30px; text-align: center;">
          <p style="color: #71717a; font-size: 12px; margin: 0;">
            &copy; ${new Date().getFullYear()} E.A.T. - Ecology Agriculture Trade. All rights reserved.
          </p>
          <p style="color: #a1a1aa; font-size: 12px; margin: 10px 0 0;">
            Serving communities across North America, the Caribbean, and South America.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Welcome to E.A.T., ${name}!

Thank you for joining our community. Please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account with E.A.T., you can safely ignore this email.

- The E.A.T. Team
  `;

  return sendEmail({
    to: email,
    subject: "Verify Your Email - Welcome to E.A.T.!",
    html,
    text,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  token: string
): Promise<boolean> {
  const resetUrl = `${config.appUrl}/auth/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password - E.A.T.</title>
    </head>
    <body style="font-family: 'Inter', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700;">E.A.T.</h1>
          <p style="color: #dcfce7; margin: 10px 0 0; font-size: 14px;">Ecology Agriculture Trade</p>
        </div>

        <div style="padding: 40px 30px;">
          <h2 style="color: #18181b; margin: 0 0 20px; font-size: 24px;">Password Reset Request</h2>
          <p style="color: #52525b; line-height: 1.6; margin: 0 0 20px;">
            Hi ${name}, we received a request to reset your password for your E.A.T. account. Click the button below to create a new password.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="display: inline-block; background-color: #22c55e; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Reset Password
            </a>
          </div>

          <p style="color: #71717a; font-size: 14px; line-height: 1.6;">
            If the button above doesn't work, copy and paste this link into your browser:
          </p>
          <p style="color: #22c55e; font-size: 14px; word-break: break-all;">
            ${resetUrl}
          </p>

          <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin-top: 30px;">
            <p style="color: #92400e; font-size: 14px; margin: 0;">
              <strong>Security Notice:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
            </p>
          </div>
        </div>

        <div style="background-color: #f4f4f5; padding: 20px 30px; text-align: center;">
          <p style="color: #71717a; font-size: 12px; margin: 0;">
            &copy; ${new Date().getFullYear()} E.A.T. - Ecology Agriculture Trade. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Password Reset Request

Hi ${name},

We received a request to reset your password for your E.A.T. account. Click the link below to create a new password:

${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, please ignore this email and your password will remain unchanged.

- The E.A.T. Team
  `;

  return sendEmail({
    to: email,
    subject: "Reset Your Password - E.A.T.",
    html,
    text,
  });
}

export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to E.A.T.!</title>
    </head>
    <body style="font-family: 'Inter', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700;">Welcome to E.A.T.!</h1>
          <p style="color: #dcfce7; margin: 10px 0 0; font-size: 14px;">Your journey to sustainable living starts here</p>
        </div>

        <div style="padding: 40px 30px;">
          <h2 style="color: #18181b; margin: 0 0 20px; font-size: 24px;">Hello, ${name}!</h2>
          <p style="color: #52525b; line-height: 1.6; margin: 0 0 20px;">
            Your email has been verified and your account is now fully active! Welcome to the E.A.T. community - a global network of nature lovers, gardeners, farmers, and sustainability enthusiasts.
          </p>

          <h3 style="color: #18181b; margin: 30px 0 15px; font-size: 18px;">Here's what you can do now:</h3>

          <div style="margin-bottom: 20px;">
            <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
              <span style="background-color: #dcfce7; color: #16a34a; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 600; margin-right: 12px; flex-shrink: 0;">1</span>
              <div>
                <strong style="color: #18181b;">Complete Your Profile</strong>
                <p style="color: #71717a; margin: 4px 0 0; font-size: 14px;">Add your skills, interests, and what you have to offer the community.</p>
              </div>
            </div>

            <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
              <span style="background-color: #dcfce7; color: #16a34a; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 600; margin-right: 12px; flex-shrink: 0;">2</span>
              <div>
                <strong style="color: #18181b;">Explore the Marketplace</strong>
                <p style="color: #71717a; margin: 4px 0 0; font-size: 14px;">Browse organic produce, seeds, plants, and eco-friendly services.</p>
              </div>
            </div>

            <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
              <span style="background-color: #dcfce7; color: #16a34a; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 600; margin-right: 12px; flex-shrink: 0;">3</span>
              <div>
                <strong style="color: #18181b;">Discover Foraging Spots</strong>
                <p style="color: #71717a; margin: 4px 0 0; font-size: 14px;">Find wild edible plants and share your own discoveries.</p>
              </div>
            </div>

            <div style="display: flex; align-items: flex-start;">
              <span style="background-color: #dcfce7; color: #16a34a; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 600; margin-right: 12px; flex-shrink: 0;">4</span>
              <div>
                <strong style="color: #18181b;">Join Events & Learn</strong>
                <p style="color: #71717a; margin: 4px 0 0; font-size: 14px;">Attend workshops, meetups, and access training modules.</p>
              </div>
            </div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${config.appUrl}" style="display: inline-block; background-color: #22c55e; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Go to Dashboard
            </a>
          </div>
        </div>

        <div style="background-color: #f4f4f5; padding: 20px 30px; text-align: center;">
          <p style="color: #71717a; font-size: 12px; margin: 0;">
            &copy; ${new Date().getFullYear()} E.A.T. - Ecology Agriculture Trade. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: "Welcome to E.A.T. - Your Account is Ready!",
    html,
  });
}
