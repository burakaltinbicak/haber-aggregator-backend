import { connectDatabase, disconnectDatabase } from "./client";
import { Source } from "./models";

async function seed() {
    await connectDatabase();

    await Source.findOneAndUpdate(
        { slug: "ntv" },
        {
            name: "NTV",
            slug: "ntv",
            baseUrl: "https://www.ntv.com.tr",
            feeds: [
                { url: "https://www.ntv.com.tr/turkiye.rss", category: "turkiye" },
                { url: "https://www.ntv.com.tr/egitim.rss", category: "egitim" },
                { url: "https://www.ntv.com.tr/ekonomi.rss", category: "ekonomi" },
                { url: "https://www.ntv.com.tr/ntvpara.rss", category: "ntvpara" },
                { url: "https://www.ntv.com.tr/yasam.rss", category: "yasam" },
                { url: "https://www.ntv.com.tr/dunya.rss", category: "dunya" },
                { url: "https://www.ntv.com.tr/sporskor.rss", category: "sporskor" },
                { url: "https://www.ntv.com.tr/teknoloji.rss", category: "teknoloji" },
                { url: "https://www.ntv.com.tr/saglik.rss", category: "saglik" },
                { url: "https://www.ntv.com.tr/otomobil.rss", category: "otomobil" },
                { url: "https://www.ntv.com.tr/son-dakika.rss", category: "son-dakika" },
            ],
            parserType: "rss",
            isActive: true,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await Source.findOneAndUpdate(
        { slug: "trthaber" },
        {
            name: "TRT Haber",
            slug: "trthaber",
            baseUrl: "https://www.trthaber.com",
            feeds: [
                { url: "https://www.trthaber.com/manset_articles.rss", category: "manset" },
                { url: "https://www.trthaber.com/sondakika_articles.rss", category: "sondakika" },
                { url: "https://www.trthaber.com/koronavirus_articles.rss", category: "koronavirus" },
                { url: "https://www.trthaber.com/gundem_articles.rss", category: "gundem" },
                { url: "https://www.trthaber.com/turkiye_articles.rss", category: "turkiye" },
                { url: "https://www.trthaber.com/dunya_articles.rss", category: "dunya" },
                { url: "https://www.trthaber.com/ekonomi_articles.rss", category: "ekonomi" },
                { url: "https://www.trthaber.com/spor_articles.rss", category: "spor" },
                { url: "https://www.trthaber.com/yasam_articles.rss", category: "yasam" },
                { url: "https://www.trthaber.com/saglik_articles.rss", category: "saglik" },
                { url: "https://www.trthaber.com/kultur_sanat_articles.rss", category: "kultur-sanat" },
                { url: "https://www.trthaber.com/bilim_teknoloji_articles.rss", category: "bilim-teknoloji" },
                { url: "https://www.trthaber.com/guncel_articles.rss", category: "guncel" },
                { url: "https://www.trthaber.com/egitim_articles.rss", category: "egitim" },
                { url: "https://www.trthaber.com/infografik_articles.rss", category: "infografik" },
                { url: "https://www.trthaber.com/interaktif_articles.rss", category: "interaktif" },
                { url: "https://www.trthaber.com/ozel_haber_articles.rss", category: "ozel-haber" },
                { url: "https://www.trthaber.com/dosya_haber_articles.rss", category: "dosya-haber" },
            ],
            parserType: "rss",
            isActive: true,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const count = await Source.countDocuments();
    console.log(`DB'deki kaynak sayisi: ${count}`);
    console.log("Seed tamamlandı");
    await disconnectDatabase();
}

seed().catch(console.error);