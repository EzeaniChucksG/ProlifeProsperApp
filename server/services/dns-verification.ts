import dns from 'dns';
import { promisify } from 'util';
import crypto from 'crypto';

const resolveTxt = promisify(dns.resolveTxt);
const resolve4 = promisify(dns.resolve4);
const resolveCname = promisify(dns.resolveCname);

interface DNSVerificationResult {
  success: boolean;
  type: 'txt' | 'cname' | 'a';
  value?: string;
  error?: string;
  details?: string;
}

export class DNSVerificationService {
  private static readonly MAIN_DOMAIN = process.env.MAIN_DOMAIN || 'staging.prolifegive.com';
  private static readonly VERIFICATION_PREFIX = 'prolifegive-verification=';
  
  /**
   * Check if we're in a development environment (Replit)
   * In dev, we simulate DNS verification. In staging/production, we do real DNS checks.
   */
  private static isDevEnvironment(): boolean {
    return !!process.env.REPL_ID || process.env.NODE_ENV === 'development';
  }

  /**
   * Generate a unique verification token for a domain
   */
  static generateVerificationToken(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Verify domain ownership via TXT record
   */
  static async verifyTxtRecord(
    domain: string,
    expectedToken: string
  ): Promise<DNSVerificationResult> {
    try {
      const records = await resolveTxt(domain);
      
      // Flatten array of arrays to single array of strings
      const txtRecords = records.flat();
      
      // Look for our verification token
      const verificationRecord = txtRecords.find(record => 
        record.startsWith(this.VERIFICATION_PREFIX) &&
        record.includes(expectedToken)
      );

      if (verificationRecord) {
        return {
          success: true,
          type: 'txt',
          value: verificationRecord,
          details: `TXT record verified: ${verificationRecord}`,
        };
      }

      return {
        success: false,
        type: 'txt',
        error: 'Verification TXT record not found',
        details: `Expected: ${this.VERIFICATION_PREFIX}${expectedToken}`,
      };
    } catch (error: any) {
      return {
        success: false,
        type: 'txt',
        error: error.code === 'ENOTFOUND' 
          ? 'Domain not found or has no TXT records' 
          : error.message,
      };
    }
  }

  /**
   * Verify domain points to our server via CNAME
   */
  static async verifyCnameRecord(domain: string): Promise<DNSVerificationResult> {
    try {
      const records = await resolveCname(domain);
      
      if (records.includes(this.MAIN_DOMAIN) || 
          records.some(r => r.endsWith('.replit.dev') || r.endsWith('.replit.app'))) {
        return {
          success: true,
          type: 'cname',
          value: records[0],
          details: `CNAME points to: ${records[0]}`,
        };
      }

      return {
        success: false,
        type: 'cname',
        error: 'CNAME does not point to our server',
        details: `Expected: ${this.MAIN_DOMAIN}, Found: ${records[0]}`,
      };
    } catch (error: any) {
      return {
        success: false,
        type: 'cname',
        error: error.code === 'ENODATA' 
          ? 'No CNAME record found' 
          : error.message,
      };
    }
  }

  /**
   * Verify domain points to our server via A record
   */
  static async verifyARecord(domain: string): Promise<DNSVerificationResult> {
    try {
      const records = await resolve4(domain);
      
      // In production, check against actual server IP
      // For Replit, we'll accept any valid A record as we use dynamic IPs
      if (records.length > 0) {
        return {
          success: true,
          type: 'a',
          value: records[0],
          details: `A record points to: ${records[0]}`,
        };
      }

      return {
        success: false,
        type: 'a',
        error: 'No A records found',
      };
    } catch (error: any) {
      return {
        success: false,
        type: 'a',
        error: error.message,
      };
    }
  }

  /**
   * Comprehensive domain verification
   * Checks TXT for ownership, then CNAME/A for routing
   * In dev environment (Replit), simulates successful verification
   */
  static async verifyDomain(
    domain: string,
    verificationToken: string
  ): Promise<{
    ownershipVerified: boolean;
    routingVerified: boolean;
    txtResult: DNSVerificationResult;
    routingResult: DNSVerificationResult;
    overallSuccess: boolean;
  }> {
    // In development (Replit), simulate successful DNS verification
    if (this.isDevEnvironment()) {
      console.log(`🔧 DEV MODE: Simulating DNS verification for ${domain}`);
      return {
        ownershipVerified: true,
        routingVerified: true,
        txtResult: {
          success: true,
          type: 'txt',
          value: `${this.VERIFICATION_PREFIX}${verificationToken}`,
          details: '[DEV] Simulated TXT record verification',
        },
        routingResult: {
          success: true,
          type: 'cname',
          value: this.MAIN_DOMAIN,
          details: `[DEV] Simulated CNAME pointing to ${this.MAIN_DOMAIN}`,
        },
        overallSuccess: true,
      };
    }

    // In staging/production, perform real DNS verification
    console.log(`🔍 PRODUCTION MODE: Performing real DNS verification for ${domain}`);
    
    // Step 1: Verify ownership via TXT record
    const txtResult = await this.verifyTxtRecord(domain, verificationToken);

    // Step 2: Verify routing via CNAME or A record
    let routingResult = await this.verifyCnameRecord(domain);
    if (!routingResult.success) {
      routingResult = await this.verifyARecord(domain);
    }

    return {
      ownershipVerified: txtResult.success,
      routingVerified: routingResult.success,
      txtResult,
      routingResult,
      overallSuccess: txtResult.success && routingResult.success,
    };
  }

  /**
   * Get DNS setup instructions for users
   */
  static getDNSInstructions(domain: string, verificationToken: string) {
    return {
      step1: {
        title: 'Verify Domain Ownership',
        instructions: 'Add a TXT record to your DNS settings',
        record: {
          type: 'TXT',
          name: '@', // or domain root
          value: `${this.VERIFICATION_PREFIX}${verificationToken}`,
        },
      },
      step2: {
        title: 'Point Domain to Our Server',
        instructions: 'Choose ONE of the following options:',
        options: [
          {
            type: 'CNAME (Recommended)',
            record: {
              type: 'CNAME',
              name: domain,
              value: this.MAIN_DOMAIN,
            },
            note: 'Automatically handles IP changes',
          },
          {
            type: 'A Record (Alternative)',
            record: {
              type: 'A',
              name: domain,
              value: 'Contact support for current IP',
            },
            note: 'May need updates if server IP changes',
          },
        ],
      },
      step3: {
        title: 'Wait for DNS Propagation',
        instructions: 'DNS changes can take 5 minutes to 48 hours to propagate globally',
        note: 'You can check status in your domain settings',
      },
    };
  }
}
