import { FastifyInstance } from "fastify";
import { News } from "../../database/models";
import { runCrawler } from "../../crawler/engine";
import { acquireLock, isLocked } from "../../crawler/lock";
import { logger } from "../../utils/logger";

export async function newsRoutes(app: FastifyInstance): Promise<void> {
    app.get("/news", async (request, reply) => {
        const news = await News.find()
            .sort({ publishedAt: -1 })
            .populate("sourceId", "name slug");

        return reply.send(news);
    });



    app.post("/crawl", async (request, reply) => {
        if (isLocked()) {
            return reply.status(409).send({ error: "Crawler zaten çalışıyor" });
        }

        try {
            let result = { inserted: 0, skipped: 0 };

            await acquireLock(async () => {
                result = await runCrawler();
            });

            return reply.send({
                message: "Crawl tamamlandı",
                inserted: result.inserted,
                skipped: result.skipped,
            });
        } catch (error) {
            logger.error("Manuel crawl hatası", error);
            return reply.status(500).send({ error: "Crawl sırasında hata oluştu" });
        }
    });
}