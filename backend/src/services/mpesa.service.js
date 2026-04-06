const axios = require('axios');

class MpesaService {
  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.passkey = process.env.MPESA_PASSKEY;
    this.shortcode = process.env.MPESA_SHORTCODE;
    this.env = process.env.MPESA_ENV || 'sandbox'; // sandbox or production
    this.baseUrl = this.env === 'production' 
      ? 'https://api.safaricom.et' 
      : 'https://sandbox.safaricom.et';
  }

  async getAccessToken() {
    const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
    
    try {
      const response = await axios.get(
        `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: { Authorization: `Basic ${auth}` }
        }
      );
      return response.data.access_token;
    } catch (error) {
      throw new Error(`M-Pesa Auth Error: ${error.message}`);
    }
  }

  async initiateSTKPush(phoneNumber, amount, accountReference, transactionDesc) {
    const token = await this.getAccessToken();
    const timestamp = this.generateTimestamp();
    const password = Buffer.from(
      `${this.shortcode}${this.passkey}${timestamp}`
    ).toString('base64');

    // Format phone number (2547XXXXXXXX)
    const formattedPhone = phoneNumber.startsWith('0') 
      ? `254${phoneNumber.slice(1)}` 
      : phoneNumber;

    const payload = {
      BusinessShortCode: this.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.ceil(amount), // M-Pesa doesn't accept decimals
      PartyA: formattedPhone,
      PartyB: this.shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: `${process.env.BACKEND_URL}/api/webhooks/mpesa`,
      AccountReference: accountReference.slice(0, 12), // Max 12 chars
      TransactionDesc: transactionDesc.slice(0, 13) // Max 13 chars
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`STK Push Error: ${error.response?.data?.errorMessage || error.message}`);
    }
  }

  async queryTransaction(checkoutRequestID) {
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

    try {
      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Query Error: ${error.response?.data?.errorMessage || error.message}`);
    }
  }

  generateTimestamp() {
    const date = new Date();
    return date.toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  }

  // Validate M-Pesa callback
  validateCallback(callbackData) {
    // In production, verify the password in callback
    return callbackData.Body.stkCallback;
  }
}

module.exports = new MpesaService();