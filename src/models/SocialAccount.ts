import { SupabaseClient } from '@supabase/supabase-js';
import { decryptToken } from '@/services/googleKms.service';
import { logger } from '@/config/logger';
import { Assistant } from '@/types/assistant';

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
  assistant?: Assistant
}

export class SocialAccount {
  private data: SocialAccountData;
  private _decryptedToken?: string;

  constructor(data: SocialAccountData) {
    this.data = data;
  }

  get id(): string {
    return this.data.id;
  }

  get userId(): string {
    return this.data.user_id;
  }

  get platform(): string {
    return this.data.platform;
  }

  get platformAccountId(): string {
    return this.data.platform_account_id;
  }

  get platformUserId(): string | undefined {
    return this.data.platform_user_id;
  }

  get assistantId(): string | undefined {
    return this.data.assistant_id;
  }

  get isActive(): boolean {
    return this.data.is_active;
  }

  get tokenExpiresAt(): string {
    return this.data.token_expires_at;
  }

  get assistant(): Assistant | undefined {
    return this.data.assistant;
  }

  /**
   * Get decrypted access token
   * Caches the decrypted token to avoid multiple decryption calls
   */
  async getAccessToken(): Promise<string> {
    if (this._decryptedToken) {
      return this._decryptedToken;
    }

    try {
      this._decryptedToken = await decryptToken(this.data.access_token);
      return this._decryptedToken;
    } catch (error) {
      logger.error({ err: error, accountId: this.id }, 'Failed to decrypt access token');
      throw new Error('Failed to decrypt access token');
    }
  }

  /**
   * Check if token is expired or about to expire
   */
  isTokenExpired(bufferMinutes: number = 5): boolean {
    const expiryDate = new Date(this.data.token_expires_at);
    const now = new Date();
    const bufferMs = bufferMinutes * 60 * 1000;
    return expiryDate.getTime() - now.getTime() < bufferMs;
  }

  /**
   * Convert to plain object
   */
  toJSON(): SocialAccountData {
    return { ...this.data };
  }

  /**
   * Find a single account by ID
   */
  static async findById(
    supabase: SupabaseClient,
    accountId: string,
    isActive?: boolean
  ): Promise<SocialAccount | null> {

    const query = supabase
      .from('social_accounts')
      .select('*')
      .eq('id', accountId);

    // Only filter by is_active if explicitly provided
    if (isActive !== undefined) {
      query.eq('is_active', isActive);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return null;
    }

    return new SocialAccount(data as SocialAccountData);
  }

  /**
   * Find active Instagram accounts for a user
   */
  static async findByUserId(
    supabase: SupabaseClient,
    userId: string,
    platform: string = 'instagram'
  ): Promise<SocialAccount[]> {
    const { data, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', platform)
      .eq('is_active', true);

    if (error) {
      logger.error({ err: error, userId, platform }, 'Error fetching social accounts');
      throw new Error('Failed to fetch social accounts');
    }

    return (data || []).map((account) => new SocialAccount(account as SocialAccountData));
  }

  /**
   * Find a single account by platform user ID
   * @param includeAssistant - If true, also fetches the associated assistant
   */
  static async findByPlatformUserId(
    supabase: SupabaseClient,
    platformUserId: string,
    platform: string = 'instagram',
    includeAssistant: boolean = false
  ): Promise<SocialAccount | null> {
    const selectFields = includeAssistant ? `*, assistant:assistants(*)` : '*';

    const { data, error } = await supabase
      .from('social_accounts')
      .select(selectFields)
      .eq('platform_user_id', platformUserId)
      .eq('platform', platform)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    const accountData: any = data;
    const account = new SocialAccount(accountData as SocialAccountData);

    return account;
  }

  /**
   * Find account with assistant details
   */
  static async findWithAssistant(
    supabase: SupabaseClient,
    platformUserId: string,
    platform: string = 'instagram'
  ): Promise<{ account: SocialAccount; assistant: any } | null> {
    const { data, error } = await supabase
      .from('social_accounts')
      .select(`
        *,
        assistants (*)
      `)
      .eq('platform_user_id', platformUserId)
      .eq('platform', platform)
      .eq('is_active', true)
      .not('assistant_id', 'is', null)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      account: new SocialAccount(data as SocialAccountData),
      assistant: data.assistants,
    };
  }



  /**
   * Update account status
   */
  static async updateStatus(
    supabase: SupabaseClient,
    accountId: string,
    isActive: boolean
  ): Promise<void> {
    const { error } = await supabase
      .from('social_accounts')
      .update({ is_active: isActive })
      .eq('id', accountId);

    if (error) {
      logger.error({ err: error, accountId }, 'Error updating account status');
      throw new Error('Failed to update account status');
    }
  }
}
