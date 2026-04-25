import { toast } from "sonner";

export const CORE_CHAIN = {
  chainId: "0x45c", // 1116
  chainName: "Core Blockchain",
  nativeCurrency: { name: "CORE", symbol: "CORE", decimals: 18 },
  rpcUrls: ["https://rpc.coredao.org"],
  blockExplorerUrls: ["https://scan.coredao.org"],
};

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
};

function getProvider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eth = (window as any).ethereum as Eip1193Provider | undefined;
  return eth ?? null;
}

export async function ensureCoreNetwork(): Promise<void> {
  const provider = getProvider();
  if (!provider) throw new Error("No Web3 wallet detected. Install MetaMask or a compatible wallet.");
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CORE_CHAIN.chainId }] });
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 4902 || code === -32603) {
      await provider.request({ method: "wallet_addEthereumChain", params: [CORE_CHAIN] });
    } else {
      throw err;
    }
  }
}

export async function connectWallet(): Promise<string> {
  const provider = getProvider();
  if (!provider) {
    toast.error("No Web3 wallet detected");
    throw new Error("No Web3 wallet detected");
  }
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts?.length) throw new Error("No account returned by wallet");
  return accounts[0].toLowerCase();
}

export async function signMessage(address: string, message: string): Promise<string> {
  const provider = getProvider();
  if (!provider) throw new Error("No Web3 wallet detected");
  const sig = (await provider.request({
    method: "personal_sign",
    params: [message, address],
  })) as string;
  return sig;
}

export function buildSiweMessage(params: {
  address: string;
  nonce: string;
  domain: string;
  uri: string;
  issuedAt: string;
}): string {
  const { address, nonce, domain, uri, issuedAt } = params;
  return [
    `${domain} wants you to sign in with your Core Blockchain account:`,
    address,
    "",
    "Sign in to Forest Guardian using your CORE wallet.",
    "",
    `URI: ${uri}`,
    `Version: 1`,
    `Chain ID: 1116`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join("\n");
}