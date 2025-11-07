class SearchComponent extends HTMLElement {
    constructor() {
        super();
        this.searchResults = [];
        this.isLoading = false;
        this.currentQuery = '';
    }

    connectedCallback() {
        this.render();
        this.attachEventListeners();
    }

    render() {
        this.innerHTML = `
            <div class="search-component">
                <div class="search-box">
                    <input type="text" 
                           id="mainSearchInput" 
                           placeholder="Search products, suppliers, categories..."
                           class="search-input">
                    <button class="search-button" id="mainSearchButton">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M21 21L16.514 16.506L21 21ZM19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z" 
                                  stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        Search
                    </button>
                </div>

                <div class="search-filters">
                    <div class="filter-group">
                        <label>Category</label>
                        <select id="categoryFilter" class="filter-select">
                            <option value="">All Categories</option>
                            <option value="industrial">Industrial Equipment</option>
                            <option value="office">Office Supplies</option>
                            <option value="safety">Safety Gear</option>
                            <option value="construction">Construction</option>
                            <option value="electrical">Electrical</option>
                        </select>
                    </div>

                    <div class="filter-group">
                        <label>Price Range</label>
                        <select id="priceFilter" class="filter-select">
                            <option value="">Any Price</option>
                            <option value="0-1000">Under ZAR 1,000</option>
                            <option value="1000-5000">ZAR 1,000 - 5,000</option>
                            <option value="5000-10000">ZAR 5,000 - 10,000</option>
                            <option value="10000-50000">ZAR 10,000 - 50,000</option>
                            <option value="50000+">Over ZAR 50,000</option>
                        </select>
                    </div>

                    <div class="filter-group">
                        <label>Supplier Type</label>
                        <select id="supplierFilter" class="filter-select">
                            <option value="">All Suppliers</option>
                            <option value="bbbee">B-BBEE Certified</option>
                            <option value="local">Local Manufacturer</option>
                            <option value="sme">SME Business</option>
                        </select>
                    </div>

                    <div class="filter-group">
                        <label>Sort By</label>
                        <select id="sortFilter" class="filter-select">
                            <option value="relevance">Relevance</option>
                            <option value="price_low">Price: Low to High</option>
                            <option value="price_high">Price: High to Low</option>
                            <option value="rating">Highest Rated</option>
                            <option value="newest">Newest First</option>
                        </select>
                    </div>
                </div>

                <div class="search-results-container" id="resultsContainer">
                    <div class="results-header">
                        <h3 id="resultsTitle">Search Results</h3>
                        <div class="results-stats" id="resultsStats"></div>
                    </div>

                    <div class="loading-indicator" id="loadingIndicator" style="display: none;">
                        <div class="spinner"></div>
                        <span>Searching products...</span>
                    </div>

                    <div class="search-results" id="searchResults">
                        <div class="empty-state" id="emptyState">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                                <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" 
                                      stroke="currentColor" stroke-width="2"/>
                            </svg>
                            <h4>Start Searching</h4>
                            <p>Enter a product name, category, or supplier to find what you need</p>
                        </div>
                    </div>

                    <div class="results-pagination" id="pagination" style="display: none;"></div>
                </div>

                <div class="search-suggestions" id="searchSuggestions" style="display: none;">
                    <div class="suggestions-header">
                        <h4>Popular Searches</h4>
                    </div>
                    <div class="suggestion-items">
                        <span class="suggestion-item" data-query="industrial generator">Industrial Generator</span>
                        <span class="suggestion-item" data-query="office chairs bulk">Office Chairs Bulk</span>
                        <span class="suggestion-item" data-query="safety helmets">Safety Helmets</span>
                        <span class="suggestion-item" data-query="construction materials">Construction Materials</span>
                        <span class="suggestion-item" data-query="bbbee suppliers">B-BBEE Suppliers</span>
                    </div>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Search input events
        const searchInput = this.querySelector('#mainSearchInput');
        const searchButton = this.querySelector('#mainSearchButton');
        
        searchButton.addEventListener('click', () => this.performSearch());
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });

        // Real-time search suggestions
        searchInput.addEventListener('input', (e) => {
            this.handleInputChange(e.target.value);
        });

        // Filter changes
        this.querySelectorAll('.filter-select').forEach(select => {
            select.addEventListener('change', () => {
                if (this.currentQuery) {
                    this.performSearch();
                }
            });
        });

        // Suggestion clicks
        this.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const query = e.target.getAttribute('data-query');
                this.querySelector('#mainSearchInput').value = query;
                this.performSearch();
            });
        });
    }

    handleInputChange(value) {
        const suggestions = this.querySelector('#searchSuggestions');
        
        if (value.length > 2) {
            suggestions.style.display = 'block';
            this.showSearchSuggestions(value);
        } else {
            suggestions.style.display = value.length > 0 ? 'block' : 'none';
        }
    }

    async showSearchSuggestions(query) {
        try {
            const response = await fetch(`/api/products/suggestions?q=${encodeURIComponent(query)}`);
            const suggestions = await response.json();
            
            this.displaySuggestions(suggestions);
        } catch (error) {
            console.error('Failed to fetch suggestions:', error);
        }
    }

    displaySuggestions(suggestions) {
        const container = this.querySelector('.suggestion-items');
        
        if (suggestions.length > 0) {
            container.innerHTML = suggestions.map(suggestion => `
                <span class="suggestion-item" data-query="${suggestion}">${suggestion}</span>
            `).join('');

            // Reattach event listeners
            this.querySelectorAll('.suggestion-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    const query = e.target.getAttribute('data-query');
                    this.querySelector('#mainSearchInput').value = query;
                    this.performSearch();
                    this.querySelector('#searchSuggestions').style.display = 'none';
                });
            });
        }
    }

    async performSearch() {
        const query = this.querySelector('#mainSearchInput').value.trim();
        if (!query) return;

        this.currentQuery = query;
        this.isLoading = true;
        
        this.showLoading();
        this.hideSuggestions();

        try {
            const filters = this.getCurrentFilters();
            const searchParams = new URLSearchParams({
                q: query,
                ...filters
            });

            const response = await fetch(`/api/products/search?${searchParams}`);
            const results = await response.json();

            this.displaySearchResults(results);
        } catch (error) {
            console.error('Search failed:', error);
            this.showError('Failed to perform search. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    getCurrentFilters() {
        return {
            category: this.querySelector('#categoryFilter').value,
            priceRange: this.querySelector('#priceFilter').value,
            supplierType: this.querySelector('#supplierFilter').value,
            sortBy: this.querySelector('#sortFilter').value
        };
    }

    displaySearchResults(results) {
        const resultsContainer = this.querySelector('#searchResults');
        const statsContainer = this.querySelector('#resultsStats');
        const emptyState = this.querySelector('#emptyState');
        const pagination = this.querySelector('#pagination');

        if (results.data && results.data.length > 0) {
            emptyState.style.display = 'none';
            
            // Update stats
            statsContainer.innerHTML = `
                <span>Found ${results.pagination?.total || results.data.length} products</span>
            `;

            // Display results
            resultsContainer.innerHTML = results.data.map(product => this.createProductCard(product)).join('');

            // Display pagination if available
            if (results.pagination && results.pagination.pages > 1) {
                this.displayPagination(results.pagination);
                pagination.style.display = 'flex';
            } else {
                pagination.style.display = 'none';
            }

        } else {
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                        <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" 
                              stroke="currentColor" stroke-width="2"/>
                    </svg>
                    <h4>No products found</h4>
                    <p>Try adjusting your search terms or filters</p>
                </div>
            `;
            pagination.style.display = 'none';
        }

        // Dispatch event for external components
        this.dispatchEvent(new CustomEvent('search-results-updated', {
            detail: { results, query: this.currentQuery },
            bubbles: true
        }));
    }

    createProductCard(product) {
        return `
            <div class="search-result-card" data-id="${product._id}">
                <div class="product-image">
                    ${product.images && product.images.length > 0 ? 
                        `<img src="${product.images[0].url}" alt="${product.name}" loading="lazy">` :
                        `<div class="image-placeholder">${product.name.charAt(0)}</div>`
                    }
                    <div class="product-badges">
                        ${product.isBbbeeCompliant ? '<span class="badge bbbee">B-BBEE</span>' : ''}
                        ${product.isLocalProduct ? '<span class="badge local">Local</span>' : ''}
                        ${product.stockQuantity === 0 ? '<span class="badge out-of-stock">Out of Stock</span>' : ''}
                    </div>
                </div>
                
                <div class="product-info">
                    <h4 class="product-name">${product.name}</h4>
                    <p class="product-supplier">${product.supplierName}</p>
                    <p class="product-category">${product.category}</p>
                    
                    <div class="product-rating">
                        ${this.generateStarRating(product.rating?.average || 0)}
                        <span class="rating-count">(${product.rating?.count || 0})</span>
                    </div>
                    
                    <div class="product-pricing">
                        <span class="product-price">ZAR ${product.price.toLocaleString('en-ZA', {minimumFractionDigits: 2})}</span>
                        ${product.comparePrice ? `
                            <span class="product-compare-price">ZAR ${product.comparePrice.toLocaleString('en-ZA', {minimumFractionDigits: 2})}</span>
                        ` : ''}
                    </div>
                    
                    <div class="product-actions">
                        <button class="btn-primary add-to-cart-btn" data-id="${product._id}">
                            Add to Cart
                        </button>
                        <button class="btn-secondary quick-view-btn" data-id="${product._id}">
                            Quick View
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    generateStarRating(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let stars = '';
        for (let i = 0; i < fullStars; i++) {
            stars += '★';
        }
        if (hasHalfStar) {
            stars += '☆';
        }
        for (let i = 0; i < emptyStars; i++) {
            stars += '☆';
        }

        return `<span class="stars">${stars}</span>`;
    }

    displayPagination(pagination) {
        const paginationContainer = this.querySelector('#pagination');
        const { current, pages, total } = pagination;

        let paginationHTML = '';

        // Previous button
        if (current > 1) {
            paginationHTML += `<button class="pagination-btn prev" data-page="${current - 1}">Previous</button>`;
        }

        // Page numbers
        for (let i = 1; i <= pages; i++) {
            if (i === 1 || i === pages || (i >= current - 1 && i <= current + 1)) {
                paginationHTML += `
                    <button class="pagination-btn ${i === current ? 'active' : ''}" data-page="${i}">
                        ${i}
                    </button>
                `;
            } else if (i === current - 2 || i === current + 2) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
        }

        // Next button
        if (current < pages) {
            paginationHTML += `<button class="pagination-btn next" data-page="${current + 1}">Next</button>`;
        }

        paginationContainer.innerHTML = paginationHTML;

        // Add event listeners to pagination buttons
        paginationContainer.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = parseInt(e.target.getAttribute('data-page'));
                this.loadPage(page);
            });
        });
    }

    async loadPage(page) {
        const filters = this.getCurrentFilters();
        const searchParams = new URLSearchParams({
            q: this.currentQuery,
            page: page,
            ...filters
        });

        this.showLoading();

        try {
            const response = await fetch(`/api/products/search?${searchParams}`);
            const results = await response.json();
            this.displaySearchResults(results);
            
            // Scroll to results
            this.querySelector('#resultsContainer').scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        } catch (error) {
            console.error('Failed to load page:', error);
            this.showError('Failed to load page. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    showLoading() {
        this.isLoading = true;
        this.querySelector('#loadingIndicator').style.display = 'flex';
        this.querySelector('#searchResults').style.opacity = '0.5';
    }

    hideLoading() {
        this.isLoading = false;
        this.querySelector('#loadingIndicator').style.display = 'none';
        this.querySelector('#searchResults').style.opacity = '1';
    }

    showError(message) {
        const resultsContainer = this.querySelector('#searchResults');
        resultsContainer.innerHTML = `
            <div class="error-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                    <path d="M12 8V12M12 16H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" 
                          stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <h4>Search Error</h4>
                <p>${message}</p>
                <button class="btn-primary" id="retrySearch">Try Again</button>
            </div>
        `;

        this.querySelector('#retrySearch').addEventListener('click', () => {
            this.performSearch();
        });
    }

    hideSuggestions() {
        this.querySelector('#searchSuggestions').style.display = 'none';
    }

    // Public method to set search query programmatically
    setSearchQuery(query) {
        this.querySelector('#mainSearchInput').value = query;
        this.performSearch();
    }

    // Public method to clear search
    clearSearch() {
        this.querySelector('#mainSearchInput').value = '';
        this.currentQuery = '';
        this.querySelector('#searchResults').innerHTML = this.querySelector('#emptyState').outerHTML;
        this.querySelector('#resultsStats').innerHTML = '';
        this.querySelector('#pagination').style.display = 'none';
    }
}

customElements.define('search-component', SearchComponent);
