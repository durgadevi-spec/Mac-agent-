import nodemailer from 'nodemailer';

export interface EmailConfig {
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  fromEmail: string;
  fromName: string;
}

let transporter: nodemailer.Transporter | null = null;

/**
 * Initialize email service with SMTP configuration
 * Configuration can be set via environment variables:
 * - SMTP_HOST
 * - SMTP_PORT
 * - SMTP_SECURE
 * - SMTP_USER
 * - SMTP_PASS
 * - EMAIL_FROM
 * - EMAIL_FROM_NAME
 */
export function initializeEmailService(config?: EmailConfig): boolean {
  try {
    const smtpConfig = config || {
      smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      },
      fromEmail: process.env.EMAIL_FROM || 'agent@knockturn.com',
      fromName: process.env.EMAIL_FROM_NAME || 'Knockturn Employee Agent',
    };

    // Validate configuration
    if (!smtpConfig.smtp.auth.user || !smtpConfig.smtp.auth.pass) {
      console.warn('[Email Service] SMTP credentials not configured. Email service disabled.');
      return false;
    }

    transporter = nodemailer.createTransport({
      host: smtpConfig.smtp.host,
      port: smtpConfig.smtp.port,
      secure: smtpConfig.smtp.secure,
      auth: {
        user: smtpConfig.smtp.auth.user,
        pass: smtpConfig.smtp.auth.pass,
      },
    });

    console.log('[Email Service] Email service initialized successfully');
    return true;
  } catch (error) {
    console.error('[Email Service] Failed to initialize email service:', error);
    return false;
  }
}

/**
 * Generate HTML template for daily summary email
 */
export function generateSummaryEmailTemplate(
  employeeName: string,
  date: string,
  metrics: {
    totalTime: string;
    deskTime: string;
    idleTime: string;
    productiveTime: string;
    nonproductiveTime: string;
    neutralTime?: string;
    productivityScore: number;
    topApps: Array<{ name: string; duration: string }>;
  }
): string {
  const topAppsHtml = metrics.topApps
    .slice(0, 5)
    .map(
      (app) =>
        `<li style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
      <span style="font-weight: 500; color: #333;">${app.name}</span>
      <br>
      <span style="color: #666; font-size: 14px;">${app.duration}</span>
    </li>`
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background-color: #f5f5f5;
          margin: 0;
          padding: 20px;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 40px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .header p {
          margin: 8px 0 0 0;
          font-size: 14px;
          opacity: 0.9;
        }
        .content {
          padding: 40px;
        }
        .greeting {
          font-size: 16px;
          color: #333;
          margin-bottom: 30px;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 30px;
        }
        .metric-card {
          background-color: #f9f9f9;
          padding: 15px;
          border-radius: 6px;
          border-left: 4px solid #667eea;
        }
        .metric-label {
          font-size: 12px;
          text-transform: uppercase;
          color: #999;
          font-weight: 600;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        .metric-value {
          font-size: 24px;
          font-weight: 700;
          color: #333;
        }
        .metric-card.productive {
          border-left-color: #10b981;
        }
        .metric-card.idle {
          border-left-color: #f59e0b;
        }
        .metric-card.nonproductive {
          border-left-color: #ef4444;
        }
        .metric-card.neutral {
          border-left-color: #6b7280;
        }
        .section {
          margin-bottom: 30px;
        }
        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: #333;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 2px solid #f0f0f0;
        }
        .app-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .productivity-score {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          border-radius: 6px;
          text-align: center;
          margin-bottom: 20px;
        }
        .productivity-score .label {
          font-size: 14px;
          opacity: 0.9;
          margin-bottom: 8px;
        }
        .productivity-score .score {
          font-size: 40px;
          font-weight: 700;
        }
        .footer {
          background-color: #f9f9f9;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #999;
          border-top: 1px solid #f0f0f0;
        }
        .footer a {
          color: #667eea;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 Daily Summary Report</h1>
          <p>${date}</p>
        </div>
        
        <div class="content">
          <div class="greeting">
            Hi <strong>${employeeName}</strong>,
            <br><br>
            Here is your productivity summary report for ${date}.
          </div>

          <div class="productivity-score">
            <div class="label">Productivity Score</div>
            <div class="score">${metrics.productivityScore}%</div>
          </div>

          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-label">Total Time</div>
              <div class="metric-value">${metrics.totalTime}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Desk Time</div>
              <div class="metric-value">${metrics.deskTime}</div>
            </div>
            <div class="metric-card productive">
              <div class="metric-label">Productive Time</div>
              <div class="metric-value">${metrics.productiveTime}</div>
            </div>
            <div class="metric-card idle">
              <div class="metric-label">Idle Time</div>
              <div class="metric-value">${metrics.idleTime}</div>
            </div>
            <div class="metric-card nonproductive">
              <div class="metric-label">Non-Productive Time</div>
              <div class="metric-value">${metrics.nonproductiveTime}</div>
            </div>
            ${metrics.neutralTime ? `<div class="metric-card neutral">
              <div class="metric-label">Neutral Time</div>
              <div class="metric-value">${metrics.neutralTime}</div>
            </div>` : ''}
          </div>

          <div class="section">
            <div class="section-title">Most Used Applications & Websites</div>
            <ul class="app-list">
              ${topAppsHtml}
            </ul>
          </div>
        </div>

        <div class="footer">
          <p>This is an automated report from <strong>Knockturn Employee Agent</strong></p>
          <p><a href="#">View detailed analytics</a> | <a href="#">Settings</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send summary email to an employee
 */
export async function sendSummaryEmail(
  recipientEmail: string,
  recipientName: string,
  date: string,
  metrics: {
    totalTime: string;
    deskTime: string;
    idleTime: string;
    productiveTime: string;
    nonproductiveTime: string;
    neutralTime?: string;
    productivityScore: number;
    topApps: Array<{ name: string; duration: string }>;
  }
): Promise<boolean> {
  if (!transporter) {
    console.warn('[Email Service] Email transporter not initialized');
    return false;
  }

  try {
    const htmlContent = generateSummaryEmailTemplate(recipientName, date, metrics);

    const mailOptions = {
      from: process.env.EMAIL_FROM_NAME
        ? `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`
        : process.env.EMAIL_FROM || 'agent@knockturn.com',
      to: recipientEmail,
      subject: `Daily Summary Report - ${date}`,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Email Service] Summary email sent to ${recipientEmail}`);
    return true;
  } catch (error) {
    console.error(`[Email Service] Failed to send email to ${recipientEmail}:`, error);
    return false;
  }
}

/**
 * Send test email to verify configuration
 */
export async function sendTestEmail(recipientEmail: string): Promise<boolean> {
  if (!transporter) {
    console.warn('[Email Service] Email transporter not initialized');
    return false;
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM_NAME
        ? `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`
        : process.env.EMAIL_FROM || 'agent@knockturn.com',
      to: recipientEmail,
      subject: 'Test Email - Knockturn Employee Agent',
      text: 'This is a test email to verify your email configuration.',
      html: '<p>This is a test email to verify your email configuration.</p>',
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Email Service] Test email sent to ${recipientEmail}`);
    return true;
  } catch (error) {
    console.error(`[Email Service] Failed to send test email:`, error);
    return false;
  }
}
