import axios from "axios";
import { parseStringPromise } from "xml2js";
import { logger } from "../utils/logger";

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

interface FeedEntry {
    externalId: string;
    title: string;
    summary?: string;
    content?: string;
    imageUrl?: string;
    originalUrl: string;
    publishedAt: Date;
    rawData: string;
}

function detectFormat(parsed: any): "atom" | "rss2" | "unknown" {
    if (parsed?.feed) return "atom";
    if (parsed?.rss?.channel?.[0]?.item) return "rss2";
    return "unknown";
}

function extractImageUrl(entry: any): string | undefined {
    if (entry.enclosure?.[0]?.$.url) {
        return entry.enclosure[0].$.url;
    }
    if (entry["media:thumbnail"]?.[0]?.$.url) {
        return entry["media:thumbnail"][0].$.url;
    }
    if (entry["media:content"]?.[0]?.$.url) {
        return entry["media:content"][0].$.url;
    }
    if (Array.isArray(entry.link)) {
        const enclosure = entry.link.find((l: any) => l?.$?.rel === "enclosure");
        if (enclosure?.$?.href) return enclosure.$.href;
    }
    const desc = entry.description?.[0] ?? entry.summary?.[0]?._ ?? entry.summary?.[0] ?? "";
    if (typeof desc === "string") {
        const imgMatch = desc.match(/<<img[^>]+src=["']([^"']+)["']/i);
        if (imgMatch) return imgMatch[1];
    }
    return undefined;
}

function parseAtomEntry(entry: any): FeedEntry | null {
    const externalId = entry.id?.[0] ?? "";
    const title = entry.title?.[0]?._ ?? entry.title?.[0] ?? "";
    const summary = entry.summary?.[0]?._ ?? entry.summary?.[0] ?? undefined;
    const content = entry.content?.[0]?._ ?? undefined;

    let originalUrl = "";
    if (Array.isArray(entry.link)) {
        const altLink = entry.link.find((l: any) => l?.$?.rel === "alternate") ?? entry.link[0];
        originalUrl = altLink?.$?.href ?? "";
    } else if (entry.link?.[0]?.$?.href) {
        originalUrl = entry.link[0].$.href;
    }

    const publishedRaw = entry.published?.[0] ?? entry.updated?.[0];
    if (!publishedRaw) return null;

    const publishedAt = new Date(publishedRaw);
    const imageUrl = extractImageUrl(entry);

    if (!externalId || !title || !originalUrl) return null;

    return {
        externalId,
        title,
        summary,
        content,
        imageUrl,
        originalUrl,
        publishedAt,
        rawData: JSON.stringify(entry),
    };
}

function parseRss2Item(item: any): FeedEntry | null {
    const externalId = item.guid?.[0]?._ ?? item.guid?.[0] ?? "";
    const title = item.title?.[0] ?? "";
    const summary = item.description?.[0] ?? undefined;
    const content = item["content:encoded"]?.[0] ?? item.description?.[0] ?? undefined;
    const originalUrl = item.link?.[0] ?? "";
    const publishedRaw = item.pubDate?.[0] ?? item["dc:date"]?.[0];

    if (!publishedRaw) return null;

    const publishedAt = new Date(publishedRaw);
    const imageUrl = extractImageUrl(item);

    if (!externalId || !title || !originalUrl) return null;

    return {
        externalId,
        title,
        summary,
        content,
        imageUrl,
        originalUrl,
        publishedAt,
        rawData: JSON.stringify(item),
    };
}

export async function parseFeedUrl(url: string, category?: string, retries: number = 2): Promise<ParsedArticle[]> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await axios.get(url, {
                timeout: 5000,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                    "Accept": "application/rss+xml, application/xml, text/xml, */*"
                }
            });

            const parsed = await parseStringPromise(response.data);
            const format = detectFormat(parsed);
            const articles: ParsedArticle[] = [];

            if (format === "atom") {
                const entries = parsed.feed.entry ?? [];
                for (const entry of entries) {
                    const parsed = parseAtomEntry(entry);
                    if (parsed) articles.push({ ...parsed, category });
                }
            } else if (format === "rss2") {
                const items = parsed.rss.channel[0].item ?? [];
                for (const item of items) {
                    const parsed = parseRss2Item(item);
                    if (parsed) articles.push({ ...parsed, category });
                }
            } else {
                throw new Error(`Desteklenmeyen RSS formatı: ${url}`);
            }

            return articles;

        } catch (error: any) {
            const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
            const isLastAttempt = attempt === retries;

            if (isTimeout && !isLastAttempt) {
                logger.warn(`RSS timeout (${attempt}/${retries}): ${url}, 3sn sonra tekrar denenecek...`);
                await new Promise(r => setTimeout(r, 3000));
                continue;
            }

            throw error;
        }
    }

    return [];
}