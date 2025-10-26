// Database Interface Abstractions for Multi-Database Architecture
// Supports PostgreSQL (current) and DynamoDB (future payment transactions)

export interface DatabaseConfig {
  primary: 'postgresql' | 'dynamodb';
  secondary?: 'postgresql' | 'dynamodb';
}

// Base repository interface for all database operations
export interface BaseRepository<T> {
  create(data: Partial<T>): Promise<T>;
  findById(id: string | number): Promise<T | null>;
  findMany(filters?: any): Promise<T[]>;
  update(id: string | number, data: Partial<T>): Promise<T>;
  delete(id: string | number): Promise<boolean>;
}

// Payment-specific repository interface optimized for high-throughput
export interface PaymentRepository<T> extends BaseRepository<T> {
  // High-performance payment operations
  createTransaction(transaction: Partial<T>): Promise<T>;
  findByTransactionId(transactionId: string): Promise<T | null>;
  findByDateRange(startDate: Date, endDate: Date, organizationId?: number): Promise<T[]>;
  updateTransactionStatus(transactionId: string, status: string): Promise<T>;
  
  // Batch operations for massive scale
  createBatch(transactions: Partial<T>[]): Promise<T[]>;
  findPendingTransactions(limit?: number): Promise<T[]>;
  
  // Analytics queries optimized for speed
  getTransactionMetrics(organizationId: number, timeframe: string): Promise<any>;
  getDailyVolume(organizationId: number, days: number): Promise<any[]>;
}

// Standard repository interface for regular data operations
export interface StandardRepository<T> extends BaseRepository<T> {
  // Relational operations
  findWithRelations(id: string | number, relations: string[]): Promise<T | null>;
  findByOrganization(organizationId: number): Promise<T[]>;
  search(query: string, filters?: any): Promise<T[]>;
}

// Database factory pattern for swappable implementations
export interface DatabaseFactory {
  createPaymentRepository<T>(): PaymentRepository<T>;
  createStandardRepository<T>(): StandardRepository<T>;
  getConnection(): any;
  healthCheck(): Promise<boolean>;
}

// Configuration for database routing
export interface DatabaseRouter {
  // Route payment transactions to high-speed database (future DynamoDB)
  getPaymentDatabase(): DatabaseFactory;
  
  // Route standard operations to relational database (PostgreSQL)
  getStandardDatabase(): DatabaseFactory;
  
  // Configuration management
  configureRouting(config: DatabaseConfig): void;
}

export type DatabaseOperation = 'payment' | 'standard';
export type DatabaseType = 'postgresql' | 'dynamodb';