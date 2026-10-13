import * as Crypto from "expo-crypto";

// Hermes (iOS/Android) hat kein WebCrypto. Supabase braucht es für den
// sicheren Anmelde-Ablauf (PKCE): echten Zufall und SHA-256. Ohne diese
// Brücke fiele es auf Math.random und die ungehashte Variante zurück.

type Digest = (algorithmus: string | { name: string }, daten: BufferSource) => Promise<ArrayBuffer>;
type KryptoGlobal = { getRandomValues?: <T extends ArrayBufferView | null>(feld: T) => T; subtle?: { digest?: Digest } };

const g = globalThis as unknown as { crypto?: KryptoGlobal };
if (!g.crypto) g.crypto = {};
const k = g.crypto;

if (typeof k.getRandomValues !== "function") {
  k.getRandomValues = (feld) => {
    if (feld) Crypto.getRandomValues(feld as unknown as Uint8Array);
    return feld;
  };
}

if (!k.subtle || typeof k.subtle.digest !== "function") {
  const ALGORITHMEN: Record<string, Crypto.CryptoDigestAlgorithm> = {
    "SHA-1": Crypto.CryptoDigestAlgorithm.SHA1,
    "SHA-256": Crypto.CryptoDigestAlgorithm.SHA256,
    "SHA-384": Crypto.CryptoDigestAlgorithm.SHA384,
    "SHA-512": Crypto.CryptoDigestAlgorithm.SHA512,
  };
  k.subtle = {
    ...k.subtle,
    digest: (algorithmus, daten) => {
      const name = typeof algorithmus === "string" ? algorithmus : algorithmus.name;
      const a = ALGORITHMEN[name.toUpperCase()];
      if (!a) return Promise.reject(new Error(`Nicht unterstützt: ${name}`));
      return Crypto.digest(a, daten);
    },
  };
}
