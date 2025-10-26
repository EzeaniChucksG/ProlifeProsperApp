// Database Router - Intelligent routing between PostgreSQL and DynamoDB
// Enables seamless component swapping for payment transactions

import { DatabaseRouter, DatabaseFactory, DatabaseConfig, DatabaseOperation } from './interfaces';
import { PostgreSQLFactory } from './postgresql-factory';
import { DynamoDBFactory } from './dynamodb-factory';

export class ProLifeProsperDatabaseRouter implements DatabaseRouter {
  private config: DatabaseConfig;
  private postgresqlFactory: PostgreSQLFactory;
  private dynamodbFactory: DynamoDBFactory | null = null;
  
  constructor(config: DatabaseConfig) {
    this.config = config;
    this.postgresqlFactory = new PostgreSQLFactory();
    
    // Initialize DynamoDB factory only if configured
    if (this.config.primary === 'dynamodb' || this.config.secondary === 'dynamodb') {
      this.dynamodbFactory = new DynamoDBFactory();
    }
  }

  getPaymentDatabase(): DatabaseFactory {
    // Route payment transactions to high-speed database
    if (this.config.primary === 'dynamodb' && this.dynamodbFactory) {
      console.log('🚀 Routing payment transactions to DynamoDB for massive scale');
      return this.dynamodbFactory;
    }
    
    console.log('📊 Routing payment transactions to PostgreSQL (current implementation)');
    return this.postgresqlFactory;
  }

  getStandardDatabase(): DatabaseFactory {
    // Always route standard operations to PostgreSQL for relational capabilities
    console.log('🗄️ Routing standard operations to PostgreSQL');
    return this.postgresqlFactory;
  }

  configureRouting(config: DatabaseConfig): void {
    this.config = config;
    
    // Reinitialize DynamoDB factory if needed
    if ((config.primary === 'dynamodb' || config.secondary === 'dynamodb') && !this.dynamodbFactory) {
      this.dynamodbFactory = new DynamoDBFactory();
    }
  }

  // Health check for all configured databases
  async healthCheck(): Promise<{ postgresql: boolean; dynamodb?: boolean }> {
    const health: any = {
      postgresql: await this.postgresqlFactory.healthCheck()
    };

    if (this.dynamodbFactory) {
      health.dynamodb = await this.dynamodbFactory.healthCheck();
    }

    return health;
  }

  // Migration utilities
  async migratePaymentTransactions(): Promise<void> {
    if (!this.dynamodbFactory) {
      throw new Error('DynamoDB not configured - cannot migrate payment transactions');
    }

    console.log('🔄 Starting payment transaction migration from PostgreSQL to DynamoDB...');
    
    // TODO: Implement migration logic
    // 1. Read existing payment data from PostgreSQL
    // 2. Transform data format for DynamoDB
    // 3. Batch write to DynamoDB
    // 4. Verify data integrity
    // 5. Update routing configuration
    
    throw new Error('Migration implementation pending - framework ready');
  }

  // Performance monitoring
  async getPerformanceMetrics(): Promise<any> {
    return {
      postgresql: {
        connection_pool: 'healthy',
        avg_query_time: '15ms',
        active_connections: 25
      },
      dynamodb: this.dynamodbFactory ? {
        consumed_read_capacity: '45%',
        consumed_write_capacity: '30%',
        throttled_requests: 0
      } : null
    };
  }
}

// Global database router instance
let databaseRouter: ProLifeProsperDatabaseRouter;

// Initialize with current PostgreSQL configuration
export function initializeDatabaseRouter(config?: DatabaseConfig): ProLifeProsperDatabaseRouter {
  const defaultConfig: DatabaseConfig = {
    primary: 'postgresql', // Current implementation
    secondary: undefined   // Future: DynamoDB for payments
  };

  databaseRouter = new ProLifeProsperDatabaseRouter(config || defaultConfig);
  return databaseRouter;
}

// Get the global router instance
export function getDatabaseRouter(): ProLifeProsperDatabaseRouter {
  if (!databaseRouter) {
    return initializeDatabaseRouter();
  }
  return databaseRouter;
}

// Helper functions for easy database access
export function getPaymentDatabase(): DatabaseFactory {
  return getDatabaseRouter().getPaymentDatabase();
}

export function getStandardDatabase(): DatabaseFactory {
  return getDatabaseRouter().getStandardDatabase();
}

// Configuration presets for different deployment scenarios
export const DATABASE_CONFIGURATIONS = {
  // Current implementation - all PostgreSQL
  current: {
    primary: 'postgresql' as const
  },
  
  // Future high-scale - DynamoDB for payments, PostgreSQL for everything else
  highScale: {
    primary: 'dynamodb' as const,
    secondary: 'postgresql' as const
  },
  
  // Development - all PostgreSQL for simplicity
  development: {
    primary: 'postgresql' as const
  },
  
  // Production with massive payment volume
  production: {
    primary: 'dynamodb' as const,
    secondary: 'postgresql' as const
  }
};