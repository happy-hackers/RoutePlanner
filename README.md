# RoutePlanner

A full-stack delivery route planning and management application for dispatchers and drivers.

## Overview

RoutePlanner helps logistics companies optimize delivery routes, manage dispatchers, and provide drivers with mobile-friendly interfaces to track their deliveries.

### Key Features

- 📦 **Order Management** - Create, assign, and track delivery orders
- 🚚 **Dispatcher Management** - Manage driver accounts and schedules
- 🗺️ **Route Optimization** - AI-powered route planning using Google Maps and OR-Tools
- 📱 **Mobile Driver Interface** - Mobile-first route viewing and delivery tracking
- 🔐 **Secure Authentication** - Session-based auth for driver access
- 👥 **Customer Management** - Maintain customer database with delivery preferences

## Tech Stack

### Frontend
- **React** + **TypeScript** + **Vite**
- **Ant Design** - UI component library
- **Redux Toolkit** - State management
- **React Router v7** - Routing
- **Google Maps API** - Map display and geocoding
- **Leaflet + OpenStreetMap** - Route visualization

### Backend
- **FastAPI** (Python) - Route optimization API
- **OR-Tools** - Constraint programming for route optimization
- **Supabase** - Database and authentication
  - PostgreSQL database
  - Row Level Security (RLS)
  - Built-in authentication

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- Supabase account
- Google Maps API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd RoutePlanner
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   # or with uv
   uv sync
   ```

4. **Set up environment variables**

   Create `.env` in project root:
   ```bash
   VITE_GOOGLE_API_KEY=your-google-api-key
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_SERVER_URL=http://localhost:8000
   ```

   Create `.env` in backend folder:
   ```bash
   GOOGLE_API_KEY=your-google-api-key
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   ```

5. **Set up database**

   Run the SQL migrations in Supabase SQL Editor (see `docs/AUTH_SYSTEM.md` for schema)

6. **Start development servers**

   Frontend:
   ```bash
   npm run dev
   ```

   Backend (in separate terminal):
   ```bash
   cd backend
   python main.py
   # or with uvicorn
   uvicorn main:app --reload
   ```

7. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - Driver Login: http://localhost:5173/driver-login

## Documentation

Comprehensive documentation is available in the [`docs/`](./docs) directory:

- **[docs/README.md](./docs/README.md)** - Documentation index
- **[docs/AUTH_SYSTEM.md](./docs/AUTH_SYSTEM.md)** - Authentication system guide
- **[docs/DRIVER_FEATURE_PLAN.md](./docs/DRIVER_FEATURE_PLAN.md)** - Driver interface specifications
- **[docs/UX_IMPROVEMENTS.md](./docs/UX_IMPROVEMENTS.md)** - UI/UX enhancements
- **[CLAUDE.md](./CLAUDE.md)** - Development guidelines and architecture

## Project Structure

```
RoutePlanner/
├── src/                      # Frontend source code
│   ├── components/          # React components
│   ├── pages/               # Page components
│   ├── contexts/            # React contexts (Auth, etc.)
│   ├── utils/               # Utility functions
│   ├── types/               # TypeScript type definitions
│   ├── store/               # Redux store
│   └── styles/              # CSS files
├── backend/                 # Backend API
│   └── main.py             # FastAPI route optimization service
├── docs/                    # Documentation
├── public/                  # Static assets
└── scripts/                 # Utility scripts

```

## User Roles

### Admin
- Manage dispatchers (create accounts, reset passwords)
- Manage customers
- Create and assign orders
- View all routes and analytics

### Dispatcher/Driver
- Log in with email/password
- View assigned delivery routes
- Mark deliveries as complete
- Navigate using Google Maps integration

## Features

### Order Management
- Create orders with customer details
- Assign to dispatchers manually or automatically
- Track order status (Pending → In Progress → Delivered)
- Filter by date, time period, and status

### Route Optimization
- **Normal Mode**: Optimize by shortest distance
- **Time-Aware Mode**: Respect customer opening hours
- Uses Google Maps Directions API for routing
- OR-Tools constraint solver for optimization
- Visual route display with polylines

### Driver Interface
- Mobile-first responsive design
- Session-based secure authentication
- View today's deliveries on map
- Mark deliveries complete with one tap
- Auto-advance to next stop
- Open full route in Google Maps
- Date picker for viewing future/past routes

## Development

### Frontend Development
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Backend Development
```bash
cd backend
python main.py       # Start FastAPI server
# Server runs on http://localhost:8000
```

### Code Style
- TypeScript for type safety
- ESLint for code quality
- Ant Design components for consistency
- Follow conventions in [CLAUDE.md](./CLAUDE.md)

## Testing Mobile Interface

1. **Start dev server with network access:**
   ```bash
   npm run dev -- --host
   ```

2. **Find your local IP:**
   ```bash
   # Mac/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1

   # Windows
   ipconfig
   ```

3. **Access from mobile device** (same WiFi):
   ```
   http://YOUR_IP:5173/driver-login
   ```

See [docs/AUTH_SYSTEM.md](./docs/AUTH_SYSTEM.md) for detailed mobile testing instructions.

## Deployment

### Frontend (Vercel/Netlify)
1. Connect repository to hosting platform
2. Set environment variables
3. Build command: `npm run build`
4. Publish directory: `dist`

### Backend (Render/Railway/Fly.io)
1. Deploy `backend/` directory
2. Set environment variables
3. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

## Environment Variables

### Frontend (.env)
- `VITE_GOOGLE_API_KEY` - Google Maps API key
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_SERVER_URL` - Backend API URL

### Backend (backend/.env)
- `GOOGLE_API_KEY` - Google Maps API key
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service role key

## Contributing

1. Read [CLAUDE.md](./CLAUDE.md) for development guidelines
2. Create feature branch from `main`
3. Make changes following code style
4. Test thoroughly (desktop + mobile)
5. Submit pull request

## License

[Add your license here]

## Support

For documentation and guides, see the [`docs/`](./docs) directory.

For code-related questions, see [CLAUDE.md](./CLAUDE.md).

---

**Built with** ❤️ **by the RoutePlanner Team**
