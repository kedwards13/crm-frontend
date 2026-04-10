const NOISE_PATTERNS = [
  /^(show|find|list|get|search(?: for)?|pull|give me)\s+/i,
  /\b(customers?|leads?|quotes?|jobs?|appointments?|records?)\b/gi,
  /\b(with|that|who|have|has|where|and|or|for|me|the|all)\b/gi,
];

export function normalizeSmartQuery(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  let normalized = raw;
  NOISE_PATTERNS.forEach((pattern) => {
    normalized = normalized.replace(pattern, " ");
  });

  normalized = normalized.replace(/\s+/g, " ").trim();
  return normalized.length >= 2 ? normalized : raw;
}

