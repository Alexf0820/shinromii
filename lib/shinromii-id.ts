let fallbackCounter = 0;

function nextFallbackCounter() {
  fallbackCounter = (fallbackCounter + 1) % Number.MAX_SAFE_INTEGER;
  return fallbackCounter;
}

function fallbackSegment() {
  const counter = nextFallbackCounter().toString(36);
  const timestamp = Date.now().toString(36);
  const random = Math.floor(Math.random() * 0xffffffff)
    .toString(36)
    .padStart(7, "0");

  return `${timestamp}-${counter}-${random}`;
}

export function createShinromiiId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${prefix}-${fallbackSegment()}`;
}
