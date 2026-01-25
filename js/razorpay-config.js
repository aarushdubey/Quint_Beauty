// Razorpay Configuration
// Note: In production, never expose your key_secret in frontend code
// Only use key_id for frontend integration

const RAZORPAY_CONFIG = {
    key_id: 'rzp_live_S83Chu6RWaxfaV',
    // key_secret should ONLY be used on your backend/server
    // Never expose it in frontend JavaScript
    
    // Optional: You can customize these
    currency: 'INR',
    company_name: 'Quint Beauty',
    company_logo: '', // Add your logo URL here if you have one
    theme_color: '#000000',
    
    // Test mode: Set to true during development
    // In test mode, you should use test API keys (rzp_test_...)
    test_mode: false
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RAZORPAY_CONFIG;
}
