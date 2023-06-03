import { MovementAmountType, Status } from "@prisma/client";

export type MovementType = {
  amount: number;
  model: string;
  modelId: number;
  details: string;
  currencyId: number;
  type: MovementAmountType;
  status: Status;
};
