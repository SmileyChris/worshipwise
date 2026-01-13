# Elvanto Import Scripts

This directory contains scripts for importing historical service and song data from Elvanto into WorshipWise.

## Quick Start

### 1. Get Your Elvanto API Key

1. Log in to your Elvanto account
2. Go to **Settings → Account Settings**
3. Scroll to the **API Access** section
4. Copy your API key

### 2. Test the Connection

Run the test script to verify your API key works and see sample data:

```bash
# Option 1: Using environment variable (recommended)
ELVANTO_API_KEY=your_api_key_here node scripts/elvanto-test.mjs

# Option 2: Pass as argument
node scripts/elvanto-test.mjs your_api_key_here
```

### 3. Review the Output

The script will:
- ✅ Verify your API authentication
- 📅 Fetch the first 5 services (with plan details)
- 🎵 Fetch the first 5 songs (with arrangement details)
- 📊 Display the data structure in a readable format

## What the Test Script Shows

### Services Data
- Service name, date, type, and status
- Series information
- Full plan/setlist with:
  - Song titles and order
  - Keys and tempo (BPM)
  - CCLI numbers
  - Duration

### Songs Data
- Song title and artist
- Categories/tags
- Musical details from arrangements:
  - Keys (male, female, chart)
  - Tempo (BPM)
  - Duration
  - Copyright info
  - Lyrics (if available)

## Next Steps

Once the test script works:

1. **Review the data structure** - See what fields are available
2. **Plan the import mapping** - Decide which Elvanto fields map to WorshipWise
3. **Build full import script** - Create database integration (future work)

## Troubleshooting

### "Authentication failed"
- Double-check your API key
- Make sure you copied the entire key without spaces
- Verify your Elvanto account has API access enabled

### "Network error"
- Check your internet connection
- Verify you can access https://api.elvanto.com in your browser

### No services showing up
- The script fetches the most recent 5 services by default
- If you have no recent services, you may need to adjust the date range

## Files

- `elvanto-test.mjs` - **Simple API key authentication** (recommended for testing)
- `elvanto-test-oauth.mjs` - OAuth 2.0 authentication (more complex, for production apps)

## Security Note

⚠️ **Never commit your API key to git!**

Always use environment variables or pass as command-line arguments. Your API key gives full access to your Elvanto data.
