const mongoose = require('mongoose');

class Database {
    constructor() {
        this.isConnected = false;
        this.connection = null;
    }

    async connect() {
        try {
            const dbUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/b2b-marketplace';
            
            this.connection = await mongoose.connect(dbUrl, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });

            this.isConnected = true;
            
            mongoose.connection.on('error', (error) => {
                console.error('MongoDB connection error:', error);
                this.isConnected = false;
            });

            mongoose.connection.on('disconnected', () => {
                console.log('MongoDB disconnected');
                this.isConnected = false;
            });

            mongoose.connection.on('reconnected', () => {
                console.log('MongoDB reconnected');
                this.isConnected = true;
            });

            console.log('✅ MongoDB connected successfully');
            
        } catch (error) {
            console.error('❌ MongoDB connection failed:', error);
            process.exit(1);
        }
    }

    async disconnect() {
        if (this.isConnected) {
            await mongoose.disconnect();
            this.isConnected = false;
            console.log('✅ MongoDB disconnected');
        }
    }

    getConnection() {
        return this.connection;
    }

    getStatus() {
        return {
            isConnected: this.isConnected,
            readyState: mongoose.connection.readyState,
            host: mongoose.connection.host,
            name: mongoose.connection.name
        };
    }
}

module.exports = new Database();
