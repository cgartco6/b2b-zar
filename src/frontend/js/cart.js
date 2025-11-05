// Shopping Cart functionality
class ShoppingCart {
    constructor() {
        this.items = JSON.parse(localStorage.getItem('b2bCart')) || [];
        this.init();
    }

    init() {
        this.updateCartDisplay();
        this.setupCartEventListeners();
    }

    addItem(product, quantity = 1) {
        const existingItem = this.items.find(item => item.id === product.id);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.items.push({
                ...product,
                quantity: quantity
            });
        }
        
        this.saveToLocalStorage();
        this.updateCartDisplay();
        this.showAddToCartNotification(product.name);
    }

    removeItem(productId) {
        this.items = this.items.filter(item => item.id !== productId);
        this.saveToLocalStorage();
        this.updateCartDisplay();
    }

    updateQuantity(productId, newQuantity) {
        const item = this.items.find(item => item.id === productId);
        if (item) {
            if (newQuantity <= 0) {
                this.removeItem(productId);
            } else {
                item.quantity = newQuantity;
                this.saveToLocalStorage();
                this.updateCartDisplay();
            }
        }
    }

    clearCart() {
        this.items = [];
        this.saveToLocalStorage();
        this.updateCartDisplay();
    }

    getTotal() {
        return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    getItemCount() {
        return this.items.reduce((count, item) => count + item.quantity, 0);
    }

    saveToLocalStorage() {
        localStorage.setItem('b2bCart', JSON.stringify(this.items));
    }

    updateCartDisplay() {
        const cartCount = document.querySelector('.cart-count');
        const cartItems = document.getElementById('cartItems');
        const cartTotal = document.getElementById('cartTotal');

        // Update cart count
        cartCount.textContent = this.getItemCount();

        // Update cart items
        if (this.items.length === 0) {
            cartItems.innerHTML = '<div class="empty-cart">Your cart is empty</div>';
        } else {
            cartItems.innerHTML = this.items.map(item => `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-supplier">${item.supplier}</div>
                    </div>
                    <div class="cart-item-price">
                        ZAR ${(item.price * item.quantity).toLocaleString('en-ZA', {minimumFractionDigits: 2})}
                    </div>
                    <div class="cart-item-quantity">
                        <button class="quantity-btn minus" data-id="${item.id}">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn plus" data-id="${item.id}">+</button>
                    </div>
                    <button class="remove-btn" data-id="${item.id}">Remove</button>
                </div>
            `).join('');
        }

        // Update total
        cartTotal.textContent = this.getTotal().toLocaleString('en-ZA', {minimumFractionDigits: 2});
    }

    setupCartEventListeners() {
        // Add to cart buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-to-cart')) {
                const productId = parseInt(e.target.dataset.id);
                const product = window.marketplace.products.find(p => p.id === productId);
                if (product) {
                    this.addItem(product);
                }
            }
        });

        // Cart item controls
        document.getElementById('cartItems').addEventListener('click', (e) => {
            const productId = parseInt(e.target.dataset.id);
            
            if (e.target.classList.contains('remove-btn')) {
                this.removeItem(productId);
            } else if (e.target.classList.contains('minus')) {
                const item = this.items.find(item => item.id === productId);
                if (item) {
                    this.updateQuantity(productId, item.quantity - 1);
                }
            } else if (e.target.classList.contains('plus')) {
                const item = this.items.find(item => item.id === productId);
                if (item) {
                    this.updateQuantity(productId, item.quantity + 1);
                }
            }
        });

        // Checkout button
        document.querySelector('.checkout-btn').addEventListener('click', () => {
            this.proceedToCheckout();
        });
    }

    showAddToCartNotification(productName) {
        // Create and show notification
        const notification = document.createElement('div');
        notification.className = 'cart-notification';
        notification.innerHTML = `
            <span>✓ Added ${productName} to cart</span>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: var(--accent-color);
            color: white;
            padding: 1rem 2rem;
            border-radius: 5px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 3000;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    proceedToCheckout() {
        if (this.items.length === 0) {
            alert('Your cart is empty');
            return;
        }

        // In a real application, this would redirect to checkout page
        alert(`Proceeding to checkout with ${this.items.length} items. Total: ZAR ${this.getTotal().toLocaleString('en-ZA', {minimumFractionDigits: 2})}`);
        
        // Here you would integrate with payment gateway
        console.log('Initiating checkout process...');
    }
}

// Initialize cart when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.shoppingCart = new ShoppingCart();
});
