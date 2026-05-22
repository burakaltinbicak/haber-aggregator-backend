import { Source, News } from "../database/models";
import { parseFeedUrl } from "../parsers/universal";
import { logger } from "../utils/logger";
import { fetchContentWithReadability } from "../parsers/readability";
import { fetchWithSmartExtractor } from "../parsers/smartExtractor";
import { isContentSufficient, getRealTextLength } from "../parsers/contentUtils";

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

                            // Duplicate kontrolü
                            const existingNews = await News.findOne({ externalId: article.externalId });
                            if (existingNews) {
                                skipped++;
                                continue;
                            }

                            // YENİ: RSS content'ini GERÇEK metin uzunluğuyla değerlendir
                            const rssContentLength = getRealTextLength(article.content);
                            const hasRealContent = isContentSufficient(article.content, 300); // 300+ karakter gerçek metin

                            let extractionMethod = "rss";
                            let finalContent = article.content;

                            // Eğer RSS content'i yetersizse, siteye git ve çek
                            if (!hasRealContent) {
                                logger.info(
                                    `[${source.name}] RSS content yetersiz (${rssContentLength} karakter), siteye gidiliyor: ${article.originalUrl}`
                                );

                                // 1. Readability dene
                                finalContent = await fetchContentWithReadability(article.originalUrl);
                                extractionMethod = "readability";

                                // 2. Readability başarısız olursa Smart Extractor dene
                                if (!finalContent) {
                                    logger.info(`[${source.name}] Readability başarısız, Smart Extractor deneniyor...`);
                                    finalContent = await fetchWithSmartExtractor(article.originalUrl);
                                    extractionMethod = "smart_extractor";
                                }

                                if (finalContent) {
                                    logger.info(
                                        `[${source.name}] Content ${extractionMethod} ile tamamlandi (${finalContent.length} karakter): ${article.originalUrl}`
                                    );
                                } else {
                                    logger.warn(`[${source.name}] Hicbir yontemle content alinamadi: ${article.originalUrl}`);
                                    extractionMethod = "failed";
                                }
                            } else {
                                logger.info(`[${source.name}] RSS content yeterli (${rssContentLength} karakter), siteye gidilmiyor.`);
                            }

                            await News.create({
                                sourceId: source._id,
                                externalId: article.externalId,
                                title: article.title,
                                summary: article.summary,
                                content: finalContent,
                                imageUrl: article.imageUrl,
                                originalUrl: article.originalUrl,
                                publishedAt: article.publishedAt,
                                rawData: article.rawData,
                                category: article.category,
                                // Opsiyonel: extractionMethod'u da kaydetmek istersen News schema'ya ekle
                                // extractionMethod,
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