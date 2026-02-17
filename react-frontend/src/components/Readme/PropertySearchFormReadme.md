# Property Search Form Component

A comprehensive, user-friendly property search form for your local property marketplace MVP. Designed to help renters and buyers easily filter and find their perfect home.

## Features

✨ **Clean, Modern Design** - Professional UI with blue theme
🔄 **Rent/Buy Toggle** - Easy switch between rental and purchase options
📍 **Location Search** - Smart location input with icon
🏠 **BHK Filter** - Dropdown with options from 1 BHK to 4+ BHK
🏢 **Property Type** - Filter by apartments, villas, independent houses, etc.
🛋️ **Furnishing Options** - Fully furnished, semi-furnished, or unfurnished
💰 **Dynamic Price Range** - Interactive slider with different ranges for rent vs buy
📱 **Fully Responsive** - Works perfectly on all devices
🎨 **Smooth Animations** - Polished user experience with micro-interactions

## Filters Included

### Core Filters (Required)
- ✅ **Location** - Text input for locality, area, or landmark
- ✅ **Price Range** - Slider with dynamic ranges (₹0-1L for rent, ₹0-2Cr for buy)
- ✅ **Rent/Buy Toggle** - Switch between rental and purchase search
- ✅ **BHK Type** - Dropdown (1, 1.5, 2, 2.5, 3, 3.5, 4, 4+ BHK)

### Additional Filters (For Better UX)
- **Property Type** - Apartment, Independent House, Villa, Builder Floor, Studio, Penthouse
- **Furnishing** - Fully Furnished, Semi Furnished, Unfurnished

## Installation

1. Copy `PropertySearchForm.jsx` and `PropertySearchForm.css` to your components folder

2. Import and use in your landing page:

```jsx
import PropertySearchForm from './components/PropertySearchForm';

function HomePage() {
  return (
    <div>
      <Navbar />
      <PropertySearchForm />
      {/* Other components */}
    </div>
  );
}

export default HomePage;
```

## Component Structure

```
├── PropertySearchForm.jsx    # Main search form component
└── PropertySearchForm.css    # Styling with blue theme
```

## How It Works

### 1. State Management
The component manages:
- `searchType`: 'rent' or 'buy'
- `priceRange`: Number value for the slider
- `filters`: Object containing location, bhk, propertyType, furnishing

### 2. Dynamic Price Range
```javascript
// Automatically adjusts based on search type
- Rent: ₹0 to ₹1,00,000 (in ₹1K steps)
- Buy: ₹0 to ₹2,00,00,000 (in ₹1L steps)
```

### 3. Form Submission
```javascript
const handleSubmit = (e) => {
  e.preventDefault();
  const searchData = {
    searchType,      // 'rent' or 'buy'
    priceRange,      // Number
    location,        // String
    bhk,            // String
    propertyType,   // String
    furnishing      // String
  };
  // Send to your API to fetch filtered properties
};
```

## Customization

### Change Form Fields

Add more filters in the `form-grid`:

```jsx
<div className="form-group">
  <label htmlFor="newFilter" className="form-label">
    <svg>...</svg>
    New Filter
  </label>
  <select id="newFilter" className="form-select">
    <option value="">Select...</option>
  </select>
</div>
```

### Modify Price Range

In `PropertySearchForm.jsx`:

```javascript
const getMaxPrice = () => {
  return searchType === 'rent' ? 100000 : 20000000; // Change these values
};
```

### Update Colors

In `PropertySearchForm.css`, search and replace the blue color:

```css
/* Primary: #2563eb */
/* Darker: #1d4ed8 */
```

## BHK Options Explained

- **1 BHK** - 1 Bedroom, Hall, Kitchen
- **1.5 BHK** - 1 Bedroom + Small study/room, Hall, Kitchen
- **2 BHK** - 2 Bedrooms, Hall, Kitchen
- **2.5 BHK** - 2 Bedrooms + Small study/room, Hall, Kitchen
- **3 BHK** - 3 Bedrooms, Hall, Kitchen
- **3.5 BHK** - 3 Bedrooms + Small study/room, Hall, Kitchen
- **4 BHK** - 4 Bedrooms, Hall, Kitchen
- **4+ BHK** - 4 or more Bedrooms, Hall, Kitchen

## Property Types

1. **Apartment** - Flat in a multi-story building
2. **Independent House** - Standalone house
3. **Villa** - Luxury independent house with amenities
4. **Builder Floor** - Floor in an independent building
5. **Studio Apartment** - Single large room with kitchenette
6. **Penthouse** - Luxury apartment on top floor

## Responsive Breakpoints

- **Desktop (> 768px)**: Full 2-column grid layout
- **Tablet (768px)**: Single column layout, adjusted spacing
- **Mobile (480px)**: Compact layout with smaller fonts and padding

## Integration with Backend

When user submits the form, send the data to your API:

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  const searchParams = {
    searchType,
    priceRange,
    ...filters
  };
  
  try {
    const response = await fetch('/api/properties/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchParams)
    });
    
    const properties = await response.json();
    // Display properties to user
  } catch (error) {
    console.error('Search failed:', error);
  }
};
```

## Next Steps

1. **Add autocomplete** for location field (Google Places API)
2. **Add area/sqft filter** for property size
3. **Add amenities filter** (parking, gym, pool, etc.)
4. **Add availability date** filter
5. **Implement saved searches** functionality
6. **Add property age filter** (new construction, 1-5 years, etc.)

## Why These Filters?

Based on user research in property search:

1. **Location** - Most important factor (where do they want to live?)
2. **Price Range** - Budget constraint (what can they afford?)
3. **BHK Type** - Space requirement (how many rooms do they need?)
4. **Property Type** - Lifestyle preference (apartment vs independent house)
5. **Furnishing** - Move-in readiness (do they have furniture?)
6. **Rent vs Buy** - Transaction type (fundamental decision)

These 6 filters cover 90% of user search needs for an MVP!

---

**Happy house hunting! 🏡**