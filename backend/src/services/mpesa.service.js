const axios = require('axios');

class MpesaService {
  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.passkey = process.env.MPESA_PASSKEY;
    this.shortcode = process.env.MPESA_SHORTCODE;
    this.env = process.env.MPESA_ENV || 'sandbox';
    
    // Correct Safaricom URLs for Kenya
    this.baseUrl = this.env === 'production' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke';
    
    this.tokenCache = null;
    this.tokenExpiry = null;
  }

  /**
   * Get OAuth token with caching
   */
  async getAccessToken() {
    // Return cached token if still valid
    if (this.tokenCache && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.tokenCache;
    }

    if (!this.consumerKey || !this.consumerSecret) {
      throw new Error('M-Pesa credentials not configured. Set MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET');
    }

    const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
    
    try {
      console.log('🔑 Requesting M-Pesa access token...');
      const response = await axios.get(
        `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: { 
            Authorization: `Basic ${auth}`,
            'User-Agent': 'VINEYARD-SMS/1.0'
          },
          timeout: 10000
        }
      );

      this.tokenCache = response.data.access_token;
      // Cache for 55 minutes (token valid for 60 minutes)
      this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000);
      
      console.log('✅ M-Pesa access token obtained');
      return this.tokenCache;
    } catch (error) {
      const errorMsg = error.response?.data?.error_description || error.message;
      console.error('❌ M-Pesa Auth Error:', errorMsg);
      throw new Error(`M-Pesa Authentication Failed: ${errorMsg}`);
    }
  }

  /**
   * Initiate STK Push (Prompt for payment)
   */
  async initiateSTKPush(phoneNumber, amount, accountReference, transactionDesc) {
    if (!this.shortcode || !this.passkey) {
      throw new Error('M-Pesa shortcode and passkey not configured');
    }

    // ✅ NEW: Warn if callbacks won't work
    const callbackUrl = process.env.BACKEND_URL;
    if (!callbackUrl || callbackUrl.includes('localhost') || callbackUrl.includes('127.0.0.1')) {
      console.warn('⚠️  BACKEND_URL is set to localhost. M-Pesa callbacks will NOT reach this server!');
      console.warn('   Use ngrok for testing: npx ngrok http 5000');
      console.warn('   Then set BACKEND_URL=https://your-ngrok-url.ngrok-free.app');
    }

    try {
      const token = await this.getAccessToken();
      const timestamp = this.generateTimestamp();
      const password = Buffer.from(
        `${this.shortcode}${this.passkey}${timestamp}`
      ).toString('base64');

      // Format phone number (254XXXXXXXXX)
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      const cleanAmount = Math.ceil(parseFloat(amount)); // M-Pesa requires integers

      if (cleanAmount < 1) {
        throw new Error('Amount must be at least 1 shilling');
      }

      const payload = {
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: cleanAmount,
        PartyA: formattedPhone,
        PartyB: this.shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: `${process.env.BACKEND_URL}/api/webhooks/mpesa`,
        AccountReference: accountReference.slice(0, 12).toUpperCase(), // Max 12 chars
        TransactionDesc: transactionDesc.slice(0, 13).toUpperCase() // Max 13 chars
      };

      console.log(`📱 Initiating STK Push for ${formattedPhone}, Amount: ${cleanAmount}`);

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
        payload,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'User-Agent': 'VINEYARD-SMS/1.0'
          },
          timeout: 10000
        }
      );

      console.log('✅ STK Push initiated successfully');
      return {
        success: true,
        checkoutRequestId: response.data.CheckoutRequestID,
        responseCode: response.data.ResponseCode,
        responseDescription: response.data.ResponseDescription,
        merchantRequestId: response.data.MerchantRequestID,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const errorMsg = error.response?.data?.errorMessage || error.message;
      console.error('❌ STK Push Error:', errorMsg);
      throw new Error(`STK Push Failed: ${errorMsg}`);
    }
  }

  /**
   * Query transaction status
   */
  async queryTransaction(checkoutRequestID) {
    if (!this.shortcode || !this.passkey) {
      throw new Error('M-Pesa shortcode and passkey not configured');
    }

    try {
      const token = await this.getAccessToken();
      const timestamp = this.generateTimestamp();
      const password = Buffer.from(
        `${this.shortcode}${this.passkey}${timestamp}`
      ).toString('base64');

      const payload = {
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestID
      };

      console.log(`🔍 Querying transaction: ${checkoutRequestID}`);

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
        payload,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'User-Agent': 'VINEYARD-SMS/1.0'
          },
          timeout: 10000
        }
      );

      console.log('✅ Transaction query successful');
      return {
        success: true,
        responseCode: response.data.ResponseCode,
        responseDescription: response.data.ResponseDescription,
        resultCode: response.data.ResultCode,
        resultDesc: response.data.ResultDesc
      };
    } catch (error) {
      const errorMsg = error.response?.data?.errorMessage || error.message;
      console.error('❌ Query Error:', errorMsg);
      throw new Error(`Transaction Query Failed: ${errorMsg}`);
    }
  }

  /**
   * Generate timestamp (14 digits: YYYYMMDDHHmmss) in KENYA TIME (EAT, UTC+3)
   */
  generateTimestamp() {
    const now = new Date();
    // Kenya is UTC+3 (no daylight saving)
    const offsetMs = 3 * 60 * 60 * 1000;
    const kenyaTime = new Date(now.getTime() + offsetMs);
    return kenyaTime.toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  }

  /**
   * Format phone number to 254XXXXXXXXX format
   */
  formatPhoneNumber(phone) {
    let cleaned = phone.toString().replace(/\D/g, '');
    
    // Remove country code if present and ensure correct format
    if (cleaned.startsWith('254')) {
      return cleaned;
    }
    
    // Add country code
    if (cleaned.startsWith('0')) {
      return '254' + cleaned.slice(1);
    }
    
    return '254' + cleaned;
  }

  /**
   * Validate callback structure
   */
  validateCallback(callbackData) {
    try {
      if (!callbackData || !callbackData.Body || !callbackData.Body.stkCallback) {
        throw new Error('Invalid callback structure');
      }

      const stkCallback = callbackData.Body.stkCallback;

      // Check required fields
      if (!stkCallback.CheckoutRequestID || stkCallback.ResultCode === undefined) {
        throw new Error('Missing required callback fields');
      }

      return {
        valid: true,
        checkoutRequestId: stkCallback.CheckoutRequestID,
        resultCode: stkCallback.ResultCode,
        resultDesc: stkCallback.ResultDesc,
        merchantRequestId: stkCallback.MerchantRequestID,
        callbackMetadata: stkCallback.CallbackMetadata
      };
    } catch (error) {
      console.error('❌ Callback Validation Error:', error.message);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Extract transaction details from callback
   */
  extractTransactionDetails(callbackMetadata) {
    try {
      if (!callbackMetadata || !callbackMetadata.Item) {
        return null;
      }

      const items = callbackMetadata.Item;
      const details = {};

      items.forEach(item => {
        details[item.Name] = item.Value;
      });

      return {
        amount: parseFloat(details.Amount || 0),
        mpesaReceiptNumber: details.MpesaReceiptNumber,
        transactionDate: details.TransactionDate,
        phoneNumber: details.PhoneNumber,
        receiptNumber: details.ReceiptNumber
      };
    } catch (error) {
      console.error('❌ Error extracting transaction details:', error.message);
      return null;
    }
  }

  /**
   * Check if M-Pesa is properly configured
   */
  isConfigured() {
    return !!(
      this.consumerKey && 
      this.consumerSecret && 
      this.passkey && 
      this.shortcode
    );
  }

  /**
   * Get configuration status
   */
  getConfigStatus() {
    return {
      configured: this.isConfigured(),
      environment: this.env,
      hasConsumerKey: !!this.consumerKey,
      hasConsumerSecret: !!this.consumerSecret,
      hasPasskey: !!this.passkey,
      hasShortcode: !!this.shortcode,
      baseUrl: this.baseUrl,
      shortcode: this.shortcode ? `****${this.shortcode.slice(-3)}` : 'Not set'
    };
  }
}

module.exports = new MpesaService();