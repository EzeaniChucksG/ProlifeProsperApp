/**
 * Zoho CRM Integration Service
 * Handles creating accounts and contacts in Zoho CRM
 */

interface ZohoConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

interface ZohoContact {
  First_Name: string;
  Last_Name: string;
  Email: string;
  Phone?: string;
  Account_Name: string;
  Organization: string;
  Lead_Source: string;
  Description?: string;
}

interface ZohoAccount {
  Account_Name: string;
  Phone?: string;
  Website?: string;
  Description?: string;
  Account_Type: string;
}

class ZohoCrmService {
  private config: ZohoConfig | null = null;
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor() {
    // Initialize config from environment variables
    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;
    const refreshToken = process.env.ZOHO_REFRESH_TOKEN;

    if (clientId && clientSecret && refreshToken) {
      this.config = { clientId, clientSecret, refreshToken };
    }
  }

  /**
   * Check if Zoho CRM integration is available
   */
  isAvailable(): boolean {
    return this.config !== null;
  }

  /**
   * Get access token using refresh token
   */
  private async getAccessToken(): Promise<string> {
    if (!this.config) {
      throw new Error('Zoho CRM configuration not available');
    }

    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: this.config.refreshToken,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get Zoho access token: ${response.status}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      // Set expiry to 50 minutes (tokens last 60 minutes)
      this.tokenExpiry = Date.now() + (50 * 60 * 1000);

      return this.accessToken;
    } catch (error) {
      console.error('Error getting Zoho access token:', error);
      throw error;
    }
  }

  /**
   * Make authenticated request to Zoho CRM API
   */
  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' = 'GET',
    data?: any
  ): Promise<any> {
    const accessToken = await this.getAccessToken();
    
    const response = await fetch(`https://www.zohoapis.com/crm/v2/${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      ...(data && { body: JSON.stringify(data) }),
    });

    if (!response.ok) {
      throw new Error(`Zoho CRM API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Search for an account by name
   */
  async findAccount(accountName: string): Promise<any> {
    try {
      const response = await this.makeRequest(
        `Accounts/search?criteria=Account_Name:equals:${encodeURIComponent(accountName)}`
      );
      return response.data && response.data.length > 0 ? response.data[0] : null;
    } catch (error) {
      console.error('Error searching for account:', error);
      return null;
    }
  }

  /**
   * Create a new account in Zoho CRM
   */
  async createAccount(accountData: ZohoAccount): Promise<any> {
    try {
      const response = await this.makeRequest('Accounts', 'POST', {
        data: [accountData]
      });
      
      if (response.data && response.data.length > 0) {
        return response.data[0];
      }
      throw new Error('Failed to create account');
    } catch (error) {
      console.error('Error creating account:', error);
      throw error;
    }
  }

  /**
   * Ensure the "ProLifeGive" account exists, create if not
   */
  async ensureProLifeGiveAccount(): Promise<string> {
    const accountName = 'ProLifeGive';
    
    // Check if account exists
    let account = await this.findAccount(accountName);
    
    if (!account) {
      // Create the account
      console.log('Creating ProLifeGive account in Zoho CRM');
      account = await this.createAccount({
        Account_Name: accountName,
        Phone: '(800) 555-0100',
        Website: 'https://prolifeprosper.com',
        Description: 'Pro-Life Prosper platform - parent account for all nonprofit organizations',
        Account_Type: 'Technology Partner'
      });
    }

    return account.details?.id || account.id;
  }

  /**
   * Create a contact in Zoho CRM under ProLifeGive account
   */
  async createOrganizationContact(
    organizationName: string,
    email: string,
    phone?: string,
    organizationType?: string
  ): Promise<any> {
    try {
      // Ensure ProLifeGive account exists
      const accountId = await this.ensureProLifeGiveAccount();

      // Extract contact name (use organization name or email prefix)
      const contactName = organizationName || email.split('@')[0];
      const [firstName, ...lastNameParts] = contactName.split(' ');
      const lastName = lastNameParts.join(' ') || 'Organization';

      const contactData: ZohoContact = {
        First_Name: firstName,
        Last_Name: lastName,
        Email: email,
        Phone: phone,
        Account_Name: 'ProLifeGive',
        Organization: organizationName,
        Lead_Source: 'Pro-Life Prosper Platform',
        Description: `${organizationType ? organizationType.charAt(0).toUpperCase() + organizationType.slice(1).replace('-', ' ') + ' - ' : ''}Organization registered through Pro-Life Prosper platform`
      };

      const response = await this.makeRequest('Contacts', 'POST', {
        data: [contactData]
      });

      if (response.data && response.data.length > 0) {
        console.log(`Successfully created Zoho contact for ${organizationName}`);
        return response.data[0];
      }

      throw new Error('Failed to create contact');
    } catch (error) {
      console.error('Error creating organization contact:', error);
      // Don't throw - we don't want CRM errors to block organization creation
      return null;
    }
  }
}

// Export singleton instance
export const zohoCrmService = new ZohoCrmService();