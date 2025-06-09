# GrantMaster

A web-based tool that helps early-stage startup founders in Sweden find relevant Vinnova grants and draft strong, tailored applications using AI.

## Features

- Grant Discovery Dashboard
- Grant Detail Pages
- User Authentication
- User Onboarding Wizard
- AI-Powered Application Drafting

## Tech Stack

- Frontend: Next.js + Tailwind CSS
- Backend: Next.js API Routes
- Database: Supabase
- Authentication: Supabase Auth
- AI: OpenAI GPT-4

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file with:
   ```
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # OpenAI
   OPENAI_API_KEY=your_openai_api_key
   
   # Vinnova API
   VINNOVA_API_KEY=your_vinnova_api_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
grantmaster/
├── app/                    # Next.js 13+ app directory
│   ├── api/               # API routes
│   ├── components/        # React components
│   ├── lib/              # Utility functions
│   ├── styles/           # Global styles
│   └── utils/            # Helper functions
├── public/               # Static files
└── styles/              # Additional styles
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT 

## Vinnova API Client

A robust, type-safe client for the Vinnova Open Data and GDP APIs.

### Features
- Axios-based client with keep-alive, API key and OAuth2 support
- Automatic retries, error handling, and in-memory caching
- Typed endpoint wrappers for utlysningar, ansokningar, finansierade aktiviteter
- Pagination helpers and robust error classes

### Environment Variables
- `VINNOVA_API_KEY`
- `VINNOVA_API_BASE_URL`
- `USE_OAUTH2`
- `VINNOVA_TENANT_ID`, `VINNOVA_CLIENT_ID`, `VINNOVA_CLIENT_SECRET`, `VINNOVA_SCOPE` (for OAuth2)

### Usage
```typescript
import { getUtlysningar } from './services/vinnovaApiClient';

try {
  const data = await getUtlysningar({ limit: 5 });
  console.log(data.results);
} catch (err) {
  // See error handling example below
}
```

### Error Handling
- Throws `VinnovaAuthError` for 401/403
- Throws `VinnovaRateLimitError` for 429
- Throws `VinnovaServerError` for 5xx
- Throws generic `Error` for network/unknown errors
- Use `instanceof` to distinguish error types

### Caching
- GET requests are cached in-memory per-URL for 2 minutes by default
- UseCache param can be set to false to bypass cache 