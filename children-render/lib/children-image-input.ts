export type ChildrenDiscordImageAttachment = {
  id: string;
  filename: string;
  url: string;
  contentType?: string;
  size?: number;
  width?: number;
  height?: number;
};

export type ChildrenGeminiImagePart = {
  inlineData: {
    mimeType: string;
    data: string;
  };
};

export const CHILDREN_SUPPORTED_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export const CHILDREN_MAX_IMAGES_PER_MESSAGE = 2;
export const CHILDREN_MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type ChildrenDiscordImageFile = {
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
};

async function fetchChildrenDiscordImage(
  attachment: ChildrenDiscordImageAttachment,
): Promise<ChildrenDiscordImageFile | null> {
  if (!isChildrenDiscordImageAttachmentSupported(attachment)) return null;
  try {
    const response = await fetch(attachment.url, {
      method: "GET",
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
      headers: { "user-agent": "Vought-Children-Discord-Vision/1.0" },
    });
    if (!response.ok) return null;

    const mimeType =
      normalizedMime(response.headers.get("content-type")) ||
      normalizedMime(attachment.contentType);
    if (!SUPPORTED_MIME_TYPES.has(mimeType)) return null;

    const declared = Number(response.headers.get("content-length") ?? "0");
    if (Number.isFinite(declared) && declared > CHILDREN_MAX_IMAGE_BYTES) return null;

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.byteLength || bytes.byteLength > CHILDREN_MAX_IMAGE_BYTES) return null;

    return {
      filename: attachment.filename,
      mimeType,
      bytes,
    };
  } catch {
    return null;
  }
}

export async function loadChildrenDiscordImageFiles(
  attachments: ChildrenDiscordImageAttachment[] = [],
): Promise<ChildrenDiscordImageFile[]> {
  const candidates = attachments
    .filter(isChildrenDiscordImageAttachmentSupported)
    .slice(0, CHILDREN_MAX_IMAGES_PER_MESSAGE);
  const files: ChildrenDiscordImageFile[] = [];
  for (const attachment of candidates) {
    const file = await fetchChildrenDiscordImage(attachment);
    if (file) files.push(file);
  }
  return files;
}


const SUPPORTED_MIME_TYPES = new Set<string>(CHILDREN_SUPPORTED_IMAGE_MIME_TYPES);
const SUPPORTED_EXTENSIONS = /\.(?:png|jpe?g|webp|heic|heif)$/i;
const DISCORD_IMAGE_HOSTS = new Set(["cdn.discordapp.com", "media.discordapp.net"]);

function normalizedMime(value?: string | null) {
  return value?.split(";")[0]?.trim().toLowerCase() ?? "";
}

export function isChildrenDiscordImageAttachmentSupported(
  attachment: ChildrenDiscordImageAttachment,
) {
  if (!attachment?.url || !attachment?.filename) return false;
  let parsed: URL;
  try {
    parsed = new URL(attachment.url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" || !DISCORD_IMAGE_HOSTS.has(parsed.hostname)) return false;
  if (typeof attachment.size === "number" && attachment.size > CHILDREN_MAX_IMAGE_BYTES) return false;
  const mime = normalizedMime(attachment.contentType);
  return SUPPORTED_MIME_TYPES.has(mime) || (!mime && SUPPORTED_EXTENSIONS.test(attachment.filename));
}

export async function loadChildrenDiscordImages(
  attachments: ChildrenDiscordImageAttachment[] = [],
): Promise<ChildrenGeminiImagePart[]> {
  const files = await loadChildrenDiscordImageFiles(attachments);
  return files.map((file) => ({
    inlineData: {
      mimeType: file.mimeType,
      data: Buffer.from(file.bytes).toString("base64"),
    },
  }));
}
