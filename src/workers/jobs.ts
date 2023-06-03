import Bull from "bull";
import Handlebars from "handlebars";
import fs from "fs";
import { sendMail } from "./mail.js";
import { PrismaClient, PublicationType, UserType } from "@prisma/client";
import { PubSub, withFilter } from "graphql-subscriptions";
import { TimelineType } from "../../cluz-server/public/types/Timeline.js";
import { PostType } from "../../cluz-server/public/types/Post.js";

const prisma = new PrismaClient();

export const sendWelcomeEmail = async (
  userEmail: string,
  userName: string
): Promise<void> => {
  const emailQueue = new Bull("email-sending");

  const job = await emailQueue.add({
    emailType: "welcomeEmailBasic",
    userEmail,
  });

  emailQueue.process((job, done) => {
    if (job.data.emailType == "welcomeEmailBasic") {
      const templateHtml = fs.readFileSync(
        "./src/templates/emails/client/wellcome.hbs",
        "utf-8"
      );

      const template = Handlebars.compile(templateHtml);

      const html = template({ username: userName });

      sendMail(job.data.userEmail, html, "Bienvenido!")
        .then(() => {
          done();
        })
        .catch((error) => {
          console.log(`Error sending email: ${error}`);
          done(error);
        });
    }
  });
};

export const sendResetCodeEmail = async (
  userEmail: string,
  resetCode: string
): Promise<void> => {
  const emailQueue = new Bull("email-sending");

  const job = await emailQueue.add({
    resetCode,
    userEmail,
  });

  emailQueue.process((job, done) => {
    const templateHtml = fs.readFileSync(
      "./src/templates/emails/client/resetPasswordEmail.hbs",
      "utf-8"
    );

    const template = Handlebars.compile(templateHtml);

    const html = template({ resetCode: job.data.resetCode });

    sendMail(job.data.userEmail, html, "Restaura tu cuenta")
      .then(() => {
        done();
      })
      .catch((error) => {
        console.log(`Error sending email: ${error}`);
        done(error);
      });
  });
};

export const propagatePublicationWithFollowers = async (
  mainUser,
  publication,
  pubsub: PubSub
) => {
  try {
    const timelineQueue = new Bull("timeline-service");
    const user = mainUser;
    const followers = await prisma.follows.findMany({
      where: {
        followingId: user.id,
      },
    });

    // Agregar trabajo para guardar la publicación en la línea de tiempo de los seguidores
    const savePublicationJob = await timelineQueue.add("save-publication", {
      publication,
      followers,
    });

    // Agregar trabajo para enviar notificaciones a los seguidores
    const sendNotificationJob = await timelineQueue.add("send-notification", {
      publication,
      user,
      followers,
    });

    timelineQueue.process("save-publication", async (job, done) => {
      const { publication, followers } = job.data;
      prisma.timeline
        .createMany({
          data: job.data.followers.map((follower) => ({
            publicationId: job.data.publication.id,
            userId: follower.followerId,
          })),
        })
        .then(
          () => done(),
          (err) => console.log(err)
        );

      done();
    });
    timelineQueue.process("send-notification", async (job, done) => {
      job.data.followers.forEach(async (follower) => {
        let payload = {
          postCreated: {
            postId: job.data.publication.id,
            userId: follower.followerId,
            user: job.data.user,
          },
        };

        pubsub.publish("POST_CREATED", payload);
      });
      done();
    });

    console.log("Added jobs with IDs", savePublicationJob.id);
    console.log("Added jobs with IDs22", sendNotificationJob.id);
  } catch (error) {
    console.error(error);
    // timelineQueue.moveToFailedState(error);
  }
};

export const propagatePublicationsToUser = async (
  finalUser,
  publications,
  pubsub: PubSub
) => {
  try {
    const timelineQueue = new Bull("timeline-service");
    const user = finalUser;

    // Agregar trabajo para guardar la publicación en la línea de tiempo de los seguidores
    const savePublicationJob = await timelineQueue.add(
      "save-publication-to-user",
      {
        publications,
        user,
      }
    );

    timelineQueue.process("save-publication-to-user", async (job, done) => {
      const { publications, user } = job.data;
      console.log(publications);
      console.log(user);

   await Promise.all(
        publications.map(async (post: any) => {
         await prisma.timeline
            .create({
              data: { publicationId: post.id, userId: user },
            })
            .then(
              () => done(),
              (err) => console.log(err)
              
            );
        })
      );
   
      

      done();
    });

    console.log("Added jobs with IDs", savePublicationJob.id);
  } catch (error) {
    console.error(error);
    // timelineQueue.moveToFailedState(error);
  }
};
