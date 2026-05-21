import { Source, News } from "../database/models";
import { parseFeedUrl } from "../parsers/universal";
import { logger } from "../utils/logger";

export async function runCrawler(): Promise<{ inserted: number; skipped: number }> {
    let inserted = 0;
    let skipped = 0;

    logger.info("Crawler başladı");

    try {
        const sources = await Source.find({ isActive: true });

        for (const source of sources) {
            if (!source.feeds || source.feeds.length === 0) {
                logger.warn(`${source.name} için feed bulunamadı`);
                continue;
            }

            for (const feed of source.feeds) {
                try {
                    logger.info(`${source.name} - ${feed.category} feed'i çekiliyor...`);

                    const articles = await parseFeedUrl(feed.url, feed.category);
                    logger.info(`${source.name} - ${feed.category}: ${articles.length} haber bulundu`);

                    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

                    for (const article of articles) {
                        try {
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
                } catch (error) {
                    logger.error(`${source.name} - ${feed.category} feed hatası`, error);
                    continue;
                }
            }
        }
    } catch (error) {
        logger.error("Crawler hatası", error);
    }

    logger.info(`Crawler bitti: ${inserted} eklendi, ${skipped} atlandı`);
    return { inserted, skipped };
}