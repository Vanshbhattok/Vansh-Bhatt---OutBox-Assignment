import nodemailer from 'nodemailer';
import { config } from '../config';

class EtherealService {
  private transporter: nodemailer.Transporter | null = null;
  private testAccount: nodemailer.TestAccount | null = null;

  public async getTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    if (config.ethereal.user && config.ethereal.pass) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: config.ethereal.user,
          pass: config.ethereal.pass,
        },
      });
      console.log(`[Ethereal SMTP] Initialized using provided account: ${config.ethereal.user}`);
      return this.transporter;
    }

    // Auto-generate test account if credentials not explicitly configured
    this.testAccount = await nodemailer.createTestAccount();
    console.log(`[Ethereal SMTP] Created auto test account:`);
    console.log(`  User: ${this.testAccount.user}`);
    console.log(`  Pass: ${this.testAccount.pass}`);

    this.transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: this.testAccount.user,
        pass: this.testAccount.pass,
      },
    });

    return this.transporter;
  }

  public async sendEmail(payload: {
    from: string;
    to: string;
    subject: string;
    body: string;
  }): Promise<{ messageId: string; previewUrl: string | false }> {
    const transporter = await this.getTransporter();

    const info = await transporter.sendMail({
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
      html: payload.body,
      text: payload.body.replace(/<[^>]*>?/gm, ''),
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`[Ethereal SMTP] Sent email to ${payload.to}. Preview URL: ${previewUrl}`);

    return {
      messageId: info.messageId,
      previewUrl: previewUrl || false,
    };
  }
}

export const etherealService = new EtherealService();
