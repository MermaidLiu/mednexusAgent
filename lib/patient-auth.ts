export function hashPhoneSync(phone: string) {
  const digits = phone.replace(/\D/g, "");
  let h = 2166136261;
  for (let i = 0; i < digits.length; i++) {
    h ^= digits.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `fnv1a-${(h >>> 0).toString(16)}-${digits.slice(-4)}`;
}

export function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return "***";
  return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
}

export function newSessionToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
}

export function isValidCnMobile(phone: string) {
  return /^1\d{10}$/.test(phone.replace(/\D/g, ""));
}

/** 开发/内测验证码；生产应对接短信服务商 */
export function verifyOtp(_phone: string, code: string, devCode?: string) {
  const expected = devCode || "123456";
  return code === expected;
}
