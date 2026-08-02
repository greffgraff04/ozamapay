import { Kyc, User } from '@prisma/client';

/**
 * PREP ONLY — pa konekte ak okenn apèl StroWallet reyèl. Konstwi payload
 * "Create Card Customer" pou nouvo pwodwi backup Mastercard USD la, an
 * atandan konfimasyon StroWallet sou egzat endpoint/otantifikasyon an.
 * Non chan yo (snake_case) se pi bon deviné nou, dapre konvansyon
 * create-nfc-card ki deja egziste — verifye kont vrè dokimantasyon
 * StroWallet lè li disponib, anvan w konekte fonksyon sa a ak yon apèl vrè.
 *
 * Twa desizyon biznis konfime (2026-08-02) — menm apwòch ak flux Visa a:
 *   1. Adrès: toujou adrès biznis fiks OZAMAPAY (Miami), jamè vrè adrès
 *      Kyc kliyan an.
 *   2. Telefòn: nimewo Ayisyen (prefiks 509/+509) ranplase ak yon nimewo
 *      fiks US, menm jan ak Visa. Kèlkeswa nimewo ki itilize, "+" retire
 *      devan l (StroWallet mande fòma san +).
 *   3. ID Back Image: menm imaj ak ID Front Image — nou sèlman kolekte
 *      YON sèl foto ID kounye a. Solisyon tanporè pragmatik, jiskaske
 *      (si janm) yon etap kaptasyon do kat ID ajoute nan flux KYC la.
 */
export interface MastercardCustomerPayload {
  first_name: string;
  last_name: string;
  other_names?: string;
  email: string;
  phone: string;
  dob: string;
  id_type: string;
  id_number: string;
  id_front_image: string;
  id_back_image: string;
  line1: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

// Menm adrès fakti fiks ki deja itilize pou flux Visa NFC live la
// (strowallet.service.ts — createAndFundCard/createReplacementCard) —
// idantik esprè, dapre desizyon biznis #1.
const FIXED_ADDRESS = {
  line1: '3401 N. Miami Ave, Ste 230',
  city: 'Miami',
  state: 'FL',
  postal_code: '33127',
  country: 'USA',
};

const FALLBACK_US_PHONE = '3055550100';

export function mapKycToMastercardCustomer(kyc: Kyc | null, user: User): MastercardCustomerPayload {
  const nameParts = (user.name || 'OZAMA USER').trim().split(' ');
  const firstName = kyc?.firstName || nameParts[0];
  const lastName = kyc?.lastName || nameParts.slice(1).join(' ') || 'USER';

  // Desizyon biznis #2: menm sibstitisyon fo nimewo US pou kliyan Ayisyen.
  const rawPhone = (user.phone && !user.phone.startsWith('509') && !user.phone.startsWith('+509'))
    ? user.phone
    : FALLBACK_US_PHONE;
  const phone = rawPhone.replace(/^\+/, '');

  const dob = kyc?.dateOfBirth
    ? new Date(kyc.dateOfBirth).toLocaleDateString('en-US', {
        month: '2-digit', day: '2-digit', year: 'numeric',
      })
    : '01/01/1990';

  return {
    first_name: firstName,
    last_name: lastName,
    // Pa gen chan "middle name"/"other names" nan Kyc/User — pa gen done
    // sous, kidonk chan opsyonèl sa a rete san valè.
    email: user.email,
    phone,
    dob,
    id_type: kyc?.idType || 'national_id',
    id_number: kyc?.idNumber || '00000000',
    id_front_image: kyc?.idImage || '',
    id_back_image: kyc?.idImage || '', // Desizyon biznis #3: menm imaj ak devan
    ...FIXED_ADDRESS,
  };
}
