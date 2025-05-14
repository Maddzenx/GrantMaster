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