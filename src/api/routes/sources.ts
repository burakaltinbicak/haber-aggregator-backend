import { FastifyInstance } from "fastify";
import { Source, News } from "../../database/models";
import * as configs from "../../sources";

export async function sourcesRoutes(app: FastifyInstance): Promise<void> {
    app.get("/sources", async (request, reply) => {
        const sources = await Source.find();

        const result = await Promise.all(
            sources.map(async (source) => {
                const newsCount = await News.countDocuments({ sourceId: source._id });

                const configKey = source.slug + "Config";
                const config = (configs as any)[configKey];
                const categories = config?.feeds.map((feed: any) => feed.category) ?? [];

                return {
                    id: source._id,
                    name: source.name,
                    slug: source.slug,
                    isActive: source.isActive,
                    newsCount,
                    categories,
                };
            })
        );

        return reply.send(result);
    });
}