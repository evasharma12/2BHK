# NoBroker Clone - Navbar Component

A modern, responsive Navbar component for your NoBroker clone website built with React.

## Features

- ✨ Clean, modern design with blue theme
- 📱 Fully responsive (desktop, tablet, mobile)
- 🎨 Smooth animations and hover effects
- 🎯 Scroll-aware navbar with shadow effect
- ♿ Accessible with ARIA labels
- 🎭 Professional UI with ripple effects

## Installation

1. Copy both `Navbar.jsx` and `Navbar.css` to your React project

2. Import the component in your App.js or main layout:

```jsx
import Navbar from './components/Navbar';

function App() {
  return (
    <div className="App">
      <Navbar />
      {/* Your other components */}
    </div>
  );
}

export default App;
```

## Component Structure

```
├── Navbar.jsx          # Main React component
└── Navbar.css          # Styling with blue theme
```

## Customization

### Change Primary Color

In `Navbar.css`, update the blue color values:

```css
/* Current blue: #2563eb */
/* Replace with your preferred color */
.navbar__logo-icon {
  color: #YOUR_COLOR;
}

.navbar__button--primary {
  background: linear-gradient(135deg, #YOUR_COLOR 0%, #DARKER_SHADE 100%);
}
```

### Adjust Navbar Height

In `Navbar.css`:

```css
.navbar__container {
  height: 70px; /* Change this value */
}
```

### Modify Buttons

You can add or remove buttons by editing the `navbar__actions` section in `Navbar.jsx`.

## Responsive Breakpoints

- **Desktop**: Full navbar with all buttons
- **Tablet (< 1024px)**: Hides "Pay Rent" and "For Property owners" buttons
- **Mobile (< 768px)**: Shows only Menu and essential buttons
- **Small Mobile (< 480px)**: Compact layout with icon-only menu

## Animations

The navbar includes:
- Scroll-triggered shadow effect
- Button hover animations with translate effects
- Ripple effect on button clicks
- Logo rotation on hover
- Smooth transitions throughout

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Dependencies

- React 16.8+ (uses Hooks)
- No additional packages required

## Next Steps

1. Add dropdown menus for navigation items
2. Implement mobile menu sidebar
3. Add search functionality
4. Integrate authentication state
5. Add user profile dropdown

## Notes

- The component uses fixed positioning for sticky navbar behavior
- Google Fonts (Outfit, Inter) are imported in the CSS
- All colors follow the blue theme as requested
- Follows React style guide and best practices

---

**Happy coding! 🚀**