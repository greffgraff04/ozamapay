export const COMMISSION_AGENT_KYC = 405; // HTG — komisyon agent pou apwobasyon KYC (ancien modèle, KYC payé avant la bascule)

// Renaissance pricing (KYC gratuit / carte payante) — derrière un flag, false par défaut.
// Quand RENAISSANCE_PRICING_ENABLED=false, le comportement actuel (KYC $25, commission 405 HTG) reste inchangé.
export const RENAISSANCE_PRICING_ENABLED = process.env.RENAISSANCE_PRICING_ENABLED === 'true';
export const CARD_CREATION_FEE_HTG = 1500; // Frè kreyasyon kat, tout kon tou, nouvo modèl
export const CARD_INITIAL_BALANCE_USD = 3; // Solde inisyal kat la apre peman frè kreyasyon an
export const AGENT_FIRST_CARD_COMMISSION_HTG = 200; // Komisyon agent pou premye kat peyan kliyan an
