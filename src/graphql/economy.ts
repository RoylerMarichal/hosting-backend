import {
  PrismaClient,
} from "@prisma/client";
import { PubSub, withFilter } from "graphql-subscriptions";

const prisma = new PrismaClient();
const pubsub = new PubSub();

import { MyContext } from "../types/MyContextInterface";

const TypeDefs = `#graphql

type MovementType {
    amount: Float
    currencyId: CurrencyType
    model: String
    modelId: Int
    details: String
    type: String
    status: String
  }

   
  type Query {
    getMovementsForUser: [MovementType]
    }
`;

const resolvers = {
  Query: {
    getMovementsForUser: async (root: any, args: any, context: MyContext) => {
      return await prisma.adminMovementsAmounts.findMany({
        where: {
          modelId: context.user.id,
        },
        include: {
          currency: true,
        },
      });
    },
  },
};

export { TypeDefs, resolvers };
