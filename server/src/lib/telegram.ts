import crypto from "node:crypto";

/**
 * Validates Telegram Mini App initData per
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateTelegramInitData(initData: string, botToken: string): boolean {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return false;
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const computed = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  return computed === hash;
}

export function parseInitDataUser(initData: string): {
  id: bigint;
  username?: string;
  first_name?: string;
  last_name?: string;
} | null {
  const params = new URLSearchParams(initData);
  const userJson = params.get("user");
  if (!userJson) return null;
  try {
    const user = JSON.parse(userJson) as {
      id: number;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
    return {
      id: BigInt(user.id),
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
    };
  } catch {
    return null;
  }
}
