import Fastify from "fastify";
import { logger } from "../utils/logger";

import fastifyStatic from "@fastify/static";//fron için
import path from "path";// front için

export const app = Fastify();
//front için 
app.register(fastifyStatic, {
    root: path.resolve(process.cwd(), "public"),
    prefix: "/",
});

app.setErrorHandler((error, request, reply) => {
    logger.error("Sunucu hatası", error);
    reply.status(500).send({ error: "Internal Server Error" });
});