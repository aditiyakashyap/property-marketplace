// File: seller/seller.js
import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, collection, addDoc, getDocs, query, where, updateDoc, deleteDoc, doc, serverTimestamp } from '../firebase-config.js';

class SellerApp {
    constructor() {
        this.user = null;
        this.initAuth();
        
        document.getElementById('login-btn').addEventListener('click', () => this.login());
        document.getElementById('listing-form').addEventListener('submit', (e) => this.saveListing(e));
    }

    initAuth() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.user = user;
                document.getElementById('auth-section').innerHTML = `
                    <div class="flex items-center gap-4">
                        <span class="text-gray-700 font-medium hidden sm:inline">${user.displayName}</span>
                        <button onclick="sellerApp.logout()" class="text-gray-500 hover:text-red-600 transition-colors" title="Logout"><i class="fa-solid fa-arrow-right-from-bracket text-xl"></i></button>
                    </div>`;
                document.getElementById('dashboard').classList.remove('hidden');
                this.loadListings();
                this.loadQueries();
            } else {
                document.getElementById('dashboard').classList.add('hidden');
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
        document.getElementById('section-listings').classList.toggle('hidden', tab !== 'listings');
        document.getElementById('section-queries').classList.toggle('hidden', tab !== 'queries');
        document.getElementById('tab-listings').className = tab === 'listings' ? 'font-bold text-lg text-blue-600 transition-colors' : 'font-bold text-lg text-gray-500 hover:text-gray-700 transition-colors';
        document.getElementById('tab-queries').className = tab === 'queries' ? 'font-bold text-lg text-blue-600 transition-colors' : 'font-bold text-lg text-gray-500 hover:text-gray-700 transition-colors';
    }

    toggleListingForm() {
        const form = document.getElementById('listing-form');
        form.classList.toggle('hidden');
        if(!form.classList.contains('hidden')) {
            form.reset();
        }
    }

    async saveListing(e) {
        e.preventDefault();
        const btn = document.getElementById('publish-btn');
        btn.disabled = true;
        btn.innerHTML = 'Publishing...';

        // Generate Unique Serial Number
        const serialNum = 'PRJ-' + Math.floor(10000 + Math.random() * 90000); 

        const listingData = {
            serialNum,
            sellerId: this.user.uid,
            sellerName: this.user.displayName,
            title: document.getElementById('prop-title').value,
            location: document.getElementById('prop-location').value,
            type: document.getElementById('prop-type').value,
            price: Number(document.getElementById('prop-price').value),
            description: document.getElementById('prop-desc').value,
            imageUrl: document.getElementById('prop-image').value || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80',
            createdAt: serverTimestamp()
        };

        try {
            await addDoc(collection(db, "listings"), listingData);
            alert(`Listing Published! System ID: ${serialNum}`);
            this.toggleListingForm();
            this.loadListings();
        } catch (err) {
            alert("Failed to publish listing.");
            console.error(err);
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Publish to Market';
        }
    }

    async loadListings() {
        const grid = document.getElementById('my-listings-grid');
        grid.innerHTML = `<div class="col-span-full flex justify-center py-12"><div class="loader"></div></div>`;

        try {
            const q = query(collection(db, "listings"), where("sellerId", "==", this.user.uid));
            const snapshot = await getDocs(q);
            grid.innerHTML = '';
            
            if(snapshot.empty) {
                grid.innerHTML = `
                    <div class="col-span-full text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                        <i class="fa-regular fa-folder-open text-4xl text-gray-400 mb-3"></i>
                        <p class="text-gray-500 text-lg">Your portfolio is empty.</p>
                    </div>`;
                return;
            }

            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                grid.innerHTML += `
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col property-card">
                        <div class="relative h-40 bg-gray-200">
                            <img src="${data.imageUrl}" class="w-full h-full object-cover">
                            <span class="absolute top-3 left-3 bg-white/90 backdrop-blur text-xs font-bold text-gray-800 px-2 py-1 rounded shadow-sm">ID: ${data.serialNum}</span>
                        </div>
                        <div class="p-4 flex-grow flex flex-col">
                            <p class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">${data.type}</p>
                            <h3 class="font-bold text-lg text-gray-900 leading-tight mb-2">${data.title}</h3>
                            <p class="text-gray-500 text-sm mb-4"><i class="fa-solid fa-location-dot mr-1"></i> ${data.location}</p>
                            
                            <div class="mt-auto border-t border-gray-100 pt-3 flex justify-between items-center">
                                <p class="text-blue-600 font-bold text-lg">₹${data.price.toLocaleString('en-IN')}</p>
                                <button onclick="sellerApp.deleteListing('${docSnap.id}')" class="text-red-500 text-sm hover:bg-red-50 px-3 py-1 rounded transition-colors font-medium">
                                    <i class="fa-solid fa-trash mr-1"></i> Remove
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
        } catch (err) {
            grid.innerHTML = '<p class="text-red-500">Failed to load listings.</p>';
        }
    }

    async deleteListing(id) {
        if(confirm("Are you sure you want to permanently delete this listing?")) {
            try {
                await deleteDoc(doc(db, "listings", id));
                this.loadListings();
            } catch (err) {
                alert("Error deleting listing.");
            }
        }
    }

    async loadQueries() {
        const list = document.getElementById('queries-list');
        list.innerHTML = `<div class="flex justify-center py-8"><div class="loader"></div></div>`;

        try {
            const q = query(collection(db, "queries"), where("sellerId", "==", this.user.uid));
            const snapshot = await getDocs(q);
            list.innerHTML = '';

            if(snapshot.empty) {
                list.innerHTML = `
                    <div class="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                        <i class="fa-regular fa-envelope-open text-4xl text-gray-400 mb-3"></i>
                        <p class="text-gray-500 text-lg">No buyer inquiries yet.</p>
                    </div>`;
                return;
            }

            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                const maskedBuyerId = "Buyer-" + data.buyerId.substring(0, 5).toUpperCase();
                
                list.innerHTML += `
                    <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 border-l-4 ${data.reply ? 'border-l-green-500' : 'border-l-yellow-400'}">
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <p class="text-xs text-gray-500 font-bold tracking-wide uppercase mb-1">Inquiry for Property</p>
                                <p class="text-gray-900 font-semibold">${data.listingTitle} <span class="text-sm text-gray-500 font-normal ml-1">(${data.listingSerial})</span></p>
                            </div>
                            <span class="text-xs font-bold px-3 py-1 rounded-full ${data.reply ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'}">${data.reply ? 'Answered' : 'Action Needed'}</span>
                        </div>
                        
                        <div class="bg-gray-50 p-4 rounded-lg mb-4">
                            <p class="text-sm text-gray-800"><span class="font-bold text-gray-600 mr-2">${maskedBuyerId} asks:</span> "${data.text}"</p>
                        </div>
                        
                        ${data.reply 
                            ? `<div class="bg-blue-50 border border-blue-100 p-4 rounded-lg text-sm text-blue-900">
                                <span class="font-bold text-blue-700 mr-2"><i class="fa-solid fa-check mr-1"></i> Your Reply:</span> ${data.reply}
                               </div>` 
                            : `<div class="flex gap-2">
                                 <input type="text" id="reply-${docSnap.id}" placeholder="Type your response to the buyer..." class="border border-gray-300 p-2 rounded-lg flex-grow outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm">
                                 <button onclick="sellerApp.sendReply('${docSnap.id}')" id="btn-${docSnap.id}" class="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap">Send Reply</button>
                               </div>`
                        }
                    </div>
                `;
            });
        } catch(err) {
            list.innerHTML = '<p class="text-red-500">Failed to load queries.</p>';
        }
    }

    async sendReply(queryId) {
        const replyInput = document.getElementById(`reply-${queryId}`);
        const btn = document.getElementById(`btn-${queryId}`);
        const replyText = replyInput.value;
        
        if(!replyText.trim()) return alert("Please type a message before sending.");
        
        btn.disabled = true;
        btn.innerHTML = 'Sending...';

        try {
            await updateDoc(doc(db, "queries", queryId), {
                reply: replyText,
                status: 'answered',
                repliedAt: serverTimestamp()
            });
            this.loadQueries();
        } catch(err) {
            alert("Failed to send reply. Please try again.");
            btn.disabled = false;
            btn.innerHTML = 'Send Reply';
        }
    }
}

window.sellerApp = new SellerApp();
