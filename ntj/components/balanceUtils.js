export const toBalanceNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") return fallback;
  const normalized =
    typeof value === "string" ? value.replace(/[^0-9.-]+/g, "") : value;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : fallback;
};

export const roundBalance = (value, digits = 3) => {
  const num = toBalanceNumber(value, 0);
  return Number(num.toFixed(digits));
};

export const normalizeBalanceState = ({ oldBalance = 0, advanceBalance = 0 } = {}) => {
  let ob = toBalanceNumber(oldBalance, 0);
  let ab = toBalanceNumber(advanceBalance, 0);

  if (ob < 0) {
    ab += Math.abs(ob);
    ob = 0;
  }

  if (ab < 0) {
    ob += Math.abs(ab);
    ab = 0;
  }

  return {
    oldBalance: roundBalance(ob),
    advanceBalance: roundBalance(ab),
  };
};

export const computeNetBalance = ({
  oldBalance = 0,
  advanceBalance = 0,
  issue = 0,
  receipt = 0,
  cash = 0,
  gstPure = 0,
} = {}) => {
  const normalized = normalizeBalanceState({ oldBalance, advanceBalance });
  const issueValue = toBalanceNumber(issue, 0);
  const receiptValue = toBalanceNumber(receipt, 0);
  const cashValue = toBalanceNumber(cash, 0);

  return roundBalance(
    normalized.oldBalance -
      normalized.advanceBalance +
      issueValue -
      receiptValue -
      cashValue,
  );
};

export const deriveBalanceStateFromNet = (netBalance = 0) => {
  const net = roundBalance(netBalance);
  return {
    currentBalance: net,
    oldBalance: net > 0 ? net : 0,
    advanceBalance: net < 0 ? Math.abs(net) : 0,
  };
};

export const buildBalanceSummary = ({
  oldBalance = 0,
  advanceBalance = 0,
  issue = 0,
  receipt = 0,
  cash = 0,
  gstPure = 0,
} = {}) => {
  const normalized = normalizeBalanceState({ oldBalance, advanceBalance });
  const issueValue = roundBalance(issue);
  const receiptValue = roundBalance(receipt);
  const cashValue = roundBalance(cash);
  const gstValue = roundBalance(gstPure);
  const netBalance = computeNetBalance({
    oldBalance: normalized.oldBalance,
    advanceBalance: normalized.advanceBalance,
    issue: issueValue,
    receipt: receiptValue,
    cash: cashValue,
    gstPure: gstValue,
  });
  const finalState = deriveBalanceStateFromNet(netBalance);
  const startsWithAdvance =
    normalized.oldBalance === 0 && normalized.advanceBalance > 0;
  const startLabel = startsWithAdvance ? "Advance Balance" : "Old Balance";
  const startValue = startsWithAdvance
    ? normalized.advanceBalance
    : normalized.oldBalance;
  const leftSum = startsWithAdvance
    ? roundBalance(normalized.advanceBalance + receiptValue + cashValue)
    : roundBalance(normalized.oldBalance + issueValue);
  const rightSum = startsWithAdvance
    ? roundBalance(issueValue)
    : roundBalance(receiptValue + cashValue);

  return {
    oldBalance: normalized.oldBalance,
    advanceBalance: normalized.advanceBalance,
    issue: issueValue,
    receipt: receiptValue,
    cash: cashValue,
    gstPure: gstValue,
    netBalance,
    startLabel,
    startValue,
    leftSum,
    rightSum,
    finalLabel: finalState.oldBalance > 0 ? "Old Balance" : "Advance Balance",
    finalValue: roundBalance(Math.abs(netBalance)),
    startsWithAdvance,
    ...finalState,
  };
};
