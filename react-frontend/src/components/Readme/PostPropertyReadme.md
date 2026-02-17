# Post Property - Multi-Step Form

A comprehensive, user-friendly property listing form for property owners to post their properties for rent or sale. Built with React using a multi-step wizard approach.

## 📋 Table of Contents

- [Features](#features)
- [Components](#components)
- [Installation](#installation)
- [Form Fields](#form-fields)
- [Usage](#usage)
- [Customization](#customization)

## ✨ Features

- **Multi-Step Wizard** - 6-step process with progress indicator
- **Comprehensive Fields** - All relevant property information
- **Image Upload** - Drag & drop with preview and reordering
- **Smart Validation** - Required fields and format validation
- **Dynamic Pricing** - Different fields for Rent vs Sale
- **24 Amenities** - Checkboxes with icons for easy selection
- **Responsive Design** - Works on all devices
- **Professional UI** - Clean, modern design with blue theme

## 🧩 Components

### Main Component
- **PostProperty.jsx** - Main orchestrator component with step management

### Sub-components (Steps)
1. **PropertyBasicInfo.jsx** - Basic property & location info
2. **PropertyDetails.jsx** - Detailed specifications
3. **PropertyAmenities.jsx** - 24 amenity options with icons
4. **PropertyImages.jsx** - Image upload with drag & drop
5. **PropertyPricing.jsx** - Pricing & charges
6. **OwnerContact.jsx** - Owner contact details

### Styling
- **PostProperty.css** - Comprehensive styling for all components

## 📦 Installation

1. Copy all component files to your `components` folder:
```
src/
├── components/
│   ├── PostProperty/
│   │   ├── PostProperty.jsx
│   │   ├── PropertyBasicInfo.jsx
│   │   ├── PropertyDetails.jsx
│   │   ├── PropertyAmenities.jsx
│   │   ├── PropertyImages.jsx
│   │   ├── PropertyPricing.jsx
│   │   ├── OwnerContact.jsx
│   │   └── PostProperty.css
```

2. Import and use in your app:

```jsx
import PostProperty from './components/PostProperty/PostProperty';

function App() {
  return (
    <div>
      <Navbar />
      <PostProperty />
    </div>
  );
}
```

## 📝 Form Fields

### Step 1: Basic Information
- **Property For** - Rent or Sell (toggle)
- **Property Type** - Apartment, Villa, Independent House, etc.
- **BHK Type** - 1 to 4+ BHK
- **Address** - Full property address
- **Locality** - Area/locality name
- **City** - City name
- **Pincode** - 6-digit pincode

### Step 2: Property Details
- **Built-up Area** - Total area in sq ft
- **Carpet Area** - Usable area in sq ft
- **Total Floors** - Floors in building
- **Floor Number** - Property floor (0 for ground)
- **Property Age** - Age range (0-1, 1-3, 3-5, 5-10, 10+ years)
- **Furnishing** - Fully/Semi/Unfurnished
- **Facing** - Direction (N, S, E, W, NE, NW, SE, SW)
- **Description** - Detailed property description

### Step 3: Amenities (24 Options)
✅ Car Parking • Gym • Swimming Pool • Garden • Clubhouse • Kids Play Area • Lift • Power Backup • 24/7 Security • CCTV • 24/7 Water Supply • Internet/WiFi • Intercom • Maintenance Staff • Visitor Parking • Fire Safety • Rainwater Harvesting • Waste Disposal • Servant Room • Study Room • Store Room • Balcony • AC • Modular Kitchen

### Step 4: Property Images
- Drag & drop or click to upload
- Up to 10 images (JPG, PNG, max 5MB each)
- Reorder images (first is cover photo)
- Delete unwanted images
- Real-time preview

### Step 5: Pricing & Charges

**For Rent:**
- Monthly Rent (required)
- Maintenance Charges (optional)
- Security Deposit (required)
- Price Negotiable (checkbox)
- Move-in Cost Summary

**For Sale:**
- Sale Price (required)
- Price Negotiable (checkbox)

### Step 6: Contact Information
- Owner Name (required)
- Phone Number (10 digits, required)
- Email Address (required)
- Available From Date (required)
- Preferred Contact Method (Phone/Email/Both)
- Terms & Conditions (checkbox)

## 🚀 Usage

### Basic Implementation

```jsx
import PostProperty from './components/PostProperty/PostProperty';

function PostPropertyPage() {
  return <PostProperty />;
}
```

### Handling Form Submission

The form submission is in `PostProperty.jsx`. Customize the `handleSubmit` function:

```jsx
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Create FormData for image upload
  const formDataToSend = new FormData();
  
  // Add all fields
  Object.keys(formData).forEach(key => {
    if (key === 'images') {
      formData.images.forEach(img => {
        formDataToSend.append('images', img.file);
      });
    } else if (key === 'amenities') {
      formDataToSend.append('amenities', JSON.stringify(formData.amenities));
    } else {
      formDataToSend.append(key, formData[key]);
    }
  });
  
  try {
    const response = await fetch('/api/properties/create', {
      method: 'POST',
      body: formDataToSend
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert('Property posted successfully!');
      // Redirect or reset form
    }
  } catch (error) {
    console.error('Error posting property:', error);
    alert('Failed to post property. Please try again.');
  }
};
```

## 🎨 Customization

### Change Colors

In `PostProperty.css`, update the blue color scheme:

```css
/* Primary Blue: #2563eb */
/* Darker Blue: #1d4ed8 */

/* Replace with your colors */
```

### Add/Remove Amenities

In `PropertyAmenities.jsx`, modify the `amenitiesList` array:

```jsx
const amenitiesList = [
  { id: 'new-amenity', label: 'New Amenity', icon: '🎯' },
  // ... add more
];
```

### Modify Form Steps

To add a new step:

1. Create new component file (e.g., `PropertyAdditionalInfo.jsx`)
2. Import in `PostProperty.jsx`
3. Update `totalSteps` constant
4. Add case in `renderStep()` switch
5. Add title in `getStepTitle()` array

### Validation

Add custom validation in each subcomponent or in `handleNext()`:

```jsx
const handleNext = () => {
  // Add validation logic
  if (!formData.propertyType) {
    alert('Please select a property type');
    return;
  }
  
  if (currentStep < totalSteps) {
    setCurrentStep(prev => prev + 1);
  }
};
```

## 📊 Data Structure

The complete form data structure:

```javascript
{
  // Basic Info
  propertyFor: 'rent' | 'sell',
  propertyType: string,
  bhk: string,
  address: string,
  locality: string,
  city: string,
  pincode: string,
  
  // Details
  builtUpArea: number,
  carpetArea: number,
  totalFloors: number,
  floorNumber: number,
  propertyAge: string,
  furnishing: string,
  facing: string,
  description: string,
  
  // Amenities
  amenities: string[],
  
  // Images
  images: Array<{
    file: File,
    preview: string,
    name: string
  }>,
  
  // Pricing
  expectedPrice: number,
  priceNegotiable: boolean,
  maintenanceCharges: number, // for rent
  securityDeposit: number,    // for rent
  
  // Contact
  ownerName: string,
  ownerPhone: string,
  ownerEmail: string,
  availableFrom: string (date)
}
```

## 🔄 Step Navigation

- **Next Button** - Moves to next step
- **Previous Button** - Goes back to previous step
- **Post Property Button** - Submits form (final step)
- **Progress Indicator** - Shows current step with checkmarks
- **Auto Scroll** - Scrolls to top on step change

## 📱 Responsive Breakpoints

- **Desktop (> 768px)** - 2-column grid layout
- **Tablet (≤ 768px)** - Single column, adjusted spacing
- **Mobile (≤ 480px)** - Compact layout, smaller text

## 🎯 Best Practices Implemented

1. **Modular Components** - Each step is a separate component
2. **State Management** - Centralized in parent component
3. **Prop Drilling** - Clean data flow to children
4. **Validation** - HTML5 validation + custom checks
5. **Accessibility** - Proper labels and ARIA attributes
6. **Performance** - Image previews with object URLs
7. **UX** - Progress indicator, smooth transitions
8. **Mobile First** - Responsive design

## 🛠️ Backend Integration

### API Endpoint Example

```javascript
// POST /api/properties/create
app.post('/api/properties/create', upload.array('images', 10), async (req, res) => {
  try {
    const propertyData = {
      ...req.body,
      amenities: JSON.parse(req.body.amenities),
      images: req.files.map(file => ({
        url: file.path,
        filename: file.filename
      }))
    };
    
    const property = await Property.create(propertyData);
    res.json({ success: true, property });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 💡 Tips

1. **Image Optimization** - Compress images before upload on backend
2. **Progress Save** - Consider saving draft at each step
3. **Email Verification** - Verify owner email before posting
4. **Phone Verification** - OTP verification for phone number
5. **Duplicate Check** - Check for duplicate properties
6. **Moderation** - Review properties before going live

## 🚧 Future Enhancements

- Save as draft functionality
- Auto-save on step change
- Image editing/cropping
- Map integration for location
- Suggested pricing based on area
- Property verification
- Analytics dashboard for owners

---

**Happy Property Listing! 🏠**