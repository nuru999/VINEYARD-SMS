#!/bin/bash

echo "🚀 VINEYARD-SMS Backend Setup"
echo "════════════════════════════════════════════"
echo ""

# Check Node.js
echo "✓ Checking Node.js..."
node --version

# Check npm
echo "✓ Checking npm..."
npm --version

echo ""
echo "Step 1: Setting up database..."
echo "Make sure PostgreSQL is running!"
echo ""

node setup-db.js

if [ $? -ne 0 ]; then
    echo "❌ Database setup failed!"
    echo "Make sure:"
    echo "  1. PostgreSQL is running"
    echo "  2. Credentials in .env are correct"
    exit 1
fi

echo ""
echo "════════════════════════════════════════════"
echo "✅ All setup complete!"
echo ""
echo "Starting server in 3 seconds..."
sleep 3

npm run dev