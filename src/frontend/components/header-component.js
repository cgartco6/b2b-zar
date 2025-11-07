class HeaderComponent extends HTMLElement {
    constructor() {
        super();
        this.user = null;
        this.cartCount = 0;
    }

    connectedCallback() {
        this.render();
        this.attachEventListeners();
        this.loadUserData();
        this.updateCartCount();
    }

    render() {
        this.innerHTML = `
            <header class="header">
                <div class="container">
                    <div class="logo">
                        <h1>B2B ZAR Marketplace</h1>
                        <span class="tagline">South Africa's Premier B2B Platform</span>
                    </div>
                    
                    <nav class="nav">
                        <ul>
                            <li><a href="#home" class="nav-link active">Home</a></li>
                            <li><a href="#products" class="nav-link">Products</a></li>
                            <li><a href="#suppliers" class="nav-link">Suppliers</a></li>
                            <li><a href="#categories" class="nav-link">Categories</a></li>
                            <li><a href="#business" class="nav-link">Business Tools</a></li>
                        </ul>
                    </nav>

                    <div class="header-actions">
                        <div class="action-group">
                            <button class="action-btn search-btn" id="searchBtn" title="Search">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M21 21L16.514 16.506L21 21ZM19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z" 
                                          stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </button>
                            
                            <div class="cart-wrapper">
                                <button class="action-btn cart-btn" id="cartBtn" title="Shopping Cart">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <path d="M3 3H5L5.4 5M7 13H17L21 5H5.4M7 13L5.4 5M7 13L4.7 15.3C4.3 15.7 4.6 16.4 5.2 16.4H17M17 13V16.4M9 19C9 19.6 8.6 20 8 20C7.4 20 7 19.6 7 19C7 18.4 7.4 18 8 18C8.6 18 9 18.4 9 19ZM17 19C17 19.6 16.6 20 16 20C15.4 20 15 19.6 15 19C15 18.4 15.4 18 16 18C16.6 18 17 18.4 17 19Z" 
                                              stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                    </svg>
                                    <span class="cart-badge" id="cartBadge">0</span>
                                </button>
                            </div>

                            <div class="user-menu" id="userMenu">
                                <button class="action-btn user-btn" id="userBtn" title="Account">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <path d="M20 21V19C20 17.9 19.1 17 18 17H6C4.9 17 4 17.9 4 19V21M16 7C16 9.2 14.2 11 12 11C9.8 11 8 9.2 8 7C8 4.8 9.8 3 12 3C14.2 3 16 4.8 16 7Z" 
                                              stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                    </svg>
                                </button>
                                <div class="user-dropdown" id="userDropdown">
                                    <div class="dropdown-content">
                                        <div class="user-info" id="userInfo">
                                            <div class="user-avatar">
                                                <span>GU</span>
                                            </div>
                                            <div class="user-details">
                                                <span class="user-name">Guest User</span>
                                                <span class="user-email">Sign in to your account</span>
                                            </div>
                                        </div>
                                        <div class="dropdown-actions">
                                            <button class="dropdown-item" id="loginBtn">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                    <path d="M15 3H19C19.6 3 20 3.4 20 4V20C20 20.6 19.6 21 19 21H15M10 17L15 12M15 12L10 7M15 12H3" 
                                                          stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                                </svg>
                                                Sign In
                                            </button>
                                            <button class="dropdown-item" id="registerBtn">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                    <path d="M16 7C16 9.2 14.2 11 12 11C9.8 11 8 9.2 8 7C8 4.8 9.8 3 12 3C14.2 3 16 4.8 16 7ZM12 14C8.1 14 4 15.8 4 19V21H20V19C20 15.8 15.9 14 12 14Z" 
                                                          stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                                </svg>
                                                Register Business
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Search Overlay -->
                <div class="search-overlay" id="searchOverlay">
                    <div class="search-container">
                        <div class="search-header">
                            <h3>Search Products & Suppliers</h3>
                            <button class="close-search" id="closeSearch">&times;</button>
                        </div>
                        <div class="search-input-group">
                            <input type="text" 
                                   id="searchInput" 
                                   placeholder="What are you looking for today?"
                                   class="search-input">
                            <button class="search-submit" id="searchSubmit">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M21 21L16.514 16.506L21 21ZM19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z" 
                                          stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </button>
                        </div>
                        <div class="search-suggestions">
                            <div class="suggestion-category">
                                <h4>Popular Categories</h4>
                                <div class="suggestion-tags">
                                    <span class="suggestion-tag">Industrial Equipment</span>
                                    <span class="suggestion-tag">Office Furniture</span>
                                    <span class="suggestion-tag">Safety Gear</span>
                                    <span class="suggestion-tag">Construction Materials</span>
                                </div>
                            </div>
                            <div class="suggestion-category">
                                <h4>Quick Links</h4>
                                <div class="suggestion-tags">
                                    <span class="suggestion-tag">B-BBEE Suppliers</span>
                                    <span class="suggestion-tag">Local Manufacturers</span>
                                    <span class="suggestion-tag">Bulk Discounts</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
        `;
    }

    attachEventListeners() {
        // Search functionality
        this.querySelector('#searchBtn').addEventListener('click', () => this.openSearch());
        this.querySelector('#closeSearch').addEventListener('click', () => this.closeSearch());
        this.querySelector('#searchSubmit').addEventListener('click', () => this.performSearch());
        this.querySelector('#searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });

        // Cart functionality
        this.querySelector('#cartBtn').addEventListener('click', () => this.openCart());

        // User menu functionality
        this.querySelector('#userBtn').addEventListener('click', (e) => this.toggleUserMenu(e));
        
        // Auth buttons
        this.querySelector('#loginBtn').addEventListener('click', () => this.openLogin());
        this.querySelector('#registerBtn').addEventListener('click', () => this.openRegister());

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => this.handleClickOutside(e));

        // Navigation links
        this.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => this.handleNavClick(e));
        });
    }

    async loadUserData() {
        try {
            const token = localStorage.getItem('authToken');
            if (token) {
                const response = await fetch('/api/auth/profile', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    this.user = await response.json();
                    this.updateUserInterface();
                }
            }
        } catch (error) {
            console.error('Failed to load user data:', error);
        }
    }

    updateUserInterface() {
        const userInfo = this.querySelector('#userInfo');
        const dropdownActions = this.querySelector('.dropdown-actions');
        
        if (this.user) {
            userInfo.innerHTML = `
                <div class="user-avatar" style="background: #2c5aa0;">
                    <span>${this.getInitials(this.user.firstName, this.user.lastName)}</span>
                </div>
                <div class="user-details">
                    <span class="user-name">${this.user.firstName} ${this.user.lastName}</span>
                    <span class="user-email">${this.user.email}</span>
                    ${this.user.businessName ? `<span class="user-business">${this.user.businessName}</span>` : ''}
                </div>
            `;

            dropdownActions.innerHTML = `
                <button class="dropdown-item" id="dashboardBtn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M3 9L12 2L21 9V20C21 20.5 20.8 21 20.4 21.4C20 21.8 19.5 22 19 22H5C4.5 22 4 21.8 3.6 21.4C3.2 21 3 20.5 3 20V9Z" 
                              stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    Dashboard
                </button>
                <button class="dropdown-item" id="ordersBtn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M3 10H21M7 15H8M12 15H13M6 20H18C19.7 20 21 18.7 21 17V7C21 5.3 19.7 4 18 4H6C4.3 4 3 5.3 3 7V17C3 18.7 4.3 20 6 20Z" 
                              stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    My Orders
                </button>
                <button class="dropdown-item" id="profileBtn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M12 12C14.2 12 16 10.2 16 8C16 5.8 14.2 4 12 4C9.8 4 8 5.8 8 8C8 10.2 9.8 12 12 12ZM12 14C9.3 14 4 15.3 4 18V20H20V18C20 15.3 14.7 14 12 14Z" 
                              stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    Profile Settings
                </button>
                <div class="dropdown-divider"></div>
                <button class="dropdown-item logout-btn" id="logoutBtn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M17 16L21 12M21 12L17 8M21 12H9M13 16V17C13 18.7 11.7 20 10 20H6C4.3 20 3 18.7 3 17V7C3 5.3 4.3 4 6 4H10C11.7 4 13 5.3 13 7V8" 
                              stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    Sign Out
                </button>
            `;

            // Add event listeners for authenticated user actions
            this.querySelector('#dashboardBtn').addEventListener('click', () => this.openDashboard());
            this.querySelector('#ordersBtn').addEventListener('click', () => this.openOrders());
            this.querySelector('#profileBtn').addEventListener('click', () => this.openProfile());
            this.querySelector('#logoutBtn').addEventListener('click', () => this.logout());
        }
    }

    getInitials(firstName, lastName) {
        return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
    }

    openSearch() {
        const overlay = this.querySelector('#searchOverlay');
        overlay.style.display = 'block';
        setTimeout(() => {
            overlay.classList.add('active');
            this.querySelector('#searchInput').focus();
        }, 10);
    }

    closeSearch() {
        const overlay = this.querySelector('#searchOverlay');
        overlay.classList.remove('active');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }

    performSearch() {
        const query = this.querySelector('#searchInput').value.trim();
        if (query) {
            this.dispatchEvent(new CustomEvent('search-performed', {
                detail: { query },
                bubbles: true
            }));
            this.closeSearch();
        }
    }

    openCart() {
        this.dispatchEvent(new CustomEvent('cart-opened', {
            bubbles: true
        }));
    }

    toggleUserMenu(event) {
        event.stopPropagation();
        const dropdown = this.querySelector('#userDropdown');
        dropdown.classList.toggle('active');
    }

    handleClickOutside(event) {
        if (!this.contains(event.target)) {
            this.querySelector('#userDropdown').classList.remove('active');
        }
    }

    handleNavClick(event) {
        event.preventDefault();
        const target = event.target.getAttribute('href').substring(1);
        
        // Update active state
        this.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        event.target.classList.add('active');

        // Dispatch navigation event
        this.dispatchEvent(new CustomEvent('navigation-changed', {
            detail: { section: target },
            bubbles: true
        }));
    }

    openLogin() {
        this.dispatchEvent(new CustomEvent('login-requested', {
            bubbles: true
        }));
        this.querySelector('#userDropdown').classList.remove('active');
    }

    openRegister() {
        this.dispatchEvent(new CustomEvent('register-requested', {
            bubbles: true
        }));
        this.querySelector('#userDropdown').classList.remove('active');
    }

    openDashboard() {
        window.location.href = '/dashboard';
    }

    openOrders() {
        window.location.href = '/orders';
    }

    openProfile() {
        window.location.href = '/profile';
    }

    async logout() {
        try {
            const token = localStorage.getItem('authToken');
            if (token) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('authToken');
            this.user = null;
            this.render();
            this.attachEventListeners();
            
            this.dispatchEvent(new CustomEvent('user-logged-out', {
                bubbles: true
            }));
        }
    }

    updateCartCount(count) {
        const badge = this.querySelector('#cartBadge');
        this.cartCount = count || 0;
        badge.textContent = this.cartCount;
        badge.style.display = this.cartCount > 0 ? 'flex' : 'none';
    }

    // Method to update cart count from external source
    setCartCount(count) {
        this.updateCartCount(count);
    }

    // Method to update user data from external source
    setUser(user) {
        this.user = user;
        this.updateUserInterface();
    }
}

customElements.define('header-component', HeaderComponent);
