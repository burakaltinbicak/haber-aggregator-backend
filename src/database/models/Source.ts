import mongoose from "mongoose";

const SourceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    baseUrl: { type: String, required: true },
    rssUrl: { type: String },
    parserType: { type: String, default: "rss" },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
});

export const Source = mongoose.model("Source", SourceSchema);