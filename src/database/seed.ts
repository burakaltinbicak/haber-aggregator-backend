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
            rssUrl: "https://www.ntv.com.tr/turkiye.rss",
            parserType: "rss",
            isActive: true,
        },
        { upsert: true, new: true }
    );

    await Source.findOneAndUpdate(
        { slug: "trthaber" },
        {
            name: "TRT Haber",
            slug: "trthaber",
            baseUrl: "https://www.trthaber.com",
            rssUrl: "https://www.trthaber.com/manset_articles.rss",
            parserType: "rss",
            isActive: true,
        },
        { upsert: true, new: true }
    );

    console.log("Seed tamamlandı");
    await disconnectDatabase();
}

seed().catch(console.error);