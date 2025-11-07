const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['user', 'assistant', 'system'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    metadata: {
        messageId: String,
        tokens: Number,
        responseTime: Number,
        userRating: {
            type: Number,
            min: 1,
            max: 5
        },
        userFeedback: String
    }
});

const chatSessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    userContext: {
        userType: String,
        businessName: String,
        industry: String,
        location: String,
        preferences: mongoose.Schema.Types.Mixed
    },
    messages: [messageSchema],
    status: {
        type: String,
        enum: ['active', 'closed', 'escalated', 'archived'],
        default: 'active'
    },
    title: {
        type: String,
        maxlength: 200
    },
    summary: {
        type: String,
        maxlength: 1000
    },
    metadata: {
        ipAddress: String,
        userAgent: String,
        deviceType: String,
        location: {
            country: String,
            region: String,
            city: String
        },
        referralSource: String,
        initialQuery: String
    },
    analytics: {
        messageCount: {
            type: Number,
            default: 0
        },
        totalTokens: {
            type: Number,
            default: 0
        },
        averageResponseTime: {
            type: Number,
            default: 0
        },
        userSatisfaction: {
            type: Number,
            default: 0
        },
        escalationCount: {
            type: Number,
            default: 0
        }
    },
    tags: [String],
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    closedAt: Date,
    archivedAt: Date,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for performance
chatSessionSchema.index({ userId: 1, createdAt: -1 });
chatSessionSchema.index({ status: 1, updatedAt: -1 });
chatSessionSchema.index({ 'analytics.userSatisfaction': -1 });
chatSessionSchema.index({ tags: 1 });
chatSessionSchema.index({ priority: 1, updatedAt: -1 });

// Virtual for session duration
chatSessionSchema.virtual('duration').get(function() {
    const endTime = this.closedAt || new Date();
    return endTime - this.createdAt;
});

// Virtual for is active
chatSessionSchema.virtual('isActive').get(function() {
    return this.status === 'active';
});

// Virtual for has unrated messages
chatSessionSchema.virtual('hasUnratedMessages').get(function() {
    return this.messages.some(msg => 
        msg.role === 'assistant' && !msg.metadata.userRating
    );
});

// Pre-save middleware to update analytics
chatSessionSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    
    // Update message count
    this.analytics.messageCount = this.messages.length;
    
    // Update total tokens
    this.analytics.totalTokens = this.messages.reduce((total, msg) => 
        total + (msg.metadata?.tokens || 0), 0
    );
    
    // Update average response time
    const assistantMessages = this.messages.filter(msg => msg.role === 'assistant');
    if (assistantMessages.length > 0) {
        this.analytics.averageResponseTime = assistantMessages.reduce((total, msg) => 
            total + (msg.metadata?.responseTime || 0), 0
        ) / assistantMessages.length;
    }
    
    // Update user satisfaction (average of all ratings)
    const ratedMessages = this.messages.filter(msg => 
        msg.metadata?.userRating
    );
    if (ratedMessages.length > 0) {
        this.analytics.userSatisfaction = ratedMessages.reduce((total, msg) => 
            total + msg.metadata.userRating, 0
        ) / ratedMessages.length;
    }
    
    // Update escalation count
    this.analytics.escalationCount = this.messages.filter(msg => 
        msg.content.toLowerCase().includes('escalat') || 
        msg.metadata?.escalated
    ).length;
    
    // Generate title from first user message if not set
    if (!this.title && this.messages.length > 0) {
        const firstUserMessage = this.messages.find(msg => msg.role === 'user');
        if (firstUserMessage) {
            this.title = firstUserMessage.content.substring(0, 50) + 
                        (firstUserMessage.content.length > 50 ? '...' : '');
        }
    }
    
    next();
});

// Method to add message to session
chatSessionSchema.methods.addMessage = function(role, content, metadata = {}) {
    const message = {
        role,
        content,
        metadata: {
            messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...metadata
        }
    };
    
    this.messages.push(message);
    return this.save();
};

// Method to rate a message
chatSessionSchema.methods.rateMessage = function(messageId, rating, feedback = '') {
    const message = this.messages.find(msg => 
        msg.metadata.messageId === messageId
    );
    
    if (message && message.role === 'assistant') {
        message.metadata.userRating = rating;
        if (feedback) {
            message.metadata.userFeedback = feedback;
        }
        return this.save();
    }
    
    throw new Error('Message not found or cannot be rated');
};

// Method to close session
chatSessionSchema.methods.close = function(reason = 'user_closed') {
    this.status = 'closed';
    this.closedAt = new Date();
    
    // Generate summary if not exists
    if (!this.summary) {
        this.generateSummary();
    }
    
    return this.save();
};

// Method to escalate session
chatSessionSchema.methods.escalate = function(priority = 'high', assignedTo = null) {
    this.status = 'escalated';
    this.priority = priority;
    if (assignedTo) {
        this.assignedTo = assignedTo;
    }
    
    // Add system message about escalation
    this.addMessage('system', 
        `Conversation escalated to human support. Priority: ${priority}.` +
        (assignedTo ? ` Assigned to: ${assignedTo}` : '')
    );
    
    return this.save();
};

// Method to generate conversation summary
chatSessionSchema.methods.generateSummary = function() {
    const userMessages = this.messages.filter(msg => msg.role === 'user');
    const assistantMessages = this.messages.filter(msg => msg.role === 'assistant');
    
    if (userMessages.length === 0) return '';
    
    // Extract key topics from user messages
    const topics = this.extractTopics(userMessages.map(msg => msg.content));
    
    this.summary = `Discussion about ${topics.join(', ')}. ` +
                  `${userMessages.length} user messages, ` +
                  `${assistantMessages.length} assistant responses.`;
    
    return this.summary;
};

// Method to extract topics from messages (simplified)
chatSessionSchema.methods.extractTopics = function(messages) {
    const commonTopics = {
        'pricing': ['price', 'cost', 'expensive', 'cheap', 'discount', 'quote'],
        'products': ['product', 'item', 'catalog', 'inventory', 'stock'],
        'shipping': ['ship', 'delivery', 'track', 'courier', 'transport'],
        'payment': ['pay', 'payment', 'invoice', 'bill', 'card', 'gateway'],
        'account': ['account', 'login', 'password', 'register', 'profile'],
        'support': ['help', 'support', 'assistance', 'problem', 'issue']
    };
    
    const content = messages.join(' ').toLowerCase();
    const foundTopics = [];
    
    Object.entries(commonTopics).forEach(([topic, keywords]) => {
        if (keywords.some(keyword => content.includes(keyword))) {
            foundTopics.push(topic);
        }
    });
    
    return foundTopics.length > 0 ? foundTopics : ['general inquiry'];
};

// Method to calculate session quality score
chatSessionSchema.methods.getQualityScore = function() {
    const weights = {
        userSatisfaction: 0.4,
        messageCount: 0.2,
        responseTime: 0.2,
        escalationCount: 0.2
    };
    
    let score = 0;
    
    // User satisfaction component
    score += (this.analytics.userSatisfaction / 5) * weights.userSatisfaction;
    
    // Message count component (normalized)
    const maxMessages = 50; // reasonable maximum
    score += (Math.min(this.analytics.messageCount, maxMessages) / maxMessages) * weights.messageCount;
    
    // Response time component (faster is better)
    const idealResponseTime = 2000; // 2 seconds
    const responseTimeScore = Math.max(0, 1 - (this.analytics.averageResponseTime / (idealResponseTime * 5)));
    score += responseTimeScore * weights.responseTime;
    
    // Escalation component (fewer escalations are better)
    const escalationScore = Math.max(0, 1 - (this.analytics.escalationCount / 3));
    score += escalationScore * weights.escalationCount;
    
    return Math.min(score * 100, 100); // Convert to percentage
};

// Static method to find active sessions
chatSessionSchema.statics.findActiveSessions = function() {
    return this.find({ status: 'active' })
        .populate('userId', 'firstName lastName email businessName')
        .sort({ updatedAt: -1 });
};

// Static method to find sessions needing follow-up
chatSessionSchema.statics.findNeedFollowUp = function() {
    return this.find({
        status: 'active',
        updatedAt: { 
            $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Older than 24 hours
        }
    })
    .populate('userId', 'firstName lastName email')
    .sort({ updatedAt: 1 });
};

// Static method to get session analytics
chatSessionSchema.statics.getSessionAnalytics = async function(timeRange = '7d') {
    const rangeMap = {
        '24h': new Date(Date.now() - 24 * 60 * 60 * 1000),
        '7d': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        '30d': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    };
    
    const startDate = rangeMap[timeRange] || rangeMap['7d'];
    
    const sessions = await this.find({
        createdAt: { $gte: startDate }
    });
    
    const totalSessions = sessions.length;
    const activeSessions = sessions.filter(s => s.status === 'active').length;
    const closedSessions = sessions.filter(s => s.status === 'closed').length;
    const escalatedSessions = sessions.filter(s => s.status === 'escalated').length;
    
    const totalMessages = sessions.reduce((sum, session) => 
        sum + session.analytics.messageCount, 0
    );
    
    const averageMessagesPerSession = totalSessions > 0 ? 
        totalMessages / totalSessions : 0;
    
    const averageSatisfaction = totalSessions > 0 ?
        sessions.reduce((sum, session) => 
            sum + session.analytics.userSatisfaction, 0
        ) / totalSessions : 0;
    
    return {
        totalSessions,
        activeSessions,
        closedSessions,
        escalatedSessions,
        totalMessages,
        averageMessagesPerSession: Math.round(averageMessagesPerSession * 100) / 100,
        averageSatisfaction: Math.round(averageSatisfaction * 100) / 100,
        timeRange
    };
};

module.exports = mongoose.model('ChatSession', chatSessionSchema);
