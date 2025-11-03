import { z } from "zod";
import { tool } from "langchain";
import { AgentEscalationService } from "@/services/escalation.service";
import type { AgentContext } from "../index";

/**
 * Create an escalation tool for the AI agent
 * Allows the agent to escalate conversations to humans
 */
const escalationTool = tool(
  async ({ summary, context }: { summary: string; context: string }, config: any) => {
    const toolContext = config.context as AgentContext;
    const { escalationChannel, socialAccount, conversationId, senderUsername } = toolContext;

    const escalationParams: {
      summary: string;
      context: string;
      conversationId: string;
      socialAccountID: string;
      userName?: string;
      escalationChannel: any;
    } = {
      summary,
      context,
      conversationId,
      socialAccountID: socialAccount.id,
      escalationChannel,
    };

    if (senderUsername) {
      escalationParams.userName = senderUsername;
    }

    await AgentEscalationService.escalateToHumanAgent(escalationParams);

    return "Successfully escalated the conversation to a human agent. They will be notified via their preferred channel.";
  },
  {
    name: "escalate_to_human",
    description: `Escalate the conversation to a human operator when you cannot help the customer or when they explicitly request to speak with a human. Use this tool when:
- Customer requests to speak with a human/agent/manager
- Issue is too complex or outside your capabilities
- Customer is frustrated or upset
- Sensitive information or account issues need human attention`,

    schema: z.object({
      context: z.string().describe("Context of the conversation and reason for escalation"),
      summary: z.string().describe("A brief and concise summary of what the customer is asking (no more than 1 sentence)"),
    }),
  }
);

export default escalationTool;

