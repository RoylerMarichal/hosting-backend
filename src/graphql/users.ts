import bcrypt from "bcryptjs";
import { PrismaClient, Prisma, UserType } from "@prisma/client";
import jwt from "jsonwebtoken";
import { MovementType } from "../types/MovementsTypes";
import { PubSub  } from "graphql-subscriptions";
import { newMovement } from "../facades/movementsAmounts.js";
import {
  propagatePublicationsToUser,
  sendResetCodeEmail,
  sendWelcomeEmail,
} from "../workers/jobs.js";

const pubsub = new PubSub();
import { MyContext } from "../types/MyContextInterface";
import { generateSecureResetCode } from "../facades/auth.js";
import { imageKitFacade } from "../facades/imagekit.js";
import { convertToSlug } from "../facades/str.js";

const JWT_SECRET = "EN_DIOS_CONFIO_BY_JESUS";

const prisma = new PrismaClient();

const typeDefs = `#graphql

type Avatar {
    id: ID!
    url: String
  }

        input UserLoginInput {
        email: String!
        password: String!
        }

    input UserCreateInput {
        username: String!
        email: String!
        password: String!
        type: String!
    }
    type UserAmount {
        id: Int,
        amount: Float
        currency: CurrencyType
    }
    type TournamentRanking {
        points: Float,
    }

    type Person {
    id:  ID!,
    name: String
    email: String,
  }
  type NewUserType {
    user:  User!,
    token: String!
  }

    
 type Follow {
  avatar: String,
  username: String,
  id: Int,
  followedBy: [FollowBy]
  following: [Following]
  }
    
  type Following  {
    following: Follow
    }

    type Avatar {
      id:  ID!
      url: String
    }
    type Language {
      id:  ID!
      name: String
    }
    
  type FollowCount {
    followedBy: Int,
    following: Int
  }
    type FollowBy  {
    follower: Follow
    }
    type User {
    id:  ID!,
    email: String,
    avatar: String,
    phone: String,
    resume: String,
    cover: String,
    city: String,
    state: String,
    country: String,
    avatar_thumbnail: String,
    username:  String!,
    name:  String!,
    type: String!
    followedBy: [FollowBy],
    following: [Following],
    amounts: [UserAmount],
    TournamentRanking: [TournamentRanking],
    Language: Language,
    include: [FollowBy],
    _count:  FollowCount
  }
  type CodeForChangePassword {
    userId: Int
   }
  type Token {
   token: String!
  }

 extend type Query {
    getUsersByType(
      offset: Int,
      limit: Int,
      type: String!,
      search: String
    ): [User],
    peoples(
     offset: Int,
      limit: Int
    ): [User],
    peoplesForStartPage(
     offset: Int,
      limit: Int
    ): [User],
    me: User,
    getUser(
     username: String!
    ): User,
  }
  
  type Mutation {
    login(
      email: String!,
      password: String!
    ): NewUserType,
    createUser(username: String!, email: String!,password: String!,type: String!): NewUserType
    forgotPassword(email:String!): Boolean
    checkResetCode(email:String!,resetCode:String!): CodeForChangePassword
    updatePasswordByEmail(userId:Int!,newPassword:String!): Boolean
    propagateTheFirstPublicationsForNewUser: Boolean
    updateUser(email: String,username: String, resume: String, password: String,avatar: String, cover: String,avatar_thumbnail: String, phone: String, country: String, state:String, city:String, languageId: Int): User
    followUser(
      followingId: Int!
    ): Boolean
  }

`;

const resolvers = {
  Query: {
    me: (root: any, args: any, context: MyContext) => {
      return prisma.user.findUnique({
        where: { id: context.user.id },
        include: {
          following: {
            include: {
              following: {
                select: {
                  id: true,
                  username: true,
                  avatar: true,
                },
              },
            },
          },
          Language: true,
          amounts: {
            include: {
              currency: true,
            },
          },
          TournamentRanking: {
            select: {
              points: true,
            },
          },
        },
      });
    },
    getUser: async (root: any, args: { username: Prisma.StringFilter }) => {
      const user = await prisma.user.findFirst({
        where: {
          username: args.username,
        },
        include: {
          following: {
            include: {
              follower: {
                select: {
                  avatar: true,
                  username: true,
                  id: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              followedBy: true,
              following: true,
            },
          },
        },
      });

      console.log("user", user);

      return user;
    },
    // getUsersByType: async (
    //   root: any,
    //   args: { offset: any; limit: any; type: UserType, search: string }
    // ) => {
    //   let typeSelected: Prisma.UserWhereInput;

    //   typeSelected = {};

    //   const users = await prisma.user.findMany({
    //     where: { type: args.type },
    //     include: {
    //       _count: {
    //         select: {
    //           followedBy: true,
    //           following: true,
    //         },
    //       },
    //     },
    //     orderBy: {
    //       followedBy: {
    //         _count: "desc",
    //       },
    //     },
    //   });

    //   return users;
    // },
    getUsersByType: async (
      root: any,
      args: { offset: any; limit: any; type: UserType; search: string },
      context: MyContext
    ) => {
      let typeSelected: Prisma.UserWhereInput;

      typeSelected = {};

      if (args.search) {
        typeSelected = {
          OR: [
            { username: { contains: args.search } }, // Filtro de búsqueda por nombre
            { email: { contains: args.search } }, // Filtro de búsqueda por email (ejemplo)
            { id: { not: context.user.id } },
            // Agrega más condiciones de búsqueda según tus necesidades
          ],
        };
      }

      const users = await prisma.user.findMany({
        where: {
          type: args.type,
          ...typeSelected, // Combina el filtro de búsqueda con el filtro de tipo
        },
        include: {
          _count: {
            select: {
              followedBy: true,
              following: true,
            },
          },
        },
        orderBy: {
          followedBy: {
            _count: "desc",
          },
        },
      });

      return users;
    },

    peoples: async (root: any, args: { offset: any; limit: any }) => {
      return prisma.user.findMany();
    },
    peoplesForStartPage: async (
      root: any,
      args: { offset: any; limit: any }
    ) => {
      return prisma.user.findMany();
    },
  },
  Mutation: {
    login: async (
      root: any,
      args: { email: Prisma.StringFilter; password: string }
    ) => {
      let userFind: Prisma.UserFindFirstArgs;

      userFind = {
        where: {
          email: args.email,
        },
      };

      const user = await prisma.user.findFirst(userFind);
      //Decrypt password before compare with bcrypt

      if (!user || !bcrypt.compareSync(args.password, user.password)) {
        throw new Error("Invalid credentials");
      }

      const userForToken = {
        username: user.username,
        id: user.id,
      };

      return { token: jwt.sign(userForToken, JWT_SECRET), user: user };
    },
    createUser: async (root: any, args: any, { prisma }) => {
      return await prisma.$transaction(async (tx) => {
        const { email, username, password, type } = args;

        // Check if email is already taken
        const existingUser = await tx.user.findFirst({
          where: {
            email,
          },
        });

        if (existingUser) {
          throw new Error("Email already in use");
        }

        let name = username;
        let newUserName = convertToSlug(name);

        const existingUserName = await tx.user.findFirst({
          where: {
            username: newUserName,
          },
        });

        if (existingUserName) {
          newUserName = newUserName + "-2";
        }

        const user = await tx.user.create({
          data: {
            email,
            type,
            name: name,
            username: newUserName,
            password: bcrypt.hashSync(password, 10),
          },
        });

        let payload: MovementType = {
          amount: 100,
          model: "USER",
          modelId: user.id,
          details: "Regalo de bienvenida",
          currencyId: 1,
          type: "CREDIT",
          status: "COMPLETED",
        };

        const movement = await newMovement(tx, payload);

        if (user) {
          const userForToken = {
            username: user.username,
            id: user.id,
          };

          sendWelcomeEmail(user.email, user.username);
          return { token: jwt.sign(userForToken, JWT_SECRET), user: user };
        }
      });
    },
    updateUser: async (
      root: any,
      args: {
        email: string;
        username: string;
        password: string;
        avatar: string;
        cover: string;
        resume: string;
        avatar_thumbnail: string;
        phone: string;
        country: string;
        state: string;
        city: string;
        languageId?: number;
      },
      MyContext
    ) => {
      try {
        const avatar: any = args.avatar
          ? await imageKitFacade(args.avatar, MyContext.user.username)
          : null;

        const cover: any = args.cover
          ? await imageKitFacade(args.cover, MyContext.user.username)
          : null;

        const dataToUpdate: any = {
          email: args.email || MyContext.user.email,
          username: args.username || MyContext.user.username,
          resume: args.resume || MyContext.user.resume,
          password: args.password
            ? bcrypt.hashSync(args.password, 3)
            : MyContext.user.password,
          avatar: avatar ? avatar.url : args.avatar || MyContext.user.avatar,
          cover: cover ? cover.url : args.cover || MyContext.user.cover,
          avatar_thumbnail: avatar
            ? avatar.thumbnailUrl
            : args.avatar_thumbnail || MyContext.user.avatar_thumbnail,
          phone: args.phone || MyContext.user.phone,
          country: args.country || MyContext.user.country,
          state: args.state || MyContext.user.state,
          city: args.city || MyContext.user.city,
          languageId: args.languageId || MyContext.user.languageId,
        };

        const user = await prisma.user.update({
          where: {
            id: MyContext.user.id,
          },
          data: dataToUpdate,
        });

        return user;
      } catch (error) {
        console.log(error);
      }

      return null;
    },
    followUser: async (root: any, args: { followingId: number }, MyContext) => {
      try {
        //Check is the user is already following
        const data = await prisma.follows.findFirst({
          where: {
            followerId: MyContext.user.id,
            followingId: args.followingId,
          },
        });

        if (data) {
          await prisma.follows.delete({
            where: {
              id: data.id,
            },
          });
          return false;
        }

        await prisma.follows.create({
          data: {
            followerId: MyContext.user.id, //El usuario autentificado que va a empezar a seguir
            followingId: args.followingId,
          },
        });
        return true;
      } catch (error) {
        console.log(error);
      }
    },
    forgotPassword: async (root: any, args: { email: string }) => {
      try {
        const user = await prisma.user.findFirst({
          where: {
            email: args.email,
          },
        });

        if (!user) {
          throw new Error("Email not found");
        }

        let resetCode = generateSecureResetCode();
        let resetCodeExpires = new Date(Date.now() + 1800000);

        const updateUser = await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            resetCode: resetCode,
            resetCodeExpires: resetCodeExpires,
          },
        });

        if (updateUser) {
          sendResetCodeEmail(updateUser.email, resetCode);
        }
      } catch (error) {
        throw new Error(error.message);
      }
    },
    checkResetCode: async (
      root: any,
      args: { email: string; resetCode: string }
    ) => {
      try {
        const user = await prisma.user.findFirst({
          where: {
            email: args.email,
          },
        });

        if (!user) {
          throw new Error("Email not found");
        }

        if (user.resetCode !== args.resetCode) {
          throw new Error("Invalid reset code");
        }

        if (user.resetCodeExpires < new Date()) {
          throw new Error("Reset code has expired");
        }

        // Si todo está bien, devuelve el ID del usuario
        return { userId: user.id };
      } catch (error) {
        throw new Error(error.message);
      }
    },
    updatePasswordByEmail: async (
      root: any,
      args: { userId: number; newPassword: string }
    ) => {
      try {
        const user = await prisma.user.update({
          where: {
            id: args.userId,
          },
          data: {
            password: bcrypt.hashSync(args.newPassword, 3),
          },
        });
      } catch (error) {
        throw new Error("No se pudo cambiar la contraseña");
      }
    },
    propagateTheFirstPublicationsForNewUser: async (
      root: any,
      args: {},
      MyContext
    ) => {
      // Obtener la lista de amigos que el usuario ya sigue
      const user = await prisma.user.findUnique({
        where: {
          id: MyContext.user.id,
        },
        include: {
          following: {
            include: {
              following: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Obtener la última publicación de cada amigo
      const friendPublications = await Promise.all(
        user.following.map(async (follow) => {
          const friendId = follow.following.id;
          const publication = await prisma.publication.findFirst({
            where: {
              userId: friendId,
            },
            orderBy: {
              createdAt: "desc",
            },
          });
          return publication;
        })
      );

      console.log(friendPublications);

      // Filtrar las publicaciones que no sean nulas
      const filteredPublications = friendPublications.filter(
        (publication) => publication !== null
      );

      // Propagar las publicaciones al usuario
      propagatePublicationsToUser(
        MyContext.user.id,
        filteredPublications,
        pubsub
      );

      return true;
    },
  },
};

export { typeDefs, resolvers };
