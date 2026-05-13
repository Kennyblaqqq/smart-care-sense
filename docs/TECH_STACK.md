# Technical Stack

Smart Care Sense is built using a modern, scalable, and high-performance technology stack.

## Frontend
- **Framework**: [React 18](https://reactjs.org/) with [TypeScript](https://www.typescriptlang.org/) for type safety.
- **Build Tool**: [Vite](https://vitejs.dev/) for lightning-fast development and optimized production builds.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) for utility-first responsive design.
- **Components**: [Shadcn UI](https://ui.shadcn.com/) (built on [Radix UI](https://www.radix-ui.com/)) for accessible, high-quality primitive components.
- **Animations**: [Framer Motion](https://www.framer.com/motion/) for smooth layout transitions and micro-interactions.
- **Data Fetching**: [TanStack Query v5](https://tanstack.com/query/latest) (React Query) for robust server state management.
- **Icons**: [Lucide React](https://lucide.dev/) for a consistent and clean iconography.

## Backend & Infrastructure
- **Platform**: [Supabase](https://supabase.com/) (Backend-as-a-Service).
- **Database**: [PostgreSQL](https://www.postgresql.org/) for relational data storage.
- **Authentication**: [Supabase Auth](https://supabase.com/auth) for secure user sessions.
- **Edge Functions**: [Supabase Edge Functions](https://supabase.com/edge-functions) (Deno) for processing AI requests and data ingestion.
- **AI Integration**: Custom RAG implementation utilizing Supabase's vector capabilities for the AI Assistant.

## Hardware Connectivity
- **Web Bluetooth API**: Standard GATT profiles (Heart Rate Service `0x180D`) for direct browser-to-device communication.
- **HTTP Ingest**: Dedicated endpoints for Wi-Fi enabled IoT devices to post vital signs via REST API.

## Testing & Quality
- **Unit Testing**: [Vitest](https://vitest.dev/) and [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/).
- **Linting**: [ESLint](https://eslint.org/) with modern flat config.
- **Formatting**: Modern TypeScript and CSS standards.
