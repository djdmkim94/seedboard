/**
 * TikTok Dashboard Server
 * Serves static files, proxies Claude API requests, and handles local storage
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const ACCOUNTS_FILE = path.join(__dirname, 'accounts.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Initialize Anthropic client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// Helper: Load data from JSON file
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
    return [];
}

// Helper: Save data to JSON file
function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Helper: Load/save account stats
function loadAccounts() {
    try {
        if (fs.existsSync(ACCOUNTS_FILE)) {
            return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
        }
    } catch (e) {}
    return {};
}
function saveAccounts(data) {
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(data, null, 2));
}

// Helper: Extract TikTok video ID from URL
function extractTikTokVideoId(url) {
    const match = url?.match(/\/video\/(\d+)/);
    return match ? match[1] : null;
}

/**
 * Content CRUD Endpoints
 */

// GET all content
app.get('/api/content', (req, res) => {
    const data = loadData();
    res.json(data);
});

// POST new content
app.post('/api/content', (req, res) => {
    const data = loadData();
    const newItem = {
        ...req.body,
        id: Date.now().toString(),
        createdDate: new Date().toISOString().split('T')[0],
    };
    data.push(newItem);
    saveData(data);
    res.json(newItem);
});

// PUT update content
app.put('/api/content/:id', (req, res) => {
    const data = loadData();
    const index = data.findIndex(item => item.id === req.params.id);
    if (index === -1) {
        return res.status(404).json({ error: 'Content not found' });
    }
    data[index] = { ...data[index], ...req.body };
    saveData(data);
    res.json(data[index]);
});

// DELETE content
app.delete('/api/content/:id', (req, res) => {
    let data = loadData();
    const index = data.findIndex(item => item.id === req.params.id);
    if (index === -1) {
        return res.status(404).json({ error: 'Content not found' });
    }
    data = data.filter(item => item.id !== req.params.id);
    saveData(data);
    res.json({ success: true });
});

/**
 * AI Content Generation Endpoint
 * POST /api/generate
 * Body: { summary: string }
 * Returns: { header: string, caption: string, hashtags: string[] }
 */
app.post('/api/generate', async (req, res) => {
    const { summary } = req.body;

    if (!summary || typeof summary !== 'string') {
        return res.status(400).json({ error: 'Summary is required' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
        return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
    }

    try {
        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            messages: [
                {
                    role: 'user',
                    content: `You are helping write TikTok captions in a specific voice. The voice is:
- Warm, personal, and genuine
- NOT hype-y, NOT "influencer-speak"
- Uses emojis sparingly (0-2 max)
- Normal capitalization

STRICT LENGTH RULES:
- Caption must be 30 words MAX total
- Each sentence must be 12 words MAX
- Keep it short and punchy

Example captions:
- "Before & after – bye bye to the best loft ever"
- "Night and day in the apartment ✨"
- "Week 1-1: Starting with learning design tools and gardening fundamentals"

Summary: ${summary}

Please provide:
1. A short header (max 50 characters)
2. A caption (MAX 30 words total, each sentence MAX 12 words)
3. 5-8 relevant hashtags

Respond in JSON format only:
{
  "header": "your header here",
  "caption": "your caption here",
  "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`,
                },
            ],
        });

        // Parse the response
        const responseText = message.content[0].text;

        // Extract JSON from response (handle potential markdown code blocks)
        let jsonStr = responseText;
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1];
        }

        const result = JSON.parse(jsonStr);

        // Validate response structure
        if (!result.header || !result.caption || !Array.isArray(result.hashtags)) {
            throw new Error('Invalid response structure');
        }

        res.json({
            header: result.header,
            caption: result.caption,
            hashtags: result.hashtags,
        });
    } catch (error) {
        console.error('AI Generation error:', error);

        if (error instanceof SyntaxError) {
            return res.status(500).json({ error: 'Failed to parse AI response' });
        }

        res.status(500).json({
            error: error.message || 'Failed to generate content',
        });
    }
});

/**
 * GET /api/accounts
 * Returns stored account stats (followers, etc.) and which APIs are configured
 */
app.get('/api/accounts', (req, res) => {
    const accounts = loadAccounts();
    res.json({
        tiktok: accounts.tiktok || null,
        instagram: accounts.instagram || null,
        lastSynced: accounts.lastSynced || null,
        configured: {
            tiktok: !!process.env.TIKTOK_ACCESS_TOKEN,
            instagram: !!process.env.INSTAGRAM_ACCESS_TOKEN,
        },
    });
});

/**
 * POST /api/sync
 * Fetches fresh metrics from TikTok + Instagram APIs, updates data.json
 * Requires TIKTOK_ACCESS_TOKEN and/or INSTAGRAM_ACCESS_TOKEN in .env
 */
app.post('/api/sync', async (req, res) => {
    const results = { updated: 0, tiktok: null, instagram: null, errors: [] };
    const data = loadData();
    const accounts = loadAccounts();

    // ── TikTok ──────────────────────────────────────────────────────────────
    if (process.env.TIKTOK_ACCESS_TOKEN) {
        try {
            // Account info (followers)
            const userRes = await fetch(
                'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,follower_count,following_count,likes_count,video_count',
                { headers: { Authorization: `Bearer ${process.env.TIKTOK_ACCESS_TOKEN}` } }
            );
            if (userRes.ok) {
                const userData = await userRes.json();
                if (userData.data?.user) {
                    accounts.tiktok = { ...userData.data.user, syncedAt: new Date().toISOString() };
                }
            }

            // Video list with metrics
            const videoRes = await fetch(
                'https://open.tiktokapis.com/v2/video/list/?fields=id,like_count,comment_count,share_count,view_count,share_url',
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${process.env.TIKTOK_ACCESS_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ max_count: 20 }),
                }
            );
            if (videoRes.ok) {
                const videoData = await videoRes.json();
                const videos = videoData.data?.videos || [];
                let matched = 0;

                for (const video of videos) {
                    const idx = data.findIndex(item => {
                        const storedId = extractTikTokVideoId(item.tiktokUrl);
                        return storedId && storedId === video.id;
                    });
                    if (idx !== -1) {
                        data[idx].views    = video.view_count    ?? data[idx].views;
                        data[idx].likes    = video.like_count    ?? data[idx].likes;
                        data[idx].comments = video.comment_count ?? data[idx].comments;
                        data[idx].shares   = video.share_count   ?? data[idx].shares;
                        data[idx].lastSynced = new Date().toISOString();
                        matched++;
                        results.updated++;
                    }
                }
                results.tiktok = { videos: videos.length, matched };
            }
        } catch (err) {
            results.errors.push(`TikTok: ${err.message}`);
        }
    } else {
        results.errors.push('TikTok: Add TIKTOK_ACCESS_TOKEN to .env to enable sync');
    }

    // ── Instagram ────────────────────────────────────────────────────────────
    if (process.env.INSTAGRAM_ACCESS_TOKEN) {
        try {
            // Account info
            const accountRes = await fetch(
                `https://graph.instagram.com/me?fields=id,username,followers_count,follows_count,media_count&access_token=${process.env.INSTAGRAM_ACCESS_TOKEN}`
            );
            if (accountRes.ok) {
                const accountData = await accountRes.json();
                accounts.instagram = { ...accountData, syncedAt: new Date().toISOString() };
            }

            // Media list with metrics
            const mediaRes = await fetch(
                `https://graph.instagram.com/me/media?fields=id,caption,like_count,comments_count,timestamp,permalink&limit=20&access_token=${process.env.INSTAGRAM_ACCESS_TOKEN}`
            );
            if (mediaRes.ok) {
                const mediaData = await mediaRes.json();
                const posts = mediaData.data || [];
                let igMatched = 0;

                for (const post of posts) {
                    const idx = data.findIndex(item => item.instagramUrl === post.permalink);
                    if (idx !== -1) {
                        data[idx].likes    = post.like_count      ?? data[idx].likes;
                        data[idx].comments = post.comments_count  ?? data[idx].comments;
                        data[idx].lastSynced = new Date().toISOString();
                        igMatched++;
                        results.updated++;
                    }
                }
                results.instagram = { posts: posts.length, matched: igMatched };
            }
        } catch (err) {
            results.errors.push(`Instagram: ${err.message}`);
        }
    } else {
        results.errors.push('Instagram: Add INSTAGRAM_ACCESS_TOKEN to .env to enable sync');
    }

    accounts.lastSynced = new Date().toISOString();
    saveData(data);
    saveAccounts(accounts);
    res.json(results);
});

/**
 * GET /api/analytics
 * Computes engagement stats for all posted content + Claude AI insights
 */
app.get('/api/analytics', async (req, res) => {
    const data = loadData();
    const posted = data.filter(item => item.status === 'posted');

    const stats = posted.map(item => ({
        id: item.id,
        title: item.title,
        views:    item.views    || 0,
        likes:    item.likes    || 0,
        comments: item.comments || 0,
        shares:   item.shares   || 0,
        engagementRate: (item.views || 0) > 0
            ? (((item.likes || 0) + (item.comments || 0) + (item.shares || 0)) / item.views * 100).toFixed(2)
            : '0.00',
        hashtags: item.hashtags || '',
        dueDate:  item.dueDate  || '',
    }));

    // Totals
    const totals = stats.reduce((acc, s) => ({
        views:    acc.views    + s.views,
        likes:    acc.likes    + s.likes,
        comments: acc.comments + s.comments,
        shares:   acc.shares   + s.shares,
    }), { views: 0, likes: 0, comments: 0, shares: 0 });

    const avgEngagement = stats.length > 0
        ? (stats.reduce((sum, s) => sum + parseFloat(s.engagementRate), 0) / stats.length).toFixed(2)
        : '0.00';

    // Claude AI insights — only if there's real data to analyze
    let insights = null;
    const withData = stats.filter(s => s.views > 0);

    if (withData.length > 0 && process.env.ANTHROPIC_API_KEY) {
        try {
            const message = await anthropic.messages.create({
                model: 'claude-sonnet-4-6',
                max_tokens: 600,
                messages: [{
                    role: 'user',
                    content: `You're analyzing TikTok/Instagram content performance for a lifestyle and gardening creator. Here's their posted content data:

${JSON.stringify(withData, null, 2)}

Give 3-4 specific, actionable insights. Be direct and reference actual numbers. Cover:
- What's performing best and what's driving it
- What's underperforming and a likely reason
- One clear recommendation for their next post
- Any hashtag or content theme worth doubling down on

Format as short bullet points. No fluff.`,
                }],
            });
            insights = message.content[0].text;
        } catch (err) {
            console.error('Analytics AI error:', err.message);
        }
    }

    res.json({ stats, totals, avgEngagement, insights });
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        apiConfigured: !!process.env.ANTHROPIC_API_KEY,
    });
});

/**
 * Serve the dashboard for all other routes
 */
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════╗
║       TikTok Content Dashboard Server              ║
╠════════════════════════════════════════════════════╣
║  Server running at: http://localhost:${PORT}          ║
║  API Key configured: ${process.env.ANTHROPIC_API_KEY ? 'Yes' : 'No (set ANTHROPIC_API_KEY)'}
╚════════════════════════════════════════════════════╝
    `);

    if (!process.env.ANTHROPIC_API_KEY) {
        console.log('\n⚠️  Warning: ANTHROPIC_API_KEY not set. AI generation will not work.');
        console.log('   Create a .env file with: ANTHROPIC_API_KEY=your_key_here\n');
    }
});
