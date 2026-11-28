export const COMMISSION_AGENT_KYC = 405; // HTG — komisyon agent pou apwobasyon KYC (ancien modèle, KYC payé avant la bascule)

// Renaissance pricing (KYC gratuit / carte payante) — derrière un flag, false par défaut.
// Quand RENAISSANCE_PRICING_ENABLED=false, le comportement actuel (KYC $25, commission 405 HTG) reste inchangé.
export const RENAISSANCE_PRICING_ENABLED = process.env.RENAISSANCE_PRICING_ENABLED === 'true';
export const CARD_CREATION_FEE_HTG = 1500; // Frè kreyasyon kat, tout kon tou, nouvo modèl
export const CARD_INITIAL_BALANCE_USD = 3; // Solde inisyal kat la apre peman frè kreyasyon an
export const AGENT_FIRST_CARD_COMMISSION_HTG = 200; // Komisyon agent pou premye kat peyan kliyan an

// 25 nov 2026 — kil switch TANPORÈ pou egzijans OTP "nouvo aparèy"
// (purpose=new_device). Defo TRUE (konpòtman jodi a — OTP obligatwa pou
// chak nouvo aparèy) — SÈLMAN valè eksplisit "false" dezaktive l. Absan
// oswa nenpòt lòt valè = konpòtman jodi a rete san chanjman. Wè
// AuthService.login()/completeSocialLogin() pou kote switch la aplike.
// Fonksyon (pa yon const jele) — menm rezon ak isStaging() nan app-env.ts:
// li li process.env chak fwa li rele, pa sèlman yon sèl fwa nan demaraj.
export function isOtpNewDeviceEnabled(): boolean {
  return process.env.OTP_NEW_DEVICE_ENABLED !== 'false';
}
