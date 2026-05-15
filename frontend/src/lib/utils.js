import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getIpfsUrl(cid) {
  if (!cid) return "";
  const trimmed = String(cid).trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://ipfs.io/ipfs/${trimmed}`;
}

export function getIpfsViewUrl(cid, localGatewayUrl) {
  if (!cid) return "";
  const trimmed = String(cid).trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (localGatewayUrl) {
    return `${String(localGatewayUrl).replace(/\/$/, "")}/${trimmed}`;
  }
  return `https://ipfs.io/ipfs/${trimmed}`;
}

export async function openIpfsUrl(cid, localGatewayUrl) {
  const url = getIpfsViewUrl(cid, localGatewayUrl);
  if (!url) return { ok: false, url, error: "No CID provided" };

  try {
    const response = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
    });
    if (response.type === "opaque" || response.ok) {
      window.open(url, "_blank");
      return { ok: true, url };
    }
    throw new Error("IPFS content temporarily unavailable");
  } catch (error) {
    return { ok: false, url, error: error?.message || "IPFS content temporarily unavailable" };
  }
}
