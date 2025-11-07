class AuthModal extends HTMLElement {
    constructor() {
        super();
        this.isOpen = false;
        this.activeTab = 'login';
        this.isLoading = false;
    }

    connectedCallback() {
        this.render();
        this.attachEventListeners();
    }

    render() {
        this.innerHTML = `
            <div class="auth-modal-overlay" id="authOverlay" style="display: none;">
                <div class="auth-modal" id="authModal">
                    <button class="auth-close" id="authClose">&times;</button>
                    
                    <div class="auth-tabs">
                        <button class="auth-tab ${this.activeTab === 'login' ? 'active' : ''}" data-tab="login">
                            Sign In
                        </button>
                        <button class="auth-tab ${this.activeTab === 'register' ? 'active' : ''}" data-tab="register">
                            Register Business
                        </button>
                    </div>

                    <div class="auth-content">
                        <!-- Login Form -->
                        <form class="auth-form ${this.activeTab === 'login' ? 'active' : ''}" id="loginForm">
                            <div class="form-group">
                                <label for="loginEmail">Business Email</label>
                                <input type="email" id="loginEmail" required placeholder="your@business.co.za">
                            </div>

                            <div class="form-group">
                                <label for="loginPassword">Password</label>
                                <input type="password" id="loginPassword" required placeholder="Enter your password">
                                <button type="button" class="password-toggle" data-target="loginPassword">
                                    👁
                                </button>
                            </div>

                            <div class="form-options">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="rememberMe">
                                    <span class="checkmark"></span>
                                    Remember me
                                </label>
                                <a href="#" class="forgot-password">Forgot Password?</a>
                            </div>

                            <button type="submit" class="btn-primary auth-submit" id="loginSubmit">
                                <span class="btn-text">Sign In</span>
                                <div class="btn-spinner" style="display: none;"></div>
                            </button>

                            <div class="auth-divider">
                                <span>or continue with</span>
                            </div>

                            <div class="social-auth">
                                <button type="button" class="btn-social google-btn">
                                    <svg width="18" height="18" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                    </svg>
                                    Google
                                </button>
                                <button type="button" class="btn-social linkedin-btn">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2">
                                        <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z"/>
                                    </svg>
                                    LinkedIn
                                </button>
                            </div>
                        </form>

                        <!-- Registration Form -->
                        <form class="auth-form ${this.activeTab === 'register' ? 'active' : ''}" id="registerForm">
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="regFirstName">First Name *</label>
                                    <input type="text" id="regFirstName" required placeholder="John">
                                </div>
                                <div class="form-group">
                                    <label for="regLastName">Last Name *</label>
                                    <input type="text" id="regLastName" required placeholder="Doe">
                                </div>
                            </div>

                            <div class="form-group">
                                <label for="regEmail">Business Email *</label>
                                <input type="email" id="regEmail" required placeholder="john@business.co.za">
                            </div>

                            <div class="form-group">
                                <label for="regPhone">Phone Number *</label>
                                <input type="tel" id="regPhone" required placeholder="+27 12 345 6789">
                            </div>

                            <div class="form-group">
                                <label for="regBusiness">Business Name *</label>
                                <input type="text" id="regBusiness" required placeholder="Your Business (Pty) Ltd">
                            </div>

                            <div class="form-group">
                                <label for="regBusinessType">Business Type *</label>
                                <select id="regBusinessType" required>
                                    <option value="">Select business type</option>
                                    <option value="sole_proprietor">Sole Proprietor</option>
                                    <option value="pty_ltd">Private Company (Pty Ltd)</option>
                                    <option value="cc">Close Corporation (CC)</option>
                                    <option value="partnership">Partnership</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label for="regPassword">Password *</label>
                                    <input type="password" id="regPassword" required placeholder="Create a password">
                                    <button type="button" class="password-toggle" data-target="regPassword">
                                        👁
                                    </button>
                                </div>
                                <div class="form-group">
                                    <label for="regConfirmPassword">Confirm Password *</label>
                                    <input type="password" id="regConfirmPassword" required placeholder="Confirm your password">
                                    <button type="button" class="password-toggle" data-target="regConfirmPassword">
                                        👁
                                    </button>
                                </div>
                            </div>

                            <div class="password-strength" id="passwordStrength">
                                <div class="strength-bar">
                                    <div class="strength-fill" id="strengthFill"></div>
                                </div>
                                <span class="strength-text" id="strengthText">Password strength</span>
                            </div>

                            <div class="form-options">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="acceptTerms" required>
                                    <span class="checkmark"></span>
                                    I agree to the <a href="/terms" target="_blank">Terms of Service</a> and <a href="/privacy" target="_blank">Privacy Policy</a>
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" id="newsletterSub" checked>
                                    <span class="checkmark"></span>
                                    Subscribe to business insights and offers
                                </label>
                            </div>

                            <button type="submit" class="btn-primary auth-submit" id="registerSubmit">
                                <span class="btn-text">Create Business Account</span>
                                <div class="btn-spinner" style="display: none;"></div>
                            </button>

                            <p class="auth-note">
                                By registering, you confirm your business is compliant with South African regulations
                            </p>
                        </form>
                    </div>

                    <div class="auth-success" id="authSuccess" style="display: none;">
                        <div class="success-icon">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                <path d="M22 4L12 14.01l-3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </div>
                        <h3 id="successTitle">Success!</h3>
                        <p id="successMessage">Your account has been created successfully.</p>
                        <button class="btn-primary" id="successAction">Continue</button>
                    </div>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Close modal
        this.querySelector('#authClose').addEventListener('click', () => this.close());
        this.querySelector('#authOverlay').addEventListener('click', (e) => {
            if (e.target === this.querySelector('#authOverlay')) {
                this.close();
            }
        });

        // Tab switching
        this.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });

        // Form submissions
        this.querySelector('#loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        this.querySelector('#registerForm').addEventListener('submit', (e) => this.handleRegister(e));

        // Password toggles
        this.querySelectorAll('.password-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const targetId = e.target.getAttribute('data-target');
                this.togglePasswordVisibility(targetId);
            });
        });

        // Password strength
        this.querySelector('#regPassword').addEventListener('input', (e) => {
            this.checkPasswordStrength(e.target.value);
        });

        // Social auth buttons
        this.querySelector('.google-btn').addEventListener('click', () => this.socialAuth('google'));
        this.querySelector('.linkedin-btn').addEventListener('click', () => this.socialAuth('linkedin'));

        // Success action
        this.querySelector('#successAction').addEventListener('click', () => this.close());
    }

    open(tab = 'login') {
        this.isOpen = true;
        this.activeTab = tab;
        this.render();
        this.attachEventListeners();
        
        const overlay = this.querySelector('#authOverlay');
        overlay.style.display = 'block';
        
        setTimeout(() => {
            overlay.classList.add('active');
            this.querySelector('#authModal').classList.add('active');
        }, 10);

        // Dispatch event
        this.dispatchEvent(new CustomEvent('auth-modal-opened', {
            detail: { tab },
            bubbles: true
        }));
    }

    close() {
        const overlay = this.querySelector('#authOverlay');
        const modal = this.querySelector('#authModal');
        
        overlay.classList.remove('active');
        modal.classList.remove('active');
        
        setTimeout(() => {
            overlay.style.display = 'none';
            this.isOpen = false;
            
            this.dispatchEvent(new CustomEvent('auth-modal-closed', {
                bubbles: true
            }));
        }, 300);
    }

    switchTab(tabName) {
        this.activeTab = tabName;
        
        // Update tab buttons
        this.querySelectorAll('.auth-tab').forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
        });

        // Update forms
        this.querySelectorAll('.auth-form').forEach(form => {
            form.classList.toggle('active', form.id === `${tabName}Form`);
        });

        // Reset forms
        this.resetForms();
    }

    resetForms() {
        this.querySelectorAll('.auth-form').forEach(form => {
            form.reset();
        });
        this.querySelector('#passwordStrength').style.display = 'none';
    }

    async handleLogin(event) {
        event.preventDefault();
        if (this.isLoading) return;

        const formData = {
            email: this.querySelector('#loginEmail').value,
            password: this.querySelector('#loginPassword').value,
            rememberMe: this.querySelector('#rememberMe').checked
        };

        // Basic validation
        if (!this.validateEmail(formData.email)) {
            this.showError('loginForm', 'Please enter a valid email address');
            return;
        }

        this.setLoading('loginSubmit', true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                // Store token
                localStorage.setItem('authToken', result.data.token);
                
                // Show success
                this.showSuccess('login', 'Welcome back!', 'You have successfully signed in.');
                
                // Dispatch login event
                this.dispatchEvent(new CustomEvent('user-logged-in', {
                    detail: { user: result.data.user },
                    bubbles: true
                }));

                // Close modal after delay
                setTimeout(() => this.close(), 2000);
            } else {
                this.showError('loginForm', result.message || 'Login failed. Please try again.');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('loginForm', 'Network error. Please check your connection.');
        } finally {
            this.setLoading('loginSubmit', false);
        }
    }

    async handleRegister(event) {
        event.preventDefault();
        if (this.isLoading) return;

        const formData = {
            firstName: this.querySelector('#regFirstName').value,
            lastName: this.querySelector('#regLastName').value,
            email: this.querySelector('#regEmail').value,
            phone: this.querySelector('#regPhone').value,
            businessName: this.querySelector('#regBusiness').value,
            businessType: this.querySelector('#regBusinessType').value,
            password: this.querySelector('#regPassword').value,
            confirmPassword: this.querySelector('#regConfirmPassword').value,
            acceptTerms: this.querySelector('#acceptTerms').checked,
            newsletterSub: this.querySelector('#newsletterSub').checked
        };

        // Validation
        const validation = this.validateRegistration(formData);
        if (!validation.valid) {
            this.showError('registerForm', validation.message);
            return;
        }

        this.setLoading('registerSubmit', true);

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccess('register', 'Account Created!', 'Please check your email to verify your account.');
                
                this.dispatchEvent(new CustomEvent('user-registered', {
                    detail: { user: result.data.user },
                    bubbles: true
                }));

                // Reset form
                this.querySelector('#registerForm').reset();
            } else {
                this.showError('registerForm', result.message || 'Registration failed. Please try again.');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showError('registerForm', 'Network error. Please check your connection.');
        } finally {
            this.setLoading('registerSubmit', false);
        }
    }

    validateRegistration(data) {
        if (!data.firstName || !data.lastName) {
            return { valid: false, message: 'Please enter your full name' };
        }

        if (!this.validateEmail(data.email)) {
            return { valid: false, message: 'Please enter a valid email address' };
        }

        if (!this.validatePhone(data.phone)) {
            return { valid: false, message: 'Please enter a valid South African phone number' };
        }

        if (!data.businessName) {
            return { valid: false, message: 'Please enter your business name' };
        }

        if (!data.businessType) {
            return { valid: false, message: 'Please select your business type' };
        }

        if (data.password.length < 8) {
            return { valid: false, message: 'Password must be at least 8 characters long' };
        }

        if (data.password !== data.confirmPassword) {
            return { valid: false, message: 'Passwords do not match' };
        }

        if (!data.acceptTerms) {
            return { valid: false, message: 'Please accept the Terms of Service' };
        }

        return { valid: true };
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validatePhone(phone) {
        // Basic South African phone validation
        const phoneRegex = /^(\+27|0)[1-8][0-9]{8}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }

    setLoading(buttonId, loading) {
        this.isLoading = loading;
        const button = this.querySelector(`#${buttonId}`);
        const text = button.querySelector('.btn-text');
        const spinner = button.querySelector('.btn-spinner');

        if (loading) {
            text.style.opacity = '0.5';
            spinner.style.display = 'block';
            button.disabled = true;
        } else {
            text.style.opacity = '1';
            spinner.style.display = 'none';
            button.disabled = false;
        }
    }

    showError(formId, message) {
        const form = this.querySelector(`#${formId}`);
        
        // Remove existing error
        const existingError = form.querySelector('.form-error');
        if (existingError) {
            existingError.remove();
        }

        // Add new error
        const errorElement = document.createElement('div');
        errorElement.className = 'form-error';
        errorElement.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 8V12M12 16H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" 
                      stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span>${message}</span>
        `;

        form.insertBefore(errorElement, form.querySelector('.auth-submit'));

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (errorElement.parentNode) {
                errorElement.remove();
            }
        }, 5000);
    }

    showSuccess(action, title, message) {
        // Hide forms
        this.querySelectorAll('.auth-form').forEach(form => {
            form.style.display = 'none';
        });
        this.querySelector('.auth-tabs').style.display = 'none';

        // Show success
        const success = this.querySelector('#authSuccess');
        success.style.display = 'block';
        
        this.querySelector('#successTitle').textContent = title;
        this.querySelector('#successMessage').textContent = message;

        // Update success action based on action type
        const successBtn = this.querySelector('#successAction');
        if (action === 'login') {
            successBtn.textContent = 'Continue Shopping';
        } else {
            successBtn.textContent = 'Check Email';
        }
    }

    togglePasswordVisibility(targetId) {
        const input = this.querySelector(`#${targetId}`);
        const toggle = this.querySelector(`[data-target="${targetId}"]`);
        
        if (input.type === 'password') {
            input.type = 'text';
            toggle.textContent = '🙈';
        } else {
            input.type = 'password';
            toggle.textContent = '👁';
        }
    }

    checkPasswordStrength(password) {
        const strengthBar = this.querySelector('#passwordStrength');
        const strengthFill = this.querySelector('#strengthFill');
        const strengthText = this.querySelector('#strengthText');

        if (password.length === 0) {
            strengthBar.style.display = 'none';
            return;
        }

        strengthBar.style.display = 'block';

        let strength = 0;
        let text = 'Weak';
        let color = '#e74c3c';

        // Length check
        if (password.length >= 8) strength += 25;
        
        // Complexity checks
        if (/[A-Z]/.test(password)) strength += 25;
        if (/[0-9]/.test(password)) strength += 25;
        if (/[^A-Za-z0-9]/.test(password)) strength += 25;

        // Set strength level
        if (strength >= 75) {
            text = 'Strong';
            color = '#1e8449';
        } else if (strength >= 50) {
            text = 'Good';
            color = '#f39c12';
        }

        strengthFill.style.width = `${strength}%`;
        strengthFill.style.background = color;
        strengthText.textContent = text;
        strengthText.style.color = color;
    }

    async socialAuth(provider) {
        try {
            // Redirect to social auth endpoint
            window.location.href = `/api/auth/${provider}`;
        } catch (error) {
            console.error('Social auth error:', error);
            this.showError('loginForm', `Failed to connect with ${provider}. Please try again.`);
        }
    }

    // Public method to open modal with specific tab
    openLogin() {
        this.open('login');
    }

    openRegister() {
        this.open('register');
    }
}

customElements.define('auth-modal', AuthModal);
