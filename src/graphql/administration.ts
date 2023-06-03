import { MyContext } from "../types/MyContextInterface";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const typeDefs = `#graphql
 type Language {
    id: ID!
    name: String
    lng: String
} 

type Query {
    getLanguages: [Language],
    }

type Mutation {
    createLanguage(
      name: String,
      lng: String
    ): Language,
    }
`;

const resolvers = {
  Query: {
    getLanguages: async (root: any, args: any, context: MyContext) => {
      const languages = await prisma.language.findMany({});
      return languages;
    },
  },
  Mutation: {
    // createLanguage: async (root: any, args: any, context: MyContext) => {
    //   const languages = await prisma.language.create({
    //     data: {
    //       name: args.name,
    //       lng: args.lng,
    //     },
    //   });
    //   return languages;
    // },
  },
};

export { typeDefs, resolvers };
