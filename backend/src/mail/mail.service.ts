import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend = new Resend(process.env.RESEND_API_KEY);

  private readonly frontendUrl =
    process.env.FRONTEND_URL || 'https://ozamapay.com';

  // ── shared HTML wrapper ──────────────────────────────────────────────────

  private wrap(title: string, body: string, headerColor = '#1A1A2E'): string {
    return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:${headerColor};padding:32px 40px;text-align:center;">
            <img src="https://ozamapay.com/logo.png" alt="OZAMAPAY" style="height:50px;object-fit:contain;display:block;margin:0 auto;" />
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 28px;">
            ${body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9f9fb;padding:20px 40px;border-top:1px solid #eee;text-align:center;">
            <p style="margin:0;font-size:11px;color:#999;line-height:1.6;">
              OZAMAPAY — Jacmel, Ayiti<br>
              <a href="mailto:contact@ozamapay.com" style="color:#D4630A;text-decoration:none;">contact@ozamapay.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  private btn(label: string, url: string): string {
    return `<a href="${url}" style="display:inline-block;margin-top:24px;padding:14px 32px;background:#D4630A;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;letter-spacing:0.5px;">${label}</a>`;
  }

  private h(text: string): string {
    return `<h2 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#1A1A2E;">${text}</h2>`;
  }

  private p(text: string): string {
    return `<p style="margin:0 0 12px;font-size:15px;color:#444;line-height:1.7;">${text}</p>`;
  }

  private badge(text: string, color = '#D4630A'): string {
    return `<span style="display:inline-block;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700;background:${color}20;color:${color};letter-spacing:0.5px;">${text}</span>`;
  }

  private infoRow(label: string, value: string): string {
    return `<tr>
      <td style="padding:10px 16px;font-size:13px;color:#777;border-bottom:1px solid #f0f0f0;">${label}</td>
      <td style="padding:10px 16px;font-size:13px;font-weight:700;color:#1A1A2E;border-bottom:1px solid #f0f0f0;text-align:right;">${value}</td>
    </tr>`;
  }

  private table(rows: string): string {
    return `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:10px;overflow:hidden;margin-top:20px;">${rows}</table>`;
  }

  // ── private send helper ──────────────────────────────────────────────────

  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.resend.emails.send({
        from: 'OZAMAPAY <noreply@ozamapay.com>',
        to,
        subject,
        html,
      });
    } catch (err) {
      console.error(`[MailService] Failed to send "${subject}" to ${to}:`, err);
    }
  }

  // ── public methods ───────────────────────────────────────────────────────

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const url = `${this.frontendUrl}/verify-email?token=${token}`;
    const html = this.wrap(
      'Verifye Email Ou — OZAMAPAY',
      this.h('Verifye adrès email ou') +
      this.p('Bonjou! Klike bouton anba a pou aktive kont OZAMAPAY ou.') +
      this.p('Lyen sa a ap ekspire nan 24 èdtan.') +
      this.btn('Verifye Email', url),
    );
    await this.send(email, 'Verifye kont OZAMAPAY ou', html);
  }

  async sendWelcome(email: string, name: string): Promise<void> {
    const html = this.wrap(
      'Byenveni sou OZAMAPAY',
      this.h(`Byenveni, ${name}! 🎉`) +
      this.p('Kont OZAMAPAY ou kreye avèk siksè. Ou ka kounye a:') +
      `<ul style="margin:12px 0 20px;padding-left:20px;color:#444;font-size:15px;line-height:2;">
        <li>Fè depo ak retrè lajan</li>
        <li>Soumèt KYC ou pou deblouke tout fonksyonalite</li>
        <li>Kreye kat Visa Vityèl</li>
        <li>Voye lajan bay nenpòt moun</li>
      </ul>` +
      this.btn('Ale sou Dashboard', `${this.frontendUrl}/dashboard`),
    );
    await this.send(email, 'Byenveni sou OZAMAPAY 🎉', html);
  }

  async sendKycApproved(email: string, name: string): Promise<void> {
    const html = this.wrap(
      'KYC Apwouve — OZAMAPAY',
      this.badge('✅ KYC APWOUVE', '#16a34a') +
      `<div style="height:16px;"></div>` +
      this.h(`Felisitasyon, ${name}!`) +
      this.p('KYC ou <strong>apwouve</strong>. Kont ou kounye a gen aksè konplè.') +
      this.p('Ou ka kounye a:') +
      `<ul style="margin:12px 0 20px;padding-left:20px;color:#444;font-size:15px;line-height:2;">
        <li>Kreye kat Visa Vityèl ou</li>
        <li>Fè tranzaksyon san limit</li>
        <li>Aksede tout sèvis OZAMAPAY yo</li>
      </ul>` +
      this.btn('Kreye Kat Vityèl Mwen', `${this.frontendUrl}/dashboard`),
    );
    await this.send(email, '✅ KYC ou apwouve — OZAMAPAY', html);
  }

  async sendKycRejected(email: string, name: string, reason: string): Promise<void> {
    const html = this.wrap(
      'KYC Rejte — OZAMAPAY',
      this.badge('❌ KYC REJTE', '#dc2626') +
      `<div style="height:16px;"></div>` +
      this.h(`${name}, nou pa t kapab verifye dokiman ou`) +
      this.p('Malerezman, nou pa kapab apwouve KYC ou pou rezon sa a:') +
      `<div style="margin:16px 0;padding:16px 20px;background:#fff5f5;border-left:4px solid #dc2626;border-radius:6px;font-size:14px;color:#b91c1c;">${reason || 'Dokiman yo pa klè oswa pa valid.'}</div>` +
      this.p('Tanpri resoumèt dokiman ou yo an asire yo:') +
      `<ul style="margin:12px 0 20px;padding-left:20px;color:#444;font-size:15px;line-height:2;">
        <li>Klè epi li fasil pou li</li>
        <li>Ap kouvri tout 4 kwen yo</li>
        <li>Pa plis ke 3 mwa depi emisyon</li>
      </ul>` +
      this.btn('Resoumèt KYC', `${this.frontendUrl}/dashboard`),
    );
    await this.send(email, '❌ KYC ou rejte — OZAMAPAY', html);
  }

  async sendTopupConfirmed(email: string, name: string, amount: number, method: string): Promise<void> {
    const html = this.wrap(
      'Depot Konfime — OZAMAPAY',
      this.badge('✅ DEPOT KONFIME', '#16a34a') +
      `<div style="height:16px;"></div>` +
      this.h(`Depot ou konfime, ${name}!`) +
      this.p('Tranzaksyon ou an trete avèk siksè pa ekip OZAMAPAY.') +
      this.table(
        this.infoRow('Montan', `<span style="color:#16a34a;">+${Number(amount).toLocaleString('fr-HT')} HTG</span>`) +
        this.infoRow('Metòd', method || 'N/A') +
        this.infoRow('Estati', `<span style="color:#16a34a;">✅ Konfime</span>`),
      ) +
      this.btn('Wè Balans Mwen', `${this.frontendUrl}/dashboard`),
    );
    await this.send(email, `✅ Depot ${Number(amount).toLocaleString('fr-HT')} HTG konfime`, html);
  }

  async sendWithdrawalConfirmed(email: string, name: string, amount: number, method: string): Promise<void> {
    const html = this.wrap(
      'Retrè Konfime — OZAMAPAY',
      this.badge('✅ RETRÈ KONFIME', '#D4630A') +
      `<div style="height:16px;"></div>` +
      this.h(`Retrè ou konfime, ${name}!`) +
      this.p('Demand retrè ou an trete avèk siksè. Lajan an ap voye nan kont ou.') +
      this.table(
        this.infoRow('Montan', `<span style="color:#D4630A;">-${Number(amount).toLocaleString('fr-HT')} HTG</span>`) +
        this.infoRow('Metòd', method || 'N/A') +
        this.infoRow('Estati', `<span style="color:#16a34a;">✅ Konfime</span>`),
      ) +
      this.btn('Wè Balans Mwen', `${this.frontendUrl}/dashboard`),
    );
    await this.send(email, `✅ Retrè ${Number(amount).toLocaleString('fr-HT')} HTG konfime`, html);
  }

  async sendSystemAlert(error: string, uptime: number): Promise<void> {
    const html = this.wrap(
      '🚨 OZAMAPAY — Alèt Sistèm',
      this.badge('🚨 ALÈT SISTÈM', '#B71C1C') +
      `<div style="height:16px;"></div>` +
      this.h('Pwoblèm teknik detekte') +
      this.p('Sistèm OZAMAPAY detekte yon pwoblèm teknik. Pran aksyon imedyatman.') +
      this.table(
        this.infoRow('Erè', `<span style="color:#B71C1C;font-family:monospace;">${error}</span>`) +
        this.infoRow('Uptime', `${uptime}s`) +
        this.infoRow('Lè', new Date().toISOString()),
      ) +
      `<div style="margin-top:24px;padding:16px 20px;background:#fff5f5;border-left:4px solid #B71C1C;border-radius:6px;font-size:14px;color:#B71C1C;">
        Verifye Render dashboard imedyatman.
      </div>` +
      this.btn('Ouvri Render Dashboard', 'https://dashboard.render.com'),
      '#B71C1C',
    );
    await this.send('contact@ozamapay.com', '🚨 OZAMAPAY — Alèt Sistèm', html);
  }

  async sendFinanceConfirmed(
    email: string,
    name: string,
    serviceType: string,
    amount: number,
    mode: string,
  ): Promise<void> {
    const isBuy = mode === 'BUY';
    const amountFmt = Number(amount).toLocaleString('fr-HT');
    const html = this.wrap(
      'Finance Request Konfime — OZAMAPAY',
      this.badge(isBuy ? '✅ BUY KONFIME' : '✅ SELL KONFIME', '#D4630A') +
      `<div style="height:16px;"></div>` +
      this.h(`${name}, demann ${serviceType} ou konfime!`) +
      (isBuy
        ? this.p(`Demann <strong>${serviceType}</strong> ou an konfime pa admin. <strong>${amountFmt} HTG</strong> ajoute nan kont ou.`)
        : this.p(`Demann <strong>${serviceType}</strong> ou an trete. Admin ap voye lajan nan kont ou.`)
      ) +
      this.table(
        this.infoRow('Sèvis', serviceType) +
        this.infoRow('Mod', mode) +
        this.infoRow('Montan', `${amountFmt} HTG`) +
        this.infoRow('Dat', new Date().toLocaleDateString('fr-HT')),
      ) +
      this.btn('Wè Balans Mwen', `${this.frontendUrl}/dashboard`),
      '#D4630A',
    );
    await this.send(email, 'Finance Request Konfime — OZAMAPAY', html);
  }

  async sendAgentTopupConfirmed(
    clientEmail: string,
    clientName: string,
    agentName: string,
    amount: number,
    agentEmail: string,
  ): Promise<void> {
    const amountFmt = Number(amount).toLocaleString('fr-HT');
    const commission = Number(amount * 0.02).toLocaleString('fr-HT');
    const now = new Date().toLocaleDateString('fr-HT');

    const htmlClient = this.wrap(
      'Depot Konfime — OZAMAPAY',
      this.badge('✅ DEPOT KONFIME', '#16a34a') +
      `<div style="height:16px;"></div>` +
      this.h(`${clientName}, depot ou konfime!`) +
      this.p(`Ajans <strong>${agentName}</strong> kredite <strong>${amountFmt} HTG</strong> nan kont ou avèk siksè.`) +
      this.table(
        this.infoRow('Montan', `<span style="color:#16a34a;">+${amountFmt} HTG</span>`) +
        this.infoRow('Ajans', agentName) +
        this.infoRow('Dat', now),
      ) +
      this.btn('Wè Balans Mwen', `${this.frontendUrl}/dashboard`),
      '#16a34a',
    );

    const htmlAgent = this.wrap(
      'Topup Kliyan Konfime — OZAMAPAY',
      this.badge('✅ TOPUP KONFIME', '#D4630A') +
      `<div style="height:16px;"></div>` +
      this.h(`Topup avèk siksè, ${agentName}!`) +
      this.p(`Ou fè yon topup <strong>${amountFmt} HTG</strong> pou kliyan <strong>${clientEmail}</strong> avèk siksè.`) +
      this.table(
        this.infoRow('Kliyan', clientEmail) +
        this.infoRow('Montan', `${amountFmt} HTG`) +
        this.infoRow('Komisyon (2%)', `<span style="color:#16a34a;">+${commission} HTG</span>`) +
        this.infoRow('Dat', now),
      ) +
      this.btn('Wè Aktivite Mwen', `${this.frontendUrl}/agent-dashboard`),
      '#D4630A',
    );

    await this.send(clientEmail, 'Depot Konfime — OZAMAPAY', htmlClient);
    await this.send(agentEmail, 'Topup Kliyan Konfime — OZAMAPAY', htmlAgent);
  }

  async sendAgentWithdrawConfirmed(
    clientEmail: string,
    clientName: string,
    agentName: string,
    amount: number,
    agentEmail: string,
  ): Promise<void> {
    const amountFmt = Number(amount).toLocaleString('fr-HT');
    const commission = Number(amount * 0.0075).toLocaleString('fr-HT');
    const now = new Date().toLocaleDateString('fr-HT');

    const htmlClient = this.wrap(
      'Retrè Konfime — OZAMAPAY',
      this.badge('✅ RETRÈ KONFIME', '#B71C1C') +
      `<div style="height:16px;"></div>` +
      this.h(`${clientName}, retrè ou konfime!`) +
      this.p(`Ajans <strong>${agentName}</strong> retire <strong>${amountFmt} HTG</strong> nan kont ou avèk siksè.`) +
      this.table(
        this.infoRow('Montan', `<span style="color:#B71C1C;">-${amountFmt} HTG</span>`) +
        this.infoRow('Ajans', agentName) +
        this.infoRow('Dat', now),
      ) +
      this.btn('Wè Balans Mwen', `${this.frontendUrl}/dashboard`),
      '#B71C1C',
    );

    const htmlAgent = this.wrap(
      'Retrè Kliyan Konfime — OZAMAPAY',
      this.badge('✅ RETRÈ KONFIME', '#D4630A') +
      `<div style="height:16px;"></div>` +
      this.h(`Retrè avèk siksè, ${agentName}!`) +
      this.p(`Ou fè yon retrè <strong>${amountFmt} HTG</strong> pou kliyan <strong>${clientEmail}</strong> avèk siksè.`) +
      this.table(
        this.infoRow('Kliyan', clientEmail) +
        this.infoRow('Montan', `${amountFmt} HTG`) +
        this.infoRow('Komisyon (0.75%)', `<span style="color:#16a34a;">+${commission} HTG</span>`) +
        this.infoRow('Dat', now),
      ) +
      this.btn('Wè Aktivite Mwen', `${this.frontendUrl}/agent-dashboard`),
      '#D4630A',
    );

    await this.send(clientEmail, 'Retrè Konfime — OZAMAPAY', htmlClient);
    await this.send(agentEmail, 'Retrè Kliyan Konfime — OZAMAPAY', htmlAgent);
  }

  async sendPasswordReset(email: string, name: string, resetUrl: string): Promise<void> {
    const html = this.wrap(
      'Reset Modpas — OZAMAPAY',
      this.badge('🔐 RESET MODPAS', '#D4630A') +
      `<div style="height:16px;"></div>` +
      this.h(`${name}, ou mande yon reset modpas`) +
      this.p('Nou resevwa yon demann pou chanje modpas kont OZAMAPAY ou. Klike bouton anba a pou kontinye.') +
      this.btn('Reset Modpas Mwen', resetUrl) +
      `<div style="height:20px;"></div>` +
      `<div style="padding:14px 18px;background:#fff8f0;border-left:4px solid #D4630A;border-radius:6px;font-size:13px;color:#92400e;">
        ⏱ Lyen sa a valid pou <strong>1 èdtan sèlman</strong>.
      </div>` +
      `<div style="height:12px;"></div>` +
      this.p('<span style="color:#999;font-size:12px;">Si ou pa mande reset sa a, inyore mesaj sa a. Kont ou an sekirite.</span>'),
    );
    await this.send(email, 'Reset Modpas OZAMAPAY', html);
  }
}
