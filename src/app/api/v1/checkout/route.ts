import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { createConfiguredCheckoutPostHandler } from "./configured-route";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  return createConfiguredCheckoutPostHandler({ auth, client: prisma })(request);
}
