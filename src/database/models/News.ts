import mongoose from "mongoose";

const NewsSchema = new mongoose.Schema({
    sourceId: { type: mongoose.Schema.Types.ObjectId, ref: "Source", required: true },
    externalId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    summary: { type: String },
    content: { type: String },
    imageUrl: { type: String },
    originalUrl: { type: String, required: true },
    publishedAt: { type: Date, required: true },
    fetchedAt: { type: Date, default: Date.now },
    category: { type: String },
    rawData: { type: String },
});

export const News = mongoose.model("News", NewsSchema);