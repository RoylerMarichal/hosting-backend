import { PrismaClient } from "@prisma/client";
import { PubSub, withFilter } from "graphql-subscriptions";

const prisma = new PrismaClient();
const pubsub = new PubSub();

import { MyContext } from "../types/MyContextInterface";
import { propagatePublicationWithFollowers } from "../workers/jobs.js";
import { imageKitFacade, isBase64String } from "../facades/imagekit.js";

const typeDefs = `#graphql
  type Post {
    id: ID!
    reaction: String
    type: String 
    user: User
    contents: [PublicationContentType]
    _count: PublicationCount
  }

  type PublicationCount {
    PublicationLikes: Int,
    PublicationComments: Int
  }
 

  input PublicationContentInput {
  content: String
  type: String
}



type PostCreated {
  postId: Int,
  userId: Int,
  user: User
}

type Query {
    getPublication(id:Int): Post,
}
 
type PublicationContentType {
    content: String
    type: String
}

type Mutation {
    createPublication(
      type: String,
      contents:[PublicationContentInput],
      reaction: String
    ): Post
    likePublication(
      publicationId: Int!
    ): Boolean
}

type Subscription {
    postCreated(
      userId: Int!
    ): PostCreated
}

`;

const resolvers = {
  Query: {
    getPublication: async (root: any, args: { id: number }) => {
      const publication = await prisma.publication.findFirst({
        where: {
          id: args.id,
        },
        include: {
          user: {
            select: {
              avatar: true,
            },
          },
          contents: true,
          PublicationLikes: true,
          PublicationComments: true,
        },
      });

      return publication;
    },
  },
  Mutation: {
    likePublication: async (
      root: any,
      args: { publicationId: number },
      MyContext
    ) => {
      try {
        const publication = await prisma.publication.findFirst({
          where: {
            id: args.publicationId,
          },
        });

        if (publication) {
          const publicationUserRaq = await prisma.publicationLikes.findFirst({
            where: {
              publicationId: args.publicationId,
              userId: MyContext.user.id,
            },
          });

          if (publicationUserRaq) {
            await prisma.publicationLikes.delete({
              where: {
                id: publicationUserRaq.id,
              },
            });
            return false;
          }

          const publicationUser = await prisma.publicationLikes.create({
            data: {
              publicationId: args.publicationId,
              userId: MyContext.user.id,
            },
          });

          if (publicationUser) {
            return true;
          }
        }

        return false;
      } catch (error) {
        return false;
      }
    },
    createPublication: async (
      root: any,
      args: {
        type: string;
        contents: any;
        reaction: string;
      },
      MyContext
    ) => {
      return await prisma.$transaction(
        async (tx) => {
          try {
            const user = MyContext.user;
            console.log(user);

            //1 - Create the publication
            const publication = await tx.publication.create({
              data: {
                userId: user.id,
                // type: args.type,
                reaction: args.reaction,
              },
              include: {
                user: {
                  select: {
                    avatar: true,
                    username: true,
                  },
                },
              },
            });

            const contents = await Promise.all(
              args.contents.map(async (content: any) => {
                let data = content.content;

                const regex = /^data:image\/([a-zA-Z]*);base64,([^\s]*)$/;

                if (regex.test(content.content)) {
                  data = await imageKitFacade(
                    content.content,
                    MyContext.user.username + publication.id
                  );
                  if (data) {
                    return {
                      publicationId: publication.id,
                      content: data.url,
                      type: content.type,
                    };
                  }
                } else {
                  return {
                    publicationId: publication.id,
                    content: data,
                    type: content.type,
                  };
                }
              })
            );

            //2-save the content of the publication
            if (contents) {
              await tx.publicationContent.createMany({
                data: contents,
              });
            }

            //Text : only one content text
            // if (args.type === "STATUS") {
            //   //Get value of the first element of the array
            //   await tx.publicationContent.createMany({
            //     data: args.contents,
            //     // {
            //     //   publicationId: publication.id,
            //     //   content: args.content,
            //     //   type: args.type,
            //     // },
            //   });

            // if (args.images) {
            //   //Get images and save each
            //   args.images
            //     .filter((img) => img.startsWith("https"))
            //     .map((image) => image)
            //     .map(async (image) => {
            //       await tx.publicationContent.create({
            //         data: {
            //           publicationId: publication.id,
            //           content: image,
            //           type: "GALLERY",
            //         },
            //       });
            //     });
            // }
            // }

            //Save cntent
            // await tx.publicationContent.create({
            //   data: {
            //     publicationId: publication.id,
            //     content: args.content,
            //   },
            // });

            await propagatePublicationWithFollowers(user, publication, pubsub);

            return publication;

            //VIDEO : only one URL and one thumbnail image and one comment
            // if (args.type === "VIDEO" ) {
            //   await tx.publicationContent.createMany({
            //     data: {
            //       publicationId: publication.id,
            //       content: args.content[0],
            //     },
            //     data: {
            //       publicationId: publication.id,
            //       content: args.content[0],
            //     },
            //   });
            // }
          } catch (error) {
            throw new Error(error);
          }
        },
        {
          maxWait: 10000, // default: 2000
          timeout: 15000, // default: 5000
        }
      );
    },
  },
  Subscription: {
    postCreated: {
      resolve: (payload, args, context, info) => {
        return payload.postCreated;
      },

      subscribe: withFilter(
        () => pubsub.asyncIterator("POST_CREATED"),
        (payload, variables) => {
          return payload.postCreated.userId === variables.userId;
        }
      ),
    },
  },
};

export { typeDefs, resolvers };
