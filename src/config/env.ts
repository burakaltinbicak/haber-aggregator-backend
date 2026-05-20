import dotenv from "dotenv";
dotenv.config();


export const config = {
    port: Number(process.env.PORT) || 3000,
    databaseUrl: process.env.DATABASE_URL || "",
    crawlerInterval: process.env.CRAWLER_INTERVAL || "*/30 * * * *",
    cleanupInterval: process.env.CLEANUP_INTERVAL || "0 */12 * * *",
};