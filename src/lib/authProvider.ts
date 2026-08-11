import type { User } from "@supabase/supabase-js";

/** True when the account has an email/password identity (not Google-only). */
export function isPasswordUser(user: User | null | undefined): boolean {
  if (!user) return false;
  const identities = user.identities ?? [];
  if (identities.length > 0) return identities.some((identity) => identity.provider === "email");
  const providers = (user.app_metadata?.providers as string[] | undefined) ?? [];
  if (providers.length > 0) return providers.includes("email");
  return user.app_metadata?.provider === "email";
}