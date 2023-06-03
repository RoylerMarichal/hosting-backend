import jwt from "jsonwebtoken";
import { MyContext } from "./types/MyContextInterface";
import { PrismaClient } from "@prisma/client";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import express from "express";
import http from "http";
import cors from "cors";
import bodyParser from "body-parser";
import { resolvers } from "./graphql/shema.js";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/lib/use/ws";
import dotenv from "dotenv";
import { typeDefs } from "./graphql/shema.js";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { DateTimeResolver, DateTimeTypeDefinition } from "graphql-scalars";

const timezone =  process.env.TIMEZONE ;

const prisma = new PrismaClient();
dotenv.config();
const PORT = process.env.PORT || 4000;
const app = express();
app.use(cors());

app.use(bodyParser.json({ limit: "50mb" }));
app.use(
  bodyParser.urlencoded({
    limit: "50mb",
    extended: true,
    parameterLimit: 50000,
  })
);
app.use(bodyParser.text({ limit: "200mb" }));

const httpServer = http.createServer(app);

const JWT_SECRET = "EN_DIOS_CONFIO_BY_JESUS";

const getUser = async (token: any) => {
  try {
    if (token) {
      const decodedToken: any = jwt.verify(token, JWT_SECRET) as any;
      const user = await prisma.user.findUnique({
        where: { id: decodedToken.id },
      });

      return user;
    } else {
      throw new Error("401");
    }
  } catch (error) {
    console.log(error);
  }
};

const schema = makeExecutableSchema({
  typeDefs: [typeDefs, DateTimeTypeDefinition],
  resolvers,
});

const wsServer = new WebSocketServer({
  server: httpServer,
  path: "/graphql/ws",
});

const serverCleanup = useServer({ schema }, wsServer);

const server = new ApolloServer<MyContext>({
  schema,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    },
  ],
});

await server.start();

app.use(
  "/graphql",
  cors<cors.CorsRequest>(),
  bodyParser.json(),
  expressMiddleware(server, {
    context: async ({ req, res }) => {
      const token = req.headers.authorization || "";
      const user = await getUser(token); // #todo
      return { user, prisma };
    },
  })
);

await new Promise<void>((resolve) =>
  httpServer.listen({ port: PORT }, resolve)
);
console.log(`🚀 Server ready at ${PORT}`);
