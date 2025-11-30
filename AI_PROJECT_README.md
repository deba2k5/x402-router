# X404 Protocol - AI Services Platform

A modern web application using the X404 protocol to provide AI-powered services including image generation and location-based suggestions.

## Features

- 🎨 **AI Image Generation** - Powered by Gemini Nano Banana
- 📍 **Location-Based Suggestions** - Powered by Alith AI
- 🔄 **X404 Protocol** - Custom protocol for AI request/response handling
- 💻 **Modern Stack** - Next.js 16 (Frontend) + Node.js/Express (Backend)

## Project Structure

```
x402-router/
├── x402-frontend/          # Next.js frontend
│   ├── app/
│   │   ├── page.tsx        # Dashboard with "Let's Begin" button
│   │   ├── ai/
│   │   │   ├── page.tsx    # AI service selection
│   │   │   ├── image-generation/
│   │   │   │   └── page.tsx # Image generation interface
│   │   │   └── location-suggestions/
│   │   │       └── page.tsx # Location suggestions interface
│   └── package.json
└── x402-backend/           # Node.js backend
    ├── server.js           # Express server
    ├── routes/
    │   └── ai.js           # AI endpoints
    ├── package.json
    └── .env.example
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Gemini API key (for production use)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd x402-backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file from the example:
```bash
copy .env.example .env
```

4. Edit `.env` and add your API keys:
```env
PORT=3001
GEMINI_API_KEY=your_gemini_api_key_here
ALITH_API_KEY=your_alith_api_key_here
```

5. Start the backend server:
```bash
npm run dev
```

The backend will run on `http://localhost:3001`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd x402-frontend
```

2. Dependencies are already installed. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## API Endpoints

### POST /api/ai/image-generation
Generate images using Gemini Nano Banana AI

**Request:**
```json
{
  "query": "A serene mountain landscape at sunset"
}
```

**Response (X404 Protocol):**
```json
{
  "protocol": "X404",
  "query": "A serene mountain landscape at sunset",
  "model": "gemini-nano-banana",
  "response": "Generated image description...",
  "timestamp": "2025-11-30T..."
}
```

### POST /api/ai/location-suggestions
Get location-based suggestions using Alith AI

**Request:**
```json
{
  "query": "Best coffee shops with outdoor seating",
  "location": "New York"
}
```

**Response (X404 Protocol):**
```json
{
  "protocol": "X404",
  "query": "Best coffee shops with outdoor seating",
  "location": "New York",
  "model": "alith-ai",
  "suggestions": [...],
  "timestamp": "2025-11-30T..."
}
```

### GET /api/ai/status
Check AI services status

**Response:**
```json
{
  "protocol": "X404",
  "services": {
    "gemini-nano-banana": {
      "status": "active",
      "description": "AI Image Generation"
    },
    "alith-ai": {
      "status": "active",
      "description": "Location-based Suggestions"
    }
  }
}
```

## X404 Protocol

The X404 protocol is a custom protocol used for AI request/response handling. Each request and response includes:

- `protocol`: Always "X404"
- `version`: Protocol version (default: "1.0")
- `timestamp`: ISO 8601 timestamp
- `query`: The user's query
- `metadata`: Additional context information

## Demo Mode

The application works in demo mode without API keys configured. In demo mode:
- Image generation returns AI-generated descriptions instead of actual images
- Location suggestions return sample data
- All responses follow the X404 protocol format

## Technologies Used

### Frontend
- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4

### Backend
- Node.js
- Express.js
- Google Generative AI (Gemini)
- Axios
- CORS

## Development

### Frontend Development
```bash
cd x402-frontend
npm run dev
```

### Backend Development
```bash
cd x402-backend
npm run dev
```

### Production Build

Frontend:
```bash
cd x402-frontend
npm run build
npm start
```

Backend:
```bash
cd x402-backend
npm start
```

## Environment Variables

### Backend (.env)
```env
PORT=3001
GEMINI_API_KEY=your_gemini_api_key_here
ALITH_API_KEY=your_alith_api_key_here
ALITH_API_URL=https://api.alith.ai
X404_PROTOCOL_VERSION=1.0
```

## Quick Start Guide

1. **Install backend dependencies:**
   ```bash
   cd x402-backend
   npm install
   ```

2. **Create .env file in backend:**
   ```bash
   copy .env.example .env
   ```

3. **Start backend server:**
   ```bash
   npm run dev
   ```

4. **In a new terminal, start frontend:**
   ```bash
   cd x402-frontend
   npm run dev
   ```

5. **Open browser:**
   - Frontend: http://localhost:3000
   - Backend health check: http://localhost:3001/health

## License

MIT
