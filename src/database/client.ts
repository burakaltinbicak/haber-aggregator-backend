import mongoose from "mongoose";
import { config } from "../config/env";

export async function connectDatabase(): Promise<void> {
    await mongoose.connect(config.databaseUrl);
    console.log("MongoDB Atlas bağlantısı başarılı");
}

export async function disconnectDatabase(): Promise<void> {
    await mongoose.disconnect();
}