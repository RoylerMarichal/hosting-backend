import { MovementType } from "../types/MovementsTypes";
import { MovementAmountType } from "@prisma/client";
import {
  PrismaClient,
} from "@prisma/client";

const prisma = new PrismaClient();

export const newMovement = async (
  client: PrismaClient,
  payload: MovementType
) => {
  //create an movement
  const movement = await client.adminMovementsAmounts.create({
    data: {
      amount: payload.amount,
      type: payload.type,
      model: "USER",
      modelId: payload.modelId,
      details: payload.details,
      status: payload.status,
      currencyId: payload.currencyId,
    },
  });

  if (movement) {
    const amount = await operateAmount(
      client,
      "USER",
      movement.modelId,
      movement.currencyId,
      payload.type,
      movement.amount
    );
  }

  return movement;
};

export const operateAmount = async (
  client: PrismaClient,
  model: string,
  modelId: number,
  currencyId: number,
  operation: MovementAmountType,
  amount: number
) => {
  
  switch (model) {
    case "USER":
      if (operation === "CREDIT") {
        const userAmount = await client.userAmounts.findFirst({
          where: {
            userId: modelId,
            currencyId: currencyId ,
          },
        });

        if (!userAmount) {
          return await client.userAmounts.create({
            data: {
              amount: amount ?? 0,
              userId: modelId,
              currencyId: currencyId ?? 1,
            },
          });
        } else {
          return await client.userAmounts.update({
            where: {
              id: userAmount.id,
            },
            data: {
              amount: {
                increment: amount,
              },
            },
          });
        }
      } else {
        return await client.userAmounts.update({
          where: {
            id: modelId,
          },
          data: {
            amount: {
              decrement: amount,
            },
            currencyId: currencyId,
          },
        });
      }
      break;

    default:
      break;
  }
};
