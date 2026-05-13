# Development Guide

Follow these instructions to set up and run Smart Care Sense locally.

## Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) or [Bun](https://bun.sh/)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (optional, for backend development)

## Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd smart-care-sense
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   bun install
   ```

3. Environment Setup:
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

## Running the App
- **Development Server**: Starts the app with hot-reloading.
  ```bash
  npm run dev
  ```
- **Build**: Compiles the app for production.
  ```bash
  npm run build
  ```
- **Preview**: Runs the production build locally.
  ```bash
  npm run preview
  ```

## Running Tests
- **Run all tests**:
  ```bash
  npm run test
  ```
- **Watch mode**:
  ```bash
  npm run test:watch
  ```

## Project Structure
- `src/components`: UI components and dashboard-specific layouts.
- `src/hooks`: Custom React hooks (auth, data fetching).
- `src/integrations`: Supabase client and generated types.
- `src/lib`: Utility functions and health metric logic.
- `src/pages`: Main application routes (Dashboard, Assistant, Devices, etc.).
- `supabase/functions`: Deno edge functions for AI and data processing.
