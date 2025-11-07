const { OpenAI } = require('openai');
const mongoose = require('mongoose');
const ChatSession = require('../../backend/models/ChatSession');

class BronwynChatbot {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        this.contextWindow = 10; // Number of messages to keep in context
        this.temperature = 0.7;
        this.isInitialized = false;
        this.conversationHistory = new Map();
    }

    async initialize() {
        try {
            console.log('🔄 Initializing Bronwyn Customer Support Agent...');
            
            // Test OpenAI connection
            await this.testOpenAIConnection();
            
            // Load recent chat sessions
            await this.loadRecentSessions();
            
            this.isInitialized = true;
            console.log('✅ Bronwyn Customer Support Agent initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Bronwyn:', error);
            throw error;
        }
    }

    async testOpenAIConnection() {
        try {
            await this.openai.models.list();
            console.log('🔗 OpenAI connection successful');
        } catch (error) {
            console.error('❌ OpenAI connection failed:', error);
            throw error;
        }
    }

    async loadRecentSessions() {
        // Load recent chat sessions for context (last 24 hours)
        const recentSessions = await ChatSession.find({
            updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }).limit(100);

        recentSessions.forEach(session => {
            this.conversationHistory.set(session.sessionId, session.messages);
        });

        console.log(`📚 Loaded ${recentSessions.length} recent chat sessions`);
    }

    async chat(sessionId, userMessage, userContext = {}) {
        try {
            if (!this.isInitialized) {
                throw new Error('Chatbot not initialized');
            }

            // Get or create conversation history
            let conversation = this.conversationHistory.get(sessionId) || [];
            
            // Add user message to conversation
            conversation.push({
                role: 'user',
                content: userMessage,
                timestamp: new Date()
            });

            // Prepare context for the AI
            const systemPrompt = this.generateSystemPrompt(userContext);
            const messages = this.prepareMessages(systemPrompt, conversation);

            // Generate response using OpenAI
            const response = await this.generateResponse(messages);

            // Add AI response to conversation
            conversation.push({
                role: 'assistant',
                content: response,
                timestamp: new Date()
            });

            // Maintain context window
            if (conversation.length > this.contextWindow * 2) {
                conversation = conversation.slice(-this.contextWindow * 2);
            }

            // Update conversation history
            this.conversationHistory.set(sessionId, conversation);

            // Save to database
            await this.saveChatSession(sessionId, conversation, userContext);

            return {
                success: true,
                response: response,
                sessionId: sessionId,
                timestamp: new Date()
            };

        } catch (error) {
            console.error('Chat error:', error);
            return {
                success: false,
                response: this.getFallbackResponse(userMessage),
                error: error.message
            };
        }
    }

    generateSystemPrompt(userContext) {
        const basePrompt = `You are Bronwyn, an AI customer support assistant for B2B ZAR Marketplace, a South African B2B e-commerce platform. 

Key information about the platform:
- We connect South African businesses with suppliers
- We support B-BBEE compliant businesses
- We handle payments in ZAR (South African Rand)
- We offer products across multiple categories: Industrial Equipment, Office Supplies, Safety Gear, etc.

Your personality:
- Friendly but professional
- Knowledgeable about South African business practices
- Helpful and solution-oriented
- Always verify important information before giving definitive answers

Guidelines:
- Be concise but thorough
- Ask clarifying questions when needed
- Provide accurate information about products, shipping, and payments
- Escalate to human support when necessary
- Maintain a positive, helpful tone

Current context:
- User type: ${userContext.userType || 'Unknown'}
- Business: ${userContext.businessName || 'Not specified'}
- Location: ${userContext.location || 'South Africa'}

Important: Always represent B2B ZAR Marketplace professionally and accurately.`;

        return basePrompt;
    }

    prepareMessages(systemPrompt, conversation) {
        const messages = [
            { role: 'system', content: systemPrompt }
        ];

        // Add recent conversation history
        const recentMessages = conversation.slice(-this.contextWindow);
        
        recentMessages.forEach(msg => {
            messages.push({
                role: msg.role,
                content: msg.content
            });
        });

        return messages;
    }

    async generateResponse(messages) {
        try {
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: messages,
                temperature: this.temperature,
                max_tokens: 500,
                top_p: 0.9,
                frequency_penalty: 0.1,
                presence_penalty: 0.1
            });

            return completion.choices[0].message.content;

        } catch (error) {
            console.error('OpenAI API error:', error);
            throw new Error('Failed to generate response');
        }
    }

    getFallbackResponse(userMessage) {
        const fallbackResponses = [
            "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
            "I'm currently experiencing technical difficulties. Could you please rephrase your question or try again later?",
            "I'm unable to respond at the moment. Please contact our human support team for immediate assistance.",
            "Thank you for your message. I'm temporarily unavailable. Our support team will get back to you shortly."
        ];

        // Simple keyword matching for basic responses
        const lowerMessage = userMessage.toLowerCase();

        if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
            return "Hello! I'm Bronwyn. I'm currently having some technical issues, but our team is here to help. How can we assist you today?";
        }

        if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
            return "For accurate pricing information, please check our website or contact our sales team directly. They'll be happy to provide you with current pricing.";
        }

        if (lowerMessage.includes('order') || lowerMessage.includes('track')) {
            return "For order status and tracking information, please visit the 'My Orders' section in your account or contact our support team with your order number.";
        }

        return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    }

    async saveChatSession(sessionId, messages, userContext) {
        try {
            await ChatSession.findOneAndUpdate(
                { sessionId: sessionId },
                {
                    sessionId: sessionId,
                    messages: messages,
                    userContext: userContext,
                    messageCount: messages.length,
                    lastActivity: new Date()
                },
                { upsert: true, new: true }
            );
        } catch (error) {
            console.error('Failed to save chat session:', error);
        }
    }

    async getChatHistory(sessionId, limit = 50) {
        try {
            const session = await ChatSession.findOne({ sessionId: sessionId });
            return session ? session.messages.slice(-limit) : [];
        } catch (error) {
            console.error('Failed to get chat history:', error);
            return [];
        }
    }

    async clearChatHistory(sessionId) {
        try {
            await ChatSession.deleteOne({ sessionId: sessionId });
            this.conversationHistory.delete(sessionId);
            return true;
        } catch (error) {
            console.error('Failed to clear chat history:', error);
            return false;
        }
    }

    async analyzeConversation(sessionId) {
        try {
            const messages = this.conversationHistory.get(sessionId) || [];
            
            if (messages.length === 0) {
                return { sentiment: 'neutral', topics: [], urgency: 'low' };
            }

            // Simple analysis (in production, this would use more sophisticated NLP)
            const content = messages.map(m => m.content).join(' ');
            const lowerContent = content.toLowerCase();

            // Sentiment analysis (simplified)
            let sentiment = 'neutral';
            const positiveWords = ['thanks', 'thank you', 'great', 'good', 'excellent', 'helpful', 'solved'];
            const negativeWords = ['problem', 'issue', 'error', 'wrong', 'bad', 'terrible', 'frustrated'];

            const positiveCount = positiveWords.filter(word => lowerContent.includes(word)).length;
            const negativeCount = negativeWords.filter(word => lowerContent.includes(word)).length;

            if (positiveCount > negativeCount) sentiment = 'positive';
            else if (negativeCount > positiveCount) sentiment = 'negative';

            // Topic extraction (simplified)
            const topics = [];
            const topicKeywords = {
                'pricing': ['price', 'cost', 'expensive', 'cheap', 'discount'],
                'shipping': ['ship', 'delivery', 'track', 'courier', 'deliver'],
                'products': ['product', 'item', 'stock', 'available', 'catalog'],
                'payment': ['pay', 'payment', 'card', 'invoice', 'bill'],
                'account': ['account', 'login', 'password', 'register', 'sign up']
            };

            Object.entries(topicKeywords).forEach(([topic, keywords]) => {
                if (keywords.some(keyword => lowerContent.includes(keyword))) {
                    topics.push(topic);
                }
            });

            // Urgency detection
            let urgency = 'low';
            const urgentWords = ['urgent', 'asap', 'immediately', 'emergency', 'critical'];
            if (urgentWords.some(word => lowerContent.includes(word))) {
                urgency = 'high';
            } else if (negativeCount > 2) {
                urgency = 'medium';
            }

            return {
                sentiment,
                topics: [...new Set(topics)], // Remove duplicates
                urgency,
                messageCount: messages.length,
                lastActivity: messages[messages.length - 1]?.timestamp
            };

        } catch (error) {
            console.error('Conversation analysis error:', error);
            return { sentiment: 'neutral', topics: [], urgency: 'low' };
        }
    }

    async escalateToHuman(sessionId, reason) {
        try {
            const analysis = await this.analyzeConversation(sessionId);
            
            // Create escalation ticket
            const escalationTicket = {
                sessionId,
                reason,
                analysis,
                escalatedAt: new Date(),
                priority: analysis.urgency === 'high' ? 'high' : 'normal'
            };

            // In production, this would create a ticket in your support system
            console.log('🚨 Escalating to human support:', escalationTicket);

            return {
                success: true,
                ticketId: `ESC-${Date.now()}`,
                message: 'Your conversation has been escalated to our human support team.'
            };

        } catch (error) {
            console.error('Escalation error:', error);
            return {
                success: false,
                message: 'Failed to escalate conversation. Please contact support directly.'
            };
        }
    }

    async getPerformanceMetrics() {
        const sessions = Array.from(this.conversationHistory.values());
        const totalMessages = sessions.reduce((sum, session) => sum + session.length, 0);

        return {
            activeSessions: this.conversationHistory.size,
            totalMessages,
            averageMessagesPerSession: this.conversationHistory.size > 0 ? 
                totalMessages / this.conversationHistory.size : 0,
            initializationStatus: this.isInitialized,
            memoryUsage: process.memoryUsage()
        };
    }

    async shutdown() {
        // Save all active sessions before shutdown
        const savePromises = Array.from(this.conversationHistory.entries()).map(
            ([sessionId, messages]) => this.saveChatSession(sessionId, messages, {})
        );

        await Promise.all(savePromises);
        console.log('🛑 Bronwyn Customer Support Agent shutdown complete');
    }
}

module.exports = BronwynChatbot;
