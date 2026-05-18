import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!process.env.OPS_API_KEY) {
    return NextResponse.json({ error: "OPS_AUTH_NOT_CONFIGURED" }, { status: 503 });
  }

  if (authHeader !== `Bearer ${process.env.OPS_API_KEY}`) {
    return NextResponse.json({ error: "OPS_UNAUTHORIZED" }, { status: 401 });
  }

  try {
    // Tüm kullanıcıların settings tablosunda isLifetimeBeta alanını true yap
    // Eğer UserSettings yoksa (ki yeni kayıtlarda genelde oluşur) create/upsert gerekebilir.
    // Ancak sadece mevcut kullanıcılara işlem yapacağımız için mevcutları alalım.
    const users = await prisma.user.findMany({
      include: { settings: true }
    });

    let updatedCount = 0;

    for (const user of users) {
      if (user.settings) {
        await prisma.userSettings.update({
          where: { userId: user.id },
          data: { isLifetimeBeta: true }
        });
      } else {
        await prisma.userSettings.create({
          data: {
            userId: user.id,
            isLifetimeBeta: true,
            alertPreferences: {
              email: false,
              slack: false,
              digest: "weekly"
            }
          }
        });
      }
      
      // Kullanıcının planını da pro yap (zaten free ise pro'ya çıkar, hediye)
      if (user.plan !== "team" && user.plan !== "pro") {
        await prisma.user.update({
          where: { id: user.id },
          data: { plan: "pro" }
        });
      }
      
      updatedCount++;
    }

    return NextResponse.json({
      success: true,
      message: "Successfully grandfathered beta users.",
      updatedCount
    });
  } catch (error) {
    console.error("Failed to grandfather beta users:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", details: (error as Error).message }, { status: 500 });
  }
}
