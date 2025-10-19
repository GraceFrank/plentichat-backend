import IORedis from "ioredis";
import { env } from "./env";

export default new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
});

