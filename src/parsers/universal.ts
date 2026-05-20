import axios from "axios";
import { parseStringPromise } from "xml2js";

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
    // 1. RSS 2.0 enclosure
    if (entry.enclosure?.[0]?.$.url) {
        return entry.enclosure[0].$.url;
    }
    // 2. Media thumbnail (Yahoo Media RSS - çok yaygın)
    if (entry["media:thumbnail"]?.[0]?.$.url) {
        return entry["media:thumbnail"][0].$.url;
    }
    // 3. Media content
    if (entry["media:content"]?.[0]?.$.url) {
        return entry["media:content"][0].$.url;
    }
    // 4. Atom link rel="enclosure"
    if (Array.isArray(entry.link)) {
        const enclosure = entry.link.find((l: any) => l?.$?.rel === "enclosure");
        if (enclosure?.$?.href) return enclosure.$.href;
    }
    // 5. Description içindeki ilk <img> tag'ini regex ile bul
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

export async function parseFeedUrl(url: string, category?: string): Promise<ParsedArticle[]> {
    const response = await axios.get(url, { timeout: 10000 });
    const parsed = await parseStringPromise(response.data);

    const format = detectFormat(parsed);
    const articles: ParsedArticle[] = [];

    if (format === "atom") {
        const entries = parsed.feed.entry ?? [];
        for (const entry of entries) {
            const parsed = parseAtomEntry(entry);
            if (parsed) {
                articles.push({ ...parsed, category });
            }
        }
    } else if (format === "rss2") {
        const items = parsed.rss.channel[0].item ?? [];
        for (const item of items) {
            const parsed = parseRss2Item(item);
            if (parsed) {
                articles.push({ ...parsed, category });
            }
        }
    } else {
        throw new Error(`Desteklenmeyen RSS formatı: ${url}`);
    }

    return articles;
}