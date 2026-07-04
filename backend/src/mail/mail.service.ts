import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend = new Resend(process.env.RESEND_API_KEY);

  private readonly frontendUrl =
    process.env.FRONTEND_URL || 'https://ozamapay.com';

  // ── private helpers ──────────────────────────────────────────────────────

  private wrap(
    title: string,
    headerTitle: string,
    body: string,
    headerColor = '#FF6B00',
  ): string {
    return `<!DOCTYPE html>
<html lang="ht">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:4px;overflow:hidden;">
        <tr>
          <td style="background:${headerColor};padding:28px 40px;">
            <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:2px;color:rgba(255,255,255,0.65);text-transform:uppercase;">OZAMAPAY</p>
            <p style="margin:8px 0 0;font-size:26px;font-weight:600;color:#ffffff;line-height:1.2;">${headerTitle}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px 32px;">
            ${body}
          </td>
        </tr>
        <tr>
          <td style="border-top:0.5px solid #eeeeee;padding:20px 40px;background:#fafafa;">
            <p style="margin:0 0 6px;font-size:11px;color:#999999;line-height:1.6;">Pa janm pataje PIN ou ak pèsòn — menm ekip OZAMAPAY pa ka mande l.</p>
            <p style="margin:0;font-size:11px;color:#bbbbbb;">OZAMAPAY — Jakmel, Ayiti &nbsp;·&nbsp; <a href="mailto:contact@ozamapay.com" style="color:#FF6B00;text-decoration:none;">contact@ozamapay.com</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  private amountBox(amount: string, label: string): string {
    return `<div style="background:#f5f5f5;border-radius:6px;padding:24px;text-align:center;margin:20px 0;">
      <p style="margin:0;font-size:36px;font-weight:700;color:#1a1a1a;letter-spacing:-0.5px;">${amount}</p>
      <p style="margin:8px 0 0;font-size:11px;color:#888888;text-transform:uppercase;letter-spacing:1px;">${label}</p>
    </div>`;
  }

  private badge(type: 'KREDITE' | 'KONFIME' | 'REJTE' | 'IJAN'): string {
    const s: Record<string, { bg: string; color: string; text: string }> = {
      KREDITE: { bg: '#e8f5e9', color: '#2e7d32', text: 'KREDITE ✓' },
      KONFIME: { bg: '#e8f5e9', color: '#2e7d32', text: 'KONFIME ✓' },
      REJTE:   { bg: '#ffebee', color: '#c62828', text: 'REJTE ✗' },
      IJAN:    { bg: '#fff3e0', color: '#e65100', text: 'AKSYON NESESÈ' },
    };
    const { bg, color, text } = s[type];
    return `<span style="display:inline-block;padding:5px 14px;border-radius:20px;font-size:11px;font-weight:700;background:${bg};color:${color};letter-spacing:0.5px;">${text}</span>`;
  }

  private accentLine(text: string): string {
    return `<div style="border-left:3px solid #FF6B00;background:#fff8f0;padding:14px 16px;border-radius:0 4px 4px 0;margin:20px 0;">
      <p style="margin:0;font-size:13px;color:#7c4700;line-height:1.6;">${text}</p>
    </div>`;
  }

  private btn(label: string, url: string): string {
    return `<a href="${url}" style="display:block;margin-top:24px;padding:14px;background:#FF6B00;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:700;font-size:14px;text-align:center;">${label}</a>`;
  }

  private p(text: string): string {
    return `<p style="margin:0 0 14px;font-size:14px;color:#444444;line-height:1.7;">${text}</p>`;
  }

  private list(items: string[]): string {
    const lis = items
      .map(i => `<li style="margin-bottom:6px;">${i}</li>`)
      .join('');
    return `<ul style="margin:10px 0 16px;padding-left:20px;font-size:14px;color:#444444;line-height:1.8;">${lis}</ul>`;
  }

  private infoRow(label: string, value: string): string {
    return `<tr>
      <td style="padding:11px 16px;font-size:13px;color:#888888;border-bottom:0.5px solid #eeeeee;">${label}</td>
      <td style="padding:11px 16px;font-size:13px;font-weight:600;color:#1a1a1a;border-bottom:0.5px solid #eeeeee;text-align:right;">${value}</td>
    </tr>`;
  }

  private table(rows: string): string {
    return `<table width="100%" cellpadding="0" cellspacing="0" style="border:0.5px solid #eeeeee;border-radius:6px;overflow:hidden;margin:20px 0;">${rows}</table>`;
  }

  // ── private send helper ──────────────────────────────────────────────────

  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.resend.emails.send({
        from: 'OZAMAPAY <contact@ozamapay.com>',
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
      'Konfime adrès email ou — OZAMAPAY',
      'Konfime Email Ou',
      this.p('Bonjou,') +
      this.p('Mèsi pou enskripsyon ou nan OZAMAPAY. Pou aktive kont ou, klike sou bouton anba a.') +
      this.p('Lyen sa valid pou 24 èdtan sèlman. Si se pa ou ki kreye kont sa, ou ka ignoreye mesaj sa.'),
      '#1565C0',
    );
    await this.send(email, 'Konfime adrès email ou — OZAMAPAY', html);
  }

  async sendWelcome(email: string, name: string): Promise<void> {
    const html = this.wrap(
      `${name}, byenvini nan OZAMAPAY`,
      `Byenvini, ${name}`,
      this.p(`Bonjou ${name},`) +
      this.p('Ou fè yon bon chwa jodi a.') +
      this.p('Pandan moun ap peye 10 a 15% nan Western Union pou voye lajan, ou sot chwazi yon altènativ ki koute 2% sèlman. Sa se yon desizyon entèlijan.') +
      this.p('Kont ou pare. Etap kap vini an se verifikasyon idantite ou — sa pran mwens pase 5 minit. Frè verifikasyon se $25 USD, yon sèl fwa pou tout lavi kont ou.') +
      this.p('Apre verifikasyon:') +
      this.list([
        'Ou ka resevwa lajan depi nenpòt kote',
        'Ou ka kreye kat VISA ou — san frè adisyonèl',
        'Ou ka voye kòb bay fanmi ou imedyatman',
      ]) +
      this.p('Pa kite opòtinite sa pase.') +
      this.accentLine('Kat VISA ou ap tann — disponib gratis apre KYC.'),
    );
    await this.send(email, `${name}, byenvini nan OZAMAPAY`, html);
  }

  async sendKycApproved(email: string, name: string): Promise<void> {
    const html = this.wrap(
      `${name} — Aksè konplè. Kat VISA ou disponib.`,
      'Verifikasyon Apwouve',
      this.badge('KONFIME') +
      `<div style="height:16px;"></div>` +
      this.amountBox('$25 USD', 'Frè KYC peye') +
      this.p(`Bonjou ${name},`) +
      this.p('Verifikasyon idantite ou apwouve.') +
      this.p('Kont ou kounye a gen aksè konplè. Sa vle di ou ka:') +
      this.list([
        'Achte sou Amazon, Netflix, ak tout sit entènasyonal',
        'Resevwa Zelle, CashApp, Wise — dirèkteman nan kont ou',
        'Voye ak resevwa kòb san limit',
      ]) +
      this.p('Kat VISA ou disponib gratis. Kreye l kounye a epi kòmanse achte enlign depi Ayiti.') +
      this.accentLine('Chak jou san kat se yon jou ou pa ka achte enlign.'),
    );
    await this.send(email, `${name} — Aksè konplè. Kat VISA ou disponib.`, html);
  }

  async sendKycRejected(email: string, name: string, reason: string): Promise<void> {
    const html = this.wrap(
      `${name} — Yon kòreksyon rapid epi ou pare`,
      'Verifikasyon — Kòreksyon Nesesè',
      this.badge('IJAN') +
      `<div style="height:16px;"></div>` +
      this.p(`Bonjou ${name},`) +
      this.p('Nou pa t ka konfime verifikasyon ou pou rezon sa:') +
      `<div style="border-left:3px solid #e65100;background:#fff3e0;padding:14px 16px;border-radius:0 4px 4px 0;margin:16px 0;">
        <p style="margin:0;font-size:13px;color:#7c4700;line-height:1.6;">${reason || 'Dokiman yo pa klè oswa pa valid.'}</p>
      </div>` +
      this.p('Pa dekouraje. Sa rive souvan epi li fasil pou korije. 90% moun ki resoumèt dezyèm fwa yo reisit.') +
      this.p('Sa ou dwe fè:') +
      this.list([
        'Korije sa ki mansyone anwo a',
        'Resoumèt foto ki klè ak konplè',
        'Tann mwens pase 24 èdtan pou repons',
      ]) +
      this.p('Resoumèt la gratis. Done ou yo sekirize epi konfidansyèl.'),
      '#e65100',
    );
    await this.send(email, `${name} — Yon kòreksyon rapid epi ou pare`, html);
  }

  async sendTopupConfirmed(email: string, name: string, amount: number, method: string): Promise<void> {
    const amountFmt = Number(amount).toLocaleString('fr-HT');
    const now = new Date().toLocaleDateString('fr-HT');
    const html = this.wrap(
      `${amountFmt} HTG ajoute nan kont ou`,
      'Depot Konfime',
      this.badge('KREDITE') +
      `<div style="height:16px;"></div>` +
      this.amountBox(`${amountFmt} HTG`, 'Montan kredite') +
      this.table(
        this.infoRow('Metòd', method || 'N/A') +
        this.infoRow('Frè sèvis', '6%') +
        this.infoRow('Dat', now),
      ) +
      this.accentLine('Lajan ou disponib kounye a. Ou ka kreye kat VISA ou oswa voye kòb bay fanmi ou imedyatman.') +
      this.btn('Ale nan Kont Ou →', `${this.frontendUrl}/dashboard`) +
      `<div style="height:16px;"></div>` +
      `<p style="margin:0;font-size:12px;color:#aaaaaa;text-align:center;">Chak depot se yon etap vè endepandans finansye.</p>`,
    );
    await this.send(email, `${amountFmt} HTG ajoute nan kont ou`, html);
  }

  async sendWithdrawalConfirmed(email: string, name: string, amount: number, method: string): Promise<void> {
    const amountFmt = Number(amount).toLocaleString('fr-HT');
    const now = new Date().toLocaleDateString('fr-HT');
    const html = this.wrap(
      `Retrè ou konfime — ${amountFmt} HTG`,
      'Retrè Konfime',
      this.badge('KONFIME') +
      `<div style="height:16px;"></div>` +
      this.amountBox(`${amountFmt} HTG`, 'Montan retire') +
      this.table(
        this.infoRow('Metòd', method || 'N/A') +
        this.infoRow('Frè sèvis', '2%') +
        this.infoRow('Dat', now),
      ) +
      this.p(`Bonjou ${name},`) +
      this.p('Tranzaksyon ou trete avèk siksè. Lajan an ap rive selon metòd ou chwazi a. Si ou pa resevwa l nan 24 èdtan, kontakte sipò nou imedyatman.') +
      this.p('Kont ou sekirize. Tout tranzaksyon ou yo pwoteje.') +
      this.accentLine('Yon kesyon? Ekip nou la 7 jou sou 7 sou WhatsApp.'),
      '#1565C0',
    );
    await this.send(email, `Retrè ou konfime — ${amountFmt} HTG`, html);
  }

  async sendSystemAlert(error: string, uptime: number): Promise<void> {
    const now = new Date().toLocaleDateString('fr-HT');
    const html = this.wrap(
      'URGENCE — Sistèm OZAMAPAY bezwen atansyon',
      'Alèt Sistèm',
      this.badge('IJAN') +
      `<div style="height:16px;"></div>` +
      this.p('Sistèm OZAMAPAY detekte yon pwoblèm teknik. Verifye Render dashboard imedyatman epi pran aksyon nesesè yo.') +
      this.table(
        this.infoRow('Erè', `<span style="font-family:monospace;font-size:12px;color:#B71C1C;">${error}</span>`) +
        this.infoRow('Uptime', `${uptime}s`) +
        this.infoRow('Dat', now),
      ),
      '#B71C1C',
    );
    await this.send('contact@ozamapay.com', 'URGENCE — Sistèm OZAMAPAY bezwen atansyon', html);
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
    const now = new Date().toLocaleDateString('fr-HT');
    const html = this.wrap(
      `Demann ${serviceType} ou konfime — OZAMAPAY`,
      'Finance Konfime',
      this.badge('KONFIME') +
      `<div style="height:16px;"></div>` +
      this.amountBox(`${amountFmt} HTG`, isBuy ? 'Montan kredite' : 'Montan trete') +
      this.table(
        this.infoRow('Sèvis', serviceType) +
        this.infoRow('Operasyon', isBuy ? 'Achte (Depot)' : 'Vann (Retrè)') +
        this.infoRow('Dat', now),
      ) +
      this.p(`Bonjou ${name},`) +
      (isBuy
        ? this.p(`Demann ${serviceType} ou an konfime. Montan an ajoute nan kont ou.`)
        : this.p(`Demann ${serviceType} ou an trete avèk siksè. Peman an ap fèt selon metòd ou chwazi a.`)
      ) +
      this.p('Tout echanj yo verifye epi sekirize pa ekip OZAMAPAY.'),
    );
    await this.send(email, `Demann ${serviceType} ou konfime — OZAMAPAY`, html);
  }

  async sendAgentTopupConfirmed(
    clientEmail: string,
    clientName: string,
    agentName: string,
    amount: number,
    agentEmail: string,
  ): Promise<void> {
    const amountFmt = Number(amount).toLocaleString('fr-HT');
    const commissionFmt = Number(amount * 0.02).toLocaleString('fr-HT');
    const now = new Date().toLocaleDateString('fr-HT');

    const htmlClient = this.wrap(
      `Depot konfime pa ajans ou — ${amountFmt} HTG`,
      'Depot Ajans Konfime',
      this.badge('KREDITE') +
      `<div style="height:16px;"></div>` +
      this.amountBox(`${amountFmt} HTG`, 'Montan kredite') +
      this.table(
        this.infoRow('Ajans', agentName) +
        this.infoRow('Dat', now),
      ) +
      this.p(`Bonjou ${clientName},`) +
      this.p(`Ajans ${agentName} fè yon depot nan kont ou avèk siksè. Lajan an disponib kounye a. Ou ka itilize l imedyatman.`),
    );

    const htmlAgent = this.wrap(
      `Topup kliyan konfime — ${amountFmt} HTG`,
      'Topup Kliyan Konfime',
      this.badge('KONFIME') +
      `<div style="height:16px;"></div>` +
      this.table(
        this.infoRow('Kliyan', clientEmail) +
        this.infoRow('Montan', `${amountFmt} HTG`) +
        this.infoRow('Komisyon (2%)', `${commissionFmt} HTG`) +
        this.infoRow('Dat', now),
      ) +
      this.p(`Bonjou ${agentName},`) +
      this.p(`Topup ou fè pou kliyan ${clientEmail} an trete avèk siksè. Komisyon ou ajoute nan kont ajans ou.`),
    );

    await this.send(clientEmail, `Depot konfime pa ajans ou — ${amountFmt} HTG`, htmlClient);
    await this.send(agentEmail, `Topup kliyan konfime — ${amountFmt} HTG`, htmlAgent);
  }

  async sendAgentWithdrawConfirmed(
    clientEmail: string,
    clientName: string,
    agentName: string,
    amount: number,
    agentEmail: string,
  ): Promise<void> {
    const amountFmt = Number(amount).toLocaleString('fr-HT');
    const commissionFmt = Number(amount * 0.0075).toLocaleString('fr-HT');
    const now = new Date().toLocaleDateString('fr-HT');

    const htmlClient = this.wrap(
      `Retrè konfime pa ajans ou — ${amountFmt} HTG`,
      'Retrè Ajans Konfime',
      this.badge('KONFIME') +
      `<div style="height:16px;"></div>` +
      this.amountBox(`${amountFmt} HTG`, 'Montan retire') +
      this.table(
        this.infoRow('Ajans', agentName) +
        this.infoRow('Dat', now),
      ) +
      this.p(`Bonjou ${clientName},`) +
      this.p(`Ajans ${agentName} trete retrè ou avèk siksè. Lajan an ap rive selon metòd ou chwazi a.`),
      '#1565C0',
    );

    const htmlAgent = this.wrap(
      `Retrè kliyan konfime — ${amountFmt} HTG`,
      'Retrè Kliyan Konfime',
      this.badge('KONFIME') +
      `<div style="height:16px;"></div>` +
      this.table(
        this.infoRow('Kliyan', clientEmail) +
        this.infoRow('Montan', `${amountFmt} HTG`) +
        this.infoRow('Komisyon (0.75%)', `${commissionFmt} HTG`) +
        this.infoRow('Dat', now),
      ) +
      this.p(`Bonjou ${agentName},`) +
      this.p(`Retrè ou fè pou kliyan ${clientEmail} an trete avèk siksè. Komisyon ou ajoute nan kont ajans ou.`),
      '#1565C0',
    );

    await this.send(clientEmail, `Retrè konfime pa ajans ou — ${amountFmt} HTG`, htmlClient);
    await this.send(agentEmail, `Retrè kliyan konfime — ${amountFmt} HTG`, htmlAgent);
  }

  async sendMerchantApplication(
    merchantEmail: string,
    businessName: string,
    phone: string,
    address: string,
    plan: string,
  ): Promise<void> {
    const now = new Date().toLocaleDateString('fr-HT');

    const htmlMerchant = this.wrap(
      `Demann komèsan ${businessName} resevwa — OZAMAPAY`,
      'Demann Komèsan Resevwa',
      this.badge('KONFIME') +
      `<div style="height:16px;"></div>` +
      this.p(`Bonjou ${businessName},`) +
      this.p('Nou resevwa demann ou pou vin partenè OZAMAPAY. Ekip nou an ap kontakte ou nan 24 a 48 èdtan pou konfime detay ak ba ou aksè nan sistèm lan.') +
      this.table(
        this.infoRow('Biznis', businessName) +
        this.infoRow('Plan', plan) +
        this.infoRow('Telefòn', phone) +
        this.infoRow('Dat', now),
      ) +
      this.accentLine('Pandan ke ou ap tann, ou ka kontakte nou sou WhatsApp pou nenpòt kesyon.'),
    );

    const htmlAdmin = this.wrap(
      `Nouvel demann komèsan: ${businessName}`,
      'Demann Komèsan Nouvo',
      this.badge('IJAN') +
      `<div style="height:16px;"></div>` +
      this.p('Yon nouvo komèsan soumèt yon demann pou vin partenè OZAMAPAY.') +
      this.table(
        this.infoRow('Biznis', businessName) +
        this.infoRow('Email', merchantEmail) +
        this.infoRow('Telefòn', phone) +
        this.infoRow('Adrès', address) +
        this.infoRow('Plan', plan) +
        this.infoRow('Dat', now),
      ),
      '#1565C0',
    );

    await this.send(merchantEmail, `Demann komèsan ou resevwa — OZAMAPAY`, htmlMerchant);
    await this.send('contact@ozamapay.com', `Nouvel demann komèsan: ${businessName}`, htmlAdmin);
  }

  async sendKycReminder(email: string, name: string, verifiedCount: number, totalCount: number): Promise<void> {
    const html = `<!DOCTYPE html>
<html lang="ht">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ou prèske rive — OZAMAPAY</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:4px;overflow:hidden;">

        <!-- HEADER -->
        <tr>
          <td style="background:#0F121E;padding:28px 40px;">
            <span style="display:inline-block;padding:4px 12px;background:#FF7A00;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:1.5px;color:#ffffff;text-transform:uppercase;margin-bottom:14px;">OZAMAPAY</span>
            <p style="margin:0;font-size:26px;font-weight:800;color:#ffffff;line-height:1.3;">Ou pr&egrave;ske rive</p>
            <p style="margin:10px 0 0;font-size:13px;color:rgba(255,255,255,0.6);line-height:1.5;"><strong style="color:#FF7A00;">${verifiedCount}</strong> moun deja verifye kont yo sou <strong style="color:#ffffff;">${totalCount}</strong> enskripsyon</p>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:36px 40px 32px;background:#ffffff;">

            <p style="margin:0 0 16px;font-size:14px;color:#444444;line-height:1.7;">Bonjou ${name},</p>
            <p style="margin:0 0 14px;font-size:14px;color:#444444;line-height:1.7;">Kont ou deja kreye. Ou manke yon s&egrave;l etap &mdash; verifikasyon idantite (KYC). Sa se s&egrave;l bagay ki separe ou ak aks&egrave; konpl&egrave; nan OZAMAPAY.</p>
            <p style="margin:0 0 24px;font-size:14px;color:#444444;line-height:1.7;">Apre KYC, ou ka voye lajan, resevwa transfè, epi gen kat VISA ou gratis &mdash; jou a jou depi Ayiti.</p>

            <!-- 4 benefit cards -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
              <tr>
                <td width="50%" style="padding:0 6px 12px 0;">
                  <div style="background:#f9f9f9;border-radius:8px;padding:16px;text-align:center;">
                    <p style="margin:0;font-size:22px;">&#128179;</p>
                    <p style="margin:6px 0 0;font-size:12px;font-weight:700;color:#0F121E;">Kat VISA Gratis</p>
                    <p style="margin:4px 0 0;font-size:11px;color:#888888;">Kreye l gratis apre KYC</p>
                  </div>
                </td>
                <td width="50%" style="padding:0 0 12px 6px;">
                  <div style="background:#f9f9f9;border-radius:8px;padding:16px;text-align:center;">
                    <p style="margin:0;font-size:22px;">&#128176;</p>
                    <p style="margin:6px 0 0;font-size:12px;font-weight:700;color:#0F121E;">Retr&egrave; Disponib</p>
                    <p style="margin:4px 0 0;font-size:11px;color:#888888;">MonCash, Natcash, USDT</p>
                  </div>
                </td>
              </tr>
              <tr>
                <td width="50%" style="padding:0 6px 0 0;">
                  <div style="background:#f9f9f9;border-radius:8px;padding:16px;text-align:center;">
                    <p style="margin:0;font-size:22px;">&#128722;</p>
                    <p style="margin:6px 0 0;font-size:12px;font-weight:700;color:#0F121E;">Amazon / AliExpress</p>
                    <p style="margin:4px 0 0;font-size:11px;color:#888888;">Achte enlign toupatou</p>
                  </div>
                </td>
                <td width="50%" style="padding:0 0 0 6px;">
                  <div style="background:#f9f9f9;border-radius:8px;padding:16px;text-align:center;">
                    <p style="margin:0;font-size:22px;">&#127873;</p>
                    <p style="margin:6px 0 0;font-size:12px;font-weight:700;color:#0F121E;">Gift Cards &amp; Kredi</p>
                    <p style="margin:4px 0 0;font-size:11px;color:#888888;">Netflix, Spotify, Xbox...</p>
                  </div>
                </td>
              </tr>
            </table>

            <!-- 3 steps -->
            <p style="margin:0 0 16px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#888888;">3 etap senp pou konplete KYC ou</p>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
              <tr>
                <td style="vertical-align:top;width:36px;padding-bottom:18px;">
                  <div style="width:32px;height:32px;border-radius:50%;background:#FF7A00;font-size:14px;font-weight:900;color:#ffffff;text-align:center;line-height:32px;">1</div>
                </td>
                <td style="vertical-align:top;padding-left:12px;padding-bottom:18px;">
                  <p style="margin:0;font-size:14px;font-weight:700;color:#1a1a1a;line-height:1.5;">Foto ID nasyonal ou</p>
                  <p style="margin:4px 0 0;font-size:12px;color:#888888;line-height:1.5;">Paspò, CIN, oswa lisans kondwi &mdash; kl&egrave; ak konpl&egrave;.</p>
                </td>
              </tr>
              <tr>
                <td style="vertical-align:top;width:36px;padding-bottom:18px;">
                  <div style="width:32px;height:32px;border-radius:50%;background:#FF7A00;font-size:14px;font-weight:900;color:#ffffff;text-align:center;line-height:32px;">2</div>
                </td>
                <td style="vertical-align:top;padding-left:12px;padding-bottom:18px;">
                  <p style="margin:0;font-size:14px;font-weight:700;color:#1a1a1a;line-height:1.5;">Selfie ak ID ou</p>
                  <p style="margin:4px 0 0;font-size:12px;color:#888888;line-height:1.5;">Yon foto ou kenbe ID ou akoste figi ou.</p>
                </td>
              </tr>
              <tr>
                <td style="vertical-align:top;width:36px;">
                  <div style="width:32px;height:32px;border-radius:50%;background:#FF7A00;font-size:14px;font-weight:900;color:#ffffff;text-align:center;line-height:32px;">3</div>
                </td>
                <td style="vertical-align:top;padding-left:12px;">
                  <p style="margin:0;font-size:14px;font-weight:700;color:#1a1a1a;line-height:1.5;">Peye fr&egrave; verifikasyon ($25)</p>
                  <p style="margin:4px 0 0;font-size:12px;color:#888888;line-height:1.5;">Yon s&egrave;l fwa pou tout lavi kont ou. Gratis pou kreyasyon kat VISA apre sa.</p>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <a href="https://ozamapay.com/kyc" style="display:block;padding:16px;background:#FF7A00;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:700;font-size:14px;text-align:center;margin-bottom:24px;">F&egrave; KYC mwen kounye a &rarr;</a>

            <!-- Closing italic line -->
            <div style="border-left:3px solid #FF7A00;padding:14px 18px;background:#fff8f0;border-radius:0 6px 6px 0;">
              <p style="margin:0;font-size:13px;font-style:italic;color:#7c4700;line-height:1.7;">&ldquo;Plis pase ${verifiedCount} moun deja verifye kont yo &mdash; pa rete d&egrave;y&egrave;. Kont ou deja la, jis fini etap la.&rdquo;</p>
            </div>

          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="border-top:0.5px solid #eeeeee;padding:20px 40px;background:#f9f9f9;">
            <p style="margin:0 0 6px;font-size:11px;color:#999999;text-align:center;line-height:1.6;">Pa janm pataje PIN ou ak p&egrave;s&ograve;n &mdash; menm ekip OZAMAPAY pa ka mande l.</p>
            <p style="margin:0;font-size:11px;color:#bbbbbb;text-align:center;">OZAMAPAY &middot; Jakmel, Ayiti &middot; <a href="https://ozamapay.com" style="color:#FF7A00;text-decoration:none;">ozamapay.com</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
    await this.send(email, 'Ou prèske rive — fini KYC ou nan OZAMAPAY', html);
  }

  async sendAdminInvitation(email: string, role: string, invitationLink: string): Promise<void> {
    const roleLabel: Record<string, string> = {
      ADMIN: 'Administrateur',
      SUPPORT: 'Agent Support',
      SUPER_ADMIN: 'Super Administrateur',
    };
    const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Invitation OZAMAPAY</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:4px;overflow:hidden;">
        <tr>
          <td style="background:#0F121E;padding:28px 40px;">
            <span style="display:inline-block;padding:4px 12px;background:#FF7A00;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:1.5px;color:#ffffff;text-transform:uppercase;margin-bottom:14px;">OZAMAPAY</span>
            <p style="margin:0;font-size:24px;font-weight:800;color:#ffffff;line-height:1.3;">Vous êtes invité(e) à rejoindre l'équipe</p>
            <p style="margin:10px 0 0;font-size:13px;color:rgba(255,255,255,0.6);">Poste : <strong style="color:#FF7A00;">${roleLabel[role] || role}</strong></p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px 32px;">
            <p style="margin:0 0 16px;font-size:14px;color:#444444;line-height:1.7;">Bonjour,</p>
            <p style="margin:0 0 20px;font-size:14px;color:#444444;line-height:1.7;">Le CEO d'OZAMAPAY vous invite à créer votre compte employé sur la plateforme. Cliquez sur le bouton ci-dessous pour configurer votre accès.</p>
            <div style="background:#f9f9f9;border-left:3px solid #FF7A00;border-radius:0 6px 6px 0;padding:16px 18px;margin:0 0 24px;">
              <p style="margin:0;font-size:12px;color:#888888;">Poste assigné</p>
              <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#0F121E;">${roleLabel[role] || role}</p>
            </div>
            <p style="margin:0 0 12px;font-size:13px;color:#666666;line-height:1.6;">Pour finaliser votre inscription, vous aurez besoin :</p>
            <ul style="margin:0 0 24px;padding-left:20px;font-size:13px;color:#666666;line-height:2;">
              <li>De vos informations personnelles (prénom, nom, téléphone)</li>
              <li>De choisir un mot de passe sécurisé</li>
              <li>Du code journalier fourni par votre supérieur</li>
            </ul>
            <a href="${invitationLink}" style="display:block;padding:16px;background:#FF7A00;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:700;font-size:14px;text-align:center;">Créer mon compte employé &rarr;</a>
            <p style="margin:20px 0 0;font-size:11px;color:#aaaaaa;text-align:center;">Ce lien expire dans 7 jours. Ne le partagez avec personne.</p>
          </td>
        </tr>
        <tr>
          <td style="border-top:0.5px solid #eeeeee;padding:20px 40px;background:#f9f9f9;">
            <p style="margin:0;font-size:11px;color:#bbbbbb;text-align:center;">OZAMAPAY &middot; Jakmel, Ayiti &middot; <a href="https://ozamapay.com" style="color:#FF7A00;text-decoration:none;">ozamapay.com</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
    await this.send(email, 'Invitation à rejoindre l\'équipe OZAMAPAY', html);
  }

  async sendDailyCode(email: string, code: string, date: string, expiresAt?: Date): Promise<void> {
    const expiryStr = expiresAt
      ? expiresAt.toLocaleString('fr-FR', {
          timeZone: 'America/Port-au-Prince',
          day: '2-digit', month: 'long', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
      : 'dans 24 heures';

    const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Code journalier OZAMAPAY</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:4px;overflow:hidden;">
        <tr>
          <td style="background:#0F121E;padding:24px 40px;">
            <span style="display:inline-block;padding:4px 12px;background:#FF7A00;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:1.5px;color:#ffffff;text-transform:uppercase;margin-bottom:12px;">OZAMAPAY</span>
            <p style="margin:0;font-size:20px;font-weight:800;color:#ffffff;">Code d'accès journalier</p>
            <p style="margin:8px 0 0;font-size:12px;color:rgba(255,255,255,0.5);">${date}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 24px;font-size:14px;color:#444444;line-height:1.7;">Voici le code journalier à partager avec l'équipe sur WhatsApp. Il est valable <strong>24 heures</strong>.</p>

            <div style="background:#0F121E;border:2px solid #FF7A00;border-radius:10px;padding:32px;text-align:center;margin:0 0 20px;">
              <p style="margin:0 0 14px;font-size:11px;font-weight:700;letter-spacing:3px;color:#FF7A00;text-transform:uppercase;">Code du jour</p>
              <p style="margin:0;font-size:52px;font-weight:900;color:#FF7A00;letter-spacing:14px;font-family:monospace;">${code}</p>
            </div>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
              <tr>
                <td style="background:#f4f4f4;border-radius:8px;padding:12px 16px;">
                  <p style="margin:0;font-size:11px;color:#888888;text-transform:uppercase;letter-spacing:1px;font-weight:700;">Expiration</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#222222;font-weight:700;">${expiryStr} (heure Haïti)</p>
                </td>
              </tr>
            </table>

            <div style="border-left:3px solid #FF7A00;padding:14px 16px;background:#fff8f0;border-radius:0 6px 6px 0;">
              <p style="margin:0;font-size:12px;color:#7c4700;line-height:1.6;">
                ⚠️&nbsp; Partagez ce code <strong>uniquement sur le groupe WhatsApp de l'équipe</strong>.<br>
                Ne l'envoyez jamais par email ou SMS individuel.
              </p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="border-top:0.5px solid #eeeeee;padding:16px 40px;background:#f9f9f9;">
            <p style="margin:0;font-size:11px;color:#bbbbbb;text-align:center;">OZAMAPAY &middot; Jakmel, Ayiti &middot; <a href="https://ozamapay.com" style="color:#FF7A00;text-decoration:none;">ozamapay.com</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
    await this.send(email, `Code journalier OZAMAPAY — ${date}`, html);
  }

  async sendPromoMondialeEmail(email: string, name: string): Promise<void> {
    const html = `<!DOCTYPE html>
<html lang="ht">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OZAMAPAY x Mondial 2026</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:4px;overflow:hidden;">

        <!-- HEADER -->
        <tr>
          <td style="background:#0F121E;padding:28px 40px;text-align:center;">
            <span style="display:inline-block;padding:5px 14px;background:#FF7A00;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:2px;color:#ffffff;text-transform:uppercase;margin-bottom:18px;">OZAMAPAY x MONDIAL 2026</span>
            <p style="margin:0;font-size:64px;font-weight:900;color:#FF7A00;line-height:1;letter-spacing:-1px;">5 000 HTG</p>
            <p style="margin:14px 0 0;font-size:13px;color:rgba(255,255,255,0.65);line-height:1.6;max-width:380px;margin-left:auto;margin-right:auto;">depoze sou kont OZAMAPAY ou, se s&ograve;m sa w gen chans resevwa d&egrave;men pandan match Ayiti a</p>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:36px 40px 32px;">

            <p style="margin:0 0 18px;font-size:14px;color:#444444;line-height:1.7;">Bonjou ${name},</p>

            <p style="margin:0 0 14px;font-size:14px;color:#444444;line-height:1.7;">Ayiti retounen sou s&egrave;n mondyal foutbòl la pou premye fwa nan <strong>52 ans</strong>. Se yon moman istorik pou tout Ayisyen toupatou.</p>
            <p style="margin:0 0 24px;font-size:14px;color:#444444;line-height:1.7;">OZAMAPAY selebre avèk ou — nou tire yon <strong>5 000 HTG</strong> pou yon kliyan ki satisfè kondisyon yo dèmen pandan match la.</p>

            <!-- Match box -->
            <div style="background:#0F121E;border:2px solid #FF7A00;border-radius:10px;padding:24px;text-align:center;margin:0 0 28px;">
              <p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:2.5px;color:#FF7A00;text-transform:uppercase;">FIFA WORLD CUP 2026 &mdash; GWOUP C</p>
              <p style="margin:0 0 8px;font-size:22px;font-weight:900;color:#ffffff;line-height:1.2;">&#127469;&#127481; Ha&iuml;ti vs Br&eacute;sil &#127463;&#127479;</p>
              <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.65);letter-spacing:0.5px;">Vandredi 13 Jen 2026 &mdash; 3:00 PM</p>
            </div>

            <!-- 3 steps -->
            <p style="margin:0 0 16px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#888888;">Kijan pou w patisipe</p>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
              <tr>
                <td style="vertical-align:top;width:36px;padding-bottom:18px;">
                  <div style="width:32px;height:32px;border-radius:50%;background:#FF7A00;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;color:#ffffff;text-align:center;line-height:32px;">1</div>
                </td>
                <td style="vertical-align:top;padding-left:12px;padding-bottom:18px;">
                  <p style="margin:0;font-size:14px;font-weight:700;color:#1a1a1a;line-height:1.5;">Pase KYC ou ($25)</p>
                  <p style="margin:4px 0 0;font-size:12px;color:#888888;line-height:1.5;">Si ou pa fè li toujou, pase l nan dashboard ou imedyatman.</p>
                </td>
              </tr>
              <tr>
                <td style="vertical-align:top;width:36px;padding-bottom:18px;">
                  <div style="width:32px;height:32px;border-radius:50%;background:#FF7A00;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;color:#ffffff;text-align:center;line-height:32px;">2</div>
                </td>
                <td style="vertical-align:top;padding-left:12px;padding-bottom:18px;">
                  <p style="margin:0;font-size:14px;font-weight:700;color:#1a1a1a;line-height:1.5;">Pataje lyen referans ou bay 10 zanmi oswa plis</p>
                  <p style="margin:4px 0 0;font-size:12px;color:#888888;line-height:1.5;">Via WhatsApp, Facebook, oswa nenpòt rezo sosyal.</p>
                </td>
              </tr>
              <tr>
                <td style="vertical-align:top;width:36px;">
                  <div style="width:32px;height:32px;border-radius:50%;background:#FF7A00;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;color:#ffffff;text-align:center;line-height:32px;">3</div>
                </td>
                <td style="vertical-align:top;padding-left:12px;">
                  <p style="margin:0;font-size:14px;font-weight:700;color:#1a1a1a;line-height:1.5;">Tann tiraj la apre match la</p>
                  <p style="margin:4px 0 0;font-size:12px;color:#888888;line-height:1.5;">Yon gayan ch&egrave;t ap tire pami tout kont ki satisfè kondisyon yo.</p>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <a href="https://ozamapay.com/dashboard" style="display:block;padding:16px;background:#FF7A00;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:700;font-size:14px;text-align:center;margin-bottom:24px;">Jwenn lyen referans mwen &rarr;</a>

            <!-- Quote -->
            <div style="border-left:3px solid #FF7A00;padding:14px 18px;background:#fff8f0;border-radius:0 6px 6px 0;margin:0 0 24px;">
              <p style="margin:0;font-size:13px;font-style:italic;color:#7c4700;line-height:1.7;">&ldquo;Menm jan Ayiti reprezante nou sou s&egrave;n mondyal foutbòl la &mdash; OZAMAPAY reprezante nou sou s&egrave;n finansye ent&egrave;nasyonal la.&rdquo;</p>
            </div>

            <!-- Conditions -->
            <p style="margin:0;font-size:11px;color:#aaaaaa;line-height:1.7;">Tiraj la f&egrave;t apre match la. Kondisyon: KYC apwouve + 10 zanmi enskrip via lyen ou. 1 chans pa kont.</p>

          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="border-top:0.5px solid #eeeeee;padding:20px 40px;background:#f9f9f9;">
            <p style="margin:0;font-size:11px;color:#bbbbbb;text-align:center;">OZAMAPAY &middot; Jacmel, Ha&iuml;ti &middot; <a href="https://ozamapay.com" style="color:#FF7A00;text-decoration:none;">ozamapay.com</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
    await this.send(email, '🏆 OZAMAPAY x Mondial 2026 — 5 000 HTG pou tèt ou dèmen!', html);
  }

  async sendBusinessApproved(email: string, name: string, businessName: string): Promise<void> {
    const html = this.wrap(
      `Biznis ${businessName} apwouve — OZAMAPAY Business`,
      'Biznis Ou Apwouve! 🎉',
      this.p(`Bonjou ${name},`) +
      this.badge('KONFIME') + '<br/>' +
      this.p(`Nou kontan enfòme ou ke <strong>${businessName}</strong> apwouve sou OZAMAPAY Business.`) +
      this.p('Ou ka kounye a kòmanse resevwa peman, jere ekip ou, ak fè retrè sou Dashboard Biznis ou.') +
      this.accentLine('Pou aktive peman, ale sou /business-dashboard epi konfigire profil biznis ou.') +
      this.btn('Ale sou Dashboard Biznis →', `${this.frontendUrl}/business-dashboard`),
      '#22C55E',
    );
    await this.send(email, `Biznis ${businessName} apwouve — OZAMAPAY Business`, html);
  }

  async sendBusinessRejected(email: string, name: string, businessName: string, reason?: string): Promise<void> {
    const html = this.wrap(
      `Demande biznis ${businessName} — OZAMAPAY Business`,
      'Demande Biznis Ou Refize',
      this.p(`Bonjou ${name},`) +
      this.badge('REJTE') + '<br/>' +
      this.p(`Malerezman, demande pou <strong>${businessName}</strong> pa kapab apwouve pou kounye a.`) +
      (reason ? this.accentLine(`Rezon: ${reason}`) : '') +
      this.p('Si ou gen kesyon oswa ou vle aplike ankò apre kèk tan, kontakte nou.') +
      this.btn('Kontakte Sipò →', `mailto:contact@ozamapay.com`),
      '#DC2626',
    );
    await this.send(email, `Demande biznis ${businessName} refize — OZAMAPAY Business`, html);
  }

  async sendBusinessWithdrawalApproved(
    email: string,
    name: string,
    businessName: string,
    netAmount: number,
    method: string,
  ): Promise<void> {
    const html = this.wrap(
      `Retrè ${businessName} konplete — OZAMAPAY Business`,
      'Retrè Konplete ✅',
      this.p(`Bonjou ${name},`) +
      this.badge('KONFIME') + '<br/>' +
      this.p(`Retrè biznis <strong>${businessName}</strong> ou a fin trete.`) +
      this.table(
        this.infoRow('Biznis', businessName) +
        this.infoRow('Metòd', method) +
        this.infoRow('Montan voye', `${netAmount.toLocaleString('fr-FR')} HTG`),
      ) +
      this.accentLine(`Lajan an ta dwe rive sou kont ${method} ou talè.`),
      '#22C55E',
    );
    await this.send(email, `Retrè ${businessName} konplete — OZAMAPAY Business`, html);
  }

  async sendBusinessWithdrawalRejected(
    email: string,
    name: string,
    businessName: string,
    amount: number,
    reason?: string,
  ): Promise<void> {
    const html = this.wrap(
      `Retrè ${businessName} rejte — OZAMAPAY Business`,
      'Retrè Rejte',
      this.p(`Bonjou ${name},`) +
      this.badge('REJTE') + '<br/>' +
      this.p(`Demand retrè ${amount.toLocaleString('fr-FR')} HTG pou <strong>${businessName}</strong> pa kapab trete.`) +
      (reason ? this.accentLine(`Rezon: ${reason}`) : '') +
      this.p('Lajan an retounen sou wallet biznis ou — ou ka eseye ankò oswa chwazi yon lòt metòd.') +
      this.btn('Kontakte Sipò →', `mailto:contact@ozamapay.com`),
      '#DC2626',
    );
    await this.send(email, `Retrè ${businessName} rejte — OZAMAPAY Business`, html);
  }

  async sendBusinessMemberInvitation(
    email: string,
    inviteeName: string,
    businessName: string,
    role: string,
    dashboardUrl: string,
  ): Promise<void> {
    const html = this.wrap(
      `Envitasyon pou rejwenn ${businessName} — OZAMAPAY Business`,
      'Envitasyon Biznis',
      this.p(`Bonjou ${inviteeName},`) +
      this.p(`Ou envite pou rejwenn <strong>${businessName}</strong> sou OZAMAPAY Business an tan ke <strong>${role}</strong>.`) +
      this.accentLine('Konekte nan kont OZAMAPAY ou pou aksepte envitasyon sa.') +
      this.btn('Aksepte Envitasyon →', dashboardUrl),
      '#FF6B00',
    );
    await this.send(email, `Envitasyon pou rejwenn ${businessName} — OZAMAPAY Business`, html);
  }

  async sendPasswordReset(email: string, name: string, resetUrl: string): Promise<void> {
    const html = this.wrap(
      'Demann reset modpas — OZAMAPAY',
      'Sekirite Kont Ou',
      this.p(`Bonjou ${name},`) +
      this.p('Nou resevwa yon demann pou chanje modpas kont ou.') +
      this.p('Klike sou bouton anba a pou kreye yon nouvo modpas. Lyen sa valid pou 1 èdtan sèlman.') +
      this.p('Si se pa ou ki fè demann sa, kontakte nou imedyatman sou WhatsApp oswa pa email. Kont ou toujou sekirize — pa gen chanjman fèt toujou.') +
      this.accentLine('Pou sekirite ou, pa janm pataje lyen sa ak pèsòn.') +
      this.btn('Chanje Modpas Ou →', resetUrl),
      '#1565C0',
    );
    await this.send(email, 'Demann reset modpas — OZAMAPAY', html);
  }
}
