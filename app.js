// app.js
const API_URL = 'https://script.google.com/macros/s/AKfycbwtS0z1w7hBaZ5Tnz7vYIB0fqSCUOSsRen215sddHnstN2w4zAhOnJNyIiHV895H_I/exec'; 

class App {
    constructor() {
        this.user = JSON.parse(localStorage.getItem('propMatchUser')) || null;
        this.listings = [];
        this.init();
    }

    init() {
        this.renderNav();
        if (this.user) {
            this.navigate(`dashboard-${this.user.role}`);
        } else {
            this.navigate('home');
        }
    }

    renderNav() {
        const navActions = document.getElementById('nav-actions');
        if (this.user) {
            navActions.innerHTML = `
                <div class="flex items-center gap-4">
                    <span class="text-gray-600 font-medium hidden md:block">Welcome, ${this.user.name}</span>
                    <span class="px-3 py-1 bg-gray-100 text-xs font-bold uppercase rounded-full tracking-wide text-gray-600">${this.user.role}</span>
                    <button onclick="app.logout()" class="text-gray-500 hover:text-red-600 transition-colors">
                        <i class="fa-solid fa-arrow-right-from-bracket text-xl"></i>
                    </button>
                </div>
            `;
        } else {
            navActions.innerHTML = `
                <button onclick="app.showAuthModal('login')" class="text-gray-600 hover:text-blue-600 font-medium transition-colors">Login</button>
                <button onclick="app.showAuthModal('register')" class="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 shadow-sm transition-all font-medium">Get Started</button>
            `;
        }
    }

    navigate(view) {
        const main = document.getElementById('main-content');
        
        if (view === 'home') {
            const tpl = document.getElementById('tpl-home');
            main.innerHTML = tpl.innerHTML;
        } 
        else if (view === 'dashboard-seller') {
            const tpl = document.getElementById('tpl-dashboard-seller');
            main.innerHTML = tpl.innerHTML;
            this.fetchAndRenderListings('seller');
        } 
        else if (view === 'dashboard-buyer') {
            const tpl = document.getElementById('tpl-dashboard-buyer');
            main.innerHTML = tpl.innerHTML;
            this.fetchAndRenderListings('buyer');
        }
    }

    async fetchAndRenderListings(context) {
        const containerId = context === 'seller' ? 'seller-listings-container' : 'buyer-listings-container';
        const container = document.getElementById(containerId);
        container.innerHTML = `<div class="col-span-full flex justify-center py-12"><div class="loader w-12 h-12 border-4 border-t-blue-600"></div></div>`;

        try {
            const response = await fetch(API_URL, { method: 'GET', redirect: 'follow' });
            const result = await response.json();
            
            if (result.success) {
                this.listings = result.data;
                this.renderListingsGrid(context);
            } else {
                this.showToast('Failed to load listings', 'error');
                container.innerHTML = `<p class="text-red-500 col-span-full text-center">Failed to load data.</p>`;
            }
        } catch (error) {
            console.error(error);
            this.showToast('Network error while fetching listings', 'error');
            container.innerHTML = `<p class="text-red-500 col-span-full text-center">Network error. Check console.</p>`;
        }
    }

    renderListingsGrid(context, filteredData = null) {
        const dataToRender = filteredData || this.listings;
        const containerId = context === 'seller' ? 'seller-listings-container' : 'buyer-listings-container';
        const container = document.getElementById(containerId);
        
        let filtered = dataToRender;
        if (context === 'seller') {
            filtered = dataToRender.filter(l => l.sellerId === this.user.userId);
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                    <i class="fa-regular fa-folder-open text-4xl text-gray-400 mb-3"></i>
                    <p class="text-gray-500 text-lg">No properties found.</p>
                </div>`;
            return;
        }

        container.innerHTML = filtered.map(listing => `
            <div class="property-card bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                <div class="relative h-48 overflow-hidden bg-gray-200">
                    <img src="${listing.imageUrl}" alt="${listing.title}" class="w-full h-full object-cover">
                    <div class="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-gray-800 shadow-sm">
                        ${listing.type}
                    </div>
                </div>
                <div class="p-5 flex-grow flex flex-col">
                    <div class="flex justify-between items-start mb-2">
                        <h3 class="text-xl font-bold text-gray-900 leading-tight">${listing.title}</h3>
                    </div>
                    <p class="text-blue-600 font-bold text-lg mb-3">₹${Number(listing.price).toLocaleString('en-IN')}</p>
                    <p class="text-gray-500 text-sm mb-4 line-clamp-2">${listing.description}</p>
                    
                    <div class="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                        <div class="flex items-center text-sm text-gray-500">
                            <i class="fa-solid fa-location-dot mr-2 text-gray-400"></i> ${listing.location}
                        </div>
                        ${context === 'buyer' 
                            ? `<button onclick="app.showInterestModal('${listing.id}')" class="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">I'm Interested</button>` 
                            : `<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">Active</span>`
                        }
                    </div>
                </div>
            </div>
        `).join('');
    }

    filterListings() {
        const query = document.getElementById('search-input').value.toLowerCase();
        const filtered = this.listings.filter(l => 
            l.title.toLowerCase().includes(query) || 
            l.location.toLowerCase().includes(query)
        );
        this.renderListingsGrid('buyer', filtered);
    }

    openModal(htmlContent) {
        const backdrop = document.getElementById('modal-backdrop');
        const content = document.getElementById('modal-content');
        
        content.innerHTML = htmlContent;
        backdrop.classList.remove('hidden');
        
        setTimeout(() => {
            backdrop.classList.remove('opacity-0');
            content.classList.remove('scale-95');
        }, 10);
    }

    closeModal() {
        const backdrop = document.getElementById('modal-backdrop');
        const content = document.getElementById('modal-content');
        
        backdrop.classList.add('opacity-0');
        content.classList.add('scale-95');
        
        setTimeout(() => {
            backdrop.classList.add('hidden');
            content.innerHTML = '';
        }, 300);
    }

    showAuthModal(type = 'login') {
        const isLogin = type === 'login';
        const html = `
            <div class="p-8">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold text-gray-900">${isLogin ? 'Welcome Back' : 'Create Account'}</h3>
                    <button onclick="app.closeModal()" class="text-gray-400 hover:text-gray-600"><i class="fa-solid fa-xmark text-xl"></i></button>
                </div>
                <form id="auth-form" onsubmit="event.preventDefault(); app.handleAuth('${type}');" class="space-y-4">
                    ${!isLogin ? `
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">I am a</label>
                            <select id="auth-role" class="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="buyer">Buyer / Investor</option>
                                <option value="seller">Property Seller / Developer</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input type="text" id="auth-name" required class="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                    ` : ''}
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input type="email" id="auth-email" required class="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input type="password" id="auth-password" required class="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <button type="submit" id="auth-submit-btn" class="w-full bg-blue-600 text-white rounded-lg p-3 font-medium hover:bg-blue-700 transition-colors mt-6 flex justify-center items-center">
                        ${isLogin ? 'Sign In' : 'Register'}
                    </button>
                </form>
                <div class="mt-6 text-center text-sm text-gray-500">
                    ${isLogin 
                        ? `Don't have an account? <a href="#" onclick="app.showAuthModal('register')" class="text-blue-600 font-medium">Sign up</a>` 
                        : `Already have an account? <a href="#" onclick="app.showAuthModal('login')" class="text-blue-600 font-medium">Log in</a>`}
                </div>
            </div>
        `;
        this.openModal(html);
    }

    async handleAuth(action) {
        const btn = document.getElementById('auth-submit-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = `<div class="loader w-5 h-5 border-2 border-t-white"></div>`;
        btn.disabled = true;

        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        
        let payload = { action, email, password };
        
        if (action === 'register') {
            payload.role = document.getElementById('auth-role').value;
            payload.name = document.getElementById('auth-name').value;
        }

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                // Added text/plain Content-Type to fix Google Apps Script CORS block
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload),
                redirect: 'follow'
            });
            const data = await res.json();

            if (data.success) {
                this.user = {
                    userId: data.userId,
                    role: data.role,
                    name: data.name,
                    email: email
                };
                localStorage.setItem('propMatchUser', JSON.stringify(this.user));
                this.closeModal();
                this.renderNav();
                this.navigate(`dashboard-${this.user.role}`);
                this.showToast(`Welcome, ${data.name}!`, 'success');
            } else {
                this.showToast(data.message || 'Authentication failed', 'error');
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        } catch (err) {
            console.error(err);
            this.showToast('Server connection error', 'error');
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    logout() {
        this.user = null;
        localStorage.removeItem('propMatchUser');
        this.renderNav();
        this.navigate('home');
        this.showToast('Logged out successfully', 'success');
    }

    showAddListingModal() {
        const html = `
            <div class="p-8 max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold text-gray-900">Add New Property</h3>
                    <button onclick="app.closeModal()" class="text-gray-400 hover:text-gray-600"><i class="fa-solid fa-xmark text-xl"></i></button>
                </div>
                <form id="add-listing-form" onsubmit="event.preventDefault(); app.submitListing();" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Property Title</label>
                        <input type="text" id="list-title" required class="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Luxury Villa in South Delhi">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
                            <select id="list-type" class="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="Housing Project">Housing Project</option>
                                <option value="Apartment">Apartment</option>
                                <option value="Commercial">Commercial</option>
                                <option value="Plot/Land">Plot/Land</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                            <input type="number" id="list-price" required class="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. 15000000">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <input type="text" id="list-location" required class="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="City, Area">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea id="list-desc" required rows="3" class="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Key features, amenities, etc."></textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Image URL (Optional)</label>
                        <input type="url" id="list-image" class="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://...">
                    </div>
                    <button type="submit" id="submit-listing-btn" class="w-full bg-blue-600 text-white rounded-lg p-3 font-medium hover:bg-blue-700 transition-colors mt-6 flex justify-center items-center">
                        Publish Listing
                    </button>
                </form>
            </div>
        `;
        this.openModal(html);
    }

    async submitListing() {
        const btn = document.getElementById('submit-listing-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = `<div class="loader w-5 h-5 border-2 border-t-white"></div>`;
        btn.disabled = true;

        const payload = {
            action: 'addListing',
            sellerId: this.user.userId,
            sellerName: this.user.name,
            title: document.getElementById('list-title').value,
            type: document.getElementById('list-type').value,
            price: document.getElementById('list-price').value,
            location: document.getElementById('list-location').value,
            description: document.getElementById('list-desc').value,
            imageUrl: document.getElementById('list-image').value
        };

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                // Added text/plain Content-Type to fix Google Apps Script CORS block
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload),
                redirect: 'follow'
            });
            const data = await res.json();

            if (data.success) {
                this.closeModal();
                this.showToast('Property listed successfully!', 'success');
                this.fetchAndRenderListings('seller');
            } else {
                this.showToast('Failed to add listing', 'error');
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        } catch (err) {
            console.error(err);
            this.showToast('Error connecting to server', 'error');
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    showInterestModal(listingId) {
        const listing = this.listings.find(l => l.id === listingId);
        
        const html = `
            <div class="p-8">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold text-gray-900">Express Interest</h3>
                    <button onclick="app.closeModal()" class="text-gray-400 hover:text-gray-600"><i class="fa-solid fa-xmark text-xl"></i></button>
                </div>
                
                <div class="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                    <p class="text-sm text-gray-500 uppercase tracking-wide font-semibold mb-1">Property</p>
                    <p class="font-bold text-gray-900">${listing.title}</p>
                    <p class="text-sm text-gray-600 mt-1">Seller: ${listing.sellerName}</p>
                </div>

                <form id="interest-form" onsubmit="event.preventDefault(); app.submitInterest('${listingId}');" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Your Phone Number</label>
                        <input type="tel" id="int-phone" required class="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="+91 XXXXX XXXXX">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Message / Query</label>
                        <textarea id="int-query" required rows="4" class="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="I'd like to schedule a visit..."></textarea>
                    </div>
                    <button type="submit" id="submit-interest-btn" class="w-full bg-gray-900 text-white rounded-lg p-3 font-medium hover:bg-black transition-colors mt-6 flex justify-center items-center">
                        Send to Seller
                    </button>
                </form>
            </div>
        `;
        this.openModal(html);
    }

    async submitInterest(listingId) {
        const btn = document.getElementById('submit-interest-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = `<div class="loader w-5 h-5 border-2 border-t-white"></div>`;
        btn.disabled = true;

        const payload = {
            action: 'showInterest',
            listingId: listingId,
            buyerId: this.user.userId,
            buyerName: this.user.name,
            buyerEmail: this.user.email,
            buyerPhone: document.getElementById('int-phone').value,
            query: document.getElementById('int-query').value
        };

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                // Added text/plain Content-Type to fix Google Apps Script CORS block
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload),
                redirect: 'follow'
            });
            const data = await res.json();

            if (data.success) {
                this.closeModal();
                this.showToast('Your interest has been recorded! The seller will contact you.', 'success');
            } else {
                this.showToast('Failed to send interest', 'error');
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        } catch (err) {
            console.error(err);
            this.showToast('Error connecting to server', 'error');
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        
        const colors = type === 'success' ? 'bg-green-600' : 'bg-red-600';
        const icon = type === 'success' ? 'fa-check-circle' : 'fa-circle-exclamation';

        toast.className = `toast-enter flex items-center gap-3 ${colors} text-white px-6 py-3 rounded-lg shadow-lg`;
        toast.innerHTML = `
            <i class="fa-solid ${icon} text-lg"></i>
            <span class="font-medium">${message}</span>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

const app = new App();
