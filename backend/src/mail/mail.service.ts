import { Injectable } from '@nestjs/common';

import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter =
    nodemailer.createTransport({
      service: 'gmail',

      auth: {
        user:
          process.env.EMAIL_USER,

        pass:
          process.env.EMAIL_PASS,
      },
    });

  async sendVerificationEmail(
    email: string,
    token: string,
  ) {
    const verificationUrl =
      `http://localhost:3000/verify-email?token=${token}`;

    await this.transporter.sendMail({
      from:
        `"OZAMAPAY" <${process.env.EMAIL_USER}>`,

      to: email,

      subject:
        'Verify your OZAMAPAY account',

      html: `
        <div style="font-family:sans-serif;padding:30px;">
          <h1>OZAMAPAY</h1>

          <h2>Verify your email</h2>

          <p>
            Click bouton anba pou verifye compte ou.
          </p>

          <a
            href="${verificationUrl}"
            style="
              display:inline-block;
              padding:14px 24px;
              background:black;
              color:white;
              text-decoration:none;
              border-radius:10px;
              margin-top:20px;
            "
          >
            Verify Email
          </a>
        </div>
      `,
    });
  }
}