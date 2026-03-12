
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
                document.getElementById('auth-section').innerHTML = `
                    <div class="flex items-center gap-4">
                        <button onclick="buyerApp.switchTab('interests')" class="text-blue-600 hover:text-blue-800 transition-colors"><i class="fa-solid fa-bell text-xl"></i></button>
                        <span class="text-gray-700 font-medium hidden sm:inline">Hi, ${user.displayName.split(' ')[0]}</span>
                        <button onclick="buyerApp.logout()" class="text-gray-500 hover:text-red-600 transition-colors"><i class="fa-solid fa-arrow-right-from-bracket text-xl"></i></button>
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
        try { 
            await signInWithPopup(auth, googleProvider); 
        } catch (e) { 
            alert("Login failed. Please try again."); 
            console.error(e);
        }
    }

    async logout() {
        await signOut(auth);
        window.location.reload();
    }

    switchTab(tab) {
        document.getElementById('section-home').classList.toggle('hidden', tab !== 'home');
        document.getElementById('section-interests').classList.toggle('hidden', tab !== 'interests');
        document.getElementById('tab-home').className = tab === 'home' ? 'font-bold text-lg text-blue-600 transition-colors' : 'font-bold text-lg text-gray-500 hover:text-gray-700 transition-colors';
        document.getElementById('tab-interests').className = tab === 'interests' ? 'font-bold text-lg text-blue-600 transition-colors' : 'font-bold text-lg text-gray-500 hover:text-gray-700 transition-colors';
        
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
                <div class="col-span-full text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                    <i class="fa-regular fa-folder-open text-4xl text-gray-400 mb-3"></i>
                    <p class="text-gray-500 text-lg">No properties match your search.</p>
                </div>`;
            return;
        }
        
        grid.innerHTML = '';
        listings.forEach(data => {
            grid.innerHTML += `
                <div class="property-card bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                    <div class="relative h-48 overflow-hidden bg-gray-200">
                        <img src="${data.imageUrl}" class="w-full h-full object-cover">
                        <div class="absolute top-3 left-3 bg-white/90 backdrop-blur px-2 py-1 rounded shadow-sm text-xs font-bold text-gray-800">
                            ID: ${data.serialNum}
                        </div>
                    </div>
                    <div class="p-5 flex-grow flex flex-col">
                        <p class="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">${data.type}</p>
                        <h3 class="font-bold text-xl text-gray-900 leading-tight mb-2">${data.title}</h3>
                        <p class="text-gray-500 text-sm mb-4"><i class="fa-solid fa-location-dot mr-1"></i> ${data.location}</p>
                        <div class="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center">
                            <p class="text-xl font-bold text-gray-900">₹${Number(data.price).toLocaleString('en-IN')}</p>
                            <button onclick="buyerApp.openQueryModal('${data.id}')" class="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-black transition-colors">Ask / Interest</button>
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
        
        document.getElementById('submit-query-btn').onclick = () => this.submitQuery();
    }

    async submitQuery() {
        const text = document.getElementById('query-text').value;
        const btn = document.getElementById('submit-query-btn');

        if(!text.trim()) return alert("Please enter your query.");

        btn.disabled = true;
        btn.innerHTML = 'Sending...';

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
            alert("Inquiry sent securely! The seller will reply soon.");
            document.getElementById('query-modal').classList.add('hidden');
            this.loadMyInterests();
        } catch (err) {
            alert("Failed to send query. Try again.");
            console.error(err);
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Send Anonymously';
        }
    }

    async loadMyInterests() {
        const list = document.getElementById('my-queries-list');
        list.innerHTML = `<div class="flex justify-center py-8"><div class="loader"></div></div>`;

        try {
            const q = query(collection(db, "queries"), where("buyerId", "==", this.user.uid));
            const snapshot = await getDocs(q);
            list.innerHTML = '';
            
            let hasNewReplies = false;

            if(snapshot.empty) {
                list.innerHTML = `
                    <div class="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                        <i class="fa-regular fa-comments text-4xl text-gray-400 mb-3"></i>
                        <p class="text-gray-500 text-lg">You haven't asked any queries yet.</p>
                    </div>`;
                return;
            }

            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (data.reply) hasNewReplies = true; 
                
                list.innerHTML += `
                    <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 border-l-4 ${data.reply ? 'border-l-green-500' : 'border-l-gray-300'}">
                        <div class="flex justify-between items-start mb-3">
                            <div>
                                <span class="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">REF: ${data.listingSerial}</span>
                                <h4 class="font-bold text-lg text-gray-900 mt-2">${data.listingTitle}</h4>
                            </div>
                            <span class="text-xs font-bold px-3 py-1 rounded-full ${data.reply ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">${data.reply ? 'Replied' : 'Pending'}</span>
                        </div>
                        <div class="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-3">
                            <p class="text-sm text-gray-700"><span class="font-semibold text-gray-500 mr-2">You asked:</span> "${data.text}"</p>
                        </div>
                        
                        ${data.reply ? `
                            <div class="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <p class="text-sm font-semibold text-blue-800 mb-1"><i class="fa-solid fa-reply mr-1"></i> Developer Response:</p>
                                <p class="text-sm text-blue-900">${data.reply}</p>
                            </div>
                        ` : ''}
                    </div>
                `;
            });

            const badge = document.getElementById('notif-badge');
            if (badge) badge.classList.toggle('hidden', !hasNewReplies);

        } catch (err) {
            list.innerHTML = '<p class="text-red-500">Failed to load updates.</p>';
        }
    }
}

window.buyerApp = new BuyerApp();
