# BondGarden - Development Plan

## Design Guidelines

### Design References
- **Calm.com**: Serene, nature-inspired, emotionally safe
- **Day One Journal**: Premium diary experience
- **Headspace**: Warm illustrations, rounded UI
- **Style**: Zen Garden + Soft Nature + Premium Mobile-First

### Color Palette
- Primary: #2D5A3D (Deep Forest Green)
- Secondary: #4A7C59 (Bamboo Green)
- Accent: #8FBC8F (Sage Green)
- Warm: #D4A574 (Warm Earth)
- Background: #F8F5F0 (Warm Cream)
- Surface: #FFFFFF (White cards)
- Text Primary: #2C3E2D (Dark Green-Gray)
- Text Secondary: #6B7B6E (Muted Green-Gray)
- Positive: #4CAF50 (Growth Green)
- Negative: #E57373 (Soft Red)
- Neutral: #FFB74D (Warm Amber)

### Typography
- Font: "Plus Jakarta Sans" (clean, modern, highly readable)
- H1: 28px, weight 700
- H2: 22px, weight 600
- H3: 18px, weight 600
- Body: 15px, weight 400
- Caption: 13px, weight 400

### Key Component Styles
- Cards: White bg, 16px rounded, soft shadow (0 2px 12px rgba(0,0,0,0.06))
- Buttons: 12px rounded, gentle hover transitions
- Bamboo visuals: CSS/SVG based, animated
- Bottom nav: Fixed, frosted glass effect
- Spacing: 16px base, generous padding

### CDN Images
- Hero: https://mgx-backend-cdn.metadl.com/generate/images/1008349/2026-03-08/ceb2e49d-0c3c-4783-bb39-5e99aa9accec.png
- Sprouts: https://mgx-backend-cdn.metadl.com/generate/images/1008349/2026-03-08/b075a731-6f9f-436d-bba0-549726a53814.png
- Watercolor: https://mgx-backend-cdn.metadl.com/generate/images/1008349/2026-03-08/7bddb137-c53b-436d-83d5-16d60184e927.png
- Zen Path: https://mgx-backend-cdn.metadl.com/generate/images/1008349/2026-03-08/5ecd9c6c-e0ee-4678-86da-6125945081c2.png

---

## Files to Create (8 file limit)

1. **src/lib/client.ts** - Web SDK client, auth helpers, scoring utils
2. **src/components/BottomNav.tsx** - Mobile bottom navigation bar
3. **src/components/BambooVisual.tsx** - Bamboo stalk SVG component with health visualization
4. **src/pages/Home.tsx** - Home dashboard with garden overview, mood, journal shortcut, reflection highlight
5. **src/pages/Journal.tsx** - Calendar view + journal editor + interaction review (combined)
6. **src/pages/MyGarden.tsx** - My Bamboo Garden with all relationships
7. **src/pages/GivenGarden.tsx** - Given Garden with 5 active people + needs tracking
8. **src/pages/SharedGarden.tsx** - Shared Garden with invite flow + shared views

Additional updates:
- src/App.tsx - Add routes and bottom nav
- src/index.css - Custom theme styles
- index.html - Update title

Note: Reflection and Profile/Settings will be accessible from Home page as sub-sections to stay within file limit.
