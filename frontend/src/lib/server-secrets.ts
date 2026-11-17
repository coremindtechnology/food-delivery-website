export function getServerSecret(name: string, developmentFallback: string): string {
  const secret = process.env[name];
  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error(`${name} must be configured in production.`);
  }

  return developmentFallback;
}