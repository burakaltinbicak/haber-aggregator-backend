import axios from "axios";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import iconv from "iconv-lite";
import { logger } from "../utils/logger";

const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0"
];

export async function fetchContentWithReadability(
    url: string,
    retries: number = 3
): Promise<string | undefined> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            logger.info(`Readability [Deneme ${attempt}/${retries}]: ${url}`);

            const response = await axios.get(url, {
                responseType: "arraybuffer", // Buffer olarak al, encoding sonradan çözülecek
                headers: {
                    "User-Agent": USER_AGENTS[(attempt - 1) % USER_AGENTS.length],
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive",
                },
                timeout: 15000,
                maxRedirects: 5,
                validateStatus: (status) => status < 500, // 500+ hatalarda retry yapılacak
            });

            // Charset detection: Önce HTTP header'dan bak
            const contentTypeHeader = response.headers["content-type"];
            const contentType = typeof contentTypeHeader === 'string' ? contentTypeHeader : "";
            const headerCharsetMatch = contentType.match(/charset=([^;]+)/i);
            let detectedCharset = headerCharsetMatch ? headerCharsetMatch[1].trim() : "utf-8";

            // Meta tag'den charset kontrolü (HTML'in ilk 4KB'ına bak)
            const previewLength = Math.min(response.data.length, 4096);
            const htmlPreview = response.data.toString("utf-8", 0, previewLength);
            const metaCharsetMatch = htmlPreview.match(
                /<meta[^>]+charset=["']?([^"'>;\s]+)/i
            );
            if (metaCharsetMatch) {
                detectedCharset = metaCharsetMatch[1];
            }

            // Buffer'ı doğru encoding ile string'e çevir
            let html: string;
            const charsetLower = detectedCharset.toLowerCase();
            if (charsetLower === "utf-8" || charsetLower === "utf8") {
                html = response.data.toString("utf-8");
            } else {
                html = iconv.decode(response.data, detectedCharset);
            }

            logger.info(`Readability: HTML alindi (${html.length} karakter, charset: ${detectedCharset})`);

            const dom = new JSDOM(html, {
                url,
                contentType: "text/html",
                includeNodeLocations: false,
                storageQuota: 10000000,
            });

            const reader = new Readability(dom.window.document);
            const article = reader.parse();

            if (article && article.textContent && article.textContent.trim().length > 200) {
                logger.info(`Readability: Content bulundu! (${article.textContent.trim().length} karakter)`);
                return article.textContent.trim();
            }

            logger.warn(`Readability: Content bulunamadi veya cok kisa: ${url}`);
            return undefined;

        } catch (error: any) {
            const isLastAttempt = attempt === retries;

            if (error.code === "ECONNABORTED") {
                logger.error(`Readability: Timeout (${attempt}/${retries}): ${url}`);
            } else if (error.response?.status === 403) {
                logger.error(`Readability: 403 Forbidden (${attempt}/${retries}): ${url}`);
            } else if (error.response?.status >= 500) {
                logger.error(`Readability: HTTP ${error.response.status} (${attempt}/${retries}): ${url}`);
            } else {
                logger.error(`Readability: Hata (${attempt}/${retries}): ${url}`, error.message);
            }

            if (!isLastAttempt) {
                const backoff = 1000 * attempt; // 1sn, 2sn, 3sn
                logger.info(`Readability: ${backoff}ms sonra tekrar denenecek...`);
                await new Promise((resolve) => setTimeout(resolve, backoff));
            }
        }
    }

    return undefined;
}