import axios from "axios";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { logger } from "../utils/logger";

export async function fetchContentWithReadability(url: string): Promise<string | undefined> {
    try {
        logger.info(`Readability: ${url} icin HTML cekiliyor...`);

        const response = await axios.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7"
            },
            timeout: 15000,
            maxRedirects: 5
        });

        logger.info(`Readability: HTML alindi (${response.data.length} karakter)`);

        const dom = new JSDOM(response.data, {
            url,
            contentType: "text/html",
            includeNodeLocations: false,
            storageQuota: 10000000
        });

        const reader = new Readability(dom.window.document);
        const article = reader.parse();

        if (article && article.textContent && article.textContent.length > 200) {
            logger.info(`Readability: Content bulundu! (${article.textContent.length} karakter)`);
            return article.textContent;
        }

        logger.warn(`Readability: Content bulunamadi veya cok kisa: ${url}`);
        return undefined;

    } catch (error: any) {
        if (error.code === 'ECONNABORTED') {
            logger.error(`Readability: Timeout: ${url}`);
        } else if (error.response) {
            logger.error(`Readability: HTTP ${error.response.status}: ${url}`);
        } else {
            logger.error(`Readability: Hata: ${url}`, error.message);
        }
        return undefined;
    }
}