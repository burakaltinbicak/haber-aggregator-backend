import { Source, News } from "../database/models";
import { fetchNtvFeed } from "../sources/ntv/parser";
import { fetchTrthaberFeed } from "../sources/trt_haber/parser";
import { logger } from "../utils/logger";

export async function runCrawler(): Promise<{ inserted: number; skipped: number }> {
    let inserted = 0;
    let skipped = 0;

    logger.info("Crawler başladi");

    try {
        const sources = await Source.find({ isActive: true });

        for (const source of sources) {
            let articles: any[] = [];

            if (source.slug === "ntv") {
                articles = await fetchNtvFeed();
            } else if (source.slug === "trthaber") {
                articles = await fetchTrthaberFeed();
            }

            if (!articles.length) continue;
            for (const article of articles) {
                try {
                    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

                    if (article.publishedAt < twoDaysAgo) {
                        skipped++;
                        continue;
                    }

                    await News.create({
                        sourceId: source._id,
                        externalId: article.externalId,
                        title: article.title,
                        summary: article.summary,
                        content: article.content,
                        imageUrl: article.imageUrl,
                        originalUrl: article.originalUrl,
                        publishedAt: article.publishedAt,
                        rawData: article.rawData,
                        category: article.category,
                    });
                    inserted++;
                } catch (error: any) {
                    if (error.code === 11000) {
                        skipped++;
                    } else {
                        logger.error("Haber kaydedilemedi", error);
                    }
                }
            }
        }
    } catch (error) {
        logger.error("Crawler hatasi", error);
    }

    logger.info(`Crawler bitti: ${inserted} eklendi, ${skipped} atlandi`);
    return { inserted, skipped };
}