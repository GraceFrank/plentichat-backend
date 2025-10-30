import { Assistant } from "./assistant";

export interface SocialAccountData {
    id: string;
    created_at: string;
    user_id: string;
    platform: string;
    platform_account_id: string;
    platform_user_id?: string;
    access_token: string;
    token_expires_at: string;
    assistant_id?: string;
    is_active: boolean;
    reply_timeout_seconds: number;
    assistant?: Assistant
}