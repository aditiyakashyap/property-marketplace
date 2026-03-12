// File: buyer/buyer.js
import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, collection, addDoc, getDocs, query, where, serverTimestamp } from '../firebase-config.js';

class BuyerApp {
    constructor() {
        this.user = null;
        this.allListings = [];
        this.selectedListing = null;

        this.initAuth();
        document.getElementById('login-btn').addEventListener('click', () => this.login());
    }

    initAuth() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.user = user;
                
                // NEW: Populate Welcome Banner Name
                const welcomeName = document.getElementById('buyer-welcome-name');
                if(welcomeName) welcomeName.innerText = user.displayName.split(' ')[0];

                document.getElementById('auth-section').innerHTML = `
                    <div class="flex items-center gap-4">
                        <button onclick="buyerApp.switchTab('interests')" class="text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 w-10 h-10 rounded-full flex items-center justify-center"><i class="fa-solid fa-bell text-lg"></i></button>
                        <div class="bg-gray-100 px-4 py-2 rounded-full hidden sm:flex items-center gap-2 border border-gray-200">
                            <img src="${user.photoURL}" class="w-6 h-6 rounded-full" onerror="this.style.display='none'">
                            <span class="text-gray-700 font-medium text-sm">${user.displayName.split(' ')[0]}</span>
                        </div>
                        <button onclick="buyerApp.logout()" class="text-gray-400 hover:text-red-500 transition-colors bg-white border border-gray-200 w-10 h-10 rounded-full flex items-center justify-center shadow-sm" title="Logout"><i class="fa-solid fa-arrow-right-from-bracket"></i></button>
                    </div>`;
                document.getElementById('main-app').classList.remove('hidden');
                this.fetchAndFilterListings();
                this.loadMyInterests();
            } else {
                document.getElementById('main-app').classList.add('hidden');
            }
        });
    }

    async login() {
        try { await signInWithPopup(auth, googleProvider); } 
        catch (e) { alert("Login failed. Please try again."); console.error(e); }
    }

    async logout() {
        await signOut(auth);
        window.location.reload();
    }

    switchTab(tab) {
        document.getElementById('section-home').classList.toggle('hidden', tab !== 'home');
        document.getElementById('section-interests').classList.toggle('hidden', tab !== 'interests');
        
        // Stylish tab switching
        document.getElementById('tab-home').className = tab === 'home' ? 'font-bold text-lg text-blue-600 border-b-2 border-blue-600 pb-4 -mb-[18px] transition-all' : 'font-bold text-lg text-gray-400 hover:text-gray-700 pb-4 -mb-[18px] transition-all';
        document.getElementById('tab-interests').className = tab === 'interests' ? 'font-bold text-lg text-blue-600 border-b-2 border-blue-600 pb-4 -mb-[18px] transition-all relative' : 'font-bold text-lg text-gray-400 hover:text-gray-700 pb-4 -mb-[18px] transition-all relative';
        
        if(tab === 'interests') this.loadMyInterests();
    }

    async fetchAndFilterListings() {
        const grid = document.getElementById('market-grid');
        grid.innerHTML = `<div class="col-span-full flex justify-center py-12"><div class="loader"></div></div>`;

        if(this.allListings.length === 0) {
            try {
                const snapshot = await getDocs(collection(db, "listings"));
                this.allListings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (err) {
                grid.innerHTML = '<p class="col-span-full text-center text-red-500">Error loading properties.</p>';
                return;
            }
        }

        const keyword = document.getElementById('search-keyword').value.toLowerCase();
        const type = document.getElementById('search-type').value;

        const filtered = this.allListings.filter(l => {
            const matchKeyword = l.title.toLowerCase().includes(keyword) || 
                                 l.location.toLowerCase().includes(keyword) || 
                                 l.sellerName.toLowerCase().includes(keyword) ||
                                 l.serialNum.toLowerCase().includes(keyword);
            const matchType = type === "" || l.type === type;
            return matchKeyword && matchType;
        });

        this.renderListings(filtered);
    }

    renderListings(listings) {
        const grid = document.getElementById('market-grid');
        
        if (listings.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-20 bg-gradient-to-b from-gray-50 to-white rounded-2xl border border-gray-200 shadow-sm">
                    <div class="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fa-solid fa-magnifying-glass text-4xl text-blue-500"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-900 mb-1">No matches found</h3>
                    <p class="text-gray-500">Try adjusting your filters or search terms.</p>
                </div>`;
            return;
        }
        
        grid.innerHTML = '';
        listings.forEach(data => {
            grid.innerHTML += `
                <div class="property-card bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col group">
                    <div class="relative h-56 overflow-hidden bg-gray-200">
                        <img src="${data.imageUrl}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                        <div class="absolute top-3 left-3 bg-white/95 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm text-xs font-bold text-gray-800">
                            ID: ${data.serialNum}
                        </div>
                    </div>
                    <div class="p-6 flex-grow flex flex-col">
                        <p class="text-xs text-blue-600 font-bold uppercase tracking-widest mb-1.5">${data.type}</p>
                        <h3 class="font-bold text-xl text-gray-900 leading-tight mb-2">${data.title}</h3>
                        <p class="text-gray-500 text-sm mb-6"><i class="fa-solid fa-location-dot mr-1 text-gray-400"></i> ${data.location}</p>
                        <div class="mt-auto pt-5 border-t border-gray-100 flex justify-between items-center">
                            <p class="text-2xl font-bold text-gray-900">₹${Number(data.price).toLocaleString('en-IN')}</p>
                            <button onclick="buyerApp.openQueryModal('${data.id}')" class="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-black transition-colors shadow-md hover:shadow-lg flex items-center gap-2">
                                Ask <i class="fa-solid fa-arrow-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    openQueryModal(listingId) {
        this.selectedListing = this.allListings.find(l => l.id === listingId);
        document.getElementById('query-text').value = '';
        document.getElementById('query-modal').classList.remove('hidden');
    }

    async submitQuery() {
        const text = document.getElementById('query-text').value;
        const btn = document.getElementById('submit-query-btn');

        if(!text.trim()) return alert("Please enter your query.");

        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Sending...';

        const queryData = {
            listingId: this.selectedListing.id,
            listingTitle: this.selectedListing.title,
            listingSerial: this.selectedListing.serialNum,
            sellerId: this.selectedListing.sellerId,
            buyerId: this.user.uid, 
            text: text,
            reply: null,
            status: 'pending',
            createdAt: serverTimestamp()
        };

        try {
            await addDoc(collection(db, "queries"), queryData);
            document.getElementById('query-modal').classList.add('hidden');
            this.loadMyInterests();
        } catch (err) {
            alert("Failed to send query. Try again.");
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Securely';
        }
    }

    async loadMyInterests() {
        const list = document.getElementById('my-queries-list');
        list.innerHTML = `<div class="flex justify-center py-12"><div class="loader"></div></div>`;

        try {
            const q = query(collection(db, "queries"), where("buyerId", "==", this.user.uid));
            const snapshot = await getDocs(q);
            list.innerHTML = '';
            
            // NEW: Update Dashboard Stats
            let repliedCount = 0;
            snapshot.forEach(docSnap => { if(docSnap.data().reply) repliedCount++; });
            
            const statSent = document.getElementById('stat-sent');
            const statReplies = document.getElementById('stat-replies');
            if(statSent) statSent.innerText = snapshot.size;
            if(statReplies) statReplies.innerText = repliedCount;
            
            const badge = document.getElementById('notif-badge');
            if (badge) badge.classList.toggle('hidden', repliedCount === 0);

            if(snapshot.empty) {
                list.innerHTML = `
                    <div class="text-center py-20 bg-gradient-to-b from-gray-50 to-white rounded-2xl border border-gray-200 shadow-sm">
                        <div class="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fa-regular fa-comments text-4xl text-blue-500"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-900 mb-1">No inquiries yet</h3>
                        <p class="text-gray-500">When you ask a developer a question, it will appear here.</p>
                    </div>`;
                return;
            }

            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                
                list.innerHTML += `
                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 ${data.reply ? 'border-l-green-500' : 'border-l-gray-300'} hover:shadow-md transition-shadow">
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <span class="text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200">REF: ${data.listingSerial}</span>
                                <h4 class="font-bold text-xl text-gray-900 mt-3">${data.listingTitle}</h4>
                            </div>
                            <span class="text-xs font-bold px-3 py-1.5 rounded-full ${data.reply ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">${data.reply ? '<i class="fa-solid fa-check-double mr-1"></i> Developer Replied' : 'Pending Reply'}</span>
                        </div>
                        <div class="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-3">
                            <p class="text-sm text-gray-800"><span class="font-bold text-gray-500 uppercase tracking-wider text-xs block mb-1">You asked:</span> "${data.text}"</p>
                        </div>
                        
                        ${data.reply ? `
                            <div class="bg-blue-50/50 p-5 rounded-xl border border-blue-100 relative">
                                <div class="absolute top-0 left-5 transform -translate-y-1/2 w-4 h-4 bg-blue-50 border-t border-l border-blue-100 rotate-45"></div>
                                <p class="text-xs font-bold uppercase tracking-wider text-blue-800 mb-1"><i class="fa-solid fa-reply mr-1"></i> Developer Response:</p>
                                <p class="text-sm text-blue-900">${data.reply}</p>
                            </div>
                        ` : ''}
                    </div>
                `;
            });
        } catch (err) {
            list.innerHTML = '<p class="text-red-500">Failed to load updates.</p>';
        }
    }
}

window.buyerApp = new BuyerApp();
