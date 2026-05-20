import cron from "node-cron";
import { runCrawler } from "./engine";
import { acquireLock, isLocked } from "./lock";
import { News } from "../database/models";
import { config } from "../config/env";
import { logger } from "../utils/logger";

export function startScheduler(): void {
    cron.schedule(config.crawlerInterval, async () => {
        if (isLocked()) {
            logger.warn("Crawler zaten çalişiyor, bu tur atlandi");
            return;
        }

        try {
            await acquireLock(async () => {
                await runCrawler();
            });
        } catch (error) {
            logger.error("Scheduler crawler hatasi", error);
        }
    });

    cron.schedule(config.cleanupInterval, async () => {
        logger.info("Cleanup başladi");

        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

        const result = await News.deleteMany({
            fetchedAt: { $lt: twelveHoursAgo }
        });

        logger.info(`Cleanup bitti: ${result.deletedCount} haber silindi`);
    });

    logger.info("Scheduler başlatildi");
}