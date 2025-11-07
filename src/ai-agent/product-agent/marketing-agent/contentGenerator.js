const { OpenAI } = require('openai');
const Product = require('../../backend/models/Product');
const Supplier = require('../../backend/models/Supplier');

class MarketingContentGenerator {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        this.isInitialized = false;
        this.contentTemplates = {
            product_description: this.getProductDescriptionTemplate(),
            social_media_post: this.getSocialMediaTemplate(),
            email_campaign: this.getEmailTemplate(),
            ad_copy: this.getAdCopyTemplate()
        };
    }

    async initialize() {
        try {
            console.log('🔄 Initializing Marketing Content Generator...');
            
            // Test OpenAI connection
            await this.openai.models.list();
            
            this.isInitialized = true;
            console.log('✅ Marketing Content Generator initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Marketing Content Generator:', error);
            throw error;
        }
    }

    // Generate product description
    async generateProductDescription(productId) {
        try {
            const product = await Product.findById(productId)
                .populate('supplier', 'businessName bbbeeLevel');
            
            if (!product) {
                throw new Error('Product not found');
            }

            const prompt = this.buildProductDescriptionPrompt(product);
            
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "You are a professional copywriter specializing in B2B e-commerce product descriptions for the South African market. Create compelling, SEO-optimized descriptions that highlight business value and compliance benefits."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            });

            const description = completion.choices[0].message.content;

            // Update product with AI-generated description
            product.aiDescription = description;
            await product.save();

            return {
                success: true,
                productId: productId,
                description: description,
                type: 'product_description'
            };

        } catch (error) {
            console.error('Generate product description error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Generate social media content
    async generateSocialMediaContent(productId, platform = 'linkedin') {
        try {
            const product = await Product.findById(productId)
                .populate('supplier', 'businessName');
            
            if (!product) {
                throw new Error('Product not found');
            }

            const prompt = this.buildSocialMediaPrompt(product, platform);
            
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: this.getPlatformSpecificGuidelines(platform)
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.8,
                max_tokens: 300
            });

            const content = completion.choices[0].message.content;

            return {
                success: true,
                productId: productId,
                platform: platform,
                content: content,
                hashtags: this.generateHashtags(product, platform)
            };

        } catch (error) {
            console.error('Generate social media content error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Generate email campaign content
    async generateEmailCampaign(campaignType, targetAudience) {
        try {
            const prompt = this.buildEmailCampaignPrompt(campaignType, targetAudience);
            
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "You are an expert email marketer for B2B e-commerce in South Africa. Create compelling email content that drives engagement and conversions for business customers."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.6,
                max_tokens: 800
            });

            const emailContent = completion.choices[0].message.content;

            return {
                success: true,
                campaignType: campaignType,
                targetAudience: targetAudience,
                content: this.parseEmailContent(emailContent),
                generatedAt: new Date()
            };

        } catch (error) {
            console.error('Generate email campaign error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Generate ad copy
    async generateAdCopy(productId, adType = 'search') {
        try {
            const product = await Product.findById(productId);
            if (!product) {
                throw new Error('Product not found');
            }

            const prompt = this.buildAdCopyPrompt(product, adType);
            
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "You are a professional advertising copywriter specializing in B2B digital ads. Create compelling ad copy that drives clicks and conversions for business products."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 200
            });

            const adCopy = completion.choices[0].message.content;

            return {
                success: true,
                productId: productId,
                adType: adType,
                copy: adCopy,
                headlines: this.extractHeadlines(adCopy),
                descriptions: this.extractDescriptions(adCopy)
            };

        } catch (error) {
            console.error('Generate ad copy error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Generate content in bulk
    async generateBulkContent(contentType, filters = {}) {
        try {
            let products;
            
            if (filters.category) {
                products = await Product.find({
                    category: filters.category,
                    status: 'active'
                }).limit(filters.limit || 10);
            } else if (filters.supplier) {
                products = await Product.find({
                    supplier: filters.supplier,
                    status: 'active'
                }).limit(filters.limit || 10);
            } else {
                products = await Product.find({ status: 'active' })
                    .limit(filters.limit || 5);
            }

            const results = await Promise.all(
                products.map(async (product) => {
                    try {
                        let content;
                        
                        switch (contentType) {
                            case 'product_description':
                                content = await this.generateProductDescription(product._id);
                                break;
                            case 'social_media':
                                content = await this.generateSocialMediaContent(product._id, 'linkedin');
                                break;
                            case 'ad_copy':
                                content = await this.generateAdCopy(product._id, 'search');
                                break;
                            default:
                                throw new Error('Invalid content type');
                        }

                        return {
                            productId: product._id,
                            productName: product.name,
                            success: content.success,
                            content: content.success ? content : content.error
                        };
                    } catch (error) {
                        return {
                            productId: product._id,
                            productName: product.name,
                            success: false,
                            error: error.message
                        };
                    }
                })
            );

            return {
                success: true,
                contentType: contentType,
                generated: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length,
                results: results
            };

        } catch (error) {
            console.error('Generate bulk content error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Prompt building methods
    buildProductDescriptionPrompt(product) {
        return `
Generate a professional product description for a B2B e-commerce platform targeting South African businesses.

PRODUCT INFORMATION:
- Name: ${product.name}
- Category: ${product.category}
- Key Features: ${product.description}
- Price: ZAR ${product.price}
- Supplier: ${product.supplier.businessName}
- B-BBEE Compliant: ${product.isBbbeeCompliant ? 'Yes' : 'No'}
- Local Product: ${product.isLocalProduct ? 'Yes' : 'No'}

REQUIREMENTS:
1. Focus on business benefits and ROI
2. Highlight B-BBEE compliance if applicable
3. Emphasize local manufacturing if applicable
4. Include SEO-friendly keywords
5. Professional tone for business buyers
6. Structure with clear sections

Please generate a comprehensive product description (300-400 words) that will help business buyers make informed purchasing decisions.
        `;
    }

    buildSocialMediaPrompt(product, platform) {
        const platformGuidelines = {
            linkedin: 'Professional tone, business-focused, industry insights',
            twitter: 'Concise, engaging, use hashtags, call to action',
            facebook: 'Friendly but professional, visual appeal, engagement prompts'
        };

        return `
Create a social media post for ${platform.toUpperCase()} promoting this B2B product:

PRODUCT: ${product.name}
PRICE: ZAR ${product.price}
CATEGORY: ${product.category}
SUPPLIER: ${product.supplier.businessName}
B-BBEE: ${product.isBbbeeCompliant ? 'Compliant' : 'Not specified'}

GUIDELINES:
- ${platformGuidelines[platform]}
- Target South African businesses
- Include relevant hashtags
- Add a call to action
- Keep it engaging and professional

Generate 3 variations of the post with different angles.
        `;
    }

    buildEmailCampaignPrompt(campaignType, targetAudience) {
        return `
Create an email campaign for B2B ZAR Marketplace.

CAMPAIGN TYPE: ${campaignType}
TARGET AUDIENCE: ${targetAudience}

CAMPAIGN STRUCTURE:
1. Subject Line (3 options)
2. Pre-header Text
3. Email Body (engaging, professional)
4. Call to Action
5. Footer with compliance information

TONE: Professional, business-appropriate, South African context
LENGTH: 200-300 words

Focus on value proposition for South African businesses and include B-BBEE benefits where relevant.
        `;
    }

    buildAdCopyPrompt(product, adType) {
        const adTypeGuidelines = {
            search: 'Focus on keywords, clear value proposition, strong CTA',
            display: 'Visual appeal, brand messaging, engaging headline',
            social: 'Conversational tone, social proof, shareable content'
        };

        return `
Create ${adType} ad copy for this B2B product:

PRODUCT: ${product.name}
PRICE: ZAR ${product.price}
CATEGORY: ${product.category}
KEY FEATURE: ${product.description.substring(0, 100)}...

AD TYPE: ${adType}
GUIDELINES: ${adTypeGuidelines[adType]}
TARGET: South African businesses

Generate:
1. 3 headline variations (max 30 characters each)
2. 2 description variations (max 90 characters each)
3. Call to action button text
4. Display path (for URL)
        `;
    }

    // Helper methods
    getPlatformSpecificGuidelines(platform) {
        const guidelines = {
            linkedin: "Professional business tone, industry insights, B-BBEE compliance focus, corporate responsibility messaging",
            twitter: "Concise and engaging, use relevant hashtags, quick facts, call to action, business-focused",
            facebook: "Friendly professional tone, visual storytelling, business community engagement, local focus",
            instagram: "Visual-first approach, behind-the-scenes business content, supplier highlights, quality showcases"
        };
        
        return guidelines[platform] || guidelines.linkedin;
    }

    generateHashtags(product, platform) {
        const baseTags = [
            'B2B',
            'SouthAfrica',
            'Business',
            'Procurement'
        ];

        const categoryTags = product.category.split(' ').map(word => word.replace(/\s+/g, ''));
        const featureTags = product.isBbbeeCompliant ? ['BBBEE', 'Transformation'] : [];
        const localTags = product.isLocalProduct ? ['LocalBusiness', 'ProudlySA'] : [];

        const allTags = [...baseTags, ...categoryTags, ...featureTags, ...localTags];
        
        // Limit hashtags based on platform
        const limit = platform === 'twitter' ? 5 : 10;
        return allTags.slice(0, limit).map(tag => `#${tag}`);
    }

    parseEmailContent(emailContent) {
        // Simple parsing for email structure
        const lines = emailContent.split('\n');
        const sections = {
            subject: [],
            preheader: [],
            body: [],
            cta: [],
            footer: []
        };

        let currentSection = 'body';

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;

            if (trimmed.toLowerCase().includes('subject')) {
                currentSection = 'subject';
            } else if (trimmed.toLowerCase().includes('pre-header')) {
                currentSection = 'preheader';
            } else if (trimmed.toLowerCase().includes('call to action')) {
                currentSection = 'cta';
            } else if (trimmed.toLowerCase().includes('footer')) {
                currentSection = 'footer';
            } else {
                sections[currentSection].push(trimmed);
            }
        });

        return sections;
    }

    extractHeadlines(adCopy) {
        // Simple headline extraction
        const lines = adCopy.split('\n');
        return lines.filter(line => 
            line.length <= 30 && 
            line.length > 5 && 
            !line.toLowerCase().includes('description')
        ).slice(0, 3);
    }

    extractDescriptions(adCopy) {
        // Simple description extraction
        const lines = adCopy.split('\n');
        return lines.filter(line => 
            line.length <= 90 && 
            line.length > 10 && 
            line.toLowerCase().includes('description')
        ).map(desc => desc.replace(/description:/gi, '').trim()).slice(0, 2);
    }

    // Template methods
    getProductDescriptionTemplate() {
        return {
            structure: [
                "Compelling headline with key benefit",
                "Brief introduction highlighting unique value",
                "Key features and specifications",
                "Business benefits and ROI",
                "B-BBEE and compliance information",
                "Supplier credibility",
                "Call to action"
            ],
            tone: "Professional, informative, business-focused",
            keywords: ["B2B", "South Africa", "business", "ROI", "compliance", "quality"]
        };
    }

    getSocialMediaTemplate() {
        return {
            linkedin: {
                length: "150-300 characters",
                elements: ["Engaging hook", "Value proposition", "Key features", "Call to action", "Relevant hashtags"],
                tone: "Professional, industry-focused"
            },
            twitter: {
                length: "280 characters max",
                elements: ["Attention grabber", "Key benefit", "Link", "Hashtags"],
                tone: "Concise, engaging"
            }
        };
    }

    getEmailTemplate() {
        return {
            structure: {
                subject: "Clear, benefit-focused (50 chars max)",
                preheader: "Supporting text (100 chars max)",
                body: [
                    "Personalized greeting",
                    "Value proposition",
                    "Key benefits",
                    "Social proof",
                    "Clear CTA"
                ],
                footer: "Compliance and contact information"
            },
            tone: "Professional yet approachable"
        };
    }

    getAdCopyTemplate() {
        return {
            search: {
                headlines: "30 chars max, benefit-focused",
                descriptions: "90 chars max, feature highlights",
                ctas: ["Buy Now", "Learn More", "Get Quote"]
            },
            display: {
                headlines: "25 chars max, brand-focused",
                descriptions: "90 chars max, visual complement",
                ctas: ["Shop Now", "View Products", "Contact Us"]
            }
        };
    }

    // Performance tracking
    async trackContentPerformance(contentId, metrics) {
        // This would store content performance data
        console.log('Tracking content performance:', { contentId, metrics });
    }

    // Content optimization suggestions
    async getOptimizationSuggestions(content, performanceData) {
        try {
            const prompt = `
Analyze this marketing content and provide optimization suggestions:

CONTENT: ${content}
PERFORMANCE: ${JSON.stringify(performanceData)}

Provide specific suggestions to improve:
1. Engagement rates
2. Conversion rates
3. SEO performance
4. Audience relevance

Focus on B2B South African market context.
            `;

            const completion = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "You are a marketing optimization expert specializing in B2B content for South African businesses."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.5,
                max_tokens: 400
            });

            return completion.choices[0].message.content;

        } catch (error) {
            console.error('Get optimization suggestions error:', error);
            return 'Unable to generate optimization suggestions at this time.';
        }
    }

    async shutdown() {
        console.log('🛑 Marketing Content Generator shutdown complete');
    }
}

module.exports = MarketingContentGenerator;
