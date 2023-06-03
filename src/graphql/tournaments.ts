import { MyContext } from "./../types/MyContextInterface";
import { PrismaClient } from "@prisma/client";
import _ from "lodash";
const shuffle = _.shuffle;
import { PubSub, withFilter } from "graphql-subscriptions";
import {
  incrementPointForUser,
  matchArena,
  updateTournamentRanking,
} from "../facades/tournamentFacade.js";
import { payRewardByTournament } from "../facades/reward.js";
import { parseISO } from "date-fns";
const pubsub = new PubSub();

const prisma = new PrismaClient();

const typeDefs = `#graphql
 
type UserInTournament {
  ranking: Int
  points: Int
  userId: Int
  tournamentId: Int
  user: User
  }

type Challenge {
  id: Int,
  category: String,
  time: Int,
  level: String,
  name: String,
  questions: String,
  questionsNumber: Int,
  tournamentId: Int
  }

  type TournamentCount {
    players: Int
    challenges: Int
  }

type Tournament {
  id: Int
  user: User
  avatar: String
  resume: String
  title: String
  status: String
  description: String
  startDate: DateTime
  endDate:  DateTime
  challenges: [Challenge]
  players: [UserInTournament]
  _count: TournamentCount
  }

type TournamentPlayer {
  id: Int
  username: String
  avatar: String
  points: Float
  ranking: Int
  country: String
  state: String
  city: String
  }
type TournamentPlayerRanking {
  points: Float
  ranking_m: Int
  ranking_i: Int
  ranking_p: Int
  ranking_n: Int
  user: TournamentPlayer
  }


type TournamentRanking {
  rankingInternational: [TournamentPlayerRanking]
  rankingNational: [TournamentPlayerRanking]
  rankingState: [TournamentPlayerRanking]
  rankingCity: [TournamentPlayerRanking]
  }

  type Question {
    id: Int,
    categories: String,
    tags: String,
    level: String,
    question: String,
    answers: String,
    questionType:  String,
    questionPicture:  String,
    answerSelectionType:  String,
    correctAnswer:  String,
    explanation:  String,
  }

  type QuestionCategory {
    id: Int,
    name: String,
    description: String,
    categoryId: Int
  }

  type NewGameInArena {
    userId: Int
  }


  type UserInChallenge {
    id: Int
    points: Float
  }

  type Query {
    getAllTournaments: [Tournament],
    getAllTournamentsPlayers: [TournamentPlayer],
    getRanking(
      country: String
      state: String
      city: String
      first: Int,
      skip: Int
    ): TournamentRanking,
    getTournament(
      id: Int!
    ): Tournament,
    getUserInTournament(
      tournamentId: Int!
      userId: Int
    ): UserInTournament
    getChallange(
      id: Int!
    ): Challenge,
    getChallangeByUser(
      userId: Int
      tournamentId: Int!
    ): [Int],
    getChallangeQuestions(
      challangeId: Int
    ): [Question],
    getAllTournamentQuestionsCategories: [QuestionCategory],
    getAllTournamentQuestions(
      categoryId: String
      nameSearch: String
    ): [Question],
  }

  
  type Mutation {
    joinToBiblicalTournament(
      userId: Int,
      tournamentId: Int!,
      ) : Boolean,
    saveChallangeForOneUser(
    challengeId: Int!,
    playerId: Int,
    points: Float,
    bonusTimePoints:Float,
    ) : UserInChallenge,
    createTournament (
      tournamentName: String!,
      tournamnetResume: String!
      categoryName: Int,
      challengesNumber: Int!,
      questionsNumber: Int!,
      reward: Int,
      currencyId: Int,
      startDate: DateTime,
      endDate: DateTime
    ): Boolean
    createTournamentQuestion (
      question: String!,
      questionType: String,
      answerSelectionType: String,
      category: String,
      correctAnswer: String,
      answers: String
    ): Boolean
    createTournamentQuestionCategory(
      name: String!,
      description: String,
      categoryId: Int
    ): QuestionCategory
    deleteTournamentQuestion(
      id: Int!,
    ): Boolean
    deleteTournamentQuestionCategory(
      id: Int!,
    ): Boolean
    joinToArena: Boolean
    leaveToArena: Boolean
    finishTournament(
     id:  Int!
    ): Boolean
   }

   type Subscription {
    arenaUpdated(
      userId: Int!
    ): NewGameInArena
}
`;

const resolvers = {
  Query: {
    getRanking: async (
      root: any,
      args: { country: string; state: string; city: string,first: number; skip: number  }
    ) => {
      const { first, skip } = args;
      const rankingData = {
        rankingInternational: null,
        rankingNational: null,
        rankingState: null,
        rankingCity: null,
      };

      if (args.country && args.state && args.city) {
        rankingData.rankingCity = await prisma.tournamentRanking.findMany({
          where: {
            country: args.country,
            state: args.state,
            city: args.city,
          },
          orderBy: {
            ranking_m: "asc",
          },
          select: {
            user: {
              select: {
                username: true,
                avatar: true,
                country: true,
                state: true,
                city: true,
              },
            },
            ranking_m: true,
            points: true,
          },
          take: first, // Utiliza 'take' en lugar de 'first' para limitar la cantidad de resultados
          skip,// Omitir los resultados anteriores
        });
      }

      if (args.country && args.state && !args.city) {
        rankingData.rankingState = await prisma.tournamentRanking.findMany({
          where: {
            country: args.country,
            state: args.state,
          },
          orderBy: {
            ranking_p: "asc",
          },
          select: {
            user: {
              select: {
                username: true,
                avatar: true,
                country: true,
                state: true,
                city: true,
              },
            },
            ranking_p:true,
            points: true,
          },
          take: first, // Utiliza 'take' en lugar de 'first' para limitar la cantidad de resultados
          skip,// Omitir los resultados anteriores
        });
      }
      if (args.country && !args.state && !args.city) {
        rankingData.rankingNational = await prisma.tournamentRanking.findMany({
          where: {
            country: args.country,
          },
          orderBy: {
            ranking_i: "asc",
          },
          select: {
            user: {
              select: {
                username: true,
                avatar: true,
                country: true,
                state: true,
                city: true,
              },
            },
            ranking_n:true,
            points: true,
          },
          take: first, // Utiliza 'take' en lugar de 'first' para limitar la cantidad de resultados
          skip,// Omitir los resultados anteriores
        });
      }
      if (!args.country && !args.state && !args.city) {
        rankingData.rankingInternational =
          await prisma.tournamentRanking.findMany({
            orderBy: {
              ranking_i: "asc",
            },
            select: {
              user: {
                select: {
                  username: true,
                  avatar: true,
                  country: true,
                  state: true,
                  city: true,
                },
              },
              ranking_i:true,
              points: true,
            },
            take: first, // Utiliza 'take' en lugar de 'first' para limitar la cantidad de resultados
            skip,// Omitir los resultados anteriores
          });
      }


      return rankingData;
    },

    getChallange: async (root: any, args: { id: number }) => {
      return prisma.tournamentChallenges.findFirst({
        where: {
          id: args.id,
        },
      });
    },
    getChallangeQuestions: async (root: any, args: { challangeId: number }) => {
      const { challangeId } = args;
      return await prisma.$transaction(async (tx) => {
        let challange = await tx.tournamentChallenges.findFirst({
          where: {
            id: challangeId,
          },
        });

        if (challange) {
          let arrayNumbers = JSON.parse(challange.questions).map(
            (num: string) => parseInt(num)
          );

          let questions = await tx.tournamentQuestions.findMany({
            where: {
              id: {
                in: arrayNumbers,
              },
            },
          });

          console.log("questions", questions);

          return questions;
        }
      });
    },
    getTournament: async (root: any, args: { id: number }) => {
      return prisma.tournament.findFirst({
        where: {
          id: args.id,
        },
        include: {
          players: {
            orderBy: {
              ranking: "asc",
            },
            select: {
              id: true,
              points: true,
              ranking: true,
              user: true,
            },
          },
          challenges: {
            select: {
              id: true,
              name: true,
              questionsNumber: true,
              questions: true,
            },
          },
          _count: {
            select: {
              players: true,
              challenges: true,
            },
          },
        },
      });
    },
    getAllTournaments: async () => {
      return prisma.tournament.findMany({
        include: {
          players: true,
          user: true,

          _count: {
            select: {
              players: true,
            },
          },
        },
      });
    },
    getChallangeByUser: async (
      root: any,
      args: { userId: number; tournamentId: number },
      MyContext
    ) => {
      //Get all changes by user in an tournament
      const challenges = await prisma.tournamentChallenges.findMany({
        where: {
          tournamentId: args.tournamentId,
        },
      });

      let userChallengesIds = [];

      await Promise.all(
        challenges.map(async (challenge) => {
          const userChallenge =
            await prisma.tournamentChallengesPlayer.findFirst({
              where: {
                userId: args.userId ?? MyContext.user.id,
                challengeId: challenge.id,
              },
            });

          if (userChallenge) {
            userChallengesIds.push(userChallenge?.challengeId ?? 0);
          }
        })
      );

      return userChallengesIds;
    },
    getAllTournamentsPlayers: async () => {
      //Get array with all uniques users in tournaments
      //For each user, get data, points, ranking global in all torunament by points
      ////////////////////////////////////////////////Ranking
      const tournaments = await prisma.tournament.findMany({
        where: {
          status: "ACTIVE",
        },
        include: {
          players: {
            select: {
              id: true,
              points: true,
              ranking: true,
              user: true,
              userId: true,
            },
          },
          _count: {
            select: {
              players: true,
            },
          },
        },
      });

      let uniqueUsers = [];

      await Promise.all(
        tournaments.map(async (tournament) => {
          await Promise.all(
            tournament.players.map(async (player) => {
              const user = await prisma.user.findFirst({
                where: {
                  id: player.userId,
                },
              });

              const userInArray = uniqueUsers.find(
                (user) => user.id === player.userId
              );

              if (!userInArray) {
                uniqueUsers.push({
                  id: player.userId,
                  username: user?.username,
                  avatar: user?.avatar,
                  points: player.points,
                  ranking: player.ranking,
                });
              } else {
                userInArray.points += player.points;
              }
            })
          );
        })
      );

      //Recalculate all ranking global by points
      let newArrayUserByRanking = uniqueUsers.sort(
        (a, b) => b.points - a.points
      );

      newArrayUserByRanking.map((user, index) => {
        user.ranking = index + 1;
      });

      // uniqueUsers.sort((a, b) => b.points - a.points);

      return newArrayUserByRanking;

      // return uniqueUsers;
    },
    getAllTournamentQuestions: async (
      root: any,
      args: { categoryId: string; nameSearch: string },
      MyContext
    ) => {
      if (args.categoryId || args.nameSearch) {
        console.log(args.categoryId);
        console.log(args.nameSearch);
        return prisma.tournamentQuestions.findMany({
          orderBy: [
            {
              createdAt: "desc",
            },
          ],
          where: {
            categories: {
              contains: args.categoryId, // Default mode
            },
            question: {
              contains: args.nameSearch,
            },
          },
        });
      } else {
        return prisma.tournamentQuestions.findMany({
          orderBy: [
            {
              createdAt: "desc",
            },
          ],
        });
      }
    },
    getAllTournamentQuestionsCategories: async () => {
      return prisma.tournamentQuestionsCategories.findMany();
    },
    getUserInTournament: (
      root: any,
      args: { tournamentId: number; userId: number },
      MyContext
    ) => {
      let userId = args.userId ?? MyContext.user.id;
      return prisma.tournamentPlayers.findFirst({
        where: {
          tournamentId: args.tournamentId,
          userId: userId,
        },
      });
    },
  },
  Mutation: {
    joinToBiblicalTournament: async (
      root: any,
      args: { userId: number; tournamentId: number },
      MyContext
    ) => {
      try {
        let user = args.userId ?? MyContext.user.id;

        const tournament = await prisma.tournament.findFirst({
          where: {
            id: args.tournamentId,
          },
        });

        if (tournament) {
          //Check if the user is already in the tournament
          const tournamentUserRaq = await prisma.tournamentPlayers.findFirst({
            where: {
              tournamentId: args.tournamentId,
              userId: user,
            },
          });

          if (tournamentUserRaq) {
            return false;
          }

          const tournamentUser = await prisma.tournamentPlayers.create({
            data: {
              tournamentId: args.tournamentId,
              userId: user,
            },
          });

          if (tournamentUser) {
            return true;
          }
        }

        return false;
      } catch (error) {
        return false;
      }
    },

    saveChallangeForOneUser: async (
      root: any,
      args: {
        playerId: number; //UserID
        challengeId: number;
        points: number;
        bonusTimePoints: number;
      },
      MyContext
    ) => {
      try {
        let user = null;
        let points = parseInt(
          Number(args.points + args.bonusTimePoints).toFixed(2)
        );
        //Get Challange

        const challange = await prisma.tournamentChallenges.findFirst({
          where: {
            id: args.challengeId,
          },
        });

        if (challange) {
          //Get Player by User
          const player = await prisma.tournamentPlayers.findFirst({
            where: {
              userId: args.playerId ?? MyContext.user.id,
              tournamentId: challange.tournamentId,
            },
          });

          if (player) {
            let user = await prisma.tournamentChallengesPlayer.create({
              data: {
                challengeId: challange.id,
                playerId: player.id,
                userId: args.playerId ?? MyContext.user.id,
                points: args.points,
                totalPoints: points,
                bonusTimePoints: args.bonusTimePoints,
              },
              select: {
                id: true,
                points: true,
              },
            });
          }

          //Update the points of this  user in toruenament
          incrementPointForUser(prisma, player, points);

          //Fire a backgorunt function async to update the ranking of the tournament
          await updateTournamentRanking(challange.tournamentId);

          if (challange && player) {
            return user;
          }
        }
      } catch (error) {
        return false;
      }
    },

    createTournament: async (
      root: any,
      args: {
        tournamentName: string;
        tournamnetResume: string;
        categoryName: string;
        challengesNumber: number;
        questionsNumber: number;
        reward: number;
        currencyId: number;
        startDate: string;
        endDate: string;
      },
      MyContext
    ) => {
      return await prisma.$transaction(async (tx) => {
        try {
          let tournament = await tx.tournament.create({
            data: {
              title: args.tournamentName,
              status: "ACTIVE",
              userId: MyContext.user.id,
              resume: args.tournamnetResume,
              reward: args.reward,
              currencyId: args.currencyId,
              startDate: parseISO(args.startDate),
              endDate: parseISO(args.endDate),
            },
          });

          if (tournament) {
            const questions = await tx.tournamentQuestions.findMany(); // Obtener todas las preguntas

            if (questions.length > 0) {
              const selectedQuestions: number[][] = [];

              let questionsAddeds = [];

              let challenges = [];

              let index = 0;

              console.log(args.challengesNumber);

              while (index < args.challengesNumber) {
                let questionIds = [];

                for (let i = 0; i < args.questionsNumber; i++) {
                  let question = null;

                  while (
                    question === null ||
                    questionsAddeds.includes(question.id)
                  ) {
                    question =
                      questions[Math.floor(Math.random() * questions.length)];
                  }

                  questionsAddeds.push(question.id);

                  questionIds.push(question.id);
                }

                challenges.push(
                  await tx.tournamentChallenges.create({
                    data: {
                      tournament: { connect: { id: tournament.id } },
                      category: "General",
                      name: `Desafío ${index + 1}`,
                      level: "1",
                      time: 5,
                      questionsNumber: args.questionsNumber,
                      questions: JSON.stringify(questionIds),
                    },
                  })
                );

                index++;
              }

              await Promise.all(challenges);
            }
          }
        } catch (error) {
          throw new Error(error.message);
        }
      });
    },

    createTournamentQuestionCategory: async (
      root: any,
      args: {
        name: string;
        description: string;
        categoryId: number;
      },
      MyContext
    ) => {
      return await prisma.$transaction(async (tx) => {
        const user = MyContext.user;
        //1 - Create the publication
        const category = await tx.tournamentQuestionsCategories.create({
          data: {
            name: args.name,
            description: args.description,
            categoryId: args.categoryId,
          },
        });

        return category;
      });
    },
    deleteTournamentQuestionCategory: async (
      root: any,
      args: { id: number },
      MyContext
    ) => {
      const result = await prisma.tournamentQuestionsCategories.delete({
        where: {
          id: args.id,
        },
      });
      return true;
    },
    deleteTournamentQuestion: async (
      root: any,
      args: { id: number },
      MyContext
    ) => {
      const result = await prisma.tournamentQuestions.delete({
        where: {
          id: args.id,
        },
      });

      return true;
    },
    createTournamentQuestion: async (
      root: any,
      args: {
        question: string;
        questionType: string;
        answerSelectionType: string;
        category: string;
        correctAnswer: string;
        answers: string;
      },
      MyContext
    ) => {
      let question = await prisma.tournamentQuestions.create({
        data: {
          question: args.question,
          questionType: args.questionType,
          categories: args.category,
          answerSelectionType: args.answerSelectionType,
          answers: args.answers,
          correctAnswer: args.correctAnswer,
          tags: "",
          level: "",
        },
      });
      if (question) {
        console.log(question);
        return true;
      }
    },
    joinToArena: async (root: any, args: {}, MyContext) => {
      try {
        const result = await prisma.tournamentArena.create({
          data: {
            userId: MyContext.user.id,
          },
        });

        matchArena();

        pubsub.publish("ARENA_UPDATED", {
          arenaUpdated: {
            userId: MyContext.user.id,
          },
        });

        if (result) {
          return true;
        }
      } catch (error) {
        throw new Error("Ocurrió un error");
      }
    },
    leaveToArena: async (root: any, args: {}, MyContext) => {
      try {
        const result = await prisma.tournamentArena.delete({
          where: {
            userId: MyContext.user.id,
          },
        });

        pubsub.publish("ARENA_UPDATED", {
          arenaUpdated: {
            userId: MyContext.user.id,
          },
        });

        if (result) {
          return true;
        }
      } catch (error) {
        throw new Error("Ocurrió un error");
      }
    },
    finishTournament: async (root: any, args: { id: number }, MyContext) => {
      try {
        const tournament = await prisma.tournament.findFirst({
          where: {
            id: args.id,
          },
        });

        await prisma.tournament.update({
          where: {
            id: tournament.id,
          },
          data: {
            status: "COMPLETED",
          },
        });

        //pay
        if (tournament.reward > 0) {
          payRewardByTournament(tournament.id);
        }

        await updateTournamentRanking(tournament.id);

        const players = await prisma.tournamentPlayers.findMany({
          where: {
            tournamentId: tournament.id,
          },
          orderBy: {
            ranking: "asc",
          },
        });

        //let chanllangesPointsTotalEarned = 0;

        // for (const player of players) {
        //   const challenges = await prisma.tournamentChallengesPlayer.findMany({
        //     where: {
        //       playerId: player.id,
        //     },
        //     include: {
        //       tournamentChallenge: {
        //         tournamentId: tournament.id,
        //       },
        //     },
        //   });

        //   for (const challenge of challenges) {
        //     chanllangesPointsTotalEarned += challenge.points;
        //   }
        // }

        //Bonus multiple for users
        incrementPointForUser(prisma, players[0], 500);
      } catch (error) {
        throw new Error("Ocurrió un error");
      }
    },
  },
  Subscription: {
    arenaUpdated: {
      // More on pubsub below
      subscribe: () => pubsub.asyncIterator(["ARENA_UPDATED"]),
    },
  },
};

export { typeDefs, resolvers };
