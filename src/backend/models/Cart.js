const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    },
    unitPrice: {
        type: Number,
        required: true
    },
    totalPrice: {
        type: Number,
        required: true
    },
    addedAt: {
        type: Date,
        default: Date.now
    }
});

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    items: [cartItemSchema],
    discount: {
        code: String,
        amount: Number,
        type: {
            type: String,
            enum: ['percentage', 'fixed'],
            default: 'fixed'
        },
        appliedAt: Date
    },
    shippingCost: {
        type: Number,
        default: 0
    },
    shippingMethod: {
        type: String,
        enum: ['standard', 'express', 'overnight', 'bulk'],
        default: 'standard'
    },
    notes: {
        type: String,
        maxlength: 500
    },
    expiresAt: {
        type: Date,
        default: function() {
            return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        }
    },
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

// Indexes
cartSchema.index({ user: 1 });
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for subtotal
cartSchema.virtual('subtotal').get(function() {
    return this.items.reduce((total, item) => total + item.totalPrice, 0);
});

// Virtual for discount amount
cartSchema.virtual('discountAmount').get(function() {
    if (!this.discount || !this.discount.amount) return 0;
    
    if (this.discount.type === 'percentage') {
        return this.subtotal * (this.discount.amount / 100);
    }
    return this.discount.amount;
});

// Virtual for total with discount and shipping
cartSchema.virtual('total').get(function() {
    return this.subtotal - this.discountAmount + this.shippingCost;
});

// Virtual for VAT amount (15% in South Africa)
cartSchema.virtual('vatAmount').get(function() {
    return (this.subtotal - this.discountAmount) * 0.15;
});

// Virtual for grand total
cartSchema.virtual('grandTotal').get(function() {
    return this.total + this.vatAmount;
});

// Virtual for item count
cartSchema.virtual('itemCount').get(function() {
    return this.items.reduce((count, item) => count + item.quantity, 0);
});

// Pre-save middleware to calculate total prices
cartSchema.pre('save', function(next) {
    // Update item total prices
    this.items.forEach(item => {
        item.totalPrice = item.unitPrice * item.quantity;
    });
    
    this.updatedAt = new Date();
    next();
});

// Method to add item to cart
cartSchema.methods.addItem = function(productId, quantity = 1, unitPrice) {
    const existingItemIndex = this.items.findIndex(
        item => item.product.toString() === productId.toString()
    );

    if (existingItemIndex > -1) {
        // Update existing item
        this.items[existingItemIndex].quantity += quantity;
        this.items[existingItemIndex].totalPrice = this.items[existingItemIndex].unitPrice * this.items[existingItemIndex].quantity;
    } else {
        // Add new item
        this.items.push({
            product: productId,
            quantity: quantity,
            unitPrice: unitPrice,
            totalPrice: unitPrice * quantity
        });
    }

    return this.save();
};

// Method to update item quantity
cartSchema.methods.updateItemQuantity = function(productId, quantity) {
    const itemIndex = this.items.findIndex(
        item => item.product.toString() === productId.toString()
    );

    if (itemIndex > -1) {
        if (quantity <= 0) {
            // Remove item if quantity is 0 or negative
            this.items.splice(itemIndex, 1);
        } else {
            // Update quantity
            this.items[itemIndex].quantity = quantity;
            this.items[itemIndex].totalPrice = this.items[itemIndex].unitPrice * quantity;
        }
        return this.save();
    }

    throw new Error('Item not found in cart');
};

// Method to remove item from cart
cartSchema.methods.removeItem = function(productId) {
    this.items = this.items.filter(
        item => item.product.toString() !== productId.toString()
    );
    return this.save();
};

// Method to clear cart
cartSchema.methods.clear = function() {
    this.items = [];
    this.discount = null;
    this.shippingCost = 0;
    return this.save();
};

// Method to apply discount
cartSchema.methods.applyDiscount = function(discountCode, amount, type = 'fixed') {
    this.discount = {
        code: discountCode,
        amount: amount,
        type: type,
        appliedAt: new Date()
    };
    return this.save();
};

// Method to remove discount
cartSchema.methods.removeDiscount = function() {
    this.discount = null;
    return this.save();
};

// Method to update shipping
cartSchema.methods.updateShipping = function(cost, method = 'standard') {
    this.shippingCost = cost;
    this.shippingMethod = method;
    return this.save();
};

// Static method to get cart by user with population
cartSchema.statics.findByUser = function(userId) {
    return this.findOne({ user: userId })
        .populate('items.product', 'name images price stockQuantity supplierName');
};

// Static method to get cart summary
cartSchema.statics.getCartSummary = async function(userId) {
    const cart = await this.findOne({ user: userId });
    
    if (!cart) {
        return {
            itemCount: 0,
            subtotal: 0,
            discount: 0,
            shipping: 0,
            vat: 0,
            total: 0
        };
    }

    return {
        itemCount: cart.itemCount,
        subtotal: cart.subtotal,
        discount: cart.discountAmount,
        shipping: cart.shippingCost,
        vat: cart.vatAmount,
        total: cart.grandTotal
    };
};

// Static method to merge guest cart with user cart
cartSchema.statics.mergeCarts = async function(userId, guestCartItems) {
    let userCart = await this.findOne({ user: userId });
    
    if (!userCart) {
        userCart = new this({ user: userId, items: [] });
    }

    for (const guestItem of guestCartItems) {
        await userCart.addItem(
            guestItem.product,
            guestItem.quantity,
            guestItem.unitPrice
        );
    }

    return userCart.save();
};

module.exports = mongoose.model('Cart', cartSchema);
