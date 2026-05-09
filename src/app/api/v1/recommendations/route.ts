import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { generateAiRepoRecommendations } from "@/server/recommendations";
import { createRecommendationsPostHandler } from "./route-handler";

export const POST = createRecommendationsPostHandler({
  auth,
  client: prisma,
  apiKey: process.env.OPENAI_API_KEY,
  generateRecommendations: generateAiRepoRecommendations
});
