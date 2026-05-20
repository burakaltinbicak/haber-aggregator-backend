import { FastifyInstance } from "fastify";
import { Source } from "../../database/models";
import { parseFeedUrl } from "../../parsers/universal";
import { logger } from "../../utils/logger";

export async function adminRoutes(app: FastifyInstance): Promise<void> {
    // Tüm kaynakları listele
    app.get("/admin/sources", async (request, reply) => {
        const sources = await Source.find().sort({ createdAt: -1 });
        return reply.send(sources);
    });

    // Yeni kaynak ekle
    app.post("/admin/sources", async (request, reply) => {
        const body = request.body as any;

        if (!body.name || !body.slug || !body.baseUrl || !body.feeds || body.feeds.length === 0) {
            return reply.status(400).send({ error: "Eksik alanlar" });
        }

        try {
            const source = await Source.create({
                name: body.name,
                slug: body.slug,
                baseUrl: body.baseUrl,
                feeds: body.feeds,
                parserType: body.parserType || "rss",
                isActive: body.isActive ?? true,
            });

            return reply.send({ message: "Kaynak eklendi", source });
        } catch (error: any) {
            if (error.code === 11000) {
                return reply.status(409).send({ error: "Bu slug zaten kullanılıyor" });
            }
            logger.error("Kaynak eklenirken hata", error);
            return reply.status(500).send({ error: "Kaynak eklenemedi" });
        }
    });

    // Kaynak sil
    app.delete("/admin/sources/:id", async (request, reply) => {
        const { id } = request.params as any;

        try {
            const result = await Source.findByIdAndDelete(id);
            if (!result) {
                return reply.status(404).send({ error: "Kaynak bulunamadı" });
            }
            return reply.send({ message: "Kaynak silindi" });
        } catch (error) {
            logger.error("Kaynak silinirken hata", error);
            return reply.status(500).send({ error: "Kaynak silinemedi" });
        }
    });

    // Kaynak güncelle
    app.put("/admin/sources/:id", async (request, reply) => {
        const { id } = request.params as any;
        const body = request.body as any;

        try {
            const source = await Source.findByIdAndUpdate(
                id,
                { $set: body },
                { new: true, runValidators: true }
            );

            if (!source) {
                return reply.status(404).send({ error: "Kaynak bulunamadı" });
            }

            return reply.send({ message: "Kaynak güncellendi", source });
        } catch (error: any) {
            if (error.code === 11000) {
                return reply.status(409).send({ error: "Bu slug zaten kullanılıyor" });
            }
            logger.error("Kaynak güncellenirken hata", error);
            return reply.status(500).send({ error: "Kaynak güncellenemedi" });
        }
    });

    // RSS Preview - Kullanıcı eklemeden önce test etsin
    app.post("/admin/sources/preview", async (request, reply) => {
        const body = request.body as any;

        if (!body.url) {
            return reply.status(400).send({ error: "URL gerekli" });
        }

        try {
            const articles = await parseFeedUrl(body.url);
            const preview = articles.slice(0, 3).map(a => ({
                title: a.title,
                summary: a.summary?.substring(0, 200),
                publishedAt: a.publishedAt,
                originalUrl: a.originalUrl,
                imageUrl: a.imageUrl,
            }));

            return reply.send({
                totalFound: articles.length,
                preview,
                format: "Basariyla parse edildi",
            });
        } catch (error) {
            logger.error("Preview hatasi", error);
            return reply.status(400).send({
                error: "RSS parse edilemedi",
                detail: (error as Error).message
            });
        }
    });

    // Kaynak aktif/pasif toggle
    app.patch("/admin/sources/:id/toggle", async (request, reply) => {
        const { id } = request.params as any;

        try {
            const source = await Source.findById(id);
            if (!source) {
                return reply.status(404).send({ error: "Kaynak bulunamadı" });
            }

            source.isActive = !source.isActive;
            await source.save();

            return reply.send({
                message: `Kaynak ${source.isActive ? "aktif" : "pasif"} edildi`,
                source
            });
        } catch (error) {
            logger.error("Toggle hatasi", error);
            return reply.status(500).send({ error: "Islem basarisiz" });
        }
    });
}