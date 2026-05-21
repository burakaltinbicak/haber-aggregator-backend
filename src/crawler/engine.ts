import { Source, News } from "../database/models";
import { parseFeedUrl } from "../parsers/universal";
import { logger } from "../utils/logger";
import { fetchContentWithReadability } from "../parsers/readability";

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

                    for (const article of articles) {
                        try {
                            const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

                            if (article.publishedAt < twoDaysAgo) {
                                skipped++;
                                continue;
                            }

                            // YENİ: Önce DB'de var mı kontrol et
                            const existingNews = await News.findOne({ externalId: article.externalId });
                            if (existingNews) {
                                skipped++;
                                continue; // Zaten var, hiçbir şey yapma
                            }

                            // Sadece yeni haberde ve content eksikse Readability
                            // content var ama gerçekten uzun metin içeriyor mu? (<p> veya <br> var mı?)
                            const hasRealContent = article.content && (
                                article.content.includes('<p>') ||
                                article.content.includes('<br') ||
                                article.content.includes('<div') ||
                                (article.content.length > 500 && !article.content.includes('<article'))
                            );

                            if (!hasRealContent) {
                                logger.info(`[${source.name}] Yeni haber, content eksik, Readability deneniyor: ${article.originalUrl}`);
                                const readabilityContent = await fetchContentWithReadability(article.originalUrl);
                                if (readabilityContent) {
                                    article.content = readabilityContent;
                                    logger.info(`[${source.name}] Content Readability ile tamamlandi: ${article.originalUrl}`);
                                }
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