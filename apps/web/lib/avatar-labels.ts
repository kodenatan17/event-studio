import type { BodyType, SkinToneId, Slot } from '@undangan/world-engine';

/** Indonesian labels for the avatar editor; the wardrobe holds ids only (D-010 pattern). */
export const BODY_LABELS: Readonly<Record<BodyType, string>> = {
  pria: 'Pria',
  wanita: 'Wanita',
};

export const SKIN_LABELS: Readonly<Record<SkinToneId, string>> = {
  langsat: 'Langsat',
  kuning: 'Kuning',
  'sawo-terang': 'Sawo terang',
  'sawo-matang': 'Sawo matang',
  cokelat: 'Cokelat',
};

export const SLOT_LABELS: Readonly<Record<Slot, string>> = {
  hair: 'Rambut',
  headwear: 'Penutup kepala',
  top: 'Atasan',
  bottom: 'Bawahan',
  selendang: 'Selendang',
  shoes: 'Alas kaki',
  earrings: 'Anting',
  glasses: 'Kacamata',
  bag: 'Tas',
  brooch: 'Bros',
};

const ITEM_LABELS: Readonly<Record<string, string>> = {
  'belah-samping': 'Belah samping',
  rapi: 'Rapi',
  ikal: 'Ikal',
  'sanggul-ukel': 'Sanggul ukel',
  'sanggul-cepol': 'Sanggul cepol',
  'sanggul-tekuk': 'Sanggul tekuk',
  peci: 'Peci',
  'blangkon-solo': 'Blangkon Solo',
  'blangkon-yogya': 'Blangkon Yogya',
  iket: 'Iket',
  hijab: 'Hijab',
  beskap: 'Beskap',
  'batik-panjang': 'Batik lengan panjang',
  'batik-pendek': 'Batik lengan pendek',
  'kebaya-kutubaru': 'Kebaya kutubaru',
  'kebaya-brokat': 'Kebaya brokat',
  jarik: 'Jarik',
  celana: 'Celana',
  selendang: 'Selendang',
  selop: 'Selop',
  loafer: 'Loafer',
  heels: 'Sepatu hak',
  anting: 'Anting',
  kacamata: 'Kacamata',
  tas: 'Tas',
  bros: 'Bros',
};

const VARIANT_LABELS: Readonly<Record<string, string>> = {
  hitam: 'Hitam',
  krem: 'Krem',
  hijau: 'Hijau',
  marun: 'Marun',
  navy: 'Navy',
  sogan: 'Sogan',
  parang: 'Parang',
  kawung: 'Kawung',
  truntum: 'Truntum',
  cokelat: 'Cokelat',
  nude: 'Nude',
  emas: 'Emas',
  'merah-muda': 'Merah muda',
  biru: 'Biru',
  putih: 'Putih',
};

function lookup(labels: Readonly<Record<string, string>>, id: string): string {
  return Object.hasOwn(labels, id) ? (labels[id] ?? id) : id;
}

export const itemLabel = (id: string): string => lookup(ITEM_LABELS, id);
export const variantLabel = (id: string): string => lookup(VARIANT_LABELS, id);
