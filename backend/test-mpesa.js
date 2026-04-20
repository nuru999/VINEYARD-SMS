const axios = require('axios');
require('dotenv').config();

const mpesaService = require('./src/services/mpesa.service');

async function testMpesaSetup() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║       VINEYARD-SMS M-Pesa Integration Test            ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  // Test 1: Check Configuration
  console.log('📋 Test 1: Configuration Check');
  console.log('─'.repeat(50));
  
  const config = mpesaService.getConfigStatus();
  console.log(`  Environment: ${config.environment}`);
  console.log(`  Base URL: ${config.baseUrl}`);
  console.log(`  Consumer Key: ${config.hasConsumerKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`  Consumer Secret: ${config.hasConsumerSecret ? '✅ Set' : '❌ Missing'}`);
  console.log(`  Passkey: ${config.hasPasskey ? '✅ Set' : '❌ Missing'}`);
  console.log(`  Shortcode: ${config.hasShortcode ? config.shortcode : '❌ Missing'}`);
  console.log(`  Configured: ${config.configured ? '✅ YES' : '❌ NO'}\n`);

  if (!config.configured) {
    console.error('❌ M-Pesa not fully configured!');
    console.error('\n📝 Setup Instructions:');
    console.error('1. Go to https://developer.safaricom.co.ke/');
    console.error('2. Create an app and get credentials');
    console.error('3. Copy credentials to .env file:');
    console.error('   - MPESA_CONSUMER_KEY');
    console.error('   - MPESA_CONSUMER_SECRET');
    console.error('   - MPESA_PASSKEY');
    console.error('   - MPESA_SHORTCODE');
    console.error('4. Run this test again\n');
    process.exit(1);
  }

  // Test 2: Access Token
  console.log('🔑 Test 2: M-Pesa Access Token');
  console.log('─'.repeat(50));
  
  try {
    const token = await mpesaService.getAccessToken();
    console.log('✅ Access token obtained successfully');
    console.log(`   Token (first 50 chars): ${token.substring(0, 50)}...`);
    console.log(`   Token Length: ${token.length} characters\n`);
  } catch (error) {
    console.error('❌ Failed to get access token');
    console.error(`   Error: ${error.message}\n`);
    process.exit(1);
  }

  // Test 3: Phone Number Formatting
  console.log('📱 Test 3: Phone Number Formatting');
  console.log('─'.repeat(50));
  
  const testPhones = ['0708374149', '254708374149', '+254708374149'];
  testPhones.forEach(phone => {
    const formatted = mpesaService.formatPhoneNumber(phone);
    const isValid = formatted === '254708374149';
    console.log(`  ${phone.padEnd(15)} → ${formatted} ${isValid ? '✅' : '❌'}`);
  });
  console.log('');

  // Test 4: Timestamp Generation
  console.log('⏰ Test 4: Timestamp Generation');
  console.log('─'.repeat(50));
  
  const timestamp = mpesaService.generateTimestamp();
  console.log(`  Generated Timestamp: ${timestamp}`);
  console.log(`  Format: YYYYMMDDHHmmss (14 digits)`);
  console.log(`  Length: ${timestamp.length} digits ${timestamp.length === 14 ? '✅' : '❌'}\n`);

  // Test 5: Callback Validation
  console.log('✔️  Test 5: Callback Structure Validation');
  console.log('─'.repeat(50));
  
  const validCallback = {
    Body: {
      stkCallback: {
        CheckoutRequestID: 'ws_CO_DMZ_1234567890',
        ResultCode: 0,
        ResultDesc: 'The service request is processed successfully.',
        MerchantRequestID: '1234567890',
        CallbackMetadata: {
          Item: [
            { Name: 'Amount', Value: 100 },
            { Name: 'MpesaReceiptNumber', Value: 'NLJ7RT61SV' },
            { Name: 'TransactionDate', Value: 20240420120000 },
            { Name: 'PhoneNumber', Value: 254708374149 }
          ]
        }
      }
    }
  };

  const validation = mpesaService.validateCallback(validCallback);
  console.log(`  Valid Callback: ${validation.valid ? '✅' : '❌'}`);
  if (validation.valid) {
    console.log(`  Checkout ID: ${validation.checkoutRequestId}`);
    console.log(`  Result Code: ${validation.resultCode}`);
  }
  console.log('');

  // Test 6: Server Health Check
  console.log('🏥 Test 6: Server Health Check');
  console.log('─'.repeat(50));
  
  try {
    const healthResponse = await axios.get('http://localhost:5000/api/health', {
      timeout: 5000
    });
    
    if (healthResponse.status === 200) {
      console.log('✅ Server is running');
      console.log(`   Status: ${healthResponse.data.status}`);
      console.log(`   Database: ${healthResponse.data.database}`);
      console.log(`   Uptime: ${Math.round(healthResponse.data.uptime)}s\n`);
    }
  } catch (error) {
    console.warn('⚠️  Server not responding');
    console.warn(`   Make sure to run: npm run dev\n`);
  }

  // Summary
  console.log('═'.repeat(50));
  console.log('✅ M-Pesa Configuration Test Complete!');
  console.log('═'.repeat(50));
  console.log('\n📝 Next Steps:');
  console.log('1. Ensure PostgreSQL is running');
  console.log('2. Start server: npm run dev');
  console.log('3. Test API endpoints using TESTING.md guide');
  console.log('4. Follow MPESA_SETUP.md for payment testing\n');

  console.log('🚀 Quick Test Commands:');
  console.log('\n  1. Login:');
  console.log('     curl -X POST http://localhost:5000/api/auth/login \\');
  console.log('       -H "Content-Type: application/json" \\');
  console.log('       -d \'{"email":"admin@vineyard.test","password":"admin123456"}\'');
  console.log('\n  2. Create student:');
  console.log('     curl -X POST http://localhost:5000/api/students \\');
  console.log('       -H "Authorization: Bearer TOKEN_HERE" \\');
  console.log('       -H "Content-Type: application/json" \\');
  console.log('       -d \'{"firstName":"John","lastName":"Doe",...}\'');
  console.log('\n  3. Initiate payment:');
  console.log('     curl -X POST http://localhost:5000/api/fees/mpesa/initiate \\');
  console.log('       -H "Authorization: Bearer TOKEN_HERE" \\');
  console.log('       -H "Content-Type: application/json" \\');
  console.log('       -d \'{"studentId":"UUID","amount":100,"phoneNumber":"0708374149"}\'');
  console.log('\n');
}

// Run tests
testMpesaSetup().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});