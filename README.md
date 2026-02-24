# TikTok Content Dashboard

A web-based dashboard to track TikTok content creation with AI-powered content generation (Claude API) and Google Sheets storage.

## Features

- **Content Tracker** - View and manage all content ideas and their status
- **AI Content Generator** - Generate headers, captions, and hashtags from a summary
- **Weekly Reminders** - Dashboard displays pending tasks and deadlines
- **Google Sheets Storage** - Persistent cloud storage for all data
- **Dark Mode UI** - Clean, modern interface

## Quick Start

### 1. Install Node.js
If you don't have Node.js installed, download it from [nodejs.org](https://nodejs.org/).

### 2. Install Dependencies
```bash
cd tiktok-dashboard
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your API keys:
```bash
cp .env.example .env
```

Edit `.env`:
```
ANTHROPIC_API_KEY=your_claude_api_key
PORT=3000
```

### 4. Start the Server
```bash
npm start
```

### 5. Open the Dashboard
Navigate to `http://localhost:3000` in your browser.

---

## Google Sheets Setup

### Step 1: Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (e.g., "TikTok Dashboard")

### Step 2: Enable Google Sheets API
1. Navigate to **APIs & Services** > **Library**
2. Search for "Google Sheets API" and enable it

### Step 3: Create OAuth 2.0 Credentials
1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Configure the OAuth consent screen if prompted
4. Application type: **Web application**
5. Add authorized JavaScript origins: `http://localhost:3000`
6. Add authorized redirect URIs: `http://localhost:3000`
7. Note the **Client ID**

### Step 4: Create Your Google Sheet
1. Create a new Google Sheet
2. Rename the first sheet tab to "Content" (or leave as "Sheet1" and update code)
3. Note the **Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
   ```

### Step 5: Connect in the Dashboard
1. Click "Connect Google Sheets" in the dashboard
2. Enter your Client ID and Spreadsheet ID when prompted
3. Authorize the app when the Google consent screen appears

---

## Data Schema

| Column | Field | Description |
|--------|-------|-------------|
| A | ID | Unique identifier |
| B | Title | Content title/topic |
| C | Summary | Brief description for AI generation |
| D | Header | Generated/custom header text |
| E | Caption | Generated/custom caption |
| F | Hashtags | Comma-separated hashtags |
| G | Status | idea / in-progress / filmed / edited / posted |
| H | Due Date | Target posting date |
| I | Created | Date entry was created |

---

## Project Structure

```
tiktok-dashboard/
├── index.html          # Main dashboard page
├── styles.css          # Dashboard styling (dark mode)
├── app.js              # Main application logic
├── sheets-api.js       # Google Sheets integration
├── ai-generator.js     # Claude API integration
├── server.js           # Node.js proxy server
├── package.json        # Dependencies
├── .env.example        # Environment variables template
└── README.md           # This file
```

---

## Usage

### Adding Content
1. Click **Add Content** button
2. Fill in the title and other details
3. Click **Save Content**

### AI Content Generation
1. Enter a content summary in the AI Generator panel
2. Click **Generate Content**
3. Review the generated header, caption, and hashtags
4. Click **Use in New Content** to create a new entry with the generated content

### Managing Content
- Click on a content title to view details
- Use the edit (pencil) button to modify content
- Use the delete (trash) button to remove content
- Filter by status or search by text

### Weekly Reminders
- The left panel shows content due this week
- Items are color-coded by urgency:
  - **Red**: Overdue
  - **Yellow**: Due within 3 days
  - **Blue**: Due within 7 days

---

## Troubleshooting

### "ANTHROPIC_API_KEY not configured"
Make sure you've created a `.env` file with your API key.

### Google Sheets connection fails
- Verify your Client ID is correct
- Check that `http://localhost:3000` is in your authorized origins
- Make sure the Google Sheets API is enabled

### AI generation fails
- Check your Anthropic API key is valid
- Ensure the server is running (`npm start`)
