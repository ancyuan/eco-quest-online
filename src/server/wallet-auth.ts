import { createServerFn } from "@tanstack/react-start";
import { verifyMessage, isAddress, getAddress } from "viem";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function walletEmail(address: string): string {
  return `${address.toLowerCase()}@wallet.coredao.local`;
}

function walletPassword(address: string): string {
  // Deterministic password derived from service role + address.
  // Service role key never leaves the server. Users never use this password directly.
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  // Simple non-cryptographic mix is fine: it's only used to authenticate a user
  // whose identity we just verified via signature. Length must satisfy Supabase min.
  return `core-wallet:${address.toLowerCase()}:${secret.slice(-24)}`;
}

export const walletSignIn = createServerFn({ method: "POST" })
  .inputValidator((input: { address: string; message: string; signature: string }) => {
    if (!input || typeof input !== "object") throw new Error("Invalid input");
    if (!isAddress(input.address)) throw new Error("Invalid wallet address");
    if (typeof input.message !== "string" || input.message.length < 32 || input.message.length > 2000) {
      throw new Error("Invalid message");
    }
    if (typeof input.signature !== "string" || !/^0x[0-9a-fA-F]+$/.test(input.signature)) {
      throw new Error("Invalid signature format");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const address = getAddress(data.address).toLowerCase();

    // Validate message structure & freshness
    const lines = data.message.split("\n");
    const issuedAtLine = lines.find((l) => l.startsWith("Issued At: "));
    const chainIdLine = lines.find((l) => l.startsWith("Chain ID: "));
    if (!issuedAtLine || !chainIdLine) throw new Error("Malformed sign-in message");
    if (chainIdLine !== "Chain ID: 1116") throw new Error("Wrong chain — expected CORE (1116)");
    const issuedAt = new Date(issuedAtLine.replace("Issued At: ", "").trim());
    const ageMs = Date.now() - issuedAt.getTime();
    if (!Number.isFinite(ageMs) || ageMs < -60_000 || ageMs > 5 * 60_000) {
      throw new Error("Sign-in message expired — please try again");
    }
    if (!data.message.toLowerCase().includes(address)) {
      throw new Error("Address mismatch in message");
    }

    // Verify the signature
    const valid = await verifyMessage({
      address: getAddress(data.address),
      message: data.message,
      signature: data.signature as `0x${string}`,
    });
    if (!valid) throw new Error("Invalid signature");

    const email = walletEmail(address);
    const password = walletPassword(address);

    // Try sign-in first; if user doesn't exist, create then sign in.
    let session = await supabaseAdmin.auth.signInWithPassword({ email, password });
    if (session.error) {
      const created = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          wallet_address: address,
          provider: "core_wallet",
          display_name: `${address.slice(0, 6)}…${address.slice(-4)}`,
        },
      });
      if (created.error && !created.error.message.toLowerCase().includes("already")) {
        throw new Error(`Could not create wallet account: ${created.error.message}`);
      }
      session = await supabaseAdmin.auth.signInWithPassword({ email, password });
      if (session.error) throw new Error(session.error.message);
    }

    if (!session.data.session) throw new Error("Failed to create session");

    return {
      access_token: session.data.session.access_token,
      refresh_token: session.data.session.refresh_token,
      address,
    };
  });