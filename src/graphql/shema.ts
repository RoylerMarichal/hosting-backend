import { typeDefs as UsersTypes, resolvers as UserResolvers } from "./users.js";
import { typeDefs as CurrenciesTypes, resolvers as CurrenciesResolvers } from "./currencies.js";
import { typeDefs as AdministrationTypes, resolvers as AdministrationResolvers } from "./administration.js";

const RootQuery = `
  type Query {
    _: String
  }
`;

const typeDefs = [RootQuery, UsersTypes, CurrenciesTypes,  AdministrationTypes];
const resolvers = [  UserResolvers,  CurrenciesResolvers, AdministrationResolvers];

export { typeDefs, resolvers };
