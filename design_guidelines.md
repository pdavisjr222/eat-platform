# E.A.T. Platform Design Guidelines

## Design Approach

**Selected System:** Material Design with nature-inspired customization
**Rationale:** The platform requires extensive component variety (maps, marketplace, profiles, messaging, educational content) while maintaining a cohesive, earth-friendly aesthetic. Material Design provides robust patterns for complex data displays, filters, and interactive maps while allowing customization for the sustainability theme.

**Key Design Principles:**
- Organic & approachable: Reflect the natural, community-driven mission
- Information clarity: Multiple complex features need intuitive organization
- Mobile-first: Users will access foraging maps and marketplace on-the-go
- Trust & transparency: Build confidence in peer-to-peer transactions

---

## Typography

**Font Families:**
- Primary: Inter (body text, UI elements, data displays)
- Accent: Merriweather (headings, featured content, emotional moments)

**Hierarchy:**
- Hero/H1: text-4xl to text-6xl, font-bold, Merriweather
- Section Headers/H2: text-3xl to text-4xl, font-semibold, Merriweather
- Card Titles/H3: text-xl to text-2xl, font-semibold, Inter
- Body: text-base, font-normal, Inter
- Metadata/Labels: text-sm, font-medium, Inter
- Captions: text-xs, font-normal, Inter

---

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16, 20
- Tight spacing (cards, buttons): p-2, p-4, gap-2
- Standard sections: py-12, py-16, px-4, px-6
- Major sections: py-20, gap-8
- Generous hero spacing: py-24, gap-12

**Grid Structure:**
- Desktop marketplace/directory: grid-cols-3, gap-6
- Tablet: grid-cols-2, gap-4
- Mobile: grid-cols-1, gap-4
- Max-width containers: max-w-7xl for content areas

---

## Component Library

### Navigation
- Sticky header with transparent-to-solid transition on scroll
- Logo left, primary nav center, profile/notifications right
- Mobile: Hamburger menu with slide-out drawer
- Include quick access to: Marketplace, Foraging Map, Events, Training, Profile

### Marketplace Cards
- Image at top (16:9 aspect ratio), 2-3 images in carousel
- Title (text-lg, font-semibold)
- Location with pin icon (text-sm)
- Price/Trade badge (prominent, colored)
- Category tag (small pill)
- Seller mini-profile (avatar + name)
- Rating stars (if available)
- Hover: subtle lift (shadow-lg)

### Foraging Map Interface
- Full-width map container with overlay controls
- Side panel (desktop) or bottom sheet (mobile) for spot details
- Custom map pins with plant icons
- Spot detail card: large image, species name, edible parts, seasonality, benefits, access notes
- Filter toolbar: plant type, season, region dropdowns

### Member Profile Cards
- Circular avatar (large)
- Name, location, member since
- Interest tags (pills, max 4 visible)
- Skills badges
- "Message" button (primary action)
- 2-column grid (desktop), single column (mobile)

### Vendor Directory Cards
- Vendor logo (square, contained)
- Name, category badge, verified checkmark
- Short description (2 lines, truncate)
- Rating + review count
- Current deals indicator (if applicable)
- "View Details" link

### Event Cards
- Date badge (large, positioned top-left corner)
- Event image (background)
- Title overlay with gradient backdrop for readability
- Location, time, host info
- Category tag
- Registration status/capacity indicator

### Training Module Cards
- Icon representing category (large, centered)
- Title, difficulty level badge
- Content type indicators (video, text, interactive)
- Progress bar (if user has started)
- Estimated duration

### Chat Interface
- Conversation list: avatar, name, last message preview, timestamp, unread indicator
- Chat window: message bubbles (sent right, received left), timestamp groups
- Input bar: text field, emoji picker, image upload
- Profile preview sidebar (desktop)

### Reviews & Ratings
- Star rating (large, gold-toned)
- Reviewer avatar + name + date
- Comment text (expandable if long)
- Helpful votes counter
- Photos (if included)

### Dashboard Widgets
- Credit balance: large number display, referral code with copy button
- Upcoming events: compact list (3-5 items)
- Nearby listings: horizontal scroll card row
- New foraging spots: map thumbnail with count

### Forms
- Generous padding (p-6)
- Labels above inputs (text-sm, font-medium)
- Input fields: border, rounded-lg, focus ring
- Helper text below (text-xs)
- Primary action button (large, prominent)
- Multi-step forms: progress indicator at top

### Filters & Search
- Persistent filter bar (sticky below header)
- Region/category dropdowns, search input
- Active filters shown as dismissible pills
- Filter count badge on filter button
- Results count displayed

---

## Images

**Hero Section (Homepage):**
Large hero image showing diverse farmers/gardeners in a lush garden setting, working together. Image should convey community, sustainability, and abundance. Overlay with semi-transparent gradient (bottom to top) for text readability.

**Foraging Map:**
Use actual map tiles (Mapbox/Google Maps). Custom markers with plant/fruit icons.

**Marketplace Listings:**
User-uploaded product photos. Require minimum 800x600px. Display in 16:9 cards.

**Member Profiles:**
Circular avatars (200x200px minimum). Cover photo optional (1200x400px).

**Vendor Logos:**
Square format (300x300px), displayed in circular or rounded square containers.

**Training Modules:**
Category icons (educational, solar, seed, market themed). Video thumbnails where applicable.

**Garden Clubs/Seed Banks:**
Location photos, group photos. Use placeholder images for map pins.

---

## Interactions

**Micro-interactions:**
- Card hover: translate-y-1, shadow elevation increase
- Button press: scale-95 on active
- Filter selection: smooth color transition
- Map pin click: bounce animation
- Star rating: sequential fill on hover
- Tab switching: slide transition

**Page Transitions:**
- Minimal, fast (200ms)
- Fade between major views
- Slide-up for modals/sheets

**Loading States:**
- Skeleton screens for cards/lists
- Spinner for map loading
- Progress bars for uploads

---

## Special Considerations

- **Accessibility:** WCAG AA compliance, keyboard navigation for all interactive elements, ARIA labels for map pins
- **Performance:** Lazy load images, virtualize long lists, optimize map rendering
- **Offline Capability:** Indicate when features require connection (maps, chat)
- **Trust Indicators:** Verified badges, rating displays, member-since dates prominently shown