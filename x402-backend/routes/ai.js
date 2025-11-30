const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const axios = require('axios');

// Initialize GROQ AI
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || ''
});

/**
 * X402 Protocol Handler
 * Processes queries through the X402 protocol format
 */
const processX402Query = (query, metadata = {}) => {
  return {
    protocol: 'X402',
    version: process.env.X402_PROTOCOL_VERSION || '1.0',
    timestamp: new Date().toISOString(),
    query: query,
    metadata: metadata
  };
};

/**
 * POST /api/ai/image-generation
 * Generate images using GROQ AI
 * Uses X402 Protocol for request/response
 */
router.post('/image-generation', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ 
        error: 'Query is required',
        protocol: 'X402'
      });
    }

    // Process query through X402 protocol
    const x402Request = processX402Query(query, {
      service: 'groq-ai',
      type: 'image-generation'
    });

    console.log('X402 Request:', x402Request);

    // Check if API key is configured
    if (!process.env.GROQ_API_KEY) {
      return res.json({
        protocol: 'X402',
        query: query,
        model: 'groq-llama-vision',
        response: 'Image generation service is ready. Please configure GROQ_API_KEY in .env file to generate actual images.',
        message: 'Demo mode: In production, this would generate an image based on your query.',
        timestamp: new Date().toISOString()
      });
    }

    // Use GROQ for image generation prompt
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: `Generate a detailed and creative image description for: "${query}". 
          Provide a vivid, artistic description with colors, composition, mood, and details that would help an artist create this image.`
        }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      max_tokens: 1024,
    });
    
    const text = completion.choices[0]?.message?.content || 'No response generated';

    // X402 Protocol Response
    res.json({
      protocol: 'X402',
      query: query,
      model: 'groq-llama-3.1-8b-instant',
      response: text,
      imageDescription: text,
      message: 'Image description generated successfully using GROQ AI.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate image',
      details: error.message,
      protocol: 'X402'
    });
  }
});

/**
 * POST /api/ai/location-suggestions
 * Get location-based place suggestions using GROQ AI
 * Uses X402 Protocol for request/response
 */
router.post('/location-suggestions', async (req, res) => {
  try {
    const { query, location } = req.body;

    if (!query) {
      return res.status(400).json({ 
        error: 'Query is required',
        protocol: 'X402'
      });
    }

    // Process query through X402 protocol
    const x402Request = processX402Query(query, {
      service: 'groq-ai',
      type: 'location-suggestions',
      location: location || 'global'
    });

    console.log('X402 Request:', x402Request);

    // Check if API key is configured
    if (!process.env.GROQ_API_KEY) {
      return res.json({
        protocol: 'X402',
        query: query,
        location: location || 'global',
        model: 'groq-llama',
        suggestions: [
          {
            name: 'Demo Place 1',
            description: 'This is a demo suggestion. Configure GROQ_API_KEY for real AI suggestions.',
            address: location || 'Location not specified',
            rating: 4.5
          }
        ],
        message: 'Demo mode: Configure API keys for real suggestions.',
        timestamp: new Date().toISOString()
      });
    }

    // Use GROQ for location suggestions
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: `Based on the following preferences: "${query}"${location ? ` in ${location}` : ''}, 
suggest 5 relevant places. For each place, provide:
- Name
- Brief description
- Type of place
- Rating (0-5)
Format your response as a valid JSON array with objects containing: name, description, type, and rating.
Only return the JSON array, nothing else.`
        }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      max_tokens: 2048,
    });
    
    const text = completion.choices[0]?.message?.content || '[]';

    // Try to parse JSON from response
    let suggestions;
    try {
      // Extract JSON from response if present
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        suggestions = text;
      }
    } catch (parseError) {
      suggestions = text;
    }

    // X402 Protocol Response
    res.json({
      protocol: 'X402',
      query: query,
      location: location || 'global',
      model: 'groq-llama-3.1-8b-instant',
      suggestions: suggestions,
      response: text,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Location suggestions error:', error);
    res.status(500).json({ 
      error: 'Failed to get location suggestions',
      details: error.message,
      protocol: 'X402'
    });
  }
});

/**
 * GET /api/ai/status
 * Check AI services status
 */
router.get('/status', (req, res) => {
  res.json({
    protocol: 'X402',
    services: {
      'groq-image-generation': {
        status: process.env.GROQ_API_KEY ? 'active' : 'demo',
        description: 'AI Image Generation (GROQ Llama 3.1 8B)',
        model: 'llama-3.1-8b-instant'
      },
      'groq-location-suggestions': {
        status: process.env.GROQ_API_KEY ? 'active' : 'demo',
        description: 'Location-based Suggestions (GROQ Llama 3.1 8B)',
        model: 'llama-3.1-8b-instant'
      }
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
