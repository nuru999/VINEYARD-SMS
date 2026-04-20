# M-Pesa Integration Setup Guide

Complete guide to set up M-Pesa payments for the VINEYARD-SMS school management system.

## 🏦 M-Pesa Payment Methods Supported

1. **STK Push** - Prompt for payment (recommended for most use cases)
2. **PayBill** - Direct payment to school's paybill number
3. **Till** - Point of sale payments (if applicable)

---

## 📋 Prerequisites

- Active **Safaricom business account**
- M-Pesa **Business Account** (Lipa na M-Pesa Online)
- Daraja Platform access (Safaricom developer portal)

---

## 🔑 Step 1: Get M-Pesa Credentials

### Option A: Sandbox Testing (FREE - For Development)

1. Go to **Safaricom Daraja Platform**: https://developer.safaricom.co.ke/

2. **Sign up / Log in** with your email

3. **Create an App**:
   - Click "Create App"
   - App Name: `VINEYARD-SMS`
   - Environment: Select **Sandbox**
   - Click Create

4. **Copy these credentials**:
   - Consumer Key
   - Consumer Secret
   - Copy both to `.env` file

5. **Get Test Credentials**:
   - Shortcode (Test): **174379** (or use default from Daraja)
   - Passkey (Test): Will be provided on Daraja
   - Test Phone: **254708374149**

### Option B: Production Setup (PAID - For Live Use)

1. Contact **Safaricom Business Support**:
   - Email: businessplatform@safaricom.co.ke
   - Phone: +254722 302 000

2. **Request Lipa na M-Pesa Online Integration**:
   - Provide school name and registration number
   - Monthly transaction volume estimates
   - Use case: School fee collection

3. **Receive Production Credentials**:
   - Production Consumer Key
   - Production Consumer Secret
   - Production Shortcode
   - Production Passkey

---

## 🛠️ Step 2: Configure Environment Variables

Edit `backend/.env`:

### Sandbox Configuration

```env
# M-Pesa Configuration (Sandbox)
MPESA_ENV=sandbox
MPESA_CONSUMER_KEY=your_sandbox_consumer_key
MPESA_CONSUMER_SECRET=your_sandbox_consumer_secret
MPESA_PASSKEY=your_sandbox_passkey
MPESA_SHORTCODE=174379
BACKEND_URL=http://localhost:5000
```

### Production Configuration

```env
# M-Pesa Configuration (Production)
MPESA_ENV=production
MPESA_CONSUMER_KEY=your_production_consumer_key
MPESA_CONSUMER_SECRET=your_production_consumer_secret
MPESA_PASSKEY=your_production_passkey
MPESA_SHORTCODE=your_production_shortcode
BACKEND_URL=https://yourdomain.com
```

⚠️ **IMPORTANT**: 
- Never commit `.env` to git
- Keep credentials secret and secure
- Use environment variables in production

---

## 🧪 Step 3: Test M-Pesa Integration

### Quick Test Script

```bash
node test-mpesa.js
```

This script will:
- ✅ Check configuration
- ✅ Test M-Pesa connection
- ✅ Display configuration status

### Manual Test with cURL

#### Test 1: Login and Get Token

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@vineyard.test",
    "password": "admin123456"
  }'
```

Save the token from response.

#### Test 2: Create a Student

```bash
curl -X POST http://localhost:5000/api/students \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "Student",
    "admissionNumber": "TEST/2026/0001",
    "gender": "male",
    "dateOfBirth": "2010-01-01",
    "curriculum": "8-4-4",
    "currentGrade": "Form 1"
  }'
```

Save the student ID from response.

#### Test 3: Initiate M-Pesa Payment

```bash
curl -X POST http://localhost:5000/api/fees/mpesa/initiate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "YOUR_STUDENT_ID",
    "amount": 100,
    "phoneNumber": "0708374149"
  }'
```

**Expected Response** (Sandbox):
```json
{
  "message": "M-Pesa payment initiated",
  "checkoutRequestId": "ws_CO_DMZ_1234567890",
  "responseCode": "0",
  "responseDescription": "Success. Request accepted for processing",
  "transactionCode": "TXN..."
}
```

#### Test 4: Sandbox Payment Simulation

In **Safaricom Daraja Dashboard**:

1. Go to **Test Services**
2. Select **Lipa na M-Pesa Online** 
3. Enter:
   - Phone Number: 254708374149
   - Amount: 100
   - Checkout Request ID: (from Test 3 response)
4. Click **Simulate Transaction**

This will trigger your webhook and update the payment status.

---

## 📱 Production Deployment

### Step 1: Set Up SSL/HTTPS

M-Pesa requires HTTPS callback URLs.

```bash
# Using Let's Encrypt (free)
sudo certbot certonly --standalone -d yourdomain.com
```

### Step 2: Update BACKEND_URL

```env
BACKEND_URL=https://yourdomain.com
```

### Step 3: Configure Firewall

- Allow **HTTPS** (port 443)
- Allow **HTTP** (port 80) for Let's Encrypt renewal
- Restrict M-Pesa IPs if needed

### Step 4: Test Production Endpoint

```bash
curl -I https://yourdomain.com/api/health
```

Should return HTTP 200.

### Step 5: Configure Webhooks on Safaricom

1. Log in to Daraja Portal
2. Go to **App Settings**
3. Set Callback URL:
   ```
   https://yourdomain.com/api/webhooks/mpesa
   ```
4. Set Timeout URL:
   ```
   https://yourdomain.com/api/webhooks/mpesa
   ```

---

## 🔍 API Endpoints

### Initiate Payment

```
POST /api/fees/mpesa/initiate
Authorization: Bearer {token}

{
  "studentId": "uuid",
  "amount": 5000,
  "phoneNumber": "0700000000"
}

Response:
{
  "message": "M-Pesa payment initiated",
  "checkoutRequestId": "...",
  "responseCode": "0",
  "transactionCode": "TXN..."
}
```

### Get Fee Statement

```
GET /api/fees/student/{studentId}
Authorization: Bearer {token}

Response:
{
  "studentId": "uuid",
  "summary": {
    "totalCharged": 50000,
    "totalPaid": 15000,
    "balance": 35000,
    "status": "owing"
  },
  "payments": [...]
}
```

### Record Manual Payment

```
POST /api/fees/payment
Authorization: Bearer {token}

{
  "studentId": "uuid",
  "amount": 5000,
  "paymentMethod": "cash|bank|cheque|mpesa",
  "reference": "CASH001",
  "description": "Term 1 Tuition"
}
```

---

## 🐛 Troubleshooting

### Issue: "Invalid Credentials"

**Cause**: Wrong Consumer Key/Secret

**Fix**:
- Double-check credentials in Daraja
- Copy-paste exact values (no spaces)
- Check if using Sandbox vs Production

---

### Issue: "Shortcode not found"

**Cause**: Using wrong shortcode for environment

**Fix**:
- Sandbox: Use **174379** (test shortcode)
- Production: Use your assigned shortcode
- Check MPESA_ENV is correct

---

### Issue: "Invalid phone number"

**Cause**: Phone not in correct format

**Fix**:
- Use format: `254708374149` (no +, no 0 prefix)
- Or: `0708374149` (system will convert)

---

### Issue: "Callback not received"

**Cause**: BACKEND_URL incorrect or firewall blocking

**Fix**:
- Production must use HTTPS
- Check firewall allows incoming connections
- Test with: `curl -I https://yourdomain.com/api/health`
- Check server logs: `tail -f backend.log`

---

### Issue: "Database Error on Payment"

**Cause**: Payment table structure mismatch

**Fix**:
```bash
# Recreate tables
npm run setup-db
```

---

## 📊 Database Schema for Payments

```sql
-- Fee Payments Table
CREATE TABLE fee_payments (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES students(id),
  amount DECIMAL(10,2),
  payment_method VARCHAR(20), -- cash, bank, cheque, mpesa
  transaction_code VARCHAR(100),
  mpesa_checkout_id VARCHAR(100),
  mpesa_receipt_number VARCHAR(100),
  status VARCHAR(20), -- completed, pending, failed
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_fee_payments_student ON fee_payments(student_id);
CREATE INDEX idx_fee_payments_mpesa_id ON fee_payments(mpesa_checkout_id);
```

---

## 🔐 Security Best Practices

1. **Environment Variables**
   - Never commit `.env` to version control
   - Use `.env.example` for template only

2. **API Keys**
   - Rotate keys periodically
   - Use different keys for Sandbox and Production

3. **HTTPS Only**
   - All callbacks must use HTTPS
   - Use SSL certificates (Let's Encrypt)

4. **Request Validation**
   - Verify M-Pesa callback signature (if implemented)
   - Validate phone numbers and amounts

5. **Rate Limiting**
   - Already enabled: 100 requests per 15 minutes
   - Adjust in `server.js` if needed

6. **Logging**
   - All payments logged to console/files
   - Check logs for suspicious activity
   - Secure log file access

---

## 📈 Testing Checklist

- [ ] Sandbox credentials obtained
- [ ] `.env` configured with sandbox keys
- [ ] Server started: `npm run dev`
- [ ] Health check passes
- [ ] Login works
- [ ] Student creation works
- [ ] Payment initiation works
- [ ] Webhook receives callbacks (check logs)
- [ ] Payment status updates in database
- [ ] Production credentials obtained (when ready)
- [ ] Production `.env` configured
- [ ] HTTPS/SSL setup
- [ ] Callback URL configured on Safaricom
- [ ] Full production test completed

---

## 📞 Support Contacts

### Safaricom Daraja Support
- **Website**: https://developer.safaricom.co.ke/
- **Email**: platformops@safaricom.co.ke
- **Slack**: Join developer community

### M-Pesa Documentation
- https://developer.safaricom.co.ke/apis/docs

### VINEYARD-SMS Support
- Check logs: `npm run dev`
- Enable debug: Set NODE_ENV=debug
- Review code: `/src/services/mpesa.service.js`

---

## 💡 Pro Tips

1. **Use Sandbox First**: Always test thoroughly in sandbox before production

2. **Monitor Logs**: Enable detailed logging during testing
   ```bash
   DEBUG=* npm run dev
   ```

3. **Test Edge Cases**: Test with various amounts and phone numbers

4. **Webhook Timeout**: M-Pesa retries if no response, ensure endpoint is fast

5. **Payment Reconciliation**: Regularly compare M-Pesa reports with database

---

**Happy collecting! 🎓💰**