const DEFAULT_MAX_LIMIT = Number(process.env.API_MAX_LIST_LIMIT || 0);

const parsePositiveInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const applyOptionalLimit = (query, rawLimit, fallback = DEFAULT_MAX_LIMIT) => {
  const requestedLimit = parsePositiveInt(rawLimit);
  const safeFallback = parsePositiveInt(fallback);
  const resolvedLimit = requestedLimit || safeFallback;
  if (resolvedLimit) {
    query.limit(resolvedLimit);
  }
  return query;
};

module.exports = {
  applyOptionalLimit,
};
