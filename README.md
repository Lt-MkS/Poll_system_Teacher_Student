# Intervue Poll - Live Polling System

real time teacher student polling system, teacher can ask question and studnet can respond....
For teacher : The poll history is given after you ask
a mew question .... thats a  bug I know and that is left
there intentinally

## Features

- **Teacherr**: Create polls, view results, manage students, view poll history
- **Stduents**: Join polls, vote in real-time, view results

## Tech Stack

- React + TypeScript
- Socket.io
- Express 
- Bootstrap 

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the mock server:
```bash
npm run mock-server
```

3. Start the development server (in another terminal):
```bash
npm run dev
```

4. Open http://localhost:5173 in your browser

## Project Structure

```
src/
  components/     # Reusable components
  hooks/         # Custom React hooks
  Pages/         # Page components
  types/         # TypeScript types
  utils/         # Utility functions
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run mock-server` - Start mock backend server
- `npm run lint` - Run ESLint
