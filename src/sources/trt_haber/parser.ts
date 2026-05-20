import axios from "axios";
import { parseStringPromise } from "xml2js";
import { trtHaberConfig } from "./config";

export interface ParsedArticle {
    externalId: string;
    title: string;
    summary?: string;
    content?: string;
    imageUrl?: string;
    originalUrl: string;
    publishedAt: Date;
    category?: string;
    rawData?: string;
}

export async function fetchTrthaberFeed(): Promise<ParsedArticle[]> {
    const articles: ParsedArticle[] = [];

    for (const rss of trtHaberConfig.feeds) {
        const response = await axios.get(rss.url);
        const parsed = await parseStringPromise(response.data);
        const items = parsed?.rss?.channel?.[0]?.item ?? [];

        for (const item of items) {
            const externalId = item.guid?.[0] ?? "";
            const title = item.title?.[0] ?? "";
            const summary = item.description?.[0] ?? undefined;
            const content = item["content:encoded"]?.[0] ?? undefined;
            const originalUrl = item.link?.[0] ?? externalId;
            const publishedRaw = item.pubDate?.[0];

            if (!publishedRaw) continue;

            const publishedAt = new Date(publishedRaw);
            const imageUrl = item.enclosure?.[0]?.$.url ?? undefined;
            const category = rss.category;

            if (!externalId || !title || !originalUrl) continue;

            articles.push({
                externalId,
                title,
                summary,
                content,
                imageUrl,
                originalUrl,
                publishedAt,
                category,
                rawData: JSON.stringify(item),
            });
        }
    }

    return articles;
}