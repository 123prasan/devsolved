import nodemailer from 'nodemailer';

export const sendVerificationEmail = async (toEmail, token, host) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'devsolved.inc@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD, // App password required here
      },
    });

    const verifyUrl = `${host}/auth/verify/${token}`;

    const mailOptions = {
      from: '"DevSolved" <devsolved.inc@gmail.com>',
      to: toEmail,
      subject: 'Verify your DevSolved Account',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #000000; color: #ffffff;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="font-size: 24px; font-weight: 700; margin: 0;">DevSolved</h1>
          </div>
          <div style="background-color: #121214; border: 1px solid #27272A; border-radius: 12px; padding: 40px 30px; text-align: center;">
            <h2 style="font-size: 20px; margin-top: 0; margin-bottom: 16px;">Verify your email address</h2>
            <p style="color: #A1A1AA; font-size: 15px; line-height: 1.6; margin-bottom: 32px;">
              Welcome to DevSolved! Click the button below to verify your email address and activate your account.
            </p>
            <a href="${verifyUrl}" style="display: inline-block; background-color: #ffffff; color: #000000; font-weight: 600; font-size: 15px; padding: 12px 24px; border-radius: 8px; text-decoration: none; transition: background-color 0.2s;">
              Verify Account
            </a>
            <p style="color: #71717A; font-size: 13px; margin-top: 32px; line-height: 1.5;">
              If you didn't request this email, you can safely ignore it.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${toEmail}`);
  } catch (error) {
    console.error(`❌ Failed to send verification email to ${toEmail}:`, error);
    throw new Error('Failed to send verification email');
  }
};
