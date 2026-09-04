const ITERATIONS = 600_000;
const encoder = new TextEncoder();
const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
export const randomToken = () =>
  hex(crypto.getRandomValues(new Uint8Array(32)));
export async function digestToken(value: string) {
  return hex(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', encoder.encode(value)),
    ),
  );
}
function equal(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++)
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}
async function derive(password: string, salt: string, iterations: number) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const result = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations },
    key,
    256,
  );
  return hex(new Uint8Array(result));
}
export async function hashPassword(password: string) {
  const salt = randomToken();
  return `pbkdf2$${ITERATIONS}$${salt}$${await derive(password, salt, ITERATIONS)}`;
}
export const needsPasswordUpgrade = (hash: string) =>
  !hash.startsWith(`pbkdf2$${ITERATIONS}$`);
export async function verifyPassword(password: string, stored: string) {
  if (stored.startsWith('pbkdf2$')) {
    const parts = stored.split('$');
    const [, count, salt, expected] = parts;
    const iterations = Number(count);
    if (
      parts.length !== 4 ||
      !/^[a-f0-9]{32,64}$/.test(salt ?? '') ||
      !/^[a-f0-9]{64}$/.test(expected ?? '') ||
      !Number.isInteger(iterations) ||
      iterations < 100_000 ||
      iterations > 1_000_000
    )
      return false;
    return equal(await derive(password, salt, iterations), expected);
  }
  // Migração de contas antigas somente após comprovar a senha correta.
  const [salt, expected] = stored.split(':');
  return Boolean(
    salt &&
    expected &&
    equal(await digestToken(`${salt}:${password}`), expected),
  );
}
export function randomCode() {
  let value: number;
  // Rejeição elimina o viés da operação de módulo.
  do {
    value = crypto.getRandomValues(new Uint32Array(1))[0];
  } while (value >= 4_294_000_000);
  return String(value % 1_000_000).padStart(6, '0');
}
export const sessionStorageKey = async (token: string) =>
  `v2:${await digestToken(token)}`;
