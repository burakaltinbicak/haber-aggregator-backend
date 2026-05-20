import dotenv from "dotenv";
dotenv.config();

import { app } from "./api/server";
import { newsRoutes } from "./api/routes/news";
import { statsRoutes } from "./api/routes/stats";
import { sourcesRoutes } from "./api/routes/sources";
import { healthRoutes } from "./api/routes/health";
import { adminRoutes } from "./api/routes/admin";
import { startScheduler } from "./crawler/scheduler";
import { config } from "./config/env";
import { logger } from "./utils/logger";
import { connectDatabase } from "./database/client";

async function main() {
    await connectDatabase();

    await app.register(newsRoutes);
    await app.register(statsRoutes);
    await app.register(sourcesRoutes);
    await app.register(healthRoutes);
    await app.register(adminRoutes);

    await app.listen({ port: config.port, host: "0.0.0.0" });
    logger.info(`Sunucu ${config.port} portunda çalışıyor`);

    startScheduler();
}

main().catch((error) => {
    logger.error("Uygulama başlatılamadı", error);
    process.exit(1);
});