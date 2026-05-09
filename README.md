# Nexly 🚀

Nexly is an AI-powered B2B lead generation and cold outreach automation tool. It automatically finds potential clients, generates personalized cold emails using AI (Google Gemini / OpenAI), sends them via SMTP, and tracks responses to automatically schedule follow-ups.

## Features

- **Automated Lead Finding:** Uses Apify to extract leads based on industry, target profile, and location.
- **AI-Powered Emails:** Uses Gemini API to craft highly personalized, context-aware initial emails, follow-ups, and replies.
- **Automated Sending & Tracking:** Connects to your SMTP provider to send emails, track statuses, and cancel follow-ups if a reply is received.
- **Local SQLite Database:** Keeps track of leads, emails, scheduled follow-ups, and activity logs.

## Setup Instructions

### 1. Prerequisites
- Node.js (v18 or higher recommended)
- An Apify API Key (for lead scraping)
- A Google Gemini / OpenAI API Key (for email content generation)
- An SMTP account (like Gmail with App Passwords enabled)

### 2. Installation
Clone this repository and install the dependencies:
```bash
git clone https://github.com/BttFromTb/Nexly.git nexly
cd nexly
npm install
```

### 3. Environment Variables
To keep your sensitive data secure, this project uses a `.env` file. 

Copy the provided template and fill in your details:
```bash
cp .env.example .env
```

Open the newly created `.env` file and insert your actual API keys and SMTP credentials:
- `APIFY_API_KEY`: Your Apify API Token.
- `GEMINI_API_KEY`: Your Google Gemini API Key.
- `SMTP_USER`: Your sender email address.
- `SMTP_PASS`: Your email password (use App Passwords for Gmail/Outlook).

### 4. Running the Application
Start the server and automation processes:
```bash
npm start
```
By default, the server will start on `http://localhost:3000`.

## Scripts Included
- `run_campaign.js`: Runs a standard automated campaign.
- `send_manual.js`: Sends pending drafts manually.
- `email_search_run.js`: Fetches leads specifically for targeting.
- *Check the main directory for more specific campaign runners.*

## License
MIT

