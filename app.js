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

        // --- AI Recommendation Sorting ---
        const prefLoc = localStorage.getItem('ai_pref_location');
        const prefCat = localStorage.getItem('ai_pref_category');

        let sortedRooms = [...rooms];
        if (prefLoc || prefCat) {
            sortedRooms.sort((a, b) => {
                let scoreA = 0, scoreB = 0;
                if (prefLoc && a.location.toLowerCase().includes(prefLoc)) scoreA += 10;
                if (prefCat && prefCat !== 'Any' && a.category === prefCat) scoreA += 5;
                if (prefLoc && b.location.toLowerCase().includes(prefLoc)) scoreB += 10;
                if (prefCat && prefCat !== 'Any' && b.category === prefCat) scoreB += 5;
                return scoreB - scoreA;
            });
        }

        sortedRooms.forEach((room) => {
            const card = document.createElement('div');
            card.className = 'room-card';
            
            // Handle tags
            const tagInfo = room.category === 'BHK' ? room.bhkType : (room.pgSharing ? room.pgSharing.replace('_', ' ') : 'PG');
            const ownerName = room.ownerId && room.ownerId.username ? room.ownerId.username : "Verified Owner";

            // AI Badge Logic
            let aiBadge = '';
            if ((prefLoc && room.location.toLowerCase().includes(prefLoc)) || (prefCat && prefCat !== 'Any' && room.category === prefCat)) {
                aiBadge = `<span style="font-size: 0.75rem; background: linear-gradient(135deg, #FFD700, #F7931A); color: #000; padding: 2px 8px; border-radius: 12px; margin-bottom: 5px; font-weight: bold; display: inline-block; margin-right: 5px;">✨ AI Recommended</span>`;
            }

            card.innerHTML = `
                <img src="${room.images && room.images.length > 0 ? room.images[0] : 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800'}" alt="${room.title}" class="room-image" onerror="this.src='https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800'">
                <div class="room-content">
                    <div class="room-header">
                        <div>
                            ${aiBadge}
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
                    <p class="room-desc">${room.description && room.description.length > 80 ? room.description.substring(0, 80) + '...' : (room.description || 'No description provided.')}</p>
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

    // 2.5 Home Page Search & GPS Logic
    const homeGpsBtn = document.getElementById('home-gps-btn');
    const searchLocationInput = document.getElementById('search-location');
    if (homeGpsBtn && searchLocationInput) {
        homeGpsBtn.addEventListener('click', () => {
             if (!navigator.geolocation) return alert('Geolocation is not supported by your browser.');
             homeGpsBtn.style.opacity = '0.5';
             navigator.geolocation.getCurrentPosition(async (position) => {
                 const lat = position.coords.latitude;
                 const lon = position.coords.longitude;
                 try {
                     const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                     const data = await res.json();
                     if (data && data.address) {
                         const city = data.address.city || data.address.town || data.address.village || data.address.county || "";
                         searchLocationInput.value = city;
                     }
                 } catch(e) {}
                 homeGpsBtn.style.opacity = '1';
             });
        });
    }

    const searchBtn = document.querySelector('.search-bar .primary-btn');
    if (searchBtn && searchLocationInput) {
        searchBtn.addEventListener('click', () => {
            const loc = searchLocationInput.value.trim().toLowerCase();
            const catSelect = UtilsFindCategory(); // Helper since ID isn't set elegantly on the select in index.html sometimes
            const cat = catSelect ? catSelect.value : 'Any';
            
            if (loc) localStorage.setItem('ai_pref_location', loc);
            if (cat) localStorage.setItem('ai_pref_category', cat);
            
            navigateTo('view-rooms');
        });
    }

    function UtilsFindCategory() {
        return document.querySelector('.search-bar select');
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
            const files = fileInput.files;
            
            if (!files || files.length === 0) return alert('Please select at least one photo for the room.');

            // Read multiple files natively
            const base64Images = [];
            const readPromises = Array.from(files).map(file => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                });
            });

            try {
                const results = await Promise.all(readPromises);
                base64Images.push(...results);
            } catch (error) {
                return alert("Failed to process the uploaded images. Please try again.");
            }

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
                images: base64Images,
                ownerPhone: document.getElementById('room-owner-phone') ? document.getElementById('room-owner-phone').value : '',
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
                    if(typeof window.loadRooms === 'function') window.loadRooms();
                    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
                    const targetNavBtn = document.querySelector(`.nav-btn[data-target="view-rooms"]`);
                    if(targetNavBtn) targetNavBtn.classList.add('active');
                    
                    document.querySelectorAll('.page-section').forEach(sec => sec.classList.add('hidden'));
                    const viewRoomsSec = document.getElementById('view-rooms');
                    if (viewRoomsSec) viewRoomsSec.classList.remove('hidden');
                    
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    alert(data.message || 'Failed to add room.');
                }
            } catch (err) {
                alert('Server error: Is the backend running?');
            }
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

    // -- Modal, Maps, Slider & WhatsApp Logic --
    const roomModal = document.getElementById('room-modal');
    const closeModalBtn = document.getElementById('modal-close');

    window.openModal = function(room) {
        if (!roomModal) return;
        document.getElementById('modal-title').textContent = room.title;
        document.getElementById('modal-location').textContent = room.location;
        document.getElementById('modal-price').textContent = `$${room.price}/mo`;
        
        // Map Injection
        const encodedLocation = encodeURIComponent(room.location);
        const mapContainer = document.getElementById('modal-map-container');
        if(mapContainer) mapContainer.innerHTML = `<iframe width="100%" height="100%" frameborder="0" style="border:0" src="https://maps.google.com/maps?q=${encodedLocation}&t=&z=13&ie=UTF8&iwloc=&output=embed" allowfullscreen></iframe>`;
        
        // Image Slider Assembly
        const sliderContainer = document.getElementById('modal-slider-container');
        const sliderDots = document.getElementById('slider-dots');
        const prevBtn = document.getElementById('slider-prev');
        const nextBtn = document.getElementById('slider-next');
        
        if (sliderContainer) {
            sliderContainer.innerHTML = '';
            sliderDots.innerHTML = '';
            
            const images = (room.images && room.images.length > 0) ? room.images : ['https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800'];
            
            images.forEach((imgSrc, index) => {
                sliderContainer.innerHTML += `<div class="slider-img-wrap"><img class="slider-img" src="${imgSrc}" alt="Room Image"></div>`;
                if (images.length > 1) {
                    sliderDots.innerHTML += `<div class="slider-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></div>`;
                }
            });

            let currentSlide = 0;
            const updateSlider = () => {
                sliderContainer.style.transform = `translateX(-${currentSlide * 100}%)`;
                document.querySelectorAll('.slider-dot').forEach((dot, idx) => {
                    dot.classList.toggle('active', idx === currentSlide);
                });
            };

            if (images.length > 1) {
                prevBtn.style.display = 'flex';
                nextBtn.style.display = 'flex';
                prevBtn.onclick = () => { currentSlide = (currentSlide > 0) ? currentSlide - 1 : images.length - 1; updateSlider(); };
                nextBtn.onclick = () => { currentSlide = (currentSlide < images.length - 1) ? currentSlide + 1 : 0; updateSlider(); };
                document.querySelectorAll('.slider-dot').forEach(dot => {
                    dot.onclick = (e) => { currentSlide = parseInt(e.target.dataset.index); updateSlider(); };
                });
            } else {
                prevBtn.style.display = 'none';
                nextBtn.style.display = 'none';
            }
        }

        // Action Buttons Setup
        const waBtn = document.getElementById('whatsapp-btn');
        if(waBtn) {
            waBtn.onclick = () => {
                const phone = room.ownerPhone ? room.ownerPhone.replace(/\D/g,'') : "1234567890";
                const text = encodeURIComponent(`Hi! I'm interested in your room listing on RentX: ${room.title}`);
                window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
            };
        }

        const bookBtn = document.getElementById('book-now-btn');
        if(bookBtn) {
            bookBtn.onclick = () => {
                const originalText = bookBtn.innerHTML;
                bookBtn.innerHTML = '⌛ Processing Payment Details...';
                bookBtn.disabled = true;
                setTimeout(() => {
                    alert("This is a beautiful mock transaction!\nIn a production environment, a Stripe or Razorpay checkout modal would safely handle the deposit right here.");
                    bookBtn.innerHTML = originalText;
                    bookBtn.disabled = false;
                }, 1800);
            };
        }

        roomModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    };

    const closeBehavior = () => {
        roomModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        const mapContainer = document.getElementById('modal-map-container');
        if(mapContainer) mapContainer.innerHTML = '';
    };

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeBehavior);
    
    const modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay) modalOverlay.addEventListener('click', closeBehavior);

});
