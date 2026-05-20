import axios from "axios";
import { parseStringPromise } from "xml2js";
import { ntvConfig } from "./config";

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

export async function fetchNtvFeed(): Promise<ParsedArticle[]> {
    const articles: ParsedArticle[] = [];

    for (const feed of ntvConfig.feeds) {
        const response = await axios.get(feed.url);
        const parsed = await parseStringPromise(response.data);
        const entries = parsed?.feed?.entry ?? [];

        for (const entry of entries) {
            const externalId = entry.id?.[0] ?? "";
            const title = entry.title?.[0]?._ ?? entry.title?.[0] ?? "";
            const summary = entry.summary?.[0]?._ ?? entry.summary?.[0] ?? undefined;
            const content = entry.content?.[0]?._ ?? undefined;
            const originalUrl = entry.link?.[0]?.$.href ?? externalId;
            const publishedRaw = entry.published?.[0];
            if (!publishedRaw) continue;

            const publishedAt = new Date(publishedRaw); const imageUrl = entry.enclosure?.[0]?.$.url ?? undefined;
            const category = entry.category?.[0]?.$.term ?? undefined;

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
                rawData: JSON.stringify(entry),
            });
        }
    }

    return articles;
}