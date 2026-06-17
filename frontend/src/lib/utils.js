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
  // Default to local gateway if no localGatewayUrl provided
  const gateway = localGatewayUrl || "http://127.0.0.1:8080/ipfs";
  return `${String(gateway).replace(/\/$/, "")}/${trimmed}`;
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
    // If local gateway fails, try fallback to ipfs.io
    if (url.includes("127.0.0.1:8080")) {
      const fallbackUrl = `https://ipfs.io/ipfs/${String(cid).trim()}`;
      try {
        const fallbackResponse = await fetch(fallbackUrl, {
          method: "HEAD",
          cache: "no-store",
        });
        if (fallbackResponse.type === "opaque" || fallbackResponse.ok) {
          window.open(fallbackUrl, "_blank");
          return { ok: true, url: fallbackUrl, usingFallback: true };
        }
      } catch (fallbackError) {
        // Both failed
      }
    }
    return { ok: false, url, error: "IPFS daemon not running locally. Please start IPFS daemon to view content." };
  }
}
