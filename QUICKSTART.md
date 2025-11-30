# 🚀 Quick Start Guide - X404 AI Platform

## ✅ What's Been Built

### Frontend (Next.js 16 + React 19 + TypeScript)
- ✅ **Dashboard** (`app/page.tsx`) - Beautiful landing page with "Let's Begin" button
- ✅ **AI Selection Page** (`app/ai/page.tsx`) - Choose between two AI services
- ✅ **Image Generation** (`app/ai/image-generation/page.tsx`) - Text-to-image interface
- ✅ **Location Suggestions** (`app/ai/location-suggestions/page.tsx`) - Place recommendation interface

### Backend (Node.js + Express)
- ✅ **Server** (`server.js`) - Express server with CORS enabled
- ✅ **AI Routes** (`routes/ai.js`) - Three endpoints with X404 protocol
  - `POST /api/ai/image-generation` - Gemini-powered image generation
  - `POST /api/ai/location-suggestions` - Location-based AI suggestions
  - `GET /api/ai/status` - Service health check
- ✅ **X404 Protocol** - Custom protocol implementation for AI queries

## 🎯 Current Status

**Backend**: ✅ RUNNING on http://localhost:3001
**Frontend**: Ready to start

## 🚀 Next Steps

### 1. Start the Frontend

Open a **NEW terminal** and run:

```bash
cd x402-router/x402-frontend
npm run dev
```

The frontend will start on **http://localhost:3000**

### 2. Test the Application

1. Open browser to **http://localhost:3000**
2. Click **"Let's Begin"** button on the dashboard
3. Choose between:
   - 🎨 **AI Image Generation**
   - 📍 **Location Suggestions**
4. Enter your query and test the AI features!

## 📝 How It Works

### X404 Protocol Flow

```
User Query → Frontend → Backend API (X404) → AI Service → Response
```

Every request/response follows the X404 protocol:

```json
{
  "protocol": "X404",
  "version": "1.0",
  "timestamp": "2025-11-30T...",
  "query": "user's query",
  "response": "AI generated response"
}
```

## 🔑 API Configuration (Optional)

The app works in **demo mode** without API keys. For production features:

1. Get a Gemini API key: https://makersuite.google.com/app/apikey

2. Edit `x402-backend/.env`:
```env
GEMINI_API_KEY=your_actual_api_key_here
```

3. Restart the backend server

## 🧪 Test Endpoints Manually

### Check Backend Health
```bash
curl http://localhost:3001/health
```

### Test Image Generation
```bash
curl -X POST http://localhost:3001/api/ai/image-generation \
  -H "Content-Type: application/json" \
  -d '{"query":"A beautiful sunset over mountains"}'
```

### Test Location Suggestions
```bash
curl -X POST http://localhost:3001/api/ai/location-suggestions \
  -H "Content-Type: application/json" \
  -d '{"query":"Best coffee shops","location":"New York"}'
```

### Check Service Status
```bash
curl http://localhost:3001/api/ai/status
```

## 📁 Project Structure

```
x402-router/
├── x402-frontend/              Frontend (Next.js)
│   ├── app/
│   │   ├── page.tsx           Dashboard
│   │   ├── ai/
│   │   │   ├── page.tsx       AI service selection
│   │   │   ├── image-generation/
│   │   │   │   └── page.tsx   Image gen UI
│   │   │   └── location-suggestions/
│   │   │       └── page.tsx   Location UI
│   └── package.json
│
└── x402-backend/              Backend (Node.js)
    ├── server.js              Main server
    ├── routes/
    │   └── ai.js              AI endpoints
    ├── .env                   Configuration
    └── package.json
```

## 🎨 Features

### Dashboard
- Modern gradient design
- Feature cards
- Responsive layout
- Dark mode support

### AI Image Generation
- Text input for descriptions
- Loading states
- Error handling
- Result display
- X404 protocol integration

### Location Suggestions
- Location input (optional)
- Preference description
- Formatted results display
- Rating and address info
- X404 protocol integration

## 🛠️ Tech Stack

**Frontend:**
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4

**Backend:**
- Node.js
- Express.js
- Google Generative AI (Gemini)
- CORS
- dotenv

## 🐛 Troubleshooting

### Backend won't start
```bash
cd x402-router/x402-backend
npm install
npm start
```

### Frontend won't start
```bash
cd x402-router/x402-frontend
npm install
npm run dev
```

### CORS errors
- Make sure backend is running on port 3001
- Frontend should be on port 3000
- Check CORS is enabled in `server.js`

### API not responding
- Check backend terminal for errors
- Verify URL: http://localhost:3001
- Test health endpoint: http://localhost:3001/health

## 📚 Documentation

See `AI_PROJECT_README.md` for complete API documentation and setup instructions.

## 🎉 You're All Set!

1. ✅ Backend is running
2. ⏭️ Start the frontend: `cd x402-router/x402-frontend && npm run dev`
3. 🌐 Open http://localhost:3000
4. 🚀 Start using AI features!

Enjoy your X404 AI platform! 🎨📍
