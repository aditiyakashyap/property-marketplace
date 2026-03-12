// File: seller/seller.js
import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, collection, addDoc, getDocs, query, where, updateDoc, deleteDoc, doc, serverTimestamp } from '../firebase-config.js';

class SellerApp {
    constructor() {
        this.user = null;
        this.initAuth();
        document.getElementById('listing-form').addEventListener('submit', (e) => this.saveListing(e));
    }

    initAuth() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.user = user;
                
                const welcomeName = document.getElementById('seller-welcome-name');
                if(welcomeName) welcomeName.innerText = user.displayName;

                document.getElementById('auth-section').innerHTML = `
                    <div class="flex items-center gap-4">
                        <div class="bg-gray-100 px-4 py-2 rounded-full hidden sm:flex items-center gap-2 border border-gray-200">
                            <img src="${user.photoURL}" class="w-6 h-6 rounded-full" onerror="this.style.display='none'">
                            <span class="text-gray-700 font-medium text-sm">${user.displayName}</span>
                        </div>
                        <button onclick="sellerApp.logout()" class="text-gray-400 hover:text-red-500 transition-colors bg-white border border-gray-200 w-10 h-10 rounded-full flex items-center justify-center shadow-sm" title="Logout"><i class="fa-solid fa-arrow-right-from-bracket"></i></button>
                    </div>`;
                
                // Show App, Hide Landing
                document.getElementById('landing-page').classList.add('hidden');
                document.getElementById('dashboard').classList.remove('hidden');
                
                this.loadListings();
                this.loadQueries();
            } else {
                // Show Landing, Hide App
                document.getElementById('auth-section').innerHTML = `<button onclick="sellerApp.login()" class="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 font-medium transition-all shadow-md">Developer Login</button>`;
                document.getElementById('landing-page').classList.remove('hidden');
                document.getElementById('dashboard').classList.add('hidden');
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
        document.getElementById('section-listings').classList.toggle('hidden', tab !== 'listings');
        document.getElementById('section-queries').classList.toggle('hidden', tab !== 'queries');
        
        document.getElementById('tab-listings').className = tab === 'listings' ? 'font-bold text-lg text-blue-600 border-b-2 border-blue-600 pb-4 -mb-[18px] transition-all' : 'font-bold text-lg text-gray-400 hover:text-gray-700 pb-4 -mb-[18px] transition-all';
        document.getElementById('tab-queries').className = tab === 'queries' ? 'font-bold text-lg text-blue-600 border-b-2 border-blue-600 pb-4 -mb-[18px] transition-all' : 'font-bold text-lg text-gray-400 hover:text-gray-700 pb-4 -mb-[18px] transition-all';
    }

    toggleListingForm() {
        const form = document.getElementById('listing-form');
        form.classList.toggle('hidden');
        if(!form.classList.contains('hidden')) form.reset();
    }

    async saveListing(e) {
        e.preventDefault();
        const btn = document.getElementById('publish-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Publishing...';

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
            this.toggleListingForm();
            this.loadListings();
        } catch (err) { alert("Failed to publish listing."); } 
        finally { btn.disabled = false; btn.innerHTML = 'Publish to Market'; }
    }

    async loadListings() {
        const grid = document.getElementById('my-listings-grid');
        grid.innerHTML = `<div class="col-span-full flex justify-center py-12"><div class="loader"></div></div>`;

        try {
            const q = query(collection(db, "listings"), where("sellerId", "==", this.user.uid));
            const snapshot = await getDocs(q);
            grid.innerHTML = '';
            
            const statListings = document.getElementById('stat-listings');
            if(statListings) statListings.innerText = snapshot.size;

            if(snapshot.empty) {
                grid.innerHTML = `
                    <div class="col-span-full text-center py-20 bg-gradient-to-b from-gray-50 to-white rounded-2xl border border-gray-200 shadow-sm">
                        <div class="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fa-solid fa-box-open text-4xl text-blue-500"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-900 mb-1">No properties listed</h3>
                        <p class="text-gray-500">Your portfolio is currently empty. Add a property to get started.</p>
                    </div>`;
                return;
            }

            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                grid.innerHTML += `
                    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col property-card group">
                        <div class="relative h-48 bg-gray-200 overflow-hidden">
                            <img src="${data.imageUrl}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                            <span class="absolute top-3 left-3 bg-white/90 backdrop-blur text-xs font-bold text-gray-800 px-3 py-1.5 rounded-lg shadow-sm">ID: ${data.serialNum}</span>
                        </div>
                        <div class="p-5 flex-grow flex flex-col">
                            <p class="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">${data.type}</p>
                            <h3 class="font-bold text-xl text-gray-900 leading-tight mb-2">${data.title}</h3>
                            <p class="text-gray-500 text-sm mb-5"><i class="fa-solid fa-location-dot mr-1 text-gray-400"></i> ${data.location}</p>
                            
                            <div class="mt-auto border-t border-gray-100 pt-4 flex justify-between items-center">
                                <p class="text-gray-900 font-bold text-xl">₹${data.price.toLocaleString('en-IN')}</p>
                                <button onclick="sellerApp.deleteListing('${docSnap.id}')" class="text-red-500 text-sm hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors font-medium flex items-center">
                                    <i class="fa-solid fa-trash mr-1.5"></i> Remove
                                </button>
                            </div>
                        </div>
                    </div>`;
            });
        } catch (err) { grid.innerHTML = '<p class="text-red-500">Failed to load listings.</p>'; }
    }

    async deleteListing(id) {
        if(confirm("Are you sure you want to permanently delete this listing?")) {
            await deleteDoc(doc(db, "listings", id));
            this.loadListings();
        }
    }

    async loadQueries() {
        const list = document.getElementById('queries-list');
        list.innerHTML = `<div class="flex justify-center py-8"><div class="loader"></div></div>`;

        try {
            const q = query(collection(db, "queries"), where("sellerId", "==", this.user.uid));
            const snapshot = await getDocs(q);
            list.innerHTML = '';

            let pendingCount = 0;
            snapshot.forEach(docSnap => { if(!docSnap.data().reply) pendingCount++; });
            
            const statQueries = document.getElementById('stat-queries');
            const statPending = document.getElementById('stat-pending');
            if(statQueries) statQueries.innerText = snapshot.size;
            if(statPending) statPending.innerText = pendingCount;

            if(snapshot.empty) {
                list.innerHTML = `
                    <div class="text-center py-20 bg-gradient-to-b from-gray-50 to-white rounded-2xl border border-gray-200 shadow-sm">
                        <div class="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fa-solid fa-inbox text-4xl text-blue-500"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-900 mb-1">Inbox Zero</h3>
                        <p class="text-gray-500">You don't have any buyer inquiries yet.</p>
                    </div>`;
                return;
            }

            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                const maskedBuyerId = "Buyer-" + data.buyerId.substring(0, 5).toUpperCase();
                
                list.innerHTML += `
                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 ${data.reply ? 'border-l-green-500' : 'border-l-yellow-400'} hover:shadow-md transition-shadow">
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <p class="text-xs text-gray-400 font-bold tracking-wider uppercase mb-1">Inquiry for Property</p>
                                <p class="text-gray-900 font-bold text-lg">${data.listingTitle} <span class="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded ml-2">REF: ${data.listingSerial}</span></p>
                            </div>
                            <span class="text-xs font-bold px-3 py-1 rounded-full ${data.reply ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'}">${data.reply ? '<i class="fa-solid fa-check mr-1"></i> Answered' : 'Action Needed'}</span>
                        </div>
                        
                        <div class="bg-gray-50 p-4 rounded-xl mb-4 border border-gray-100">
                            <p class="text-sm text-gray-800"><span class="font-bold text-gray-900 mr-2">${maskedBuyerId} asks:</span> "${data.text}"</p>
                        </div>
                        
                        ${data.reply 
                            ? `<div class="bg-blue-50/50 border border-blue-100 p-4 rounded-xl text-sm text-blue-900">
                                <span class="font-bold text-blue-700 mr-2"><i class="fa-solid fa-reply mr-1"></i> Your Reply:</span> ${data.reply}
                               </div>` 
                            : `<div class="flex flex-col sm:flex-row gap-3">
                                 <input type="text" id="reply-${docSnap.id}" placeholder="Type your professional response..." class="bg-white border border-gray-300 p-3 rounded-xl flex-grow outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm shadow-sm">
                                 <button onclick="sellerApp.sendReply('${docSnap.id}')" id="btn-${docSnap.id}" class="bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-black transition-colors whitespace-nowrap shadow-md">Send Reply</button>
                               </div>`
                        }
                    </div>
                `;
            });
        } catch(err) { list.innerHTML = '<p class="text-red-500">Failed to load queries.</p>'; }
    }

    async sendReply(queryId) {
        const replyInput = document.getElementById(`reply-${queryId}`);
        const btn = document.getElementById(`btn-${queryId}`);
        const replyText = replyInput.value;
        
        if(!replyText.trim()) return alert("Please type a message before sending.");
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';

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
