/**
 * IndexNow (https://www.indexnow.org): tells Bing, Yandex, Seznam, Naver and
 * other participating engines that pages changed, without an account. The key
 * is public by design — ownership is proven by serving it at
 * https://dentvideo.com/<key>.txt (app/dentvideo/<key>.txt/route.ts).
 *
 * Submit with: node scripts/indexnow.mjs (see the script for options).
 * Changing the key means renaming that route folder and the constant in the
 * script too; a test keeps the three in step.
 */
export const INDEXNOW_KEY = "e6b765322de3360e21f7c4e8fb3c2c40";
export const INDEXNOW_KEY_URL = `https://dentvideo.com/${INDEXNOW_KEY}.txt`;
