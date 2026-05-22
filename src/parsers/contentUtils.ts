import * as cheerio from "cheerio";

/**
 * HTML string'inden tüm tag'leri kaldırıp düz metin döner.
 * Fazla whitespace'leri temizler.
 */
export function stripHtml(html: string | undefined): string {
    if (!html) return "";
    const $ = cheerio.load(html);
    return $.text().replace(/\s+/g, " ").trim();
}

/**
 * HTML content'in gerçek metin uzunluğunu döner.
 */
export function getRealTextLength(html: string | undefined): number {
    return stripHtml(html).length;
}

/**
 * Content yeterli mi? Default: 300 karakter gerçek metin.
 */
export function isContentSufficient(
    htmlOrText: string | undefined,
    minLength: number = 300
): boolean {
    if (!htmlOrText) return false;
    const text = htmlOrText.includes("<") ? stripHtml(htmlOrText) : htmlOrText;
    return text.length >= minLength;
}

/**
 * HTML content'ten sadece metin döner, line-break'leri korur.
 */
export function htmlToText(html: string | undefined): string {
    if (!html) return "";
    const $ = cheerio.load(html);
    // <p>, <br> gibi tag'leri newline ile değiştir
    $("p, br").each(function () {
        $(this).replaceWith("\n" + $(this).text());
    });
    return $.text().replace(/\n\s*\n/g, "\n").replace(/\s+/g, " ").trim();
}