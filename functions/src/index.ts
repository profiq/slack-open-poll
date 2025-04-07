import { onRequest } from "firebase-functions/v2/https";
import { slack as SlackHandler } from "./slack";
import * as logger from "firebase-functions/logger";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

export const helloWorld = onRequest((_, response) => {
  logger.info("Hello logs!", { structuredData: true });
  response.send("Hello from Firebase1!");
});

export const helloWorld2 = onRequest((request, response) => {
  logger.info("Hello logs2!", { structuredData: true });
  response.send("Hello from Firebase!");
});
