import { Queue, Worker } from "bullmq";
import redisConnection from "@/config/redis";



const messageHandoffQueue = new Queue("message-handoff", { connection: redisConnection });




export default messageHandoffQueue