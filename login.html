<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign In - Stories of You</title>
    <style>
        :root {
            --brand-navy: #0f2c4c;
            --brand-orange: #e09a1b;
            --brand-charcoal: #3d3528;
            --warm-light: #faf3e7;
            --warm-mid: #e0cba7;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: radial-gradient(1200px 500px at 50% -200px, #fff7e9 0%, #fce8c8 50%, #e0cba7 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .login-container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            width: 100%;
            max-width: 420px;
            padding: 3rem 2rem;
        }
        
        .logo-section {
            text-align: center;
            margin-bottom: 2rem;
        }
        
        .logo {
            height: 60px;
            margin-bottom: 1rem;
        }
        
        h1 {
            color: var(--brand-navy);
            font-size: 1.75rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }
        
        .subtitle {
            color: #6b7280;
            font-size: 0.95rem;
        }
        
        .form-group {
            margin-bottom: 1.5rem;
        }
        
        label {
            display: block;
            color: var(--brand-charcoal);
            font-weight: 600;
            margin-bottom: 0.5rem;
            font-size: 0.9rem;
        }
        
        input {
            width: 100%;
            padding: 0.75rem 1rem;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 1rem;
            transition: all 0.3s ease;
        }
        
        input:focus {
            outline: none;
            border-color: var(--brand-orange);
            box-shadow: 0 0 0 3px rgba(224, 154, 27, 0.1);
        }
        
        .btn {
            width: 100%;
            padding: 0.875rem;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .btn-primary {
            background: var(--brand-charcoal);
            color: white;
        }
        
        .btn-primary:hover {
            background: #5a4d3a;
            transform: translateY(-1px);
        }
        
        .btn-primary:disabled {
            background: #9ca3af;
            cursor: not-allowed;
            transform: none;
        }
        
        .otp-section {
            display: none;
        }
        
        .otp-section.active {
            display: block;
        }
        
        .otp-inputs {
            display: flex;
            gap: 0.5rem;
            justify-content: space-between;
            margin-bottom: 1rem;
        }
        
        .otp-input {
            width: 50px;
            height: 50px;
            text-align: center;
            font-size: 1.5rem;
            font-weight: 700;
            padding: 0;
        }
        
        .resend-section {
            text-align: center;
            margin-top: 1rem;
            font-size: 0.9rem;
            color: #6b7280;
        }
        
        .resend-link {
            color: var(--brand-orange);
            text-decoration: none;
            font-weight: 600;
            cursor: pointer;
        }
        
        .resend-link:hover {
            text-decoration: underline;
        }
        
        .resend-link.disabled {
            color: #9ca3af;
            cursor: not-allowed;
        }
        
        .remember-me {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 1.5rem;
        }
        
        .remember-me input {
            width: auto;
        }
        
        .error-message {
            background: #fee2e2;
            color: #dc2626;
            padding: 0.75rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            font-size: 0.9rem;
            display: none;
        }
        
        .success-message {
            background: #d1fae5;
            color: #065f46;
            padding: 0.75rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            font-size: 0.9rem;
            display: none;
        }
        
        .loading-spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid transparent;
            border-top: 2px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-left: 8px;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="logo-section">
            <img src="https://storiesofyou-stories.s3.us-east-2.amazonaws.com/logo.png" alt="Stories of You" class="logo">
            <h1>Welcome Back</h1>
            <p class="subtitle">Access your stories and memories</p>
        </div>
        
        <div class="error-message" id="errorMessage"></div>
        <div class="success-message" id="successMessage"></div>
        
        <!-- Email Section -->
        <div id="emailSection">
            <div class="form-group">
                <label for="email">Email Address</label>
                <input 
                    type="email" 
                    id="email" 
                    placeholder="your@email.com"
                    autocomplete="email"
                    required
                >
            </div>
            
            <button class="btn btn-primary" id="sendOtpBtn" onclick="sendOTP()">
                Send Access Code
            </button>
        </div>
        
        <!-- OTP Section -->
        <div class="otp-section" id="otpSection">
            <div class="form-group">
                <label>Enter 6-digit code sent to <span id="emailDisplay"></span></label>
                <div class="otp-inputs">
                    <input type="text" class="otp-input" maxlength="1" id="otp1">
                    <input type="text" class="otp-input" maxlength="1" id="otp2">
                    <input type="text" class="otp-input" maxlength="1" id="otp3">
                    <input type="text" class="otp-input" maxlength="1" id="otp4">
                    <input type="text" class="otp-input" maxlength="1" id="otp5">
                    <input type="text" class="otp-input" maxlength="1" id="otp6">
                </div>
            </div>
            
            <div class="remember-me">
                <input type="checkbox" id="rememberMe">
                <label for="rememberMe">Keep me signed in for 30 days</label>
            </div>
            
            <button class="btn btn-primary" id="verifyOtpBtn" onclick="verifyOTP()">
                Verify & Access Stories
            </button>
            
            <div class="resend-section">
                <span>Didn't receive the code?</span>
                <a class="resend-link" id="resendLink" onclick="resendOTP()">Resend</a>
                <span id="resendTimer"></span>
            </div>
        </div>
    </div>

    <script>
        const API_BASE = 'https://mikelandin.app.n8n.cloud/webhook';
        let userEmail = '';
        let resendTimer = null;
        let resendCountdown = 0;
        
        // Auto-advance OTP inputs
        document.querySelectorAll('.otp-input').forEach((input, index, inputs) => {
            input.addEventListener('input', (e) => {
                if (e.target.value && index < inputs.length - 1) {
                    inputs[index + 1].focus();
                }
                if (index === inputs.length - 1 && e.target.value) {
                    verifyOTP();
                }
            });
            
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    inputs[index - 1].focus();
                }
            });
        });
        
        async function sendOTP() {
            const email = document.getElementById('email').value;
            const btn = document.getElementById('sendOtpBtn');
            
            if (!email || !email.includes('@')) {
                showError('Please enter a valid email address');
                return;
            }
            
            userEmail = email;
            btn.disabled = true;
            btn.innerHTML = 'Sending...<span class="loading-spinner"></span>';
            
            try {
                const response = await fetch(`${API_BASE}/generate-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    document.getElementById('emailSection').style.display = 'none';
                    document.getElementById('otpSection').classList.add('active');
                    document.getElementById('emailDisplay').textContent = email;
                    document.getElementById('otp1').focus();
                    showSuccess('Access code sent! Check your email.');
                    startResendTimer();
                } else {
                    showError(data.message || 'Failed to send code. Please try again.');
                }
            } catch (error) {
                showError('Connection error. Please try again.');
            } finally {
                btn.disabled = false;
                btn.innerHTML = 'Send Access Code';
            }
        }
        
        async function verifyOTP() {
            const otp = Array.from({length: 6}, (_, i) => 
                document.getElementById(`otp${i + 1}`).value
            ).join('');
            
            if (otp.length !== 6) {
                showError('Please enter all 6 digits');
                return;
            }
            
            const btn = document.getElementById('verifyOtpBtn');
            const rememberMe = document.getElementById('rememberMe').checked;
            
            btn.disabled = true;
            btn.innerHTML = 'Verifying...<span class="loading-spinner"></span>';
            
            try {
                const response = await fetch(`${API_BASE}/verify-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        email: userEmail, 
                        otp: otp,
                        remember: rememberMe
                    })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    localStorage.setItem('storiesofyou_token', data.token);
                    localStorage.setItem('storiesofyou_email', userEmail);
                    
                    if (rememberMe) {
                        document.cookie = `storiesofyou_session=${data.token}; max-age=${30*24*60*60}; path=/; secure; samesite=strict`;
                    }
                    
                    showSuccess('Success! Redirecting to your stories...');
                    
                    const urlParams = new URLSearchParams(window.location.search);
                    const redirect = urlParams.get('redirect') || '/storyboard.html';
                    
                    setTimeout(() => {
                        window.location.href = redirect;
                    }, 1000);
                } else {
                    showError(data.message || 'Invalid code. Please try again.');
                    document.querySelectorAll('.otp-input').forEach(input => input.value = '');
                    document.getElementById('otp1').focus();
                }
            } catch (error) {
                showError('Verification failed. Please try again.');
            } finally {
                btn.disabled = false;
                btn.innerHTML = 'Verify & Access Stories';
            }
        }
        
        async function resendOTP() {
            if (resendCountdown > 0) return;
            
            const link = document.getElementById('resendLink');
            link.classList.add('disabled');
            
            try {
                await sendOTP();
                startResendTimer();
            } finally {
                // Re-enabled by timer
            }
        }
        
        function startResendTimer() {
            resendCountdown = 60;
            const link = document.getElementById('resendLink');
            const timer = document.getElementById('resendTimer');
            
            link.classList.add('disabled');
            
            resendTimer = setInterval(() => {
                resendCountdown--;
                timer.textContent = `(${resendCountdown}s)`;
                
                if (resendCountdown <= 0) {
                    clearInterval(resendTimer);
                    timer.textContent = '';
                    link.classList.remove('disabled');
                }
            }, 1000);
        }
        
        function showError(message) {
            const errorEl = document.getElementById('errorMessage');
            errorEl.textContent = message;
            errorEl.style.display = 'block';
            setTimeout(() => {
                errorEl.style.display = 'none';
            }, 5000);
        }
        
        function showSuccess(message) {
            const successEl = document.getElementById('successMessage');
            successEl.textContent = message;
            successEl.style.display = 'block';
            setTimeout(() => {
                successEl.style.display = 'none';
            }, 5000);
        }
        
        window.addEventListener('load', () => {
            const token = localStorage.getItem('storiesofyou_token');
            if (token) {
                fetch(`${API_BASE}/validate-session`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                }).then(response => {
                    if (response.ok) {
                        window.location.href = '/storyboard.html';
                    }
                });
            }
        });
    </script>
</body>
</html>
