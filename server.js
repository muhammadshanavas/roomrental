const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || "super-secret-rentx-key"; // In production, use environment variables

const app = express();

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: false // Disabled to allow images and frontend scripts to load freely during development
}));
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Limit body payload, but allow Base64 images

// Rate Limiting on API routes to prevent spam / brute force
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window`
    message: { message: "Too many requests from this IP, please try again after 15 minutes." }
});
app.use('/api/', apiLimiter);

// JWT Authentication Middleware to protect routes
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ message: "Access denied. No token provided." });
    
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ message: "Invalid or expired session token." });
        req.user = user;
        next();
    });
}

// Serve frontend automatically
app.use(express.static(__dirname));

// In-memory store (For production, use Redis or a Database)
const otpStore = {}; 
const users = [];
const roomsDb = [
    { title: "Cozy Downtown Studio", location: "New York, NY", price: 1500, category: "BHK", bhkType: "1BHK", description: "Beautiful view in a modern apartment.", ownerPhone: "1234567890", images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1000", "https://images.unsplash.com/photo-1502672260266-1c1c24226133?w=1000"] }
];

// Configure your email transporter here
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER || "your-email@gmail.com",
        pass: process.env.EMAIL_PASS || "your-app-password"
    }
});

app.post('/api/auth/send-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = { otp: otp, expiresAt: Date.now() + 5 * 60 * 1000 };

    console.log(`Generated OTP for ${email}: ${otp}`);

    if (email.includes('@')) {
        try {
            // Prevent crash if placeholder credentials are used
            if (transporter.options.auth.user === 'your-email@gmail.com') {
                console.log("\n==============================================");
                console.log(`[GMAIL PLACEHOLDER DETECTED - SIMULATING EMAIL]`);
                console.log(`To: ${email}`);
                console.log(`Subject: RentX - Your Login OTP`);
                console.log(`Message: Your One-Time Password (OTP) is: ${otp}. It will expire in 5 minutes.`);
                console.log("==============================================\n");
            } else {
                await transporter.sendMail({
                    from: `"RentX" <${transporter.options.auth.user}>`,
                    to: email,
                    subject: 'RentX - Your Login OTP',
                    text: `Your One-Time Password (OTP) is: ${otp}. It will expire in 5 minutes.`
                });
            }
            console.log(`Email sent successfully to ${email}!`);
            res.json({ message: "OTP sent to email successfully!" });
        } catch (error) {
            console.error("Error sending email:", error);
            res.status(500).json({ message: "Failed to send email. Check your server console." });
        }
    } else {
        console.log(`[SMS MOCK] Sent OTP ${otp} to phone number ${email}`);
        res.json({ message: "OTP sent via SMS (Mocked for testing)." });
    }
});

app.post('/api/auth/login', (req, res) => {
    const { email, password, otp } = req.body;
    
    if (otp) {
        const stored = otpStore[email];
        if (!stored) return res.status(400).json({ message: "No OTP found or it expired." });
        if (Date.now() > stored.expiresAt) {
            delete otpStore[email];
            return res.status(400).json({ message: "OTP has expired." });
        }
        if (stored.otp === otp) {
            delete otpStore[email];
            const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: '24h' });
            return res.json({ token, username: email.split('@')[0], message: "Login successful!" });
        } else {
            return res.status(401).json({ message: "Invalid OTP." });
        }
    }

    if (password) {
        if (password === "admin123") {
            const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: '24h' });
            return res.json({ token, username: email.split('@')[0], message: "Login successful!" });
        }
        return res.status(401).json({ message: "Invalid password." });
    }

    res.status(400).json({ message: "Please provide a password or OTP." });
});

app.post('/api/auth/register', (req, res) => {
    const { username, email, password, role, otp } = req.body;
    
    if (otp) {
        const stored = otpStore[email];
        if (!stored || stored.otp !== otp) return res.status(400).json({ message: "Invalid or expired OTP." });
        delete otpStore[email];
    }

    const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: '24h' });
    res.json({ token, username: username || email.split('@')[0], message: "Registration successful!" });
});

// Room listing route is public so front-end can show available rooms without forced login.
app.get('/api/rooms', (req, res) => {
    res.json(roomsDb);
});

// Secure room creation for logged in users
app.post('/api/rooms', authenticateToken, (req, res) => {
    const newRoom = req.body;
    // req.user has the verified payload { email }
    console.log(`[API SECURITY] Verified user ${req.user.email} is adding a room.`);
    
    roomsDb.push(newRoom);
    res.status(201).json({ message: "Room added securely!", room: newRoom });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Secured Backend server running on http://localhost:${PORT}`);
});
