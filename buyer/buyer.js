// File: buyer/buyer.js
// PropMatch Buyer App — CarWale-inspired UI
import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, collection, addDoc, getDocs, query, where, serverTimestamp } from '../firebase-config.js';

class BuyerApp {
    constructor() {
        this.user = null;
        this.allListings = [];
        this.selectedListing = null;
        this.initAuth();
    }

    initAuth() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.user = user;
                this._showApp(user);
                this.fetchAndFilterListings();
                this.loadMyInterests();
            } else {
                this._showLanding();
            }
        });
    }

    _showApp(user) {
        // Update welcome name
        const nameEl = document.getElementById('buyer-welcome-name');
        if (nameEl) nameEl.textContent = user.displayName.split(' ')[0];

        // Update avatar
        const avatarEl = document.getElementById('dash-avatar');
        if (avatarEl) {
            avatarEl.innerHTML = user.photoURL
                ? `<img src="${user.photoURL}" alt="Avatar" onerror="this.parentElement.innerHTML='<i class=\\'fa-solid fa-user\\'></i>'">`
                : `<i class="fa-solid fa-user"></i>`;
        }

        // Replace login button with user widget
        document.getElementById('auth-section').innerHTML = `
            <div class="pw-user-widget">
                <button onclick="window.buyerApp && window.buyerApp.switchTab('interests')" style="
                    width:36px;height:36px;border-radius:50%;background:var(--brand-light);
                    color:var(--brand);border:1px solid rgba(14,110,158,.2);
                    display:flex;align-items:center;justify-content:center;font-size:14px;
                    cursor:pointer;transition:background .2s;" title="My Interests">
                    <i class="fa-regular fa-bell"></i>
                </button>
                <div style="display:flex;align-items:center;gap:8px;background:#f4f7fa;
                    border:1px solid var(--border);border-radius:99px;
                    padding:5px 14px 5px 6px;cursor:default;">
                    ${user.photoURL
                        ? `<img src="${user.photoURL}" style="width:26px;height:26px;border-radius:50%;object-fit:cover;" onerror="this.style.display='none'">`
                        : `<div style="width:26px;height:26px;border-radius:50%;background:var(--brand);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;"><i class="fa-solid fa-user"></i></div>`
                    }
                    <span style="font-size:13px;font-weight:600;color:var(--gray-700);">${user.displayName.split(' ')[0]}</span>
                </div>
                <button onclick="window.buyerApp && window.buyerApp.logout()" title="Logout" style="
                    width:36px;height:36px;border-radius:50%;
                    background:#fff;border:1px solid var(--border);
                    display:flex;align-items:center;justify-content:center;
                    color:var(--gray-500);font-size:13px;cursor:pointer;transition:color .2s,border-color .2s;">
                    <i class="fa-solid fa-arrow-right-from-bracket"></i>
                </button>
            </div>`;

        document.getElementById('landing-page').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');

        // Hide footer on app (show it on landing)
        const footer = document.getElementById('pw-footer');
        if (footer) footer.style.display = 'block';
    }

    _showLanding() {
        document.getElementById('auth-section').innerHTML = `
            <button onclick="window.buyerApp && window.buyerApp.login()" class="pw-login-btn">
                <i class="fa-solid fa-user"></i><span> Login / Register</span>
            </button>`;
        document.getElementById('landing-page').classList.remove('hidden');
        document.getElementById('main-app').classList.add('hidden');
    }

    async login() {
        try { await signInWithPopup(auth, googleProvider); }
        catch (e) { console.error(e); }
    }

    async logout() {
        await signOut(auth);
        window.location.reload();
    }

    switchTab(tab) {
        const homeSection = document.getElementById('section-home');
        const interestsSection = document.getElementById('section-interests');
        const tabHome = document.getElementById('tab-home');
        const tabInterests = document.getElementById('tab-interests');

        homeSection.classList.toggle('hidden', tab !== 'home');
        interestsSection.classList.toggle('hidden', tab !== 'interests');

        tabHome.classList.toggle('pw-tab-active', tab === 'home');
        tabInterests.classList.toggle('pw-tab-active', tab === 'interests');

        // Update nav link active state too
        document.querySelectorAll('.pw-nav-link').forEach(l => l.classList.remove('pw-nav-active'));
        if (tab === 'home') document.querySelectorAll('.pw-nav-link')[0]?.classList.add('pw-nav-active');
        if (tab === 'interests') document.querySelectorAll('.pw-nav-link')[1]?.classList.add('pw-nav-active');

        if (tab === 'interests') this.loadMyInterests();
    }

    async fetchAndFilterListings() {
        const grid = document.getElementById('market-grid');
        const resultsHeader = document.getElementById('results-header');
        if (resultsHeader) resultsHeader.innerHTML = '';

        grid.innerHTML = `
            <div class="pw-loader-wrap">
                <div class="pw-loader"></div>
            </div>`;

        if (this.allListings.length === 0) {
            try {
                const snapshot = await getDocs(collection(db, "listings"));
                this.allListings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (err) {
                grid.innerHTML = `
                    <div class="pw-empty">
                        <div class="pw-empty-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                        <h3>Couldn't load properties</h3>
                        <p>Please check your connection and try again.</p>
                    </div>`;
                return;
            }
        }

        const keyword = document.getElementById('search-keyword').value.toLowerCase().trim();
        const type = document.getElementById('search-type').value;

        // FIXED: Replaced unsafe direct object accessing with fallbacks
        const filtered = this.allListings.filter(l => {
            const title = l.title || '';
            const location = l.location || '';
            const sellerName = l.sellerName || '';
            const serialNum = l.serialNum || '';

            const matchKeyword = !keyword ||
                title.toLowerCase().includes(keyword) ||
                location.toLowerCase().includes(keyword) ||
                sellerName.toLowerCase().includes(keyword) ||
                serialNum.toLowerCase().includes(keyword);
            
            const matchType = !type || l.type === type;
            return matchKeyword && matchType;
        });

        // Results header
        if (resultsHeader) {
            resultsHeader.innerHTML = filtered.length > 0
                ? `Showing <strong>${filtered.length}</strong> propert${filtered.length === 1 ? 'y' : 'ies'}${keyword ? ` for "<strong>${keyword}</strong>"` : ''}${type ? ` · Type: <strong>${type}</strong>` : ''}`
                : '';
        }

        this.renderListings(filtered);
    }

    renderListings(listings) {
        const grid = document.getElementById('market-grid');

        if (listings.length === 0) {
            grid.innerHTML = `
                <div class="pw-empty">
                    <div class="pw-empty-icon"><i class="fa-solid fa-magnifying-glass"></i></div>
                    <h3>No properties found</h3>
                    <p>Try adjusting your search terms or filters.</p>
                </div>`;
            return;
        }

        let gridHtml = '';
        listings.forEach(data => {
            const price = Number(data.price).toLocaleString('en-IN');
            const imgSrc = data.imageUrl || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80';

            gridHtml += `
                <div class="pw-card">
                    <div class="pw-card-img-wrap">
                        <img src="${imgSrc}"
                             alt="${data.title}"
                             onerror="this.src='https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80'">
                        <div class="pw-card-id">ID: ${data.serialNum}</div>
                        <div class="pw-card-type-badge">${data.type}</div>
                    </div>
                    <div class="pw-card-body">
                        <h3 class="pw-card-title">${data.title}</h3>
                        <p class="pw-card-loc">
                            <i class="fa-solid fa-location-dot"></i>
                            ${data.location}
                        </p>
                        <p class="pw-card-seller">
                            <i class="fa-solid fa-user-tie"></i>
                            Listed by ${data.sellerName}
                        </p>
                        <div class="pw-card-footer">
                            <div class="pw-card-price">₹${price}</div>
                            <div class="pw-card-cta">
                                <button onclick="window.buyerApp && window.buyerApp.openQueryModal('${data.id}')" class="pw-card-ask-btn">
                                    Express Interest <i class="fa-solid fa-arrow-right"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>`;
        });
        
        grid.innerHTML = gridHtml;
    }

    openQueryModal(listingId) {
        this.selectedListing = this.allListings.find(l => l.id === listingId);
        const titleEl = document.getElementById('modal-listing-title');
        if (titleEl && this.selectedListing) {
            titleEl.textContent = this.selectedListing.title + ' · ' + this.selectedListing.location;
        }
        document.getElementById('query-text').value = '';
        document.getElementById('query-modal').classList.remove('hidden');
    }

    async submitQuery() {
        const text = document.getElementById('query-text').value.trim();
        const btn = document.getElementById('submit-query-btn');

        if (!text) {
            document.getElementById('query-text').style.borderColor = 'var(--accent)';
            document.getElementById('query-text').focus();
            return;
        }
        document.getElementById('query-text').style.borderColor = '';

        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Sending…';

        const queryData = {
            listingId: this.selectedListing.id,
            listingTitle: this.selectedListing.title,
            listingSerial: this.selectedListing.serialNum,
            sellerId: this.selectedListing.sellerId,
            buyerId: this.user.uid,
            text,
            reply: null,
            status: 'pending',
            createdAt: serverTimestamp()
        };

        try {
            await addDoc(collection(db, "queries"), queryData);
            document.getElementById('query-modal').classList.add('hidden');
            this.switchTab('interests');
        } catch (err) {
            console.error(err);
            alert("Failed to send query. Please try again.");
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Securely';
        }
    }

    async loadMyInterests() {
        const list = document.getElementById('my-queries-list');
        list.innerHTML = `<div style="display:flex;justify-content:center;padding:48px"><div class="pw-loader"></div></div>`;

        try {
            const q = query(collection(db, "queries"), where("buyerId", "==", this.user.uid));
            const snapshot = await getDocs(q);

            let repliedCount = 0;
            const items = [];
            snapshot.forEach(docSnap => {
                const d = docSnap.data();
                if (d.reply) repliedCount++;
                items.push(d);
            });

            // Update stats
            const statSent = document.getElementById('stat-sent');
            const statReplies = document.getElementById('stat-replies');
            if (statSent) statSent.textContent = snapshot.size;
            if (statReplies) statReplies.textContent = repliedCount;

            const badge = document.getElementById('notif-badge');
            if (badge) badge.classList.toggle('hidden', repliedCount === 0);

            list.innerHTML = '';

            if (snapshot.empty) {
                list.innerHTML = `
                    <div class="pw-empty" style="max-width:100%;">
                        <div class="pw-empty-icon"><i class="fa-regular fa-comments"></i></div>
                        <h3>No inquiries yet</h3>
                        <p>When you express interest in a property, your message and the developer's reply will appear here.</p>
                    </div>`;
                return;
            }

            let htmlString = '';
            items.forEach(data => {
                htmlString += `
                    <div class="pw-query-card ${data.reply ? 'pw-qc-replied' : ''}">
                        <div class="pw-qc-head">
                            <div>
                                <span class="pw-qc-ref">REF: ${data.listingSerial}</span>
                                <h4 class="pw-qc-title">${data.listingTitle}</h4>
                            </div>
                            <span class="pw-qc-status ${data.reply ? 'replied' : 'pending'}">
                                ${data.reply
                                    ? '<i class="fa-solid fa-check-double"></i> Developer Replied'
                                    : '<i class="fa-regular fa-clock"></i> Awaiting Reply'}
                            </span>
                        </div>
                        <div class="pw-qc-question">
                            <div class="pw-qc-qlabel">Your inquiry</div>
                            <p>"${data.text}"</p>
                        </div>
                        ${data.reply ? `
                            <div class="pw-qc-reply" style="margin-top:10px;">
                                <div class="pw-qc-rlabel"><i class="fa-solid fa-reply"></i> Developer Response</div>
                                <p>${data.reply}</p>
                            </div>` : ''}
                    </div>`;
            });
            list.innerHTML = htmlString;

        } catch (err) {
            console.error(err);
            list.innerHTML = `<p style="color:var(--accent);padding:20px;">Failed to load updates. Please refresh.</p>`;
        }
    }
}

window.buyerApp = new BuyerApp();
