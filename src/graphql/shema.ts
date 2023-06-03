import { typeDefs as UsersTypes, resolvers as UserResolvers } from "./users.js";
import { typeDefs as CurrenciesTypes, resolvers as CurrenciesResolvers } from "./currencies.js";
import { typeDefs as PublicationTypes, resolvers as PublicationResolvers } from "./publications.js";
import { typeDefs as TimelineTypes, resolvers as TimelineResolvers } from "./timeline.js";
import { typeDefs as TournamentTypes, resolvers as TournamentResolvers } from "./tournaments.js";
import { typeDefs as AdministrationTypes, resolvers as AdministrationResolvers } from "./administration.js";

const RootQuery = `
  type Query {
    _: String
  }
`;

const typeDefs = [RootQuery, UsersTypes, CurrenciesTypes, PublicationTypes, TimelineTypes, TournamentTypes, AdministrationTypes];
const resolvers = [  UserResolvers, PublicationResolvers, TimelineResolvers, TournamentResolvers, CurrenciesResolvers, AdministrationResolvers];

export { typeDefs, resolvers };
