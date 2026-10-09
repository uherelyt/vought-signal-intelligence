// Canonical Altar generational offices. Registry identities are deliberately explicit.
// Source: ELAED Altar active registry and divine-office dossiers, reviewed 2026-10-09.
// Classification is not a genealogical class, political allegiance, or permission grant.
// No name substring matching: unresolved, nondivine, ambiguous and visitor identities stay untagged.
export const OLD_GODS_SHRINE_IDS = new Set([
  'elaed-0d37cf41da24-1', // Adrasteia
  'elaed-567148cedf61-1', // Aether
  'elaed-5744ee101e27-1', // Ah-Muzen-Cab "Honey, Content"  I
  'elaed-78b678a59fd3-1', // Alexiares
  'elaed-0ac0e798fd62-1', // Anicetus
  'elaed-6f8fd1651c99-1', // Aphrodite
  'elaed-e84e672cd9e2-1', // Apollo
  'elaed-e72de5afa3a8-1', // Ares
  'elaed-31907610cee4-1', // Argus "Surveillance" Panoptes
  'elaed-0ff701016574-1', // Ariadne
  'elaed-687cc059b142-1', // Aristaeus
  'elaed-c543de7f76a7-1', // Melissae Artemis
  'elaed-e82597daccde-1', // Asclepius
  'elaed-f9e48451e8e6-1', // Asherah
  'elaed-56fb12e80c9a-1', // Asteria
  'elaed-0efc8dfa53fb-1', // Athena
  'elaed-026332466ab5-1', // Atlas
  'elaed-843a5b499ce9-1', // Austeja
  'elaed-a13ca2eeddc1-1', // Bacabs
  'elaed-9a5a453bfea4-1', // Balder "Shadow Moon"
  'elaed-bfc1ea4bc9e2-1', // Beelzebub
  'elaed-5562ae75c879-1', // Bhramari
  'elaed-f7ab12815c14-1', // Bubilas
  'elaed-163c210e78dd-1', // Cacoch
  'elaed-21518c3799d6-1', // Calliope
  'elaed-6682163ce19f-1', // Calypso
  'elaed-6d5788c3dbc6-1', // Cernunnos
  'elaed-cf194e122c33-1', // Chernobog
  'elaed-04458c464e14-1', // Chronos
  'elaed-50371777f5ef-1', // Clementia "Forgiveness"
  'elaed-9815d49eaf62-1', // Clymene
  'elaed-62e600f8ff57-1', // Coeus
  'elaed-7dc36edb303b-1', // Crius
  'elaed-781910aa4eb5-1', // Cronus
  'elaed-95d09b13ad96-1', // Cyrene
  'elaed-e3756425b5d3-1', // Demeter
  'elaed-8a3151ffc5f6-1', // Dionysus "Acan/Akan, Bacchus, Tygo"
  'elaed-e97a11519716-1', // Echo
  'elaed-e3714367fe10-1', // Eileithyia
  'elaed-f2fea6707c0c-1', // Erebus
  'elaed-e44375c2d331-1', // Eros
  'elaed-16507b1f6fa6-1', // Eurybia
  'elaed-4f46587c889a-1', // Fates "Norns"
  'elaed-aaeff4756367-1', // Freyja "Frigga"
  'elaed-be57dfe49fe0-1', // Gaia
  'elaed-384777a1f715-1', // Hades
  'elaed-e44b60c6fa63-1', // Hebe
  'elaed-3ee4cfca2656-1', // Hecate "Mother Goddess, Triple Goddess"
  'elaed-2aaa90c80636-1', // Hemera
  'elaed-f0e80af825e6-1', // Hephaestus
  'elaed-01a159fb680c-1', // Hera
  'elaed-8985228f325b-1', // Heracles
  'elaed-6a2c2d1ab362-1', // Hermod
  'elaed-d3c59bed7044-1', // Hestia
  'elaed-4a4464c53ee3-1', // Himavan
  'elaed-91a7687d6d33-1', // Hyperion
  'elaed-b211eb432e4a-1', // Iapetus
  'elaed-6549241cd0ad-1', // Ida
  'elaed-9f94c4d79de3-1', // Ixchel
  'elaed-717e641834f8-1', // Khaos "The Empty, Sheol, Nun/Naunet, Amatsu-Mikaboshi, Ginnungagap"
  'elaed-6f3046917e44-1', // Kore
  'elaed-1e1527c41c65-1', // Leto
  'elaed-316b9e93250a-1', // Lilith
  'elaed-3ba266b5789c-1', // Melisseus
  'elaed-5190d47b71d5-1', // Mellona
  'elaed-718dcb5fe698-1', // Metis "Ingenuity"
  'elaed-a0cb6e684b03-1', // Mnemosyne
  'elaed-1f9f1f021947-1', // Muses
  'elaed-c26aa32aca44-1', // Nyx "Night"
  'elaed-6e71b0fc2278-1', // Oceanus
  'elaed-4f37b1bb50b1-1', // Odin Borson Borson
  'elaed-198c442dc68f-1', // Oneiros
  'elaed-036a70d5f01e-1', // Oshun
  'elaed-dc715044f6de-1', // Ostara "Easter"
  'elaed-91f01736b886-1', // Ourea
  'elaed-d501a406cb91-1', // Persephone
  'elaed-8e76be7f21cb-1', // Perses
  'elaed-6da0dea9ea3d-1', // Phoebe
  'elaed-0083351b054a-1', // Pontus
  'elaed-15d581c5a882-1', // Poseidon
  'elaed-7825c752fe4f-1', // Pothos "Desire of The Endless"
  'elaed-d607b73b61cf-1', // Psyche
  'elaed-9820b1afc626-1', // Ra
  'elaed-03b346c1654b-1', // Rhea
  'elaed-b73d1f92ab93-1', // Princess Semele
  'elaed-aa4f94b07434-1', // Set
  'elaed-068cc8e08bba-1', // Shakti "Parvati"
  'elaed-92bbfd10e020-1', // Sigyn
  'elaed-70e3c6a91f1f-1', // Tartarus
  'elaed-648253d269dd-1', // Tethys
  'elaed-238bc73ad94f-1', // Theia
  'elaed-6bb2ebaf3445-1', // Themis
  'elaed-170405f6d286-1', // Tyr
  'elaed-6eddced0befd-1', // Uranus
  'elaed-a239c77904a7-1', // Vali
  'elaed-977c6d013959-1', // Vidar
  'elaed-3836c9e3a085-1', // Yahweh "God The Father, Presence, Obatala, Itzamna"
  'elaed-c51cf3c899b2-1', // Yemaya "Yemoja"
  'elaed-150c8cbce612-1', // Zagreus
  'elaed-4e8a1a89c727-1', // Zeus
  'elaed-1509d4eed46b-1', // Colel Cab
  'elaed-387782dd51b0-1', // Jesus "God The Son" Christ
  'elaed-f759f8f3c636-1', // Loki "Ikol" Laufeyson
  'elaed-38e77d54e3ab-1', // Thor Odinson
  'elaed-9c60a1681039-1', // Zorya "Midnight Star" Polunochnaya
]);

export const NEW_GODS_SHRINE_IDS = new Set([
  'elaed-5744ee101e27-1', // Ah-Muzen-Cab "Honey, Content"  I
  'elaed-31907610cee4-1', // Argus "Surveillance" Panoptes
  'elaed-b0d92e8fd8e4-1', // Media
  'elaed-4c0d5a0f8de3-1', // New-Media "Social Media"
  'elaed-9320fa08467d-1', // Technical-Boy "Internet, Technology"
  'elaed-756477f6949c-1', // Mr. World
]);

// Ah-Muzen-Cab's ancient hive and modern content offices coexist.
// Argus Panoptes carries ancient many-eyed and modern surveillance offices.
// Others are added only when their own canonical dossiers explicitly establish a generation.
export function divineGenerationTags(figure) {
  if (!figure?.id || figure.shrineEligible === false) return [];
  return [
    ...(OLD_GODS_SHRINE_IDS.has(figure.id) ? ['Old Gods'] : []),
    ...(NEW_GODS_SHRINE_IDS.has(figure.id) ? ['New Gods'] : []),
  ];
}
