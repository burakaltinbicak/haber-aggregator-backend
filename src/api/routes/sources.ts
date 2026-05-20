import { FastifyInstance } from "fastify";
import { Source, News } from "../../database/models";


export async function sourcesRoutes(app: FastifyInstance): Promise<void> {
    app.get("/sources", async (request, reply) => {
        const sources = await Source.find();

        const result = await Promise.all(
            sources.map(async (source) => {
                const newsCount = await News.countDocuments({ sourceId: source._id });

                const categories = source.feeds?.map((feed: any) => feed.category) ?? [];

                return {
                    id: source._id,
                    name: source.name,
                    slug: source.slug,
                    isActive: source.isActive,
                    newsCount,
                    categories,
                    feedCount: source.feeds?.length ?? 0,
                };
            })
        );

        return reply.send(result);
    });
}