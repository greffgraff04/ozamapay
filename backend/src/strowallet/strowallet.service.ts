import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { ZiiropayCorrelationService } from './ziiropay-correlation.service';
import { AlertCooldownService } from '../common/alert-cooldown/alert-cooldown.service';
import axios from 'axios';
import sharp from 'sharp';
import type { CardCreationPending } from '@prisma/client';

// 4 oct 2026 — tèks egzak Mr. Greffin bay pou kliyan an pandan cardkyc rete
// "pending" (pa yon echèk — wè pollPendingCardCreations()).
const PENDING_VERIFICATION_MESSAGE = 'Kreyasyon kat ankou...';
const PENDING_ADMIN_ALERT_AFTER_MS = 60 * 60 * 1000; // 1è

@Injectable()
export class StrowalletService {
  private readonly logger = new Logger(StrowalletService.name);
  private readonly BASE_URL_STROWALLET = 'https://strowallet.com/api/bitvcard';
  private readonly BASE_URL_ZIIROPAY = 'https://ziiropay.com/api/bitvcard';
  // 2 oct 2026 — FAZ 0 reparasyon: STROWALLET_PUBLIC_KEY (fòma "pub_...",
  // kle strowallet.com) pa menm kle ak dashboard ziiropay a (fòma hex 40
  // karaktè san prefiks) — konfime AN LIVE: ziiropay.com rejte cardkyc ak
  // "Invalid public key." lè STROWALLET_PUBLIC_KEY voye. 2 chan separe pou
  // 2 pwovidè yo.
  private readonly PUBLIC_KEY: string;
  private readonly ZIIROPAY_PUBLIC_KEY: string;
  private readonly MODE = 'live';

  // Migrasyon ZiiroPay (sept 2026) — 1 sèl flag pou routing pwogresif +
  // rollback pou wout ki PA ankò konfime (ex: create_litecard, cardkycstatus).
  // 'off' (default) = kòmpòtman idantik jodi a pou wout sa yo. 'read'/'full'
  // elaji sa yo si/lè yo konfime.
  private readonly ZIIROPAY_ROUTING_STAGE: 'off' | 'read' | 'full';
  private readonly ZIIROPAY_ENDPOINTS_READ = new Set(['fetch-nfccard-detail']);
  private readonly ZIIROPAY_ENDPOINTS_FULL = new Set([
    'fetch-nfccard-detail',
    'fund-withdraw-nfccard',
    'freezeactivate-nfc',
  ]);

  // 2 oct 2026 — FAZ 0 (koreksyon ijan, konfime AN LIVE): cardkyc sou
  // strowallet.com mouri (405 Method Not Allowed, pa gen altènativ ki mache).
  // create-nfc-card bezwen menm customer_id ki kreye pa cardkyc, kidonk 2 wout
  // sa yo DWE rete ansanm sou ziiropay.com — pa gen "altènativ strowallet.com"
  // ki fonksyonèl ankò pou flow kreyasyon kat la. fetch-nfccard-detail/
  // fund-withdraw-nfccard/freezeactivate-nfc swiv menm bò a: kat ki kreye sou
  // ziiropay.com pa rekonèt sou strowallet.com (404/erè konfime live), kidonk
  // yo DWE ziiropay.com tou pou kat yo ka itilizab apre kreyasyon. Sa a bypass
  // ZIIROPAY_ROUTING_STAGE pou 5 wout sa yo espesifikman — STAGE a rete pou
  // lòt wout bitvcard ki pa ankò konfime (pa gen chanjman valè STAGE a).
  // 4 oct 2026 — 'cardkycstatus' manke nan lis sa a: san li, nfcGet()
  // rezoud sou strowallet.com, ki pa konnen anyen sou customer ki kreye pa
  // cardkyc sou ziiropay.com (konfime AN LIVE — menm kategori pwoblèm ak
  // fetch-nfccard-detail/fund-withdraw-nfccard/freezeactivate-nfc pi wo a).
  // Obligatwa pou pollPendingCardCreations() ka mache kòrèkteman.
  private readonly ZIIROPAY_ALWAYS_ENDPOINTS = new Set([
    'cardkyc',
    'cardkycstatus',
    'create-nfc-card',
    'fetch-nfccard-detail',
    'fund-withdraw-nfccard',
    'freezeactivate-nfc',
  ]);

  private resolveBaseUrl(endpoint: string): string {
    if (this.ZIIROPAY_ALWAYS_ENDPOINTS.has(endpoint)) return this.BASE_URL_ZIIROPAY;
    if (this.ZIIROPAY_ROUTING_STAGE === 'full' && this.ZIIROPAY_ENDPOINTS_FULL.has(endpoint)) {
      return this.BASE_URL_ZIIROPAY;
    }
    if (this.ZIIROPAY_ROUTING_STAGE === 'read' && this.ZIIROPAY_ENDPOINTS_READ.has(endpoint)) {
      return this.BASE_URL_ZIIROPAY;
    }
    return this.BASE_URL_STROWALLET;
  }

  private isRoutedToZiiropay(endpoint: string): boolean {
    return this.resolveBaseUrl(endpoint) === this.BASE_URL_ZIIROPAY;
  }

  // StroWallet konfime (14 out 2026): "It's customer address we requested
  // for and not billing address" — tès AVS pi bonè (984f6f4) te fè yon move
  // konklizyon; adrès Wilmington te yon ERÈ. Sèvi ak VRÈ adrès Kyc kliyan an.
  // country DWE 3 karaktè (StroWallet konfime: "The country must be 3
  // characters.") — Kyc.country estoke alpha-2 ("HT"), konvèti an alpha-3.
  private readonly ISO_ALPHA2_TO_ALPHA3: Record<string, string> = { HT: 'HTI' };

  private resolveNfcCountry(country: string | null | undefined): string {
    if (!country) return 'HTI';
    return this.ISO_ALPHA2_TO_ALPHA3[country.toUpperCase()] || country;
  }

  // 4 oct 2026 — StroWallet rejte cardkyc ak "address1 is too short" (konfime
  // AN LIVE, field="address1", rule="address_length") san bay yon sèy
  // dokimante. Done reyèl: "PAUP" (4 karaktè) rejte, "Lamandou" (8 karaktè)
  // apwouve — 8 chwazi kòm sèy pridan, pa egzak limit StroWallet la (ki rete
  // enkoni ant 5-7). Piblik pou KycService.applyCorrectedAddress() ka reyitilize
  // menm verifikasyon an lè yon kliyan soumèt yon adrès korije.
  readonly MIN_ADDRESS_LENGTH = 8;

  isAddressTooShort(line1: string | null | undefined): boolean {
    return !line1 || line1.trim().length < this.MIN_ADDRESS_LENGTH;
  }

  // Fee constants
  private readonly CARD_CREATION_FEE_USD = 2.50;
  private readonly CARD_RECHARGE_FEE_FLAT_USD = 1.90;
  private readonly CARD_RECHARGE_FEE_PCT = 0.019;
  private readonly OZAMAPAY_RECHARGE_FEE_PCT = 0.02;
  private readonly MASTER_ID = process.env.OZAMAPAY_MASTER_ID as string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private mailService: MailService,
    private ziiropayCorrelationService: ZiiropayCorrelationService,
    private alertCooldown: AlertCooldownService,
  ) {
    this.PUBLIC_KEY = this.config.get<string>('STROWALLET_PUBLIC_KEY') ?? '';
    this.ZIIROPAY_PUBLIC_KEY = this.config.get<string>('ZIIROPAY_PUBLIC_KEY') ?? '';
    const stage = this.config.get<string>('ZIIROPAY_ROUTING_STAGE');
    this.ZIIROPAY_ROUTING_STAGE = stage === 'read' || stage === 'full' ? stage : 'off';
  }

  // ─── HELPER ────────────────────────────────────────────────────────────────

  async getExchangeRate(): Promise<number> {
    const rate = await this.prisma.rate.findUnique({
      where: { key: 'CARD_RATE' },
    });
    if (!rate) throw new BadRequestException('Taux de change USD introuvable');
    return Number(rate.value);
  }

  private async nfcPost(endpoint: string, params: Record<string, string>) {
    const base = this.resolveBaseUrl(endpoint);
    // ziiropay.com 301-redirects trailing-slash URLs to the slash-less form —
    // Axios follows 301s by converting POST to GET, which silently corrupts
    // the request. strowallet.com needs the trailing slash; ziiropay.com must
    // not have one.
    const url = base === this.BASE_URL_ZIIROPAY ? `${base}/${endpoint}` : `${base}/${endpoint}/`;
    // 4 oct 2026 — id_front_image (base64, jiska ~1MB konfime pa StroWallet)
    // PA DWE janm ale nan URL/query string la (sa a se egzakteman sa ki te
    // lakòz 414 "Request-URI Too Large" nou te wè pi bonè). Retire l apa epi
    // voye l nan kò (body) requête POST la kòm form-urlencoded — tout lòt chan
    // yo rete nan query string tankou avan, paske sa deja teste AN LIVE san
    // pwoblèm pou tout lòt wout yo (fund-withdraw-nfccard, create-nfc-card,
    // elatriye). Laravel (backend StroWallet/ZiiroPay) li chan ni nan body ni
    // nan query san distenksyon, kidonk separasyon sa a san danje.
    const { id_front_image, ...restParams } = params;
    // ziiropay.com konfime AN LIVE (2 oct 2026): "mode" fè cardkyc rejte nèt
    // ({"errors":{"mode":["The selected mode is invalid."]}}) — chan an pa
    // itilize sou ziiropay.com ditou (kle dashboard la detèmine live/sandbox).
    // Tout 5 wout "always ziiropay" yo teste AN LIVE san "mode" — omèt li pou
    // yo tout, pa sèlman cardkyc, pou rete koheran ak sa ki konfime.
    const payload =
      base === this.BASE_URL_ZIIROPAY
        ? { public_key: this.ZIIROPAY_PUBLIC_KEY, ...restParams }
        : { public_key: this.PUBLIC_KEY, mode: this.MODE, ...restParams };
    const body = id_front_image !== undefined ? new URLSearchParams({ id_front_image }) : null;
    let data: any;
    try {
      ({ data } = await axios.post(url, body, { params: payload }));
    } catch (error: any) {
      const detail = error?.response?.data;
      this.logger.error(`Strowallet API error [${endpoint}]: ${JSON.stringify(detail) ?? error?.message}`);
      throw this.strowalletFailure(detail ?? error?.message);
    }
    if (data?.success === false || data?.status === false) {
      this.logger.error(`Strowallet error [${endpoint}]: ${JSON.stringify(data)}`);
      throw this.strowalletFailure(data);
    }
    return data;
  }

  // Kliyan an toujou wè mesaj jenerik la (BadRequestException.message) — pa
  // janm mesaj brit StroWallet la. `strowalletDetail` se yon chan siplemantè,
  // admin-sèlman, pou call site yo ka anrejistre l nan CardCreationFailure.
  private strowalletFailure(detail: unknown): BadRequestException {
    const err = new BadRequestException('Nou rankontre yon pwoblèm teknik. Tanpri eseye ankò pita oswa kontakte sipò OZAMAPAY.');
    (err as any).strowalletDetail = typeof detail === 'string' ? detail : JSON.stringify(detail);
    return err;
  }

  // StroWallet konfime (2026-08-08): echèk "Using fake details" — adrès Miami
  // ak telefòn Ameriken fiktif nou te itilize a se rezon prensipal echèk
  // create-nfc-card yo. Rezoud vrè non/telefòn kliyan an pou payload StroWallet
  // — itilize pa createAndFundCard ak createReplacementCard pou yo rete koheran.
  private resolveNfcIdentity(user: {
    name: string | null;
    phone: string | null;
    kyc: { phoneNumber?: string | null; firstName?: string | null; lastName?: string | null } | null;
  }) {
    // StroWallet konfime (14 out 2026): "Name should not have space" pou
    // last_name — men ~8% kliyan Ayisyen gen non fanmi 2 mo (egzanp "JEAN
    // PIERRE", "ST FLEUR"). Sèvi ak Kyc.firstName/lastName (verifye pa ajan
    // kont dokiman ID a pandan revizyon KYC) olye de devine lòd mo nan
    // user.name, ki ka estoke "SIREN Non1 Non2" (non fanmi DEVAN) pou kèk
    // kliyan — sa te bay yon last_name FO (yon mo ki soti nan prenon an).
    let firstName: string;
    let lastName: string;
    if (user.kyc?.firstName && user.kyc?.lastName) {
      firstName = user.kyc.firstName.trim();
      lastName = user.kyc.lastName.trim().replace(/\s+/g, '-');
    } else {
      // Fallback: user.name pa gen okenn garanti lòd, men se sèl sous ki
      // rete si Kyc pa gen firstName/lastName ranpli.
      const nameParts = (user.name || 'OZAMA USER').trim().split(/\s+/).filter(Boolean);
      lastName = nameParts[nameParts.length - 1] || 'USER';
      firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : lastName;
    }

    // Kyc.phoneNumber se vrè sous done a (kolekte pandan KYC, 93% ranpli);
    // User.phone se yon chan segondè ki ra ranpli (2.8%), sitou pou nimewo
    // etranje. Fòma entènasyonal san '+' StroWallet mande.
    const rawPhone = (user.kyc?.phoneNumber && user.kyc.phoneNumber.trim() !== '')
      ? user.kyc.phoneNumber
      : user.phone;
    if (!rawPhone) {
      throw new BadRequestException(
        'Ou dwe genyen yon nimewo telefòn valid nan pwofil ou pou kreye yon kat vityèl. Tanpri mete l ajou.'
      );
    }
    const digits = rawPhone.replace(/[^\d]/g, '');
    const phone = digits.length === 8 ? `509${digits}` : digits;
    const dialCode = this.resolveDialCode(digits);

    return { firstName, lastName, phone, dialCode };
  }

  // 2 oct 2026 — FAZ 0: dial_code te hardcode '+509' pou TOUT kliyan, menm
  // lè nimewo telefòn yo se yon vrè nimewo etranje (ex: kliyan dyaspora ak
  // yon selilè Ameriken) — sa voye yon enkoyerans bay cardkyc (dial_code
  // ≠ peyi vrè nimewo a), ki ka kontribye nan yon rejè. Menm sipozisyon ak
  // rès `resolveNfcIdentity()`: 8 chif = nimewo lokal ayisyen san kòd peyi
  // (509 ajoute separeman pi wo). Lòt longè sipoze gen pwòp kòd peyi li deja
  // ladan — dedwi l nan yon lis prefiks rekonèt, PI LONG anvan pi kout (pou
  // '1' pa match anvan '33' pa egzanp). Lis la pa egzostif — ajoute plis
  // kòd si lòt peyi parèt nan baz kliyan nou an. '+509' rete defo si pa gen
  // match (prezève ansyen kòmpòtman pou ka ki pa idantifye).
  private readonly KNOWN_DIAL_CODE_PREFIXES = ['509', '33', '49', '44', '34', '55', '56', '1'];

  private resolveDialCode(digits: string): string {
    if (digits.length === 8) return '+509';
    const match = this.KNOWN_DIAL_CODE_PREFIXES.find((code) => digits.startsWith(code));
    return match ? `+${match}` : '+509';
  }

  // cardkyc (ziiropay.com) mande id_front_image an Base64. 4 oct 2026 —
  // StroWallet konfime OFISYÈLMAN (pa sipò) ke vrè sèy la se yon string
  // base64 ki PA depase 1MB (~1,398,000 karaktè), PA 8,000 karaktè nou te
  // sipoze a pi bonè. 8,000 te yon sèy fo bati sou erè 414 nou te wè AN
  // LIVE 2 oct 2026 — erè sa a te lakòz pa yon BUG SEPARE (id_front_image
  // ki t ap pase nan URL/query string olye kò/body requête a, wè nfcPost())
  // ki te konprese imaj la SAN rezon jiska 25-30% kalite, sa ki te lakòz
  // ziiropay/Sumsub rejte ak "DATANOTREADABLE" (konfime AN LIVE pou kont
  // oliviergreffin20@gmail.com) — menm kategori rejè ak "PHOTOS_INSATISFAISANTES"
  // nou wè pou lòt kliyan nan dashboard la. Kounye a id_front_image ale nan
  // body (pa URL), kidonk pa gen limit pratik liye ak longè URL ankò — sèy la
  // se vrè limit StroWallet la (1MB), ak yon maj sekirite.
  private readonly ID_FRONT_IMAGE_BASE64_THRESHOLD = 1_200_000;

  // 4 oct 2026 — itilize sèlman nan ka ra kote imaj orijinal la (anvan menm
  // konvèsyon) depase 1MB base64 (~900KB done brit). 800px/kalite 85% bay yon
  // imaj klè, byen lizib pou OCR Sumsub, pandan li rete byen anba sèy 1MB la.
  private readonly ID_FRONT_IMAGE_RESIZE_WIDTH = 800;
  private readonly ID_FRONT_IMAGE_JPEG_QUALITY = 85;

  private async resolveIdFrontImageBase64(imageUrl: string): Promise<string> {
    const imageResp = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const originalBuffer = Buffer.from(imageResp.data as ArrayBuffer);
    const originalBase64 = originalBuffer.toString('base64');
    if (originalBase64.length <= this.ID_FRONT_IMAGE_BASE64_THRESHOLD) {
      return originalBase64;
    }
    const resizedBuffer = await sharp(originalBuffer)
      .resize({ width: this.ID_FRONT_IMAGE_RESIZE_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: this.ID_FRONT_IMAGE_JPEG_QUALITY })
      .toBuffer();
    const resizedBase64 = resizedBuffer.toString('base64');
    this.logger.log(`id_front_image konprese: ${originalBase64.length} -> ${resizedBase64.length} karaktè base64`);
    return resizedBase64;
  }

  private async nfcGet(endpoint: string, params: Record<string, string>) {
    const base = this.resolveBaseUrl(endpoint);
    // Same trailing-slash 301 quirk as nfcPost() — harmless for GET (method
    // is preserved across the redirect) but kept consistent for both.
    const url = base === this.BASE_URL_ZIIROPAY ? `${base}/${endpoint}` : `${base}/${endpoint}/`;
    // Menm rezon ak nfcPost() — "mode" omèt pou wout ziiropay.com yo.
    const payload =
      base === this.BASE_URL_ZIIROPAY
        ? { public_key: this.ZIIROPAY_PUBLIC_KEY, ...params }
        : { public_key: this.PUBLIC_KEY, mode: this.MODE, ...params };
    let data: any;
    try {
      ({ data } = await axios.get(url, { params: payload }));
    } catch (error: any) {
      this.logger.error(`Strowallet GET error [${endpoint}]: ${error?.message}`);
      throw new BadRequestException('Nou rankontre yon pwoblèm teknik. Tanpri eseye ankò pita oswa kontakte sipò OZAMAPAY.');
    }
    if (data?.success === false || data?.status === false) {
      this.logger.error(`Strowallet GET failed [${endpoint}]: ${JSON.stringify(data)}`);
      throw new BadRequestException('Nou rankontre yon pwoblèm teknik. Tanpri eseye ankò pita oswa kontakte sipò OZAMAPAY.');
    }
    return data;
  }

  // Yon itilizatè pa ta dwe janm gen 2 kat StroWallet ki kalifye pou
  // ACTIVE/FROZEN an menm tan, men sa rive (egzanp: race condition
  // doub-kreyasyon, 8 out) — `findFirst` san orderBy sou yon enum PA garanti
  // ki ranje l retounen, kidonk yon kat FROZEN "fantom" ka parèt olye vrè
  // kat ACTIVE la. Toujou priyorize ACTIVE anvan FROZEN pou anpeche sa.
  //
  // 31 out 2026 — filtre pa provider: yon itilizatè ka gen 1 kat StroWallet
  // + 1 kat BSICards an menm tan kounye a (wè BSICardsService pou menm
  // chanjman an). San filt sa a, yon aksyon StroWallet (freeze, fund, get
  // secret details) ta ka pran kat BSICards la pa erè.
  private async findActiveOrFrozenCard(userId: string) {
    return (
      (await this.prisma.virtualCard.findFirst({ where: { userId, provider: 'STROWALLET_NFC', status: 'ACTIVE' } })) ??
      (await this.prisma.virtualCard.findFirst({ where: { userId, provider: 'STROWALLET_NFC', status: 'FROZEN' } }))
    );
  }

  // Anrejistre echèk create-nfc-card (admin-sèlman, wè CardCreationFailure nan
  // schema.prisma) epi alète ekip la lè yon kliyan rive omwen 2 echèk
  // konsekitif san okenn siksè ant yo. Cooldown pa itilizatè (3h) ranplase
  // ansyen `=== 2` a (ki te voye YON SÈL alèt pou tout tan, menm si pwoblèm
  // nan te kontinye) — kounye a li re-alète chak 3h si echèk yo pèsiste.
  private async recordCardCreationFailure(
    userId: string,
    email: string,
    context: 'CREATE' | 'REPLACEMENT',
    errorMessage: string,
  ): Promise<void> {
    await this.prisma.cardCreationFailure.create({ data: { userId, email, context, errorMessage } });

    const lastCard = await this.prisma.virtualCard.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    const consecutiveFailures = await this.prisma.cardCreationFailure.count({
      where: { userId, ...(lastCard ? { createdAt: { gt: lastCard.createdAt } } : {}) },
    });

    if (consecutiveFailures >= 2) {
      const canSend = await this.alertCooldown.shouldSend(`card-creation-failure:${userId}`);
      if (canSend) {
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
        if (user) {
          await this.mailService.sendCardCreationFailureAlert(user.email, user.name, userId, context, errorMessage);
        }
      }
    }
  }

  // ─── HEALTH CHECK ────────────────────────────────────────────────────────────

  async checkHealth(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    // 2 oct 2026 — resolveBaseUrl('fetch-nfccard-detail') toujou retounen
    // ziiropay.com kounye a (ZIIROPAY_ALWAYS_ENDPOINTS), kidonk kle a dwe
    // ZIIROPAY_PUBLIC_KEY — pa STROWALLET_PUBLIC_KEY, menmsi non fonksyon
    // sa a ta sijere strowallet.com. Trailing-slash/mode PA touche isit la
    // (menm egzansyon ak ziiropay-correlation.service.ts — tikè separe).
    const url = `${this.resolveBaseUrl('fetch-nfccard-detail')}/fetch-nfccard-detail/`;
    try {
      await axios.get(url, {
        params: { public_key: this.ZIIROPAY_PUBLIC_KEY, mode: this.MODE, card_id: 'health-check' },
        timeout: 10000,
      });
      return { status: 'ok' };
    } catch (error: any) {
      // Any HTTP response from Strowallet (even 4xx) means the API is reachable
      if (error?.response) return { status: 'ok' };
      this.logger.warn(`Strowallet health check failed: ${error?.message}`);
      return { status: 'error', message: 'Strowallet unreachable' };
    }
  }

  // ─── 1. CREATE NFC CARD (otomatik, pa bezwen compliance review) ─────────────

  async createAndFundCard(userId: string, amountUsd: number) {
    amountUsd = Number(amountUsd);
    if (!Number.isFinite(amountUsd) || amountUsd < 3 || amountUsd > 500) {
      throw new BadRequestException('Montan dwe ant $3 ak $500');
    }

    // Verifye pa gen kat StroWallet ki poko rezoud — ACTIVE/FROZEN (kat ki egziste toujou) oswa
    // PENDING_RECHARGE (CardTerminationService ap toujou veye l, pa dwe gen 2 kreyasyon
    // pou menm kliyan an). TERMINATED/REPLACED san sa yo vle di lifecycle a fin rezoud,
    // OK pou kliyan an kreye yon nouvo kat li menm. Filtre pa provider (31 out 2026) —
    // yon kat BSICards aktif pa dwe bloke kreyasyon yon kat StroWallet.
    const existing = await this.prisma.virtualCard.findFirst({
      where: { userId, provider: 'STROWALLET_NFC', status: { in: ['ACTIVE', 'FROZEN', 'PENDING_RECHARGE'] } },
    });
    if (existing) throw new BadRequestException('Ou genyen yon kat vityèl deja');

    // Jwenn done itilizatè
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true, kyc: true },
    });
    if (!user?.wallet) throw new NotFoundException('Wallet introuvable');
    if (!user.kyc || user.kyc.status !== 'APPROVED') {
      throw new BadRequestException('KYC ou dwe apwouve pou kreye yon kat');
    }

    // 4 oct 2026 — tcheke anvan nenpòt apèl/debi, pa apre — evite yon rejè
    // cardkyc garanti ("address1 is too short") ki ta gaspiye yon tantativ
    // KYC san rezon. Wè recordAddressBlock() ak isAddressTooShort().
    if (this.isAddressTooShort(user.kyc.line1)) {
      await this.recordAddressBlockAndNotify({
        userId,
        email: user.email,
        name: user.name || 'OZAMA USER',
        amountUsd,
        context: 'CREATE',
      });
      throw new BadRequestException(
        'Adrès ou nan pwofil la twò kout/enkonplè pou n kreye kat la. Nou voye yon imèl ba ou ak enstriksyon pou korije l — pa gen okenn frè, KYC ou rete apwouve.',
      );
    }

    // Kalkile total an HTG — frè $2.50 kreyasyon absòbe pa OZAMAPAY, pa itilizatè
    const exchangeRate = await this.getExchangeRate();
    const totalHtg = Math.ceil(amountUsd * exchangeRate);

    if (Number(user.wallet.balance) < totalHtg) {
      throw new BadRequestException(
        `Balans ennsifizan. Ou bezwen ${totalHtg} HTG (depò $${amountUsd})`
      );
    }

    const { firstName, lastName, phone, dialCode } = this.resolveNfcIdentity(user);

    // Fòmate dat nesans KYC an ISO (YYYY-MM-DD) — fòma cardkyc dokiman
    // readme.io mande ("Date of birth in YYY-MM-DD").
    const isoDob = user.kyc.dateOfBirth
      ? new Date(user.kyc.dateOfBirth).toISOString().slice(0, 10)
      : '1990-01-01';

    // 2 oct 2026 — FAZ 0: id_front_image dwe Base64 (pa URL — li ale nan body
    // requête a, wè nfcPost()); konprese sèlman si li depase vrè limit
    // StroWallet la (1MB, wè resolveIdFrontImageBase64()).
    const idFrontImageBase64 = await this.resolveIdFrontImageBase64(user.kyc.idImage);

    const cardkycParams = {
      first_name: firstName,
      last_name: lastName,
      // StroWallet konfime (2026-08-07): pou kliyan Ayisyen, soumèt kat idantite
      // nasyonal la kòm si se te yon paspò — 'national_id' egzije yon fòma NIN
      // Nijeryen (11 chif) ki pa matche fòma Ayisyen an.
      id_type: 'passport',
      id_number: user.kyc.idNumber || '00000000',
      id_front_image: idFrontImageBase64,
      email: user.email,
      // Fòma entènasyonal san '+' (dokiman readme.io) — `phone` deja nan fòma
      // sa a (509XXXXXXXX) pa resolveNfcIdentity().
      phone_number: phone,
      date_of_birth: isoDob,
      // 2 oct 2026 — FAZ 0: dedwi (pa hardcode) — wè resolveDialCode().
      dial_code: dialCode,
      line1: user.kyc.line1,
      city: user.kyc.city,
      state: user.kyc.state,
      postal_code: user.kyc.zipCode,
      country: this.resolveNfcCountry(user.kyc.country),
      // Chan biznis cardkyc egzije (konfime AN LIVE 2 oct 2026) ki Kyc nou an
      // pa kolekte jodi a — valè jenerik validé AN LIVE (statu "approved"
      // resevwa ak menm valè sa yo), pa done pèsonalize pou chak kliyan.
      occupation: 'Business Owner',
      employment_status: 'self_employed',
      account_purpose: 'personal_use',
      annual_salary: '50000',
      expected_monthly_volume: '5000',
      place_of_birth: user.kyc.city || 'Port-au-Prince',
    };

    // ── Etap 1: Debi wallet sèlman (transaction 1) ──────────────────────────
    await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: totalHtg } },
      });
    });

    // ── Etap 2: Apèl HTTP ziiropay.com DEYÒ transaction — 2 etap: cardkyc
    // (jwenn/kreye customer_id) epi create-nfc-card (ak customer_id sa a).
    // Restriktire 2 oct 2026 (FAZ 0) — ansyen flow 1-apèl la (tout chan KYC
    // dirèkteman nan create-nfc-card) pa fonksyone ankò: cardkyc sou
    // strowallet.com mouri (405), e create-nfc-card bezwen yon customer_id
    // ki kreye pa cardkyc sou ziiropay.com. Flow sa a konfime AN LIVE.
    let cardId: string;
    try {
      const kycResponse = await this.nfcPost('cardkyc', cardkycParams);
      const customerId =
        kycResponse?.response?.customer_id || kycResponse?.data?.customer_id || kycResponse?.customer_id;
      const kycStatus = kycResponse?.response?.status || kycResponse?.data?.status || kycResponse?.status;
      if (!customerId) throw this.strowalletFailure('cardkyc pa retounen customer_id');
      // 4 oct 2026 — "pending" se yon eta TRANZITWA konfime AN LIVE (rezoud
      // tèt li "approved" kèk minit pita san okenn aksyon) — PA yon echèk.
      // Kenbe wallet debite a, kite pollPendingCardCreations() (chak 30s)
      // konplete kreyasyon an lè cardkyc finalman rezoud.
      if (kycStatus === 'pending') {
        await this.recordPendingCardCreation({
          userId,
          email: user.email,
          customerId,
          name: user.name || 'OZAMA USER',
          amountUsd,
          context: 'CREATE',
          totalHtg,
        });
        return { status: 'PENDING_VERIFICATION' as const, message: PENDING_VERIFICATION_MESSAGE };
      }
      if (kycStatus !== 'approved') throw this.strowalletFailure(`cardkyc status="${kycStatus}", pa "approved"`);

      const cardResponse = await this.nfcPost('create-nfc-card', {
        customer_id: customerId,
        name: user.name || 'OZAMA USER',
        amount: String(amountUsd),
      });
      cardId = cardResponse?.response?.card_id || cardResponse?.data?.card_id || cardResponse?.card_id;
      if (!cardId) throw this.strowalletFailure('create-nfc-card pa retounen card_id');
    } catch (err) {
      // ── Etap 3: Strowallet echwe → renmbi wallet (NOUVO transaction) ────────
      await this.prisma.$transaction(async (tx) => {
        await tx.wallet.update({
          where: { userId },
          data: { balance: { increment: totalHtg } },
        });
        await tx.transaction.create({
          data: {
            senderWalletId: user.wallet!.id,
            type: 'CARD',
            amount: totalHtg,
            netAmount: totalHtg,
            fee: 0,
            status: 'FAILED',
            description: `Kreyasyon kat vityèl NFC $${amountUsd} ECHWE — renmbi otomatik fèt`,
            reference: `CARD-CREATE-FAIL-${Date.now()}`,
          },
        });
      });
      await this.recordCardCreationFailure(userId, user.email, 'CREATE', (err as any)?.strowalletDetail ?? (err as any)?.message ?? 'unknown');
      throw err;
    }

    // ── Etap 4: Strowallet siksè → kreye VirtualCard + Transaction (NOUVO transaction) ──
    const virtualCard = await this.prisma.$transaction(async (tx) => {
      const card = await tx.virtualCard.create({
        data: {
          userId,
          cardId,
          balance: amountUsd,
          currency: 'USD',
          provider: 'STROWALLET_NFC',
          status: 'ACTIVE',
        },
      });

      await tx.transaction.create({
        data: {
          senderWalletId: user.wallet!.id,
          type: 'CARD',
          amount: totalHtg,
          netAmount: totalHtg,
          fee: 0,
          status: 'COMPLETED',
          description: `Kreye kat vityèl NFC — $${amountUsd}`,
          reference: `CARD-CREATE-${cardId}`,
        },
      });

      return card;
    });

    return {
      message: 'Kat vityèl NFC kreye avèk siksè! Google Pay & Apple Pay aktive.',
      card: virtualCard,
    };
  }

  // ─── 1b. CREATE REPLACEMENT CARD (apre terminasyon, deja finanse) ───────────
  // Itilize pa CardTerminationService: pa gen verifikasyon "kat deja egziste",
  // ni debi wallet — lajan an soti nan pool StroWallet (balans ranbouse a).
  // 4 oct 2026 — oldCardId/feeDeductedHtg ajoute pou pollPendingCardCreations()
  // ka konplete (make REPLACED) oswa ranbouse frè a pita si cardkyc reyèlman
  // rejte apre yon peryòd "pending" (wè CardTerminationService.finalizeReplacement()).
  async createReplacementCard(userId: string, fundAmountUsd: number, oldCardId?: string, feeDeductedHtg: number = 0) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { kyc: true },
    });
    if (!user) throw new NotFoundException('Itilizatè introuvable');

    const { firstName, lastName, phone, dialCode } = this.resolveNfcIdentity(user);

    // 2 oct 2026 — FAZ 0: menm restriktirasyon 2-etap ak createAndFundCard()
    // (cardkyc -> create-nfc-card ak customer_id), menm rezon (wè pli wo).
    const isoDob = user.kyc?.dateOfBirth
      ? new Date(user.kyc.dateOfBirth).toISOString().slice(0, 10)
      : '1990-01-01';

    const idFrontImageBase64 = await this.resolveIdFrontImageBase64(user.kyc?.idImage || '');

    const cardkycParams = {
      first_name: firstName,
      last_name: lastName,
      // StroWallet konfime (2026-08-07): pou kliyan Ayisyen, soumèt kat idantite
      // nasyonal la kòm si se te yon paspò — 'national_id' egzije yon fòma NIN
      // Nijeryen (11 chif) ki pa matche fòma Ayisyen an.
      id_type: 'passport',
      id_number: user.kyc?.idNumber || '00000000',
      id_front_image: idFrontImageBase64,
      email: user.email,
      phone_number: phone,
      date_of_birth: isoDob,
      // 2 oct 2026 — FAZ 0: dedwi (pa hardcode) — wè resolveDialCode().
      dial_code: dialCode,
      line1: user.kyc?.line1 || '',
      city: user.kyc?.city || '',
      state: user.kyc?.state || '',
      postal_code: user.kyc?.zipCode || '',
      country: this.resolveNfcCountry(user.kyc?.country),
      occupation: 'Business Owner',
      employment_status: 'self_employed',
      account_purpose: 'personal_use',
      annual_salary: '50000',
      expected_monthly_volume: '5000',
      place_of_birth: user.kyc?.city || 'Port-au-Prince',
    };

    let cardId: string;
    try {
      const kycResponse = await this.nfcPost('cardkyc', cardkycParams);
      const customerId =
        kycResponse?.response?.customer_id || kycResponse?.data?.customer_id || kycResponse?.customer_id;
      const kycStatus = kycResponse?.response?.status || kycResponse?.data?.status || kycResponse?.status;
      if (!customerId) throw this.strowalletFailure('cardkyc pa retounen customer_id');
      if (kycStatus === 'pending') {
        await this.recordPendingCardCreation({
          userId,
          email: user.email,
          customerId,
          name: user.name || 'OZAMA USER',
          amountUsd: fundAmountUsd,
          context: 'REPLACEMENT',
          oldCardId,
          feeDeductedHtg,
        });
        return { status: 'PENDING_VERIFICATION' as const, message: PENDING_VERIFICATION_MESSAGE };
      }
      if (kycStatus !== 'approved') throw this.strowalletFailure(`cardkyc status="${kycStatus}", pa "approved"`);

      const cardResponse = await this.nfcPost('create-nfc-card', {
        customer_id: customerId,
        name: user.name || 'OZAMA USER',
        amount: String(fundAmountUsd),
      });
      cardId = cardResponse?.response?.card_id || cardResponse?.data?.card_id || cardResponse?.card_id;
      if (!cardId) throw this.strowalletFailure('create-nfc-card pa retounen card_id pou kat ranplasman an');
    } catch (err) {
      await this.recordCardCreationFailure(
        userId,
        user.email,
        'REPLACEMENT',
        (err as any)?.strowalletDetail ?? (err as any)?.message ?? 'unknown',
      );
      throw err;
    }

    return this.prisma.virtualCard.create({
      data: {
        userId,
        cardId,
        balance: fundAmountUsd,
        currency: 'USD',
        provider: 'STROWALLET_NFC',
        status: 'ACTIVE',
      },
    });
  }

  // ─── 1c. ADRÈS TWÒ KOUT — deteksyon pwoaktif (4 oct 2026) ───────────────────
  // Yon sèl CardCreationAddressBlock pa rezoud pou chak (userId, context) —
  // evite voye plizyè imèl si kliyan an eseye kreye kat la plizyè fwa anvan
  // li korije adrès la. Wè KycService.applyCorrectedAddress() pou relanse a.
  async recordAddressBlockAndNotify(data: {
    userId: string;
    email: string;
    name: string;
    amountUsd: number;
    context: 'CREATE' | 'REPLACEMENT';
    oldCardId?: string;
  }): Promise<void> {
    const existing = await this.prisma.cardCreationAddressBlock.findFirst({
      where: { userId: data.userId, context: data.context, resolvedAt: null },
    });
    if (existing) {
      this.logger.log(`[CardCreationAddressBlock] Deja egziste pou userId=${data.userId} context=${data.context} — pa reenvwaye imèl.`);
      return;
    }
    await this.prisma.cardCreationAddressBlock.create({ data });
    await this.mailService.sendAddressTooShortNotice(data.email, data.name).catch((err: any) => {
      this.logger.error(`[CardCreationAddressBlock] Echèk voye imèl pou ${data.email}: ${err?.message}`);
    });
    this.logger.log(`[CardCreationAddressBlock] Anrejistre + imèl voye pou userId=${data.userId} context=${data.context}`);
  }

  // ─── 1d. CARDKYC "PENDING" — polling asenkwòn (4 oct 2026) ──────────────────
  // Wè kòmantè pi wo nan createAndFundCard()/createReplacementCard() ak
  // schema.prisma (CardCreationPending) pou kontèks konplè.

  private async recordPendingCardCreation(data: {
    userId: string;
    email: string;
    customerId: string;
    name: string;
    amountUsd: number;
    context: 'CREATE' | 'REPLACEMENT';
    totalHtg?: number;
    oldCardId?: string;
    feeDeductedHtg?: number;
  }): Promise<void> {
    await this.prisma.cardCreationPending.create({ data });
    this.logger.log(`[CardCreationPending] Anrejistre id=${data.customerId} userId=${data.userId} context=${data.context} — cardkyc "pending"`);
  }

  private isPollingPendingCardCreations = false;

  @Cron(CronExpression.EVERY_30_SECONDS)
  async pollPendingCardCreations(): Promise<void> {
    if (this.isPollingPendingCardCreations) return;
    this.isPollingPendingCardCreations = true;

    try {
      const pending = await this.prisma.cardCreationPending.findMany({ where: { resolvedAt: null } });
      for (const p of pending) {
        try {
          await this.resolvePendingCardCreation(p);
        } catch (err: any) {
          this.logger.error(`[CardCreationPending] Echèk tcheke id=${p.id}: ${err?.message}`);
        }
      }
    } finally {
      this.isPollingPendingCardCreations = false;
    }
  }

  private async resolvePendingCardCreation(p: CardCreationPending): Promise<void> {
    const statusResponse = await this.nfcGet('cardkycstatus', { email: p.email });
    const kycStatus =
      statusResponse?.data?.status || statusResponse?.response?.status || statusResponse?.status;

    await this.prisma.cardCreationPending.update({ where: { id: p.id }, data: { attempts: { increment: 1 } } });

    if (kycStatus === 'approved') {
      const customerId =
        statusResponse?.data?.customer_id || statusResponse?.response?.customer_id || p.customerId;
      try {
        const cardResponse = await this.nfcPost('create-nfc-card', {
          customer_id: customerId,
          name: p.name,
          amount: String(p.amountUsd),
        });
        const cardId = cardResponse?.response?.card_id || cardResponse?.data?.card_id || cardResponse?.card_id;
        if (!cardId) throw this.strowalletFailure('create-nfc-card pa retounen card_id (background apre pending)');

        if (p.context === 'REPLACEMENT') {
          await this.completeReplacementPendingSuccess(p, cardId);
        } else {
          await this.completeCreatePendingSuccess(p, cardId);
        }
        await this.prisma.cardCreationPending.update({ where: { id: p.id }, data: { resolvedAt: new Date() } });
        this.logger.log(`[CardCreationPending] Rezoud APWOUVE id=${p.id} cardId=${cardId}`);
      } catch (err: any) {
        await this.handlePendingCreationFailure(p, err?.strowalletDetail ?? err?.message ?? 'unknown');
      }
      return;
    }

    if (kycStatus && kycStatus !== 'pending') {
      // Rejte (oswa nenpòt lòt estati final ki pa "approved"/"pending").
      await this.handlePendingCreationFailure(p, `cardkyc status="${kycStatus}" (background poll)`);
      return;
    }

    // Toujou "pending" — alète admin yon sèl fwa si sa depase 1è, san deklare
    // okenn echèk bay kliyan an (sou demand Mr. Greffin, 4 oct 2026).
    const ageMs = Date.now() - p.createdAt.getTime();
    if (ageMs > PENDING_ADMIN_ALERT_AFTER_MS && !p.adminAlertSentAt) {
      const user = await this.prisma.user.findUnique({ where: { id: p.userId }, select: { name: true, email: true } });
      if (user) {
        await this.mailService.sendCardCreationPendingStuckAlert(
          user.email,
          user.name,
          p.userId,
          p.customerId,
          p.context,
          Math.round(ageMs / 60000),
        );
      }
      await this.prisma.cardCreationPending.update({ where: { id: p.id }, data: { adminAlertSentAt: new Date() } });
    }
  }

  private async completeCreatePendingSuccess(p: CardCreationPending, cardId: string): Promise<void> {
    const amountUsd = Number(p.amountUsd);
    const totalHtg = Number(p.totalHtg ?? 0);
    await this.prisma.$transaction(async (tx) => {
      await tx.virtualCard.create({
        data: {
          userId: p.userId,
          cardId,
          balance: amountUsd,
          currency: 'USD',
          provider: 'STROWALLET_NFC',
          status: 'ACTIVE',
        },
      });
      const wallet = await tx.wallet.findUnique({ where: { userId: p.userId } });
      await tx.transaction.create({
        data: {
          senderWalletId: wallet!.id,
          type: 'CARD',
          amount: totalHtg,
          netAmount: totalHtg,
          fee: 0,
          status: 'COMPLETED',
          description: `Kreye kat vityèl NFC — $${amountUsd} (apre verifikasyon "pending")`,
          reference: `CARD-CREATE-${cardId}`,
        },
      });
    });
  }

  private async completeReplacementPendingSuccess(p: CardCreationPending, cardId: string): Promise<void> {
    await this.prisma.virtualCard.create({
      data: {
        userId: p.userId,
        cardId,
        balance: Number(p.amountUsd),
        currency: 'USD',
        provider: 'STROWALLET_NFC',
        status: 'ACTIVE',
      },
    });
    if (p.oldCardId) {
      await this.prisma.virtualCard.update({
        where: { cardId: p.oldCardId },
        data: { status: 'REPLACED', replacedByCardId: cardId },
      });
    }
    const user = await this.prisma.user.findUnique({ where: { id: p.userId }, select: { email: true, name: true } });
    if (user) {
      const feeDeductedHtg = Number(p.feeDeductedHtg ?? 0);
      await this.mailService
        .sendCardReplaced(user.email, user.name ?? 'Kliyan', Number(p.amountUsd), feeDeductedHtg || undefined)
        .catch(() => {});
      const message = feeDeductedHtg > 0
        ? `Kat ranplase, ${feeDeductedHtg} HTG dediwi nan wallet ou pou frè yo`
        : `Kat ou ranplase otomatikman, nouvo balans: $${p.amountUsd}`;
      await this.prisma.notification.create({ data: { userId: p.userId, title: 'Kat ou ranplase', message, type: 'SUCCESS' } }).catch(() => {});
    }
  }

  private async handlePendingCreationFailure(p: CardCreationPending, errorMessage: string): Promise<void> {
    if (p.context === 'CREATE' && p.totalHtg) {
      const totalHtg = Number(p.totalHtg);
      await this.prisma.$transaction(async (tx) => {
        const wallet = await tx.wallet.findUnique({ where: { userId: p.userId } });
        await tx.wallet.update({ where: { userId: p.userId }, data: { balance: { increment: totalHtg } } });
        await tx.transaction.create({
          data: {
            senderWalletId: wallet!.id,
            type: 'CARD',
            amount: totalHtg,
            netAmount: totalHtg,
            fee: 0,
            status: 'FAILED',
            description: `Kreyasyon kat vityèl NFC $${p.amountUsd} ECHWE apre verifikasyon "pending" — renmbi otomatik fèt`,
            reference: `CARD-CREATE-FAIL-${Date.now()}`,
          },
        });
      });
    } else if (p.context === 'REPLACEMENT' && Number(p.feeDeductedHtg ?? 0) > 0) {
      const feeDeductedHtg = Number(p.feeDeductedHtg);
      await this.prisma.$transaction(async (tx) => {
        const wallet = await tx.wallet.findUnique({ where: { userId: p.userId } });
        await tx.wallet.update({ where: { userId: p.userId }, data: { balance: { increment: feeDeductedHtg } } });
        await tx.transaction.create({
          data: {
            senderWalletId: wallet!.id,
            type: 'CARD',
            amount: feeDeductedHtg,
            netAmount: feeDeductedHtg,
            fee: 0,
            status: 'FAILED',
            description: `Frè ranplasman kat vityèl ECHWE apre verifikasyon "pending" — renmbi otomatik fèt`,
            reference: `CARD-REPL-FEE-FAIL-${Date.now()}`,
          },
        });
      });
      if (p.oldCardId) {
        await this.prisma.notification
          .create({
            data: {
              userId: p.userId,
              title: 'Kat ou terminen',
              message: 'Nou rankontre yon pwoblèm pou kreye yon ranplasman otomatik. Tout frè ranbouse, tanpri kreye yon nouvo kat nan app la.',
              type: 'WARNING',
            },
          })
          .catch(() => {});
      }
    }
    await this.recordCardCreationFailure(p.userId, p.email, p.context as 'CREATE' | 'REPLACEMENT', errorMessage);
    await this.prisma.cardCreationPending.update({ where: { id: p.id }, data: { resolvedAt: new Date() } });
  }

  // ─── 2. SECRET DETAILS (nimewo konplè, CVV, dat ekspirasyon) ────────────────

  async getCardSecretDetails(userId: string) {
    const virtualCard = await this.findActiveOrFrozenCard(userId);
    if (!virtualCard) throw new NotFoundException('Ou pa gen yon kat vityèl');

    const data = await this.nfcGet('fetch-nfccard-detail', { card_id: virtualCard.cardId });

    // StroWallet retounen 2 fòma diferan selon kat la (pa gen relasyon ak dat
    // kreyasyon — konfime 2026-08-14: yon kat kreye jodi a te toujou nan
    // ansyen fòma a): swa valè brit (`card_number`/`cvv`) swa lyen iframe
    // sekirize (`card_number_url`/`cvv_url`). Retounen toulede pou fwontyè a
    // ka chwazi ki afichaj li itilize pou chak kat.
    const detail = data?.response?.card_detail;
    return {
      cardNumber: detail?.card_number,
      cvv: detail?.cvv,
      cardNumberUrl: detail?.card_number_url,
      cvvUrl: detail?.cvv_url,
      expiryDate: detail?.expiry,
      cardName: detail?.card_holder_name,
      balance: detail?.balance,
      last4: detail?.last4,
    };
  }

  // ─── 3. FUND CARD (recharje) ─────────────────────────────────────────────────

  async fundVirtualCard(userId: string, amountUsd: number) {
    amountUsd = Number(amountUsd);
    if (!Number.isFinite(amountUsd) || amountUsd < 3 || amountUsd > 500) {
      throw new BadRequestException('Montan dwe ant $3 ak $500');
    }

    const card = await this.findActiveOrFrozenCard(userId);
    if (!card) throw new NotFoundException('Ou pa gen yon kat vityèl');
    if (card.status !== 'ACTIVE') throw new BadRequestException('Kat ou a pa aktif');

    const exchangeRate = await this.getExchangeRate();
    const serviceFeeUsd = this.CARD_RECHARGE_FEE_FLAT_USD + amountUsd * this.CARD_RECHARGE_FEE_PCT;
    const ozamapayFeeUsd = Math.round(amountUsd * this.OZAMAPAY_RECHARGE_FEE_PCT * 100) / 100;
    const totalUsd = amountUsd + serviceFeeUsd + ozamapayFeeUsd;
    const totalHtg = Math.ceil(totalUsd * exchangeRate);
    const ozamapayFeeHtg = Math.round(ozamapayFeeUsd * exchangeRate * 100) / 100;

    const wallet = await this.prisma.wallet.findFirst({ where: { userId } });
    if (!wallet || Number(wallet.balance) < totalHtg) {
      throw new BadRequestException(
        `Balans ennsifizan. Ou bezwen ${totalHtg} HTG (recharge $${amountUsd} + frè sèvis $${serviceFeeUsd.toFixed(2)} + OZAMAPAY $${ozamapayFeeUsd.toFixed(2)})`
      );
    }

    // ── Etap 1: Debi wallet sèlman (transaction 1) ──────────────────────────
    await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: totalHtg } },
      });
    });

    // ── Etap 2: Apèl HTTP Strowallet DEYÒ transaction ────────────────────────
    try {
      await this.nfcPost('fund-withdraw-nfccard', {
        card_id: card.cardId,
        amount: String(amountUsd),
        type: 'fund',
      });
      // ziiropay.com pa gen webhook topup.complete konfime — anrejistre yon
      // chèk atann pou ZiiropayCorrelationService verifye nan 15 min.
      if (this.isRoutedToZiiropay('fund-withdraw-nfccard')) {
        await this.ziiropayCorrelationService
          .recordExpectedFundConfirmation(card.cardId, userId, amountUsd)
          .catch((err: any) => this.logger.error(`[ZiiropayCorrelation] recordExpectedFundConfirmation echwe: ${err.message}`));
      }
    } catch (err) {
      // ── Etap 3: Strowallet echwe → renmbi wallet (NOUVO transaction) ────────
      await this.prisma.$transaction(async (tx) => {
        await tx.wallet.update({
          where: { userId },
          data: { balance: { increment: totalHtg } },
        });
        await tx.transaction.create({
          data: {
            senderWalletId: wallet.id,
            type: 'CARD',
            amount: totalHtg,
            netAmount: Math.ceil(amountUsd * exchangeRate),
            fee: Math.round((serviceFeeUsd + ozamapayFeeUsd) * exchangeRate * 100) / 100,
            status: 'FAILED',
            description: `Recharge kat NFC $${amountUsd} ECHWE — renmbi otomatik fèt`,
            reference: `CARD-FUND-FAIL-${card.cardId}-${Date.now()}`,
          },
        });
      });
      throw err;
    }

    // ── Etap 4: Strowallet siksè → update VirtualCard balance (NOUVO transaction) ──
    await this.prisma.$transaction(async (tx) => {
      await tx.virtualCard.update({
        where: { cardId: card.cardId },
        data: { balance: { increment: amountUsd } },
      });
      await tx.wallet.update({
        where: { userId: this.MASTER_ID },
        data: { balance: { increment: ozamapayFeeHtg } },
      });
      await tx.transaction.create({
        data: {
          senderWalletId: wallet.id,
          type: 'CARD',
          amount: totalHtg,
          netAmount: Math.ceil(amountUsd * exchangeRate),
          fee: Math.round((serviceFeeUsd + ozamapayFeeUsd) * exchangeRate * 100) / 100,
          status: 'COMPLETED',
          description: `Recharge kat NFC $${amountUsd} + frè sèvis $${serviceFeeUsd.toFixed(2)} + OZAMAPAY $${ozamapayFeeUsd.toFixed(2)}`,
          reference: `CARD-FUND-${card.cardId}-${Date.now()}`,
        },
      });
    });

    return { message: `Kat recharje avèk siksè — $${amountUsd} ajoute` };
  }

  // ─── 3b. ADMIN: DIRECT CARD OPERATIONS (no wallet involvement) ──────────────
  // Thin passthroughs to the raw StroWallet endpoints, bypassing the HTG wallet
  // debit/fee logic in fundVirtualCard. For admin/one-off tooling only (e.g.
  // manual goodwill compensations funded by OZAMAPAY, not the customer) — never
  // call these from customer-facing routes.

  async fetchCardDetailByCardId(cardId: string) {
    return this.nfcGet('fetch-nfccard-detail', { card_id: cardId });
  }

  async fundCardDirect(cardId: string, amountUsd: number) {
    return this.nfcPost('fund-withdraw-nfccard', {
      card_id: cardId,
      amount: String(amountUsd),
      type: 'fund',
    });
  }

  // ─── 4. CARD HISTORY ─────────────────────────────────────────────────────────
  // Merged view of real StroWallet card activity (CardTransaction — populated by
  // webhook events) + wallet-side HTG movements (Transaction). Replaces the old
  // call to StroWallet's 'fetch-nfccard-history' endpoint, which no longer exists
  // (confirmed returning an HTML 404 page instead of JSON) — no reason to keep two
  // separate paths for what should be one history list.

  async getCardHistory(userId: string, cardId?: string) {
    const [cardTransactions, walletTransactions] = await Promise.all([
      this.prisma.cardTransaction.findMany({
        where: cardId ? { userId, cardId } : { userId },
        orderBy: { occurredAt: 'desc' },
        take: 100,
      }),
      this.prisma.transaction.findMany({
        where: {
          OR: [{ senderWallet: { userId } }, { receiverWallet: { userId } }],
        },
        include: {
          senderWallet: { include: { user: { select: { name: true, email: true } } } },
          receiverWallet: { include: { user: { select: { name: true, email: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    const merged = [
      ...cardTransactions.map((ct) => ({
        source: 'CARD' as const,
        date: ct.occurredAt,
        id: ct.id,
        cardId: ct.cardId,
        reference: ct.reference,
        type: ct.type,
        amount: Number(ct.amount),
        currency: ct.currency,
        status: ct.status,
        merchant: ct.merchant,
        narrative: ct.narrative,
        mcc: ct.mcc,
        country: ct.country,
      })),
      ...walletTransactions.map((tx) => ({
        source: 'WALLET' as const,
        date: tx.createdAt,
        ...tx,
      })),
    ];

    merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return merged;
  }

  // ─── 5. LOCAL DATA (with live balance sync) ──────────────────────────────────

  async getMyCardLocalData(userId: string) {
    const card = await this.findActiveOrFrozenCard(userId);
    if (!card) return null;

    try {
      const data = await this.nfcGet('fetch-nfccard-detail', { card_id: card.cardId });
      const liveBalance = parseFloat(data?.response?.card_detail?.balance ?? data?.data?.balance);
      if (!isNaN(liveBalance)) {
        return await this.prisma.virtualCard.update({
          where: { cardId: card.cardId },
          data: { balance: liveBalance },
        });
      }
    } catch {
      // Fall back to cached balance if Strowallet is unavailable
    }

    return card;
  }

  // ─── 6. FREEZE / UNFREEZE ────────────────────────────────────────────────────

  async freezeCard(userId: string) {
    const card = await this.findActiveOrFrozenCard(userId);
    if (!card) throw new NotFoundException('Ou pa gen yon kat vityèl');

    await this.nfcGet('freezeactivate-nfc', {
      card_id: card.cardId,
      status: 'frozen',
    });

    if (this.isRoutedToZiiropay('freezeactivate-nfc')) {
      await this.ziiropayCorrelationService
        .recordExpectedStatusChange(card.cardId, userId, 'FREEZE', 'frozen')
        .catch((err: any) => this.logger.error(`[ZiiropayCorrelation] recordExpectedStatusChange echwe: ${err.message}`));
    }

    await this.prisma.virtualCard.update({
      where: { cardId: card.cardId },
      data: { status: 'FROZEN' },
    });

    return { message: 'Kat bloké avèk siksè' };
  }

  async unfreezeCard(userId: string) {
    const card = await this.findActiveOrFrozenCard(userId);
    if (!card) throw new NotFoundException('Ou pa gen yon kat vityèl');

    await this.nfcGet('freezeactivate-nfc', {
      card_id: card.cardId,
      status: 'active',
    });

    if (this.isRoutedToZiiropay('freezeactivate-nfc')) {
      await this.ziiropayCorrelationService
        .recordExpectedStatusChange(card.cardId, userId, 'UNFREEZE', 'active')
        .catch((err: any) => this.logger.error(`[ZiiropayCorrelation] recordExpectedStatusChange echwe: ${err.message}`));
    }

    await this.prisma.virtualCard.update({
      where: { cardId: card.cardId },
      data: { status: 'ACTIVE' },
    });

    return { message: 'Kat reatktive avèk siksè' };
  }
}
