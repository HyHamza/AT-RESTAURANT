# AT RESTAURANT

A complete restaurant ordering system built with Next.js and Supabase. Customers can browse menus, place orders with location tracking, and receive real-time updates. Includes admin dashboard for order management and offline PWA capabilities.

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **Database**: PostgreSQL with location services and order tracking
- **Auth**: Supabase Auth with admin role management
- **PWA**: Service worker, offline support, installable app
- **Maps**: Google Maps API for location services
- **Storage**: IndexedDB (Dexie) for offline data sync

## Features

- Menu browsing with categories and search
- Shopping cart with persistent state
- User authentication and profiles
- Location-based ordering with GPS/manual address
- Real-time order status updates
- Admin dashboard for order and menu management
- Offline functionality with data synchronization
- PWA installation for mobile devices
- Order history and tracking
- Customer notifications

## Architecture

The application follows a client-server architecture where the Next.js frontend communicates with Supabase for data persistence and real-time updates. Location services integrate with Google Maps API for delivery tracking. Offline capabilities are handled through IndexedDB with background sync when connectivity returns.

## Environment Setup

Required environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

Copy `.env.example` to `.env.local` and update with your credentials.

## Running Locally

```bash
npm install
npm run dev
```

Database setup:
1. Create a Supabase project
2. Run the SQL schema from `schema.sql` in your Supabase SQL editor
3. Configure environment variables
4. The app will connect automatically

## Build & Deployment

```bash
npm run build
npm start
```

The application is optimized for deployment on Vercel with automatic PWA generation. Ensure environment variables are configured in your deployment platform.

## Error Handling & Logging

The application implements comprehensive error handling with user-friendly messages. Production logging excludes sensitive data and focuses on operational metrics. Offline errors are queued and retried when connectivity returns.

## Notes

- Orders use custom ID format (ORD-XXXXX) for customer reference
- Location data is optional but enhances delivery experience
- Admin users are managed through the database `is_admin` flag
- PWA installation prompts appear after user engagement delay
- Offline sync handles conflicts through timestamp-based resolution
- Google Maps API key is required for location features