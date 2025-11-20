import { tool } from "langchain";
import { z } from "zod";
import { DateTime } from "luxon";
import type { AgentContext } from "..";

/**
 * Tool for getting current date and time
 * Allows the agent to query the current time in the user's timezone
 */
const currentTimeTool = tool(
  async (_input: Record<string, never>, config?: { context?: AgentContext }) => {
    const context = config?.context;
    if (!context) {
      throw new Error('Agent context is required');
    }
    const timezone = context.assistant.timezone || 'UTC';

    const now = DateTime.now().setZone(timezone);

    const response = {
      currentDateTime: now.toFormat('cccc, MMMM d, yyyy \'at\' h:mm a ZZZZ'),
      timezone: timezone,
      isoFormat: now.toISO(),
      dayOfWeek: now.weekdayLong,
      date: now.toFormat('MMMM d, yyyy'),
      time: now.toFormat('h:mm a'),
    };

    return `Current Date and Time Information:
- Full DateTime: ${response.currentDateTime}
- Day: ${response.dayOfWeek}
- Date: ${response.date}
- Time: ${response.time}
- Timezone: ${response.timezone}`;
  },
  {
    name: "get_current_time",
    description: "Get the current date and time in the user's timezone. Use this tool when you need to know what time or date it is right now, or when reasoning about time-sensitive matters.",
    schema: z.object({}),
  }
);

export default currentTimeTool;
