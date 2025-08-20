# React + TypeScript + Vite + shadcn/ui

This project is set up with React, TypeScript, Vite, and shadcn/ui for building modern web applications with beautiful, accessible UI components.

## Getting Started

1. Install dependencies

```bash
cd web
npm install
```

2. Start the development server

```bash
npm run dev
```

3. Build for production

```bash
npm run build
```

4. Preview the production build

```bash
npm run preview
```

5. Lint the code

```bash
npm run lint
```

## Setup cloud Firebase Authentication

1. Create or select a Firebase project
2. In the Firebase Console: Build → Authentication → Get started
3. Enable Google sign-in provider
   1. To control who can login to the application you can set the Google Login to internal domains only https://console.cloud.google.com/auth/audience
4. Add your web app to the Firebase project
5. Register your app with a nickname
6. Create a `.env` file in the `web/` with the following content from `.env.example` copy insert data from (Project setting -> Your apps) `firebaseConfig`
7. Install Firebase CLI

```bash
npm install -g firebase-tools
firebase login
cd web/
npm install
firebase use --add
```

8. Choose the Firebase project you just created
9. Create alias for this project
10. If you want to change the default deploy project:

```bash
firebase use
firebase use project-you-want-to-use
```

## Using shadcn/ui

This project is pre-configured with shadcn/ui, a collection of reusable components built using Radix UI and Tailwind CSS.

### Configuration

The project is already configured with:

- **Style**: New York
- **Base Color**: Neutral
- **CSS Variables**: Enabled
- **Icon Library**: Lucide React
- **Components Path**: `@/components/ui`
- **Utils Path**: `@/lib/utils`

### Adding New Components

To add new shadcn/ui components to your project, use the shadcn CLI:

````bash
# Add a specific component (e.g., card)
npx shadcn@latest add card

# Add multiple components at once
npx shadcn@latest add card button input


### Using Components

After adding components, import and use them in your React components:

```tsx
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hello World</CardTitle>
      </CardHeader>
      <CardContent>
        <Button>Click me</Button>
      </CardContent>
    </Card>
  )
}
````

## Set up Cloud Firestore

1. Cloud Firestore → Rules
   - Copy these rules:

```rules
service cloud.firestore {
  match /databases/{database}/documents {
    match /polls/{pollId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

### Customizing Components

Components are copied to your project, so you can customize them as needed:

1. **Styling**: Modify the component files in `src/components/ui/`
2. **Variants**: Use the built-in variant system with `class-variance-authority`
3. **Themes**: Customize colors and styling in `src/index.css` and `tailwind.config.js`

### Utility Functions

The project includes a `cn()` utility function in `src/lib/utils.ts` for conditional class names:

```tsx
import { cn } from '@/lib/utils';

// Combine classes conditionally
const buttonClass = cn('base-button-styles', isActive && 'active-styles', className);
```

### Icons

The project uses Lucide React for icons:

```tsx
import { ChevronRight, User, Settings } from 'lucide-react';

export function MyComponent() {
  return (
    <div>
      <User className="h-4 w-4" />
      <Settings className="h-4 w-4" />
      <ChevronRight className="h-4 w-4" />
    </div>
  );
}
```

### Resources

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [shadcn/ui Components](https://ui.shadcn.com/docs/components)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)
