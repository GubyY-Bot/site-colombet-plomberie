// Récupère la note, le nombre d'avis et les derniers avis Google de Colombet Plomberie
// puis les enregistre dans avis.json (lu automatiquement par le site).
// Lancé chaque jour par .github/workflows/avis-google.yml
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const KEY = process.env.GOOGLE_PLACES_KEY;
const PLACE_ID = (process.env.PLACE_ID || '').trim();
const QUERY = process.env.PLACE_QUERY || 'Colombet Plomberie Le Cannet';
const FIELDS = ['id', 'displayName', 'rating', 'userRatingCount', 'reviews', 'googleMapsUri'];

// Affiche les erreurs en clair dans le résumé GitHub (sans jamais afficher la clé)
function fail(msg) {
  const clean = String(msg).replaceAll(KEY || '§', '***').replace(/\r?\n/g, ' ').slice(0, 900);
  console.log('::error title=Avis Google::' + clean);
  process.exit(1);
}
process.on('unhandledRejection', e => fail(e?.message || e));
process.on('uncaughtException', e => fail(e?.message || e));

if (!KEY) fail('Secret GOOGLE_PLACES_KEY manquant ou vide : ajoute-le dans Settings > Secrets and variables > Actions.');

async function getPlace() {
  if (PLACE_ID) {
    const r = await fetch(`https://places.googleapis.com/v1/places/${PLACE_ID}?languageCode=fr`, {
      headers: { 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': FIELDS.join(',') }
    });
    if (!r.ok) throw new Error(`Place Details ${r.status} : ${await r.text()}`);
    return r.json();
  }
  const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': KEY,
      'X-Goog-FieldMask': FIELDS.map(f => 'places.' + f).join(',')
    },
    body: JSON.stringify({ textQuery: QUERY, languageCode: 'fr', regionCode: 'FR' })
  });
  if (!r.ok) throw new Error(`Text Search ${r.status} : ${await r.text()}`);
  const data = await r.json();
  const place = (data.places || []).find(p => /colombet/i.test(p.displayName?.text || ''));
  if (!place) throw new Error('Fiche "Colombet" introuvable dans les résultats Google : ' + JSON.stringify(data).slice(0, 500));
  console.log(`Fiche trouvée : ${place.displayName.text} (PLACE_ID = ${place.id})`);
  return place;
}

const place = await getPlace();
if (typeof place.rating !== 'number' || typeof place.userRatingCount !== 'number') {
  throw new Error('Note ou nombre d\'avis absent de la réponse Google.');
}

const reviews = (place.reviews || [])
  .map(rv => ({
    author: rv.authorAttribution?.displayName || 'Client Google',
    rating: rv.rating,
    text: (rv.originalText?.text || rv.text?.text || '').trim(),
    when: rv.relativePublishTimeDescription || '',
    publishTime: rv.publishTime || ''
  }))
  .filter(rv => rv.text);

const out = {
  rating: Math.round(place.rating * 10) / 10,
  count: place.userRatingCount,
  url: place.googleMapsUri || '',
  reviews
};

// N'écrit le fichier que si quelque chose a changé (évite un commit inutile chaque jour)
const before = existsSync('avis.json') ? readFileSync('avis.json', 'utf8') : '';
let prev = null;
try { prev = JSON.parse(before); } catch {}
if (prev) { const { updated, ...rest } = prev; if (JSON.stringify(rest) === JSON.stringify(out)) { console.log('Aucun changement.'); process.exit(0); } }

writeFileSync('avis.json', JSON.stringify({ updated: new Date().toISOString(), ...out }, null, 2) + '\n');
console.log(`avis.json mis à jour : ${out.rating}/5, ${out.count} avis, ${reviews.length} avis récents.`);
