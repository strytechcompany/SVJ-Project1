let cloudinaryLib = null;
try {
  // Optional dependency: backend still works if cloudinary package/env is missing.
  // eslint-disable-next-line global-require
  cloudinaryLib = require("cloudinary");
} catch (_) {
  cloudinaryLib = null;
}

const isInvalidImageToken = (raw) => {
  const token = String(raw || "").trim().toLowerCase();
  return (
    !token ||
    token === "null" ||
    token === "undefined" ||
    token === "n/a" ||
    token === "[object object]"
  );
};

const readImageField = (value) => {
  if (!value) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (isInvalidImageToken(trimmed)) return "";
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
      (trimmed.startsWith("\"") && trimmed.endsWith("\""))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        const nested = readImageField(parsed);
        if (nested) return nested;
      } catch (_) {}
    }
    return isInvalidImageToken(trimmed) ? "" : trimmed;
  }
  if (Array.isArray(value)) {
    for (const row of value) {
      const nested = readImageField(row);
      if (nested) return nested;
    }
    return "";
  }
  if (typeof value !== "object") return "";
  const candidates = [
    value.uri,
    value.url,
    value.path,
    value.src,
    value.fileUri,
    value.sourceURL,
    value.receiptImage,
    value.proofImage,
    value.image,
    value.base64,
    value.data,
    value.assets,
    value.images,
    value.files,
  ];
  for (const candidate of candidates) {
    const nested = readImageField(candidate);
    if (nested) return nested;
  }
  return "";
};

const isHttpUrl = (value) => /^https?:\/\//i.test(String(value || "").trim());
const isDeviceUri = (value) =>
  /^(file|content|ph):\/\//i.test(String(value || "").trim());

const toCloudinaryUploadPayload = (rawImage) => {
  let image = readImageField(rawImage);
  if (!image) return "";

  try {
    if (image.includes("%2F") || image.includes("%3A") || image.includes("%2B")) {
      image = decodeURIComponent(image);
    }
  } catch (_) {}

  const compact = String(image).replace(/\s+/g, "");
  if (compact.startsWith("data:image/")) return compact;
  if (compact.startsWith("data:") && compact.includes(";base64,")) {
    const base64Part = compact.split(";base64,")[1] || "";
    return base64Part ? `data:image/jpeg;base64,${base64Part}` : "";
  }
  if (/^[A-Za-z0-9+/_=\r\n-]+$/.test(compact) && compact.length > 100) {
    return `data:image/jpeg;base64,${compact}`;
  }
  // Already a URL/device path/relative path
  return image;
};

const getCloudinaryClient = () => {
  if (!cloudinaryLib?.v2) return null;
  const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
  const apiKey = String(process.env.CLOUDINARY_API_KEY || "").trim();
  const apiSecret = String(process.env.CLOUDINARY_API_SECRET || "").trim();
  if (!cloudName || !apiKey || !apiSecret) return null;

  cloudinaryLib.v2.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
  return cloudinaryLib.v2;
};

const storeImage = async (rawImage, options = {}) => {
  const prepared = toCloudinaryUploadPayload(rawImage);
  if (!prepared) return "";
  if (isHttpUrl(prepared) || isDeviceUri(prepared)) return prepared;
  if (!prepared.startsWith("data:image/")) return prepared;

  const cloud = getCloudinaryClient();
  if (!cloud) return prepared;

  const folder = String(options.folder || "ntj").trim();
  const uploaded = await cloud.uploader.upload(prepared, {
    folder,
    resource_type: "image",
  });
  return String(uploaded?.secure_url || uploaded?.url || "").trim() || prepared;
};

const resolveImageFields = async (body = {}, options = {}) => {
  const source =
    readImageField(body?.receiptImage) ||
    readImageField(body?.proofImage) ||
    readImageField(body?.image) ||
    "";
  if (!source) return {};
  const stored = await storeImage(source, options);
  if (!stored) return {};
  return {
    receiptImage: stored,
    proofImage: stored,
    image: stored,
  };
};

module.exports = {
  readImageField,
  isHttpUrl,
  storeImage,
  resolveImageFields,
};

