import { describe, expect, it } from "vitest";
import { ImageFetchError, checkImageBytes, checkImageUrl, fetchImageSafely, isBlockedAddress, sniffImage, type Transport, type TransportResponse } from "./safe-image-fetch";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 73, 72, 68, 82]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70]);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

async function* chunks(...parts: Uint8Array[]) {
  for (const p of parts) yield p;
}

function response(status: number, headers: Record<string, string>, ...body: Uint8Array[]): TransportResponse {
  return { status, headers, body: chunks(...body), cancel: () => {} };
}

/** A fake network: host → addresses, URL → response. Records which IPs were connected to. */
function net(dns: Record<string, string[]>, pages: Record<string, () => TransportResponse>) {
  const connected: string[] = [];
  const resolve = async (host: string) => {
    if (!(host in dns)) throw new Error("ENOTFOUND");
    return dns[host];
  };
  const transport: Transport = async (url, ip) => {
    connected.push(`${ip} ${url.toString()}`);
    const page = pages[url.toString()];
    if (!page) return response(404, {});
    return page();
  };
  return { resolve, transport, connected };
}

async function code(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return "ok";
  } catch (e) {
    return e instanceof ImageFetchError ? e.code : `other: ${(e as Error).message}`;
  }
}

describe("address guard", () => {
  it("blocks loopback, private, link-local / metadata, CGNAT, multicast and reserved IPv4", () => {
    for (const ip of ["127.0.0.1", "127.255.0.9", "10.0.0.1", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "255.255.255.255", "198.18.0.1", "192.0.2.10"]) {
      expect(isBlockedAddress(ip), ip).toBe(true);
    }
  });

  it("blocks the IPv6 equivalents, including IPv4 hidden inside IPv6", () => {
    for (const ip of ["::1", "::", "fc00::1", "fd12:3456::1", "fe80::1", "ff02::1", "::ffff:127.0.0.1", "::ffff:169.254.169.254", "::ffff:a9fe:a9fe", "64:ff9b::10.0.0.1", "2001:db8::1", "::127.0.0.1"]) {
      expect(isBlockedAddress(ip), ip).toBe(true);
    }
  });

  it("allows public addresses and refuses anything unparseable", () => {
    for (const ip of ["93.184.216.34", "1.1.1.1", "172.32.0.1", "2606:4700:4700::1111", "::ffff:93.184.216.34"]) expect(isBlockedAddress(ip), ip).toBe(false);
    for (const ip of ["", "localhost", "1.2.3", "300.1.1.1"]) expect(isBlockedAddress(ip), ip).toBe(true);
  });
});

describe("URL rules", () => {
  it("fetches only plain https URLs on the default port", () => {
    expect(checkImageUrl("https://clinic.example/logo.png").hostname).toBe("clinic.example");
    for (const bad of ["http://clinic.example/logo.png", "ftp://clinic.example/x", "file:///etc/passwd", "https://user:pw@clinic.example/x.png", "https://clinic.example:8443/x.png", "not a url", "javascript:alert(1)"]) {
      expect(() => checkImageUrl(bad), bad).toThrow(ImageFetchError);
    }
  });

  it("refuses local names and private IP literals before any lookup", () => {
    for (const bad of ["https://localhost/x.png", "https://api.localhost/x.png", "https://printer.local/x.png", "https://metadata.google.internal/x", "https://127.0.0.1/x.png", "https://169.254.169.254/latest/meta-data", "https://[::1]/x.png", "https://10.1.2.3/x.png"]) {
      expect(() => checkImageUrl(bad), bad).toThrow(ImageFetchError);
    }
  });
});

describe("fetchImageSafely", () => {
  it("fetches a public PNG once, pinned to the checked address", async () => {
    const n = net({ "clinic.example": ["93.184.216.34"] }, { "https://clinic.example/logo.png": () => response(200, { "content-type": "image/png" }, PNG) });
    const img = await fetchImageSafely("https://clinic.example/logo.png", n);
    expect(img).toMatchObject({ contentType: "image/png", ext: "png" });
    expect(img.bytes).toEqual(PNG);
    expect(n.connected).toEqual(["93.184.216.34 https://clinic.example/logo.png"]);
  });

  it("refuses a host that resolves to a private address — and never connects", async () => {
    const n = net({ "evil.example": ["10.0.0.5"] }, { "https://evil.example/logo.png": () => response(200, { "content-type": "image/png" }, PNG) });
    expect(await code(fetchImageSafely("https://evil.example/logo.png", n))).toBe("blocked");
    expect(n.connected).toEqual([]);
  });

  it("refuses a mixed DNS answer (one public, one private: rebinding)", async () => {
    const n = net({ "rebind.example": ["93.184.216.34", "127.0.0.1"] }, { "https://rebind.example/logo.png": () => response(200, { "content-type": "image/png" }, PNG) });
    expect(await code(fetchImageSafely("https://rebind.example/logo.png", n))).toBe("blocked");
    expect(n.connected).toEqual([]);
  });

  it("refuses the cloud metadata address by name", async () => {
    const n = net({ "meta.example": ["169.254.169.254"] }, {});
    expect(await code(fetchImageSafely("https://meta.example/latest/meta-data/", n))).toBe("blocked");
  });

  it("refuses a redirect to a private address, a private IP literal or plain http", async () => {
    const toPrivateName = net(
      { "clinic.example": ["93.184.216.34"], "internal.example": ["192.168.0.10"] },
      { "https://clinic.example/logo.png": () => response(302, { location: "https://internal.example/admin.png" }) },
    );
    expect(await code(fetchImageSafely("https://clinic.example/logo.png", toPrivateName))).toBe("blocked");
    expect(toPrivateName.connected).toEqual(["93.184.216.34 https://clinic.example/logo.png"]);

    const toLiteral = net({ "clinic.example": ["93.184.216.34"] }, { "https://clinic.example/logo.png": () => response(301, { location: "https://169.254.169.254/latest/meta-data" }) });
    expect(await code(fetchImageSafely("https://clinic.example/logo.png", toLiteral))).toBe("blocked");

    const toHttp = net({ "clinic.example": ["93.184.216.34"] }, { "https://clinic.example/logo.png": () => response(302, { location: "http://clinic.example/logo.png" }) });
    expect(await code(fetchImageSafely("https://clinic.example/logo.png", toHttp))).toBe("url");
  });

  it("follows a few public redirects, then gives up", async () => {
    const ok = net(
      { "clinic.example": ["93.184.216.34"], "cdn.example": ["93.184.216.35"] },
      {
        "https://clinic.example/logo.png": () => response(302, { location: "https://cdn.example/l.png" }),
        "https://cdn.example/l.png": () => response(200, { "content-type": "image/png" }, PNG),
      },
    );
    expect((await fetchImageSafely("https://clinic.example/logo.png", ok)).ext).toBe("png");
    const loop = net({ "clinic.example": ["93.184.216.34"] }, { "https://clinic.example/a.png": () => response(302, { location: "/a.png" }) });
    expect(await code(fetchImageSafely("https://clinic.example/a.png", loop))).toBe("redirects");
  });

  it("refuses something that is not an image (HTML, SVG, a lie about the type)", async () => {
    const n = net(
      { "clinic.example": ["93.184.216.34"] },
      {
        "https://clinic.example/page": () => response(200, { "content-type": "text/html" }, new TextEncoder().encode("<html>")),
        "https://clinic.example/logo.svg": () => response(200, { "content-type": "image/svg+xml" }, SVG),
        "https://clinic.example/fake.png": () => response(200, { "content-type": "image/png" }, SVG),
        "https://clinic.example/swap.png": () => response(200, { "content-type": "image/png" }, JPEG),
      },
    );
    for (const u of ["page", "logo.svg", "fake.png", "swap.png"]) expect(await code(fetchImageSafely(`https://clinic.example/${u}`, n)), u).toBe("type");
  });

  it("refuses an image over 2 MB, by its declared length or while reading", async () => {
    const big = new Uint8Array(1024 * 1024);
    big.set(PNG);
    const n = net(
      { "clinic.example": ["93.184.216.34"] },
      {
        "https://clinic.example/declared.png": () => response(200, { "content-type": "image/png", "content-length": String(3 * 1024 * 1024) }, PNG),
        "https://clinic.example/streamed.png": () => response(200, { "content-type": "image/png" }, big, big, big),
      },
    );
    expect(await code(fetchImageSafely("https://clinic.example/declared.png", n))).toBe("size");
    expect(await code(fetchImageSafely("https://clinic.example/streamed.png", n))).toBe("size");
  });

  it("gives up after the timeout", async () => {
    const slow: Transport = (_u, _ip, signal) =>
      new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true }));
    expect(await code(fetchImageSafely("https://clinic.example/logo.png", { resolve: async () => ["93.184.216.34"], transport: slow, timeoutMs: 30 }))).toBe("timeout");
  });

  it("reports a name that does not resolve and an error status", async () => {
    const n = net({ "clinic.example": ["93.184.216.34"] }, {});
    expect(await code(fetchImageSafely("https://nowhere.example/logo.png", n))).toBe("dns");
    expect(await code(fetchImageSafely("https://clinic.example/missing.png", n))).toBe("status");
  });
});

describe("uploaded bytes", () => {
  it("accepts PNG, JPEG and WebP by their magic bytes, and nothing else", () => {
    expect(sniffImage(PNG)).toBe("image/png");
    expect(sniffImage(JPEG)).toBe("image/jpeg");
    expect(sniffImage(WEBP)).toBe("image/webp");
    expect(sniffImage(SVG)).toBeNull();
    expect(checkImageBytes(JPEG, "image/jpeg").ext).toBe("jpg");
    expect(checkImageBytes(WEBP, null).ext).toBe("webp");
    expect(() => checkImageBytes(SVG, "image/svg+xml")).toThrow(ImageFetchError);
    expect(() => checkImageBytes(PNG, "image/jpeg")).toThrow(ImageFetchError);
    expect(() => checkImageBytes(new Uint8Array(), "image/png")).toThrow(ImageFetchError);
    const big = new Uint8Array(2 * 1024 * 1024 + 1);
    big.set(PNG);
    expect(() => checkImageBytes(big, "image/png")).toThrow(/2 MB/);
  });
});
