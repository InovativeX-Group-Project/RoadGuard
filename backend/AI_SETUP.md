# AI Image Analysis Setup Guide

The backend now supports multiple free AI APIs for road damage detection. Choose any ONE of the following:

## Option 1: Google Cloud Vision API (Recommended)
**Free Tier:** 1,000 requests/month

1. Go to: https://cloud.google.com/vision/docs/setup
2. Create a Google Cloud project
3. Enable the Vision API
4. Create a service account and download the JSON key
5. Add to `.env`:
```
GOOGLE_CLOUD_VISION_KEY=/path/to/your-google-cloud-key.json
```

## Option 2: Imagga API
**Free Tier:** 50 requests/month

1. Go to: https://imagga.com/auth/signup
2. Sign up for free account
3. Get your API credentials from Dashboard
4. Add to `.env`:
```
IMAGGA_API_KEY=your-api-key
IMAGGA_API_SECRET=your-api-secret
```

## Option 3: Roboflow API
**Free Tier:** Limited requests

1. Go to: https://roboflow.com/
2. Create account and upload training images
3. Train a road damage detection model
4. Get your API key from deployment settings
5. Add to `.env`:
```
ROBOFLOW_API_KEY=your-api-key
```

## How It Works

1. **Image Upload** → User uploads a road damage photo
2. **API Analysis** → Backend tries APIs in order: Google Cloud Vision → Imagga → Roboflow
3. **Detection** → AI detects: Pothole, Crack, Traffic Light, or Other
4. **Fallback** → If all APIs fail, user manually selects issue type
5. **Report Saved** → Report submitted with AI-detected or manual classification

## After Setup

1. Install dependencies:
```bash
npm install
```

2. Restart the backend server:
```bash
npm run dev
```

3. Test by uploading an image in the Report Form

## Troubleshooting

- **"API key not set"**: Check your `.env` file and ensure the key environment variable is correct
- **"API timeout"**: Some free tiers have rate limits, wait a moment and try again
- **"Still getting fallback"**: Check backend console logs for detailed error messages

## Costs

- **Google Cloud Vision**: $0-6.50/month (free tier covers typical usage)
- **Imagga**: Free tier (50 requests/month) or pay for more
- **Roboflow**: Free tier with limited requests

All three options have free tiers suitable for testing and small-scale deployment.
