import { Worker } from "bullmq";
import redisConnection from "@/config/redis";



const worker = new Worker(
    "delayed-check",
    async (job) => {
        const { conversationId, messageId } = job.data;

        console.log(`⏳ Running delayed check for conversation ${conversationId}`);

        const hasHumanReplied = await checkHumanActivity(conversationId);

        if (!hasHumanReplied) {
            console.log("💬 Human inactive — sending AI response...");
            await sendAIResponse(conversationId, messageId);
        } else {
            console.log("🙋‍♂️ Human already replied — skipping AI response.");
        }
    },
    { connection: redisConnection }
);

worker.on("completed", (job) =>
    console.log(`✅ Job ${job.id} completed successfully`)
);
worker.on("failed", (job, err) =>
    console.error(`❌ Job ${job?.id} failed:`, err)
);
