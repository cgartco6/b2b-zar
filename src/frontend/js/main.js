// Main application functionality
class B2BMarketplace {
    constructor() {
        this.products = [];
        this.init();
    }

    init() {
        this.loadProducts();
        this.setupEventListeners();
        this.initializeAI();
    }

    loadProducts() {
        // Sample products - in real app, this would come from API
        this.products = [
            {
                id: 1,
                name: "Industrial Generator 5000W",
                price: 12500.00,
                category: "Industrial Equipment",
                image: "generator.jpg",
                supplier: "PowerTech SA"
            },
            {
                id: 2,
                name: "Bulk Office Chairs (Set of 10)",
                price: 8500.00,
                category: "Office Furniture",
                image: "office-chairs.jpg",
                supplier: "FurnitureCo ZA"
            },
            {
                id: 3,
                name: "Commercial Refrigeration Unit",
                price: 32500.00,
                category: "Food Service",
                image: "refrigeration.jpg",
                supplier: "CoolSolutions SA"
            },
            {
                id: 4,
                name: "Construction Safety Gear Pack",
                price: 4500.00,
                category: "Safety Equipment",
                image: "safety-gear.jpg",
                supplier: "SafeWork Africa"
            }
        ];

        this.renderProducts();
    }

    renderProducts() {
        const productGrid = document.getElementById('productGrid');
        productGrid.innerHTML = '';

        this.products.forEach(product => {
            const productCard = this.createProductCard(product);
            productGrid.appendChild(productCard);
        });
    }

    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-image">
                ${product.name}
            </div>
            <div class="product-info">
                <h3>${product.name}</h3>
                <p class="product-supplier">Supplier: ${product.supplier}</p>
                <p class="product-category">${product.category}</p>
                <p class="product-price">ZAR ${product.price.toLocaleString('en-ZA', {minimumFractionDigits: 2})}</p>
                <button class="add-to-cart" data-id="${product.id}">
                    Add to Cart
                </button>
            </div>
        `;
        return card;
    }

    setupEventListeners() {
        // Cart icon click
        document.getElementById('cartIcon').addEventListener('click', () => {
            this.toggleCartModal();
        });

        // Close modal
        document.querySelector('.close').addEventListener('click', () => {
            this.closeCartModal();
        });

        // Click outside modal to close
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('cartModal');
            if (e.target === modal) {
                this.closeCartModal();
            }
        });

        // Chatbot toggle
        document.querySelector('.minimize-btn').addEventListener('click', () => {
            this.toggleChatbot();
        });
    }

    toggleCartModal() {
        const modal = document.getElementById('cartModal');
        modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
    }

    closeCartModal() {
        document.getElementById('cartModal').style.display = 'none';
    }

    toggleChatbot() {
        const chatbot = document.querySelector('.chatbot-widget');
        chatbot.style.display = chatbot.style.display === 'flex' ? 'none' : 'flex';
    }

    initializeAI() {
        // Initialize AI agents and integrations
        console.log('Initializing AI systems...');
        // This would integrate with various AI services
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.marketplace = new B2BMarketplace();
});
