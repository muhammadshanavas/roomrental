const API_URL = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === ''
    ? 'http://localhost:5000/api'
    : 'https://your-rentx-backend.onrender.com/api';

// If the app is served via Express from root, this also maps correctly.

document.addEventListener('DOMContentLoaded', () => {
    // 1. Navigation System (SPA Routing)
    const navButtons = document.querySelectorAll('[data-target]');
    const sections = document.querySelectorAll('.page-section');

    function navigateTo(targetId) {
        sections.forEach(sec => sec.classList.add('hidden'));
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

        const targetSection = document.getElementById(targetId);
        if(targetSection) targetSection.classList.remove('hidden');

        const targetNavBtn = document.querySelector(`.nav-btn[data-target="${targetId}"]`);
        if(targetNavBtn && !targetNavBtn.classList.contains('primary-btn') && !targetNavBtn.classList.contains('auth-btn')) {
            targetNavBtn.classList.add('active');
        }

        if (targetId === 'view-rooms') {
            loadRooms();
        }
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Expose in global scope so other async callbacks can call it safely
    window.loadRooms = loadRooms;
    window.navigateTo = navigateTo;

    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(btn.getAttribute('data-target'));
        });
    });

    document.getElementById('nav-brand').addEventListener('click', () => navigateTo('home'));

    // Category toggle logic for Add Room
    const categorySelect = document.getElementById('room-category');
    const bhkGroup = document.getElementById('bhk-group');
    const pgGroup = document.getElementById('pg-group');
    
    if (categorySelect) {
        categorySelect.addEventListener('change', (e) => {
            if (e.target.value === 'PG') {
                if(bhkGroup) bhkGroup.style.display = 'none';
                if(pgGroup) pgGroup.style.display = 'block';
            } else {
                if(bhkGroup) bhkGroup.style.display = 'block';
                if(pgGroup) pgGroup.style.display = 'none';
            }
        });
        // Initial state
        if(pgGroup) pgGroup.style.display = 'none';
    }


    // 2. Load and Render Rooms
    async function loadRooms() {
        const grid = document.getElementById('room-grid');
        grid.innerHTML = '<p class="section-desc">Loading rooms...</p>';
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

            const res = await fetch(`${API_URL}/rooms`, { headers });
            if (!res.ok) throw new Error('You must be logged in to view rooms');
            
            const rooms = await res.json();
            renderRooms(rooms, grid);
        } catch (error) {
            grid.innerHTML = `<p class="section-desc" style="color:red;">Error: ${error.message}</p>`;
        }
    }

    function renderRooms(rooms, grid) {
        grid.innerHTML = ''; 
        if (!rooms || rooms.length === 0) {
            grid.innerHTML = `<p class="section-desc" style="grid-column: 1/-1;">No rooms available. Be the first to list one!</p>`;
            return;
        }

        rooms.forEach((room) => {
            const card = document.createElement('div');
            card.className = 'room-card';
            
            // Handle tags
            const tagInfo = room.category === 'BHK' ? room.bhkType : (room.pgSharing ? room.pgSharing.replace('_', ' ') : 'PG');
            const ownerName = room.ownerId ? room.ownerId.username : "Owner";

            card.innerHTML = `
                <img src="${room.images && room.images[0] ? room.images[0] : 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800'}" alt="${room.title}" class="room-image" onerror="this.src='https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800'">
                <div class="room-content">
                    <div class="room-header">
                        <div>
                            <span style="font-size: 0.75rem; background: var(--primary-color); color: white; padding: 2px 8px; border-radius: 12px; margin-bottom: 5px; display: inline-block;">${tagInfo}</span>
                            <h3 class="room-title">${room.title}</h3>
                            <div class="room-location">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                ${room.location}
                            </div>
                        </div>
                        <div class="room-price">
                            $${room.price}<span>/mo</span>
                        </div>
                    </div>
                    <p class="room-desc">${room.description.length > 80 ? room.description.substring(0, 80) + '...' : room.description}</p>
                    <div class="room-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px;">
                        <span style="font-size: 0.8rem; color: #666;">Listed by: ${ownerName}</span>
                        <button class="view-details-btn">View Details</button>
                    </div>
                </div>
            `;
            const btn = card.querySelector('.view-details-btn');
            btn.addEventListener('click', () => {
                if(typeof window.openModal === 'function') window.openModal(room);
            });
            grid.appendChild(card);
        });
    }

    // 3. API Submissions
    
    // Auth Helper
    function handleAuthSuccess(data) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data));
        alert(`Welcome, ${data.username}!`);
        navigateTo('view-rooms');

        // Update UI
        document.querySelectorAll('.auth-btn').forEach(btn => btn.style.display = 'none');
        // Add logout button if not exists
        if(!document.getElementById('logout-btn')) {
            const logoutBtn = document.createElement('button');
            logoutBtn.id = 'logout-btn';
            logoutBtn.className = 'nav-btn auth-btn';
            logoutBtn.innerText = 'Logout';
            logoutBtn.onclick = () => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                location.reload();
            };
            document.querySelector('.auth-buttons').appendChild(logoutBtn);
        }
    }

    // Show/Hide Password Toggle logic removed as requested.

    // OTP Sending Logic
    document.querySelectorAll('.get-otp-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const form = btn.closest('form');
            const emailInput = form.querySelector('input[id$="-email"]');
            const email = emailInput ? emailInput.value.trim() : '';
            
            if (!email) {
                alert('Please enter your Email or Phone Number first to receive an OTP.');
                return;
            }
            
            btn.textContent = 'Sending...';
            btn.disabled = true;

            try {
                const res = await fetch(`${API_URL}/auth/send-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const data = await res.json();
                if (res.ok) {
                    alert('OTP sent successfully! Please check your messages/email.');
                    const otpGroup = form.querySelector('.otp-group');
                    if(otpGroup) otpGroup.classList.remove('hidden');
                    
                    let countdown = 60;
                    const interval = setInterval(() => {
                        countdown--;
                        btn.textContent = `Resend in ${countdown}s`;
                        if (countdown <= 0) {
                            clearInterval(interval);
                            btn.textContent = 'Resend OTP';
                            btn.disabled = false;
                        }
                    }, 1000);
                } else {
                    alert(data.message || 'Failed to send OTP.');
                    btn.textContent = 'Send OTP';
                    btn.disabled = false;
                }
            } catch (err) {
                alert('Server error: Make sure the backend supports OTP generation.');
                btn.textContent = 'Send OTP';
                btn.disabled = false;
            }
        });
    });

    // Login Form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const otp = document.getElementById('login-otp') ? document.getElementById('login-otp').value : '';
            
            if (!password) return alert('Password is mandatory to login.');

            try {
                const res = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, otp })
                });
                const data = await res.json();
                if (res.ok) handleAuthSuccess(data);
                else alert(data.message || 'Login failed');
            } catch (err) {
                alert('Server error: Is the backend running?');
            }
        });
    }

    // Register Form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            const role = document.getElementById('reg-role') ? document.getElementById('reg-role').value : 'tenant';
            const otp = document.getElementById('reg-otp') ? document.getElementById('reg-otp').value : '';
            
            if (!password) return alert('Password is mandatory to register.');

            try {
                const res = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password, role, otp })
                });
                const data = await res.json();
                if (res.ok) handleAuthSuccess(data);
                else alert(data.message || 'Registration failed');
            } catch (err) {
                alert('Server error: Is the backend running?');
            }
        });
    }

    // GPS Auto-Location
    const getGpsBtn = document.getElementById('get-gps-btn');
    const roomLocationInput = document.getElementById('room-location');

    if (getGpsBtn && roomLocationInput) {
        getGpsBtn.addEventListener('click', () => {
            if (!navigator.geolocation) return alert('Geolocation is not supported by your browser.');
            
            getGpsBtn.textContent = '⌛ Locating...';
            navigator.geolocation.getCurrentPosition(async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                    const data = await res.json();
                    
                    if (data && data.address) {
                        const city = data.address.city || data.address.town || data.address.village || data.address.county || "";
                        const state = data.address.state || "";
                        roomLocationInput.value = [city, state].filter(Boolean).join(', ') || "Unknown Area";
                    } else {
                        roomLocationInput.value = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
                    }
                    getGpsBtn.textContent = '📍 GPS Applied';
                } catch (e) {
                    roomLocationInput.value = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
                    getGpsBtn.textContent = '📍 GPS Applied';
                }
            }, (error) => {
                getGpsBtn.textContent = '📍 Use GPS';
                alert('GPS Error: Please allow location access.');
            });
        });
    }

    // Add Room Form
    const addRoomForm = document.getElementById('add-room-form');
    if (addRoomForm) {
        addRoomForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const token = localStorage.getItem('token');
            if (!token) return alert('You must be logged in to add a room.');

            const category = document.getElementById('room-category') ? document.getElementById('room-category').value : 'BHK';
            const bhkType = document.getElementById('room-bhkType') ? document.getElementById('room-bhkType').value : '1BHK';
            const pgSharing = document.getElementById('room-pgSharing') ? document.getElementById('room-pgSharing').value : '1_sharing';

            const fileInput = document.getElementById('room-image');
            const file = fileInput.files[0];
            
            if (!file) return alert('Please select a photo for the room.');

            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64Image = reader.result;

                const locVal = document.getElementById('room-location').value;
                const cityOnly = locVal.split(',')[0].trim();
                let autoTitle = "Room";
                if (category === 'BHK') autoTitle = `${bhkType} Apartment in ${cityOnly}`;
                if (category === 'PG') autoTitle = `${pgSharing.replace('_', ' ')} PG in ${cityOnly}`;
                if (category === 'Studio') autoTitle = `Studio in ${cityOnly}`;

                const payload = {
                    title: autoTitle,
                    location: locVal,
                    price: Number(document.getElementById('room-price').value),
                    images: [base64Image],
                    description: document.getElementById('room-desc').value,
                    category: category
                };

                if (category === 'BHK') payload.bhkType = bhkType;
                if (category === 'PG') payload.pgSharing = pgSharing;

                try {
                    const res = await fetch(`${API_URL}/rooms`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(payload)
                    });
                    const data = await res.json();
                    if (res.ok) {
                        alert("Listing successfully published!");
                        addRoomForm.reset();
                        if(typeof window.loadRooms === 'function') window.loadRooms(); // Attempt to refresh via global if exposed
                        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
                        const targetNavBtn = document.querySelector(`.nav-btn[data-target="view-rooms"]`);
                        if(targetNavBtn) targetNavBtn.classList.add('active');
                        
                        document.querySelectorAll('.page-section').forEach(sec => sec.classList.add('hidden'));
                        const viewRoomsSec = document.getElementById('view-rooms');
                        if (viewRoomsSec) viewRoomsSec.classList.remove('hidden');
                        
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    } else {
                        alert(data.message || 'Failed to add room. Remember, only Owners can add rooms.');
                    }
                } catch (err) {
                    alert('Server error: Is the backend running?');
                }
            };
            
            reader.onerror = error => {
                console.error("Error reading file: ", error);
                alert("Failed to process the uploaded image.");
            };
        });
    }

    // Check auth state on load
    if(localStorage.getItem('token') && localStorage.getItem('user')) {
        const user = JSON.parse(localStorage.getItem('user'));
        document.querySelectorAll('.auth-btn').forEach(btn => btn.style.display = 'none');
        
        const logoutBtn = document.createElement('button');
        logoutBtn.id = 'logout-btn';
        logoutBtn.className = 'nav-btn auth-btn';
        logoutBtn.innerText = 'Logout';
        logoutBtn.onclick = () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            location.reload();
        };
        const authDiv = document.querySelector('.auth-buttons');
        if(authDiv) authDiv.appendChild(logoutBtn);
    }

    // -- Modal & Maps & Chat Logic --
    const roomModal = document.getElementById('room-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalLocText = document.getElementById('modal-loc-text');
    const modalMap = document.getElementById('modal-map');
    
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendChatBtn = document.getElementById('send-chat-btn');

    window.openModal = function(room) {
        if (!roomModal) return;
        modalTitle.textContent = room.title;
        modalLocText.textContent = room.location;
        
        // Google Maps Embed URL by location name (No API key needed for basic place search iframe)
        const encodedLocation = encodeURIComponent(room.location);
        modalMap.src = `https://maps.google.com/maps?q=${encodedLocation}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
        
        // Reset chat
        chatMessages.innerHTML = `<div class="chat-bubble received">Hi! I'm the owner of <b>${room.title}</b>. Are you interested in this room?</div>`;
        
        roomModal.classList.remove('hidden');
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            roomModal.classList.add('hidden');
            modalMap.src = ''; // stop iframe loading
        });
    }

    function sendChatMessage() {
        if (!chatInput) return;
        const text = chatInput.value.trim();
        if (!text) return;

        // Append user message
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-bubble sent';
        msgDiv.textContent = text;
        chatMessages.appendChild(msgDiv);
        chatInput.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Mock automated response after 1 second
        setTimeout(() => {
            const replyDiv = document.createElement('div');
            replyDiv.className = 'chat-bubble received';
            replyDiv.textContent = "Thanks for your message! As this is an automated demo, the owner will respond right here later.";
            chatMessages.appendChild(replyDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 1000);
    }

    if (sendChatBtn) sendChatBtn.addEventListener('click', sendChatMessage);
    if (chatInput) chatInput.addEventListener('keypress', (e) => { 
        if (e.key === 'Enter') sendChatMessage(); 
    });

});
