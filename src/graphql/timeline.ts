import { MyContext } from "../types/MyContextInterface";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const typeDefs = `#graphql
 type Timeline {
    id: ID!
    readed: String
    publication: Post
} 

type Query {
    timeline(offset:Int,limit:Int): [Timeline],
    userTimeline(offset:Int,limit:Int, userId:Int): [Timeline]
    timelineCount: Int,
    }
`;

const resolvers = {
  Query: {
    timeline: async (root: any, args: any, context: MyContext) => {
      const limit = args.limit;
      const offset = args.offset;
      const myTimeline = await prisma.timeline.findMany({
        where: {
          userId: context.user.id,
        },
        skip: offset, // Saltar los primeros "offset" registros
        take: limit,
        include: {
          publication: {
            select: {
              id: true,
              reaction: true,
              type: true,
              user: {
                select: {
                  avatar: true,
                  username: true,
                  id: true,
                  email: true,
                },
              },
              contents: true,
              _count: {
                select: {
                  PublicationLikes: true,
                  PublicationComments: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return myTimeline;
    },

    userTimeline: async (root: any, args: any, context: MyContext) => {
      const limit = args.limit;
      const offset = args.offset;
      

      const userPublications = await prisma.publication.findMany({
        where: {
          userId: args.userId,
        },
        skip: offset, // Saltar los primeros "offset" registros
        take: limit,
        select: {
          id: true,
          reaction: true,
          type: true,
          user: {
            select: {
              avatar: true,
              username: true,
              id: true,
              email: true,
            },
          },
          contents: true,
          _count: {
            select: {
              PublicationLikes: true,
              PublicationComments: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const timeline = userPublications.map((publication) => ({
        id: publication.id,
        publication: {
          ...publication,
          _count: {
            PublicationLikes: publication._count.PublicationLikes,
            PublicationComments: publication._count.PublicationComments,
          },
        },
      }));

      return timeline;
    },
  },
};

export { typeDefs, resolvers };
