export const TradeType = {
  Buy: "Buy",
  Sell: "Sell",
} as const;

export type TradeType = (typeof TradeType)[keyof typeof TradeType];
