const mysql = require('mysql2/promise');

class DatabaseConfig {
    constructor() {
        this.config = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USERNAME || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'b2b_marketplace',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            acquireTimeout: 60000,
            timeout: 60000,
            reconnect: true
        };
        
        this.pool = null;
    }

    async initialize() {
        try {
            this.pool = mysql.createPool(this.config);
            
            // Test connection
            const connection = await this.pool.getConnection();
            console.log('✅ Database connected successfully');
            connection.release();
            
            return this.pool;
        } catch (error) {
            console.error('❌ Database connection failed:', error);
            throw error;
        }
    }

    getPool() {
        if (!this.pool) {
            throw new Error('Database pool not initialized. Call initialize() first.');
        }
        return this.pool;
    }

    async query(sql, params = []) {
        const pool = this.getPool();
        try {
            const [results] = await pool.execute(sql, params);
            return results;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    async transaction(callback) {
        const connection = await this.getPool().getConnection();
        
        try {
            await connection.beginTransaction();
            const result = await callback(connection);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async close() {
        if (this.pool) {
            await this.pool.end();
            console.log('Database connection closed');
        }
    }

    // Health check
    async healthCheck() {
        try {
            const [result] = await this.query('SELECT 1 as health');
            return result.health === 1;
        } catch (error) {
            return false;
        }
    }

    // Backup database (simplified)
    async backup() {
        // In production, this would use mysqldump
        console.log('Database backup triggered');
        return true;
    }

    // Optimize tables
    async optimize() {
        try {
            const [tables] = await this.query('SHOW TABLES');
            
            for (const table of tables) {
                const tableName = table[`Tables_in_${this.config.database}`];
                await this.query(`OPTIMIZE TABLE ${tableName}`);
            }
            
            console.log('Database optimization completed');
            return true;
        } catch (error) {
            console.error('Database optimization failed:', error);
            return false;
        }
    }
}

module.exports = new DatabaseConfig();
