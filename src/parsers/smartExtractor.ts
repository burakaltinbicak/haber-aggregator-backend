import axios from "axios";
import * as cheerio from "cheerio";
import iconv from "iconv-lite";
import { logger } from "../utils/logger";

const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
];

// Site-agnostik CSS selector'lar (öncelik sırasına göre)
const CONTENT_SELECTORS = [
    "article",
    '[itemprop="articleBody"]',
    ".article-content",
    ".article__content",
    ".article-body",
    ".news-text",
    ".news-detail",
    ".haber-metni",
    ".post-content",
    ".entry-content",
    ".content-body",
    ".detail-content",
    ".story-body",
    ".content",
    "#articleBody",
    "#haberMetni",
    "main",
    ".main-content",
    '[role="main"]',
];

interface ExtractionResult {
    text: string;
    score: number; // Ne kadar iyi bir sonuç olduğu
}

export async function fetchWithSmartExtractor(
    url: string,
    retries: number = 2
): Promise<string | undefined> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            logger.info(`SmartExtractor [Deneme ${attempt}/${retries}]: ${url}`);

            const response = await axios.get(url, {
                responseType: "arraybuffer",
                headers: {
                    "User-Agent": USER_AGENTS[(attempt - 1) % USER_AGENTS.length],
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
                },
                timeout: 15000,
                maxRedirects: 5,
            });

            // Encoding detection (readability.ts ile aynı mantık)
            const contentTypeHeader = response.headers["content-type"];
            const contentType = typeof contentTypeHeader === 'string' ? contentTypeHeader : "";
            const headerCharsetMatch = contentType.match(/charset=([^;]+)/i);
            let detectedCharset = headerCharsetMatch ? headerCharsetMatch[1].trim() : "utf-8";

            const previewLength = Math.min(response.data.length, 4096);
            const htmlPreview = response.data.toString("utf-8", 0, previewLength);
            const metaCharsetMatch = htmlPreview.match(
                /<meta[^>]+charset=["']?([^"'>;\s]+)/i
            );
            if (metaCharsetMatch) detectedCharset = metaCharsetMatch[1];

            const charsetLower = detectedCharset.toLowerCase();
            const html =
                charsetLower === "utf-8" || charsetLower === "utf8"
                    ? response.data.toString("utf-8")
                    : iconv.decode(response.data, detectedCharset);

            const $ = cheerio.load(html);

            // 1. Önce yaygın selector'ları dene
            let bestResult: ExtractionResult | null = null;

            for (const selector of CONTENT_SELECTORS) {
                const element = $(selector).first();
                if (element.length > 0) {
                    const text = extractCleanText($, element);
                    const score = calculateScore(text, selector);

                    if (!bestResult || score > bestResult.score) {
                        bestResult = { text, score };
                    }

                    // Çok yüksek skor bulduysak erken çık
                    if (score > 90) break;
                }
            }

            // 2. Selector'lar başarısız olursa: Paragraph Density Algoritması
            if (!bestResult || bestResult.score < 50) {
                logger.info(`SmartExtractor: Selector'lar yetersiz, paragraph density deneniyor...`);
                const densityText = extractByParagraphDensity($);
                if (densityText.length > 200) {
                    bestResult = { text: densityText, score: 70 };
                }
            }

            if (bestResult && bestResult.text.length > 200) {
                logger.info(`SmartExtractor: Content bulundu! (${bestResult.text.length} karakter, score: ${bestResult.score})`);
                return bestResult.text;
            }

            logger.warn(`SmartExtractor: Yeterli content bulunamadi: ${url}`);
            return undefined;

        } catch (error: any) {
            logger.error(`SmartExtractor: Hata (${attempt}/${retries}): ${url}`, error.message);
            if (attempt < retries) {
                await new Promise((r) => setTimeout(r, 1000 * attempt));
            }
        }
    }

    return undefined;
}

/**
 * Cheerio element'inden temiz metin çıkarır.
 */
function extractCleanText($: cheerio.CheerioAPI, element: cheerio.Cheerio<any>): string {
    // Script, style, nav, header, footer, aside, reklam alanlarını temizle
    element.find("script, style, nav, header, footer, aside, .advertisement, .ads, .social-share, .related-news, .tags, .author-bio").remove();

    // <p> ve <br> tag'lerini newline ile değiştir
    element.find("p, br").each(function () {
        const el = $(this);
        if (el.is("br")) {
            el.replaceWith("\n");
        } else {
            el.replaceWith("\n" + el.text() + "\n");
        }
    });

    // Listeleri de ekle
    element.find("li").each(function () {
        const el = $(this);
        el.replaceWith("\n• " + el.text());
    });

    let text = element.text();

    // Fazla boşlukları ve newline'ları temizle
    text = text
        .replace(/\r\n/g, "\n")
        .replace(/\n\s*\n/g, "\n\n")
        .replace(/[ \t]+/g, " ")
        .trim();

    return text;
}

/**
 * Bir metnin kalitesini skorlar.
 */
function calculateScore(text: string, selector: string): number {
    const length = text.length;
    const paragraphCount = (text.match(/\n/g) || []).length;
    const sentenceCount = (text.match(/[.!?]+/g) || []).length;

    let score = 0;

    // Uzunluk puanı (ideal: 1000-5000 karakter)
    if (length > 1000) score += 40;
    else if (length > 500) score += 30;
    else if (length > 300) score += 20;
    else score += 10;

    // Paragraf sayısı (haber metni paragraf olmalı)
    if (paragraphCount >= 5) score += 30;
    else if (paragraphCount >= 3) score += 20;
    else score += 5;

    // Cümle sayısı
    if (sentenceCount >= 10) score += 20;
    else if (sentenceCount >= 5) score += 10;

    // Selector güvenilirliği
    const highConfidenceSelectors = ["article", '[itemprop="articleBody"]', ".article-content", ".article-body"];
    if (highConfidenceSelectors.includes(selector)) score += 10;

    return Math.min(score, 100);
}

/**
 * Paragraph Density Algoritması:
 * Sayfadaki en büyük metin bloğunu bulur (en çok <p> içeren parent element).
 */
function extractByParagraphDensity($: cheerio.CheerioAPI): string {
    const candidates = new Map<string, { element: cheerio.Cheerio<any>; textLength: number; pCount: number }>();

    $("p").each((_, p) => {
        const parent = $(p).parent();
        const parentKey = parent.get(0)?.tagName + (parent.attr("class") || "") + (parent.attr("id") || "");

        if (!candidates.has(parentKey)) {
            candidates.set(parentKey, {
                element: parent,
                textLength: 0,
                pCount: 0,
            });
        }

        const candidate = candidates.get(parentKey)!;
        candidate.pCount++;
        candidate.textLength += $(p).text().length;
    });

    // En iyi adayı bul (pCount * textLength skoru)
    let bestCandidate: { element: cheerio.Cheerio<any>; score: number } | null = null;

    for (const [, candidate] of candidates) {
        const score = candidate.pCount * candidate.textLength;
        if (!bestCandidate || score > bestCandidate.score) {
            bestCandidate = { element: candidate.element, score };
        }
    }

    if (bestCandidate && bestCandidate.score > 500) {
        return extractCleanText($, bestCandidate.element);
    }

    // Son çare: body'den çek ama nav/footer'ları temizle
    const body = $("body");
    body.find("nav, header, footer, aside, script, style").remove();
    return body.text().replace(/\s+/g, " ").trim();
}