import { FastifyInstance } from "fastify";
import { Source, News } from "../../database/models";

export async function statsRoutes(app: FastifyInstance): Promise<void> {
    app.get("/stats", async (request, reply) => {
        const totalNews = await News.countDocuments();
        const totalSources = await Source.countDocuments();

        const lastNews = await News.findOne()
            .sort({ fetchedAt: -1 })
            .select("fetchedAt");

        const last24Hours = await News.countDocuments({
            fetchedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        });

        return reply.send({
            totalNews,
            totalSources,
            lastCrawlAt: lastNews?.fetchedAt ?? null,
            last24HoursNews: last24Hours,
        });
    });
}