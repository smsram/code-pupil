'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNotification } from '@/app/components/Notification';
import LoadingOverlay from '@/app/components/LoadingOverlay';
import BackgroundAnimation from '../../components/BackgroundAnimation';
import '../style.css';

// Base URL constant
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function StudentAuth() {
    const router = useRouter();
    const { success, error, warning } = useNotification();
    const [mode, setMode] = useState('login');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    
    const [loginForm, setLoginForm] = useState({
        pin: '',
        password: ''
    });
    
    const [signupForm, setSignupForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        pin: '',
        startYear: '',
        section: '',
        branch: '',
        password: '',
        confirmPassword: ''
    });

    const validationRules = {
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        pin: /^[A-Z0-9]{6,10}$/i,  // Alphanumeric, 6-10 characters (case insensitive)
        password: /^.{6,}$/,
        strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
    };

    const validateLoginForm = () => {
        // Trim whitespace and validate
        const trimmedPin = loginForm.pin.trim();
        
        if (!trimmedPin || !validationRules.pin.test(trimmedPin)) {
            error('PIN must be 6-10 alphanumeric characters', 'Invalid PIN');
            return false;
        }
        if (!loginForm.password || !validationRules.password.test(loginForm.password)) {
            error('Password must be at least 6 characters', 'Invalid Password');
            return false;
        }
        return true;
    };

    const validateSignupForm = () => {
        if (!signupForm.firstName || signupForm.firstName.length < 2) {
            error('First name must be at least 2 characters', 'Invalid Name');
            return false;
        }
        if (!signupForm.lastName || signupForm.lastName.length < 2) {
            error('Last name must be at least 2 characters', 'Invalid Name');
            return false;
        }
        if (!signupForm.email || !validationRules.email.test(signupForm.email)) {
            error('Please enter a valid email address', 'Invalid Email');
            return false;
        }
        
        // Trim whitespace and validate PIN
        const trimmedPin = signupForm.pin.trim();
        if (!trimmedPin || !validationRules.pin.test(trimmedPin)) {
            error('PIN must be 6-10 alphanumeric characters', 'Invalid PIN');
            return false;
        }
        
        if (!signupForm.startYear) {
            warning('Please select your start year', 'Start Year Required');
            return false;
        }
        if (!signupForm.section || signupForm.section.trim().length === 0) {
            warning('Please enter your section', 'Section Required');
            return false;
        }
        if (!signupForm.branch) {
            warning('Please select your branch', 'Branch Required');
            return false;
        }
        if (!signupForm.password || signupForm.password.length < 8) {
            error('Password must be at least 8 characters', 'Weak Password');
            return false;
        }
        if (!validationRules.strongPassword.test(signupForm.password)) {
            error('Password must contain uppercase, lowercase, and number', 'Weak Password');
            return false;
        }
        if (signupForm.password !== signupForm.confirmPassword) {
            error('Passwords do not match', 'Password Mismatch');
            return false;
        }
        return true;
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!validateLoginForm() || isLoading) return;

        setIsLoading(true);
        setLoadingMessage('Authenticating...');

        try {
            const response = await fetch(`${API_BASE_URL}/auth/student/signin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    pin: loginForm.pin.trim().toUpperCase(), // Convert to uppercase for consistency
                    password: loginForm.password
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setLoadingMessage('Login successful! Redirecting...');
                
                localStorage.setItem('student_id', data.data.student_id.toString());

                success('Welcome back! Redirecting to dashboard...', 'Login Successful');
                
                setTimeout(() => {
                    router.push('/student');
                }, 1500);
            } else {
                setIsLoading(false);
                error(data.message || 'Please check your credentials and try again', 'Login Failed');
            }
        } catch (err) {
            console.error('Login error:', err);
            setIsLoading(false);
            error('Unable to connect to server. Please check your connection', 'Network Error');
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        if (!validateSignupForm() || isLoading) return;

        setIsLoading(true);
        setLoadingMessage('Creating your account...');

        try {
            const response = await fetch(`${API_BASE_URL}/auth/student/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    firstName: signupForm.firstName.trim(),
                    lastName: signupForm.lastName.trim(),
                    email: signupForm.email.trim(),
                    pin: signupForm.pin.trim().toUpperCase(), // Convert to uppercase for consistency
                    startYear: parseInt(signupForm.startYear),
                    section: signupForm.section.trim(),
                    branch: signupForm.branch,
                    password: signupForm.password
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setLoadingMessage('Account created! Preparing login form...');
                
                success('Account created successfully! Please sign in to continue', 'Registration Complete');
                
                setTimeout(() => {
                    setIsLoading(false);
                    setMode('login');
                    setSignupForm({
                        firstName: '',
                        lastName: '',
                        email: '',
                        pin: '',
                        startYear: '',
                        section: '',
                        branch: '',
                        password: '',
                        confirmPassword: ''
                    });
                }, 2000);
            } else {
                setIsLoading(false);
                error(data.message || 'Unable to create account. Please try again', 'Registration Failed');
            }
        } catch (err) {
            console.error('Signup error:', err);
            setIsLoading(false);
            error('Unable to connect to server. Please check your connection', 'Network Error');
        }
    };

    // Enhanced PIN input handler - allows alphanumeric characters
    const handlePinChange = (form, value) => {
        // Remove any special characters and spaces, allow only letters and numbers, limit to 10 characters
        const alphanumericValue = value.replace(/[^A-Z0-9]/gi, '').slice(0, 10).toUpperCase();
        handleInputChange(form, 'pin', alphanumericValue);
    };

    const handleInputChange = (form, field, value) => {
        if (form === 'login') {
            setLoginForm(prev => ({ ...prev, [field]: value }));
        } else {
            setSignupForm(prev => ({ ...prev, [field]: value }));
        }
    };

    return (
        <>
            <LoadingOverlay 
                active={isLoading} 
                message={loadingMessage}
                type="spinner"
                blur={true}
            />
            
            <div className="gradient-bg">
                <BackgroundAnimation />
                <div className="scroll-container">
                    <div className="main-container">
                        <div className="form-wrapper">
                            <div className="header-section">
                                <h1 className="main-title">Code Pupil</h1>
                                <p className="subtitle">Student Portal - Programming Excellence</p>
                            </div>

                            <div className="form-container">
                                <div className="toggle-section">
                                    <div className="toggle-switch">
                                        <div className={`toggle-slider ${mode === 'signup' ? 'right' : ''}`}></div>
                                        <div 
                                            className={`toggle-option left ${mode === 'login' ? 'active' : ''}`}
                                            onClick={() => !isLoading && setMode('login')}
                                            role="button"
                                            tabIndex="0"
                                        >
                                            <span>
                                                <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                </svg>
                                                Login
                                            </span>
                                        </div>
                                        <div 
                                            className={`toggle-option right ${mode === 'signup' ? 'active' : ''}`}
                                            onClick={() => !isLoading && setMode('signup')}
                                            role="button"
                                            tabIndex="0"
                                        >
                                            <span>
                                                <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                                Sign Up
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Login Form */}
                                {mode === 'login' && (
                                    <form onSubmit={handleLogin} className="form-space form-slide-enter">
                                        <div className="input-group">
                                            <p className="input-help">Enter your student PIN Number</p>
                                            <div className="input-wrapper">
                                                <div className="input-icon">
                                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                                    </svg>
                                                </div>
                                                <input 
                                                    type="text" 
                                                    className="input-field"
                                                    placeholder="Student PIN"
                                                    value={loginForm.pin}
                                                    onChange={(e) => handlePinChange('login', e.target.value)}
                                                    autoComplete="username"
                                                    disabled={isLoading}
                                                    style={{ textTransform: 'uppercase' }}
                                                />
                                            </div>
                                            {loginForm.pin && (
                                                <p className="input-help" style={{ marginTop: '4px', fontSize: '12px', color: loginForm.pin.length >= 6 && loginForm.pin.length <= 10 ? '#22c55e' : '#f59e0b' }}>
                                                    {loginForm.pin.length} / 10 characters
                                                </p>
                                            )}
                                        </div>

                                        <div className="input-group">
                                            <p className="input-help">Enter your account password</p>
                                            <div className="input-wrapper">
                                                <div className="input-icon">
                                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                    </svg>
                                                </div>
                                                <input 
                                                    type="password" 
                                                    className="input-field"
                                                    placeholder="Password"
                                                    value={loginForm.password}
                                                    onChange={(e) => handleInputChange('login', 'password', e.target.value)}
                                                    autoComplete="current-password"
                                                    disabled={isLoading}
                                                />
                                            </div>
                                        </div>

                                        <button type="submit" className="btn-primary" disabled={isLoading}>
                                            {isLoading ? (
                                                <div className="loading-spinner"></div>
                                            ) : (
                                                'Sign In to Student Portal'
                                            )}
                                        </button>

                                        <div className="text-center form-space">
                                            <a href="#" className="link-text">
                                                Forgot your password?
                                            </a>
                                        </div>

                                        <div className="text-center">
                                            <span className="text-gray">Don&apos;t have an account? </span>
                                            <button 
                                                type="button"
                                                className="link-text" 
                                                onClick={() => !isLoading && setMode('signup')}
                                                style={{ background: 'none', border: 'none', padding: 0 }}
                                                disabled={isLoading}
                                            >
                                                Create account here
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {/* Signup Form */}
                                {mode === 'signup' && (
                                    <form onSubmit={handleSignup} className="form-space form-slide-enter">
                                        <div className="form-grid">
                                            <div className="input-group">
                                                <p className="input-help">Enter your first name</p>
                                                <div className="input-wrapper">
                                                    <div className="input-icon">
                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        className="input-field"
                                                        placeholder="First Name"
                                                        value={signupForm.firstName}
                                                        onChange={(e) => handleInputChange('signup', 'firstName', e.target.value)}
                                                        autoComplete="given-name"
                                                        disabled={isLoading}
                                                    />
                                                </div>
                                            </div>

                                            <div className="input-group">
                                                <p className="input-help">Enter your last name</p>
                                                <div className="input-wrapper">
                                                    <div className="input-icon">
                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        className="input-field"
                                                        placeholder="Last Name"
                                                        value={signupForm.lastName}
                                                        onChange={(e) => handleInputChange('signup', 'lastName', e.target.value)}
                                                        autoComplete="family-name"
                                                        disabled={isLoading}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="input-group">
                                            <p className="input-help">Enter your college email address</p>
                                            <div className="input-wrapper">
                                                <div className="input-icon">
                                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                                    </svg>
                                                </div>
                                                <input 
                                                    type="email" 
                                                    className="input-field"
                                                    placeholder="Email Address"
                                                    value={signupForm.email}
                                                    onChange={(e) => handleInputChange('signup', 'email', e.target.value)}
                                                    autoComplete="email"
                                                    disabled={isLoading}
                                                />
                                            </div>
                                        </div>

                                        <div className="input-group">
                                            <p className="input-help">Enter your student PIN Number</p>
                                            <div className="input-wrapper">
                                                <div className="input-icon">
                                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                                    </svg>
                                                </div>
                                                <input 
                                                    type="text"
                                                    className="input-field"
                                                    placeholder="Student PIN"
                                                    value={signupForm.pin}
                                                    onChange={(e) => handlePinChange('signup', e.target.value)}
                                                    autoComplete="username"
                                                    disabled={isLoading}
                                                    style={{ textTransform: 'uppercase' }}
                                                />
                                            </div>
                                            {signupForm.pin && (
                                                <p className="input-help" style={{ marginTop: '4px', fontSize: '12px', color: signupForm.pin.length >= 6 && signupForm.pin.length <= 10 ? '#22c55e' : '#f59e0b' }}>
                                                    {signupForm.pin.length} / 10 characters
                                                </p>
                                            )}
                                        </div>

                                        <div className="form-grid">
                                            <div className="input-group">
                                                <p className="input-help">Select your start year</p>
                                                <div className="input-wrapper">
                                                    <div className="input-icon">
                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                    <select 
                                                        className="input-field"
                                                        value={signupForm.startYear}
                                                        onChange={(e) => handleInputChange('signup', 'startYear', e.target.value)}
                                                        disabled={isLoading}
                                                    >
                                                        <option value="">Start Year</option>
                                                        <option value="2025">2025</option>
                                                        <option value="2024">2024</option>
                                                        <option value="2023">2023</option>
                                                        <option value="2022">2022</option>
                                                        <option value="2021">2021</option>
                                                    </select>
                                                    <div className="select-arrow">
                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="input-group">
                                                <p className="input-help">Enter your section</p>
                                                <div className="input-wrapper">
                                                    <div className="input-icon">
                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                        </svg>
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        className="input-field"
                                                        placeholder="Section (e.g., A, B, 1)"
                                                        value={signupForm.section}
                                                        onChange={(e) => handleInputChange('signup', 'section', e.target.value.toUpperCase())}
                                                        maxLength="5"
                                                        disabled={isLoading}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="input-group">
                                            <p className="input-help">Select your branch</p>
                                            <div className="input-wrapper">
                                                <div className="input-icon">
                                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                    </svg>
                                                </div>
                                                <select 
                                                    className="input-field"
                                                    value={signupForm.branch}
                                                    onChange={(e) => handleInputChange('signup', 'branch', e.target.value)}
                                                    disabled={isLoading}
                                                >
                                                    <option value="">Select Branch</option>
                                                    <option value="CSM">CSM (Computer Science & Engineering)</option>
                                                    <option value="CSE">CSE (Computer Science & Engineering)</option>
                                                    <option value="CSC">CSC (Computer Science Core)</option>
                                                    <option value="CDS">CDS (Computer & Data Science)</option>
                                                    <option value="IT">IT (Information Technology)</option>
                                                    <option value="ECE">ECE (Electronics & Communication)</option>
                                                    <option value="ME">ME (Mechanical Engineering)</option>
                                                    <option value="CE">CE (Civil Engineering)</option>
                                                </select>
                                                <div className="select-arrow">
                                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="input-group">
                                            <p className="input-help">Create a strong password (min 8 chars, uppercase, lowercase, number)</p>
                                            <div className="input-wrapper">
                                                <div className="input-icon">
                                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                    </svg>
                                                </div>
                                                <input 
                                                    type="password" 
                                                    className="input-field"
                                                    placeholder="Password"
                                                    value={signupForm.password}
                                                    onChange={(e) => handleInputChange('signup', 'password', e.target.value)}
                                                    autoComplete="new-password"
                                                    disabled={isLoading}
                                                />
                                            </div>
                                        </div>

                                        <div className="input-group">
                                            <p className="input-help">Re-enter your password to confirm</p>
                                            <div className="input-wrapper">
                                                <div className="input-icon">
                                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <input 
                                                    type="password" 
                                                    className="input-field"
                                                    placeholder="Confirm Password"
                                                    value={signupForm.confirmPassword}
                                                    onChange={(e) => handleInputChange('signup', 'confirmPassword', e.target.value)}
                                                    autoComplete="new-password"
                                                    disabled={isLoading}
                                                />
                                            </div>
                                        </div>

                                        <button type="submit" className="btn-primary" disabled={isLoading}>
                                            {isLoading ? (
                                                <div className="loading-spinner"></div>
                                            ) : (
                                                'Create Student Account'
                                            )}
                                        </button>

                                        <div className="text-center">
                                            <span className="text-gray">Already have an account? </span>
                                            <button 
                                                type="button"
                                                className="link-text" 
                                                onClick={() => !isLoading && setMode('login')}
                                                style={{ background: 'none', border: 'none', padding: 0 }}
                                                disabled={isLoading}
                                            >
                                                Sign in here
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>

                            <div className="footer">
                                <p>&copy; 2025 Code Pupil. Student Portal for Programming Excellence.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
