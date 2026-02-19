# Play Bookings

A web-based facility rental marketplace for streamlining the rental of underutilized sports facilities. Connect trusted renters with available indoor basketball courts and fields.

## 🚀 Features

- **Venue Management**: Create and manage venue profiles with availability calendars
- **Booking System**: Instant booking or request-based workflows with conflict detection
- **Insurance Verification**: Document upload and approval workflow for compliance
- **Real-time Updates**: Live availability and booking notifications
- **Payment Processing**: Stripe integration for secure transactions
- **Role-based Access**: Separate interfaces for venue owners, renters, and admins

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: TailwindCSS, shadcn/ui components
- **Backend**: Supabase (PostgreSQL) with Row-Level Security
- **Authentication**: Google OAuth via Supabase Auth
- **Payments**: Stripe Connect Standard
- **Forms**: React Hook Form with Zod validation

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Google OAuth credentials
- Stripe account

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd PlayBookings
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Setup
Copy the environment example file and fill in your credentials:
```bash
cp env.example .env.local
```

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key
- `NEXT_PUBLIC_POSTHOG_KEY` - (Optional) PostHog project API key
- `NEXT_PUBLIC_POSTHOG_HOST` - (Optional) PostHog ingest host (default `https://us.i.posthog.com`)
- `NEXT_PUBLIC_POSTHOG_INTERNAL_EMAILS` - (Optional) comma-separated internal emails to exclude from analytics
- `NEXT_PUBLIC_POSTHOG_INTERNAL_DOMAINS` - (Optional) comma-separated internal email domains to exclude from analytics

PostHog internal traffic controls:
- Visit your site once with `?internal_traffic=1` to mark the current browser as internal traffic (saved in local storage).
- Visit with `?internal_traffic=0` to re-enable analytics capture for that browser.

### 4. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Protected dashboard routes
│   ├── (marketing)/       # Public marketing pages
│   └── layout.tsx         # Root layout
├── components/             # Reusable UI components
│   ├── ui/                # shadcn/ui components
│   ├── forms/             # Form components
│   └── layout/            # Layout components
├── lib/                    # Utility libraries
│   ├── supabase/          # Supabase client configuration
│   ├── validations/       # Zod validation schemas
│   └── utils.ts           # General utilities
└── types/                  # TypeScript type definitions
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 📱 Responsive Design

- Mobile-first design for renters
- Desktop-optimized for venue owners
- Responsive components using TailwindCSS

## 🔒 Security Features

- Row-Level Security (RLS) for multi-tenant data isolation
- Role-based access control
- Secure authentication with Google OAuth
- Input validation with Zod schemas

## 🚧 Development Status

This project is currently in active development. The MVP will include:

- [x] Project setup and configuration
- [x] Basic UI components and layout
- [x] Marketing landing page
- [ ] Authentication system
- [ ] Venue management
- [ ] Booking system
- [ ] Insurance workflow
- [ ] Payment integration
- [ ] Admin dashboard

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

For support and questions, please contact the development team or create an issue in the repository.
