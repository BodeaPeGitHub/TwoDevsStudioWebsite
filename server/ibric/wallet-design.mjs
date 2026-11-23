export const WALLET_STYLE = { background: '#233DA4', version: 'v2' };
const translated = value => ({ defaultValue: { language: 'ro-RO', value } });
const image = (uri, description) => ({ sourceUri: { uri }, contentDescription: translated(description) });
const assetBase = value => new URL(value).href.replace(/\/$/, '');
export function walletPresentation(member, assetOrigin, brand = { slug: 'ibric' }) {
  const threshold = member.rewardThreshold;
  const count = Math.max(0, member.stampCount);
  const remaining = Math.max(0, threshold - count);
  const earned = count >= threshold;
  const fields = {
    loyaltyPoints: { label: 'Cafele adunate', balance: { int: count } },
    secondaryLoyaltyPoints: { label: 'Până la gratuită', balance: { int: remaining } },
    textModulesData: [
      { id: `${brand.slug}-target`, header: 'PRAG RECOMPENSĂ', body: String(threshold) },
      { id: `${brand.slug}-progress`, header: 'CAFELE ADUNATE', body: `${count} / ${threshold}` },
      { id: `${brand.slug}-remaining`, header: earned ? 'RECOMPENSA TA' : 'PÂNĂ LA GRATUITĂ', body: earned ? 'O cafea gratuită!' : `${remaining} ${remaining === 1 ? 'cafea' : 'cafele'}` },
      { id: 'reward-rule', header: 'Ritualul tău, răsplătit.', body: `Cumpără ${threshold} cafele și primești următoarea cafea din partea noastră. Arată QR-ul baristei la fiecare comandă. Numărătoarea se reia după folosirea recompensei.` },
    ],
  };
  if (assetOrigin) fields.heroImage = image(`${assetBase(assetOrigin)}/art/v2/stamps-${threshold}-${Math.min(count,threshold)}.png`, earned ? 'Toate ștampilele adunate. Cafeaua gratuită este disponibilă.' : `${count} din ${threshold} ștampile adunate; ultima ceașcă reprezintă cafeaua gratuită.`);
  return fields;
}
export function walletClassDesign(assetOrigin, brand = { slug: 'ibric', brand: 'IBRIC', name: 'IBRIC Coffee Club', background: WALLET_STYLE.background }) {
  const field = path => ({ firstValue: { fields: [{ fieldPath: path }] } });
  const result = {
    issuerName: brand.brand, programName: brand.name,
    localizedIssuerName: translated(brand.brand), localizedProgramName: translated(brand.name),
    hexBackgroundColor: brand.background,
    reviewStatus: 'UNDER_REVIEW',
    classTemplateInfo: { cardTemplateOverride: { cardRowTemplateInfos: [
      { twoItems: {
        startItem: { ...field('object.loyaltyPoints.balance'), secondValue: field(`object.textModulesData['${brand.slug}-target']`).firstValue },
        endItem: field('object.secondaryLoyaltyPoints.balance'),
      } },
    ] } },
  };
  if (assetOrigin) {
    const base = `${assetBase(assetOrigin)}/art/v2`;
    result.programLogo = image(`${base}/logo.png`, `Logoul ${brand.brand}`);
    result.wideProgramLogo = image(`${base}/wide-logo.png`, brand.name);
  }
  return result;
}
