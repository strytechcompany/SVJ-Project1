// -------------------------------
// Number parser (removes symbols)
// -------------------------------
export const parseNum = (v) => {
  const n = Number(String(v).replace(/[^0-9.-]+/g, ""));
  return isNaN(n) ? 0 : n;
};

// -------------------------------
// PRODUCT CALCULATION (Pure)
// (weight - stone) * (touch / 100)
// -------------------------------
export const calcPure = (w, s, t) => {
  const W = parseNum(w);
  const S = parseNum(s);
  const T = parseNum(t);

  const net = Math.max(0, W - S);
  const pure = net * (T / 100);

  return Number(pure.toFixed(3));
};

// -------------------------------
// PRODUCT: Cash pure (rupees / goldRate)
// -------------------------------
export const computeCashPure = (r, rate) => {
  const R = parseNum(r);
  const G = parseNum(rate);

  if (G <= 0) return 0;

  return Number((R / G).toFixed(3));
};

// -------------------------------
// SUM CALCULATIONS
// -------------------------------
export const sumIssuePure = (items) =>
  items.reduce((acc, it) => acc + Number(it.purity || 0), 0);

export const sumIssueWeight = (items) =>
  items.reduce((acc, it) => acc + Number(it.weight || 0), 0);

export const sumReceiptPure = (items) =>
  items.reduce((acc, it) => acc + Number(it.purity || 0), 0);

export const sumReceiptWeight = (items) =>
  items.reduce((acc, it) => acc + Number(it.weight || 0), 0);

export const sumCashPure = (cash) =>
  cash.reduce((acc, it) => acc + Number(it.pure || 0), 0);

// --------------------------------
// BALANCE FINAL FORMULA
// --------------------------------
export const computeBalance = (oldBal, receiptPure, cashPure, issuePure) => {
  return Number((oldBal + receiptPure + cashPure - issuePure).toFixed(3));
};
