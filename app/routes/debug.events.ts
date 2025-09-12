// app/routes/debug.events.ts
import { json } from "@remix-run/node";
import prisma from "../db.server";

export async function loader() {
  const count = await prisma.orderEvent.count();
  const last5 = await prisma.orderEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  return json({
    cwd: process.cwd(),
    databaseUrl: process.env.DATABASE_URL || "(not set)",
    count,
    last5,
  });
}
