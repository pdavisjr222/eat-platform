import { db } from "./db";
import { hashPassword, generateReferralCode } from "./auth";
import {
  users,
  listings,
  vendors,
  coupons,
  foragingSpots,
  gardenClubs,
  events,
  trainingModules,
  jobPosts,
} from "./schema";

export async function seedDatabase() {
  console.log("Starting database seed...");

  // ============================================
  // USERS
  // ============================================
  console.log("Creating users...");
  const seedPassword = process.env.SEED_PASSWORD || "Password123!";
  const passwordHash = await hashPassword(seedPassword);

  const seedUsers = [
    // Jamaica
    {
      name: "Marcus Johnson",
      email: "marcus@projecteat.org",
      passwordHash,
      country: "Jamaica",
      region: "Kingston",
      city: "Kingston",
      geographicRegion: "Caribbean",
      bio: "Organic farmer specializing in tropical fruits and vegetables. Passionate about sustainable agriculture and community food security.",
      interests: ["organic farming", "permaculture", "tropical fruits"],
      skills: ["crop rotation", "composting", "irrigation"],
      offerings: ["farm tours", "seedling sales", "agricultural consulting"],
      referralCode: generateReferralCode(),
      role: "admin",
      emailVerified: true,
      creditBalance: 500,
    },
    {
      name: "Ava Campbell",
      email: "ava.campbell@email.com",
      passwordHash,
      country: "Jamaica",
      region: "St. Ann",
      city: "Ocho Rios",
      geographicRegion: "Caribbean",
      bio: "Herbalist and forager with 15 years of experience in traditional Caribbean plant medicine.",
      interests: ["herbal medicine", "foraging", "traditional remedies"],
      skills: ["plant identification", "herbal preparation", "wildcrafting"],
      offerings: ["herb walks", "medicinal tea blends", "workshops"],
      referralCode: generateReferralCode(),
      role: "moderator",
      emailVerified: true,
      creditBalance: 250,
    },
    // Trinidad
    {
      name: "Keisha Mohammed",
      email: "keisha.m@email.com",
      passwordHash,
      country: "Trinidad and Tobago",
      region: "Port of Spain",
      city: "Port of Spain",
      geographicRegion: "Caribbean",
      bio: "Urban gardener and community organizer focused on food sovereignty in Trinidad.",
      interests: ["urban gardening", "community organizing", "food justice"],
      skills: ["container gardening", "seed saving", "community building"],
      offerings: ["garden setup", "composting workshops", "seed swaps"],
      referralCode: generateReferralCode(),
      role: "user",
      emailVerified: true,
      creditBalance: 100,
    },
    {
      name: "Devon Baptiste",
      email: "devon.baptiste@email.com",
      passwordHash,
      country: "Trinidad and Tobago",
      region: "San Fernando",
      city: "San Fernando",
      geographicRegion: "Caribbean",
      bio: "Beekeeper and honey producer committed to preserving native bee species.",
      interests: ["beekeeping", "pollinator conservation", "honey production"],
      skills: ["hive management", "honey extraction", "bee breeding"],
      offerings: ["raw honey", "beeswax products", "beekeeping courses"],
      referralCode: generateReferralCode(),
      role: "user",
      emailVerified: true,
      creditBalance: 75,
    },
    // Florida
    {
      name: "Sofia Martinez",
      email: "sofia.m@email.com",
      passwordHash,
      country: "United States",
      region: "Florida",
      city: "Miami",
      geographicRegion: "North America",
      bio: "Aquaponics specialist running a sustainable fish and vegetable farm in South Florida.",
      interests: ["aquaponics", "sustainable seafood", "urban farming"],
      skills: ["system design", "fish breeding", "water quality management"],
      offerings: ["tilapia", "lettuce", "aquaponics consulting"],
      referralCode: generateReferralCode(),
      role: "user",
      emailVerified: true,
      creditBalance: 150,
    },
    {
      name: "James Wilson",
      email: "james.wilson@email.com",
      passwordHash,
      country: "United States",
      region: "Florida",
      city: "Orlando",
      geographicRegion: "North America",
      bio: "Permaculture designer creating edible landscapes throughout Central Florida.",
      interests: ["permaculture", "food forests", "native plants"],
      skills: ["landscape design", "swales", "guild planting"],
      offerings: ["design consultations", "fruit trees", "workshops"],
      referralCode: generateReferralCode(),
      role: "user",
      emailVerified: true,
      creditBalance: 200,
    },
    // Brazil
    {
      name: "Ana Paula Silva",
      email: "ana.silva@email.com",
      passwordHash,
      country: "Brazil",
      region: "Bahia",
      city: "Salvador",
      geographicRegion: "South America",
      bio: "Agroforestry practitioner working to restore degraded lands with native species.",
      interests: ["agroforestry", "land restoration", "native species"],
      skills: ["tree planting", "soil restoration", "carbon sequestration"],
      offerings: ["cacao", "acai", "restoration consulting"],
      referralCode: generateReferralCode(),
      role: "user",
      emailVerified: true,
      creditBalance: 125,
    },
    {
      name: "Carlos Eduardo Santos",
      email: "carlos.santos@email.com",
      passwordHash,
      country: "Brazil",
      region: "Sao Paulo",
      city: "Sao Paulo",
      geographicRegion: "South America",
      bio: "Organic market farmer supplying restaurants and farmers markets in Sao Paulo.",
      interests: ["organic vegetables", "farmers markets", "chef partnerships"],
      skills: ["succession planting", "pest management", "marketing"],
      offerings: ["salad greens", "microgreens", "heirloom tomatoes"],
      referralCode: generateReferralCode(),
      role: "user",
      emailVerified: true,
      creditBalance: 175,
    },
    // Mexico
    {
      name: "Maria Guadalupe Hernandez",
      email: "maria.hernandez@email.com",
      passwordHash,
      country: "Mexico",
      region: "Oaxaca",
      city: "Oaxaca City",
      geographicRegion: "North America",
      bio: "Traditional seed keeper preserving heirloom corn varieties from Oaxaca.",
      interests: ["seed saving", "heirloom corn", "traditional agriculture"],
      skills: ["seed selection", "corn cultivation", "traditional processing"],
      offerings: ["heirloom seeds", "masa workshops", "farm visits"],
      referralCode: generateReferralCode(),
      role: "user",
      emailVerified: true,
      creditBalance: 100,
    },
    {
      name: "Roberto Garcia Luna",
      email: "roberto.luna@email.com",
      passwordHash,
      country: "Mexico",
      region: "Yucatan",
      city: "Merida",
      geographicRegion: "North America",
      bio: "Meliponiculture specialist raising native stingless bees for honey and pollination.",
      interests: ["stingless bees", "mayan beekeeping", "pollination"],
      skills: ["meliponiculture", "hive construction", "honey harvesting"],
      offerings: ["melipona honey", "bee colonies", "workshops"],
      referralCode: generateReferralCode(),
      role: "user",
      emailVerified: true,
      creditBalance: 80,
    },
  ];

  const insertedUsers = await db.insert(users).values(seedUsers).returning();
  console.log(`Created ${insertedUsers.length} users`);

  // ============================================
  // LISTINGS
  // ============================================
  console.log("Creating marketplace listings...");

  const seedListings = [
    {
      ownerUserId: insertedUsers[0].id,
      type: "sell",
      category: "food",
      title: "Organic Scotch Bonnet Peppers",
      description: "Fresh, organic scotch bonnet peppers grown without pesticides. Perfect for authentic Caribbean cooking. Available in 1lb bags.",
      price: 8.99,
      currency: "USD",
      locationText: "Kingston, Jamaica",
      latitude: 18.0179,
      longitude: -76.8099,
      images: [],
    },
    {
      ownerUserId: insertedUsers[0].id,
      type: "sell",
      category: "seeds",
      title: "Jamaican Yellow Yam Cuttings",
      description: "Healthy yam cuttings ready for planting. These are the authentic Jamaican yellow yams, excellent for roasting or boiling.",
      price: 15.00,
      currency: "USD",
      locationText: "Kingston, Jamaica",
      latitude: 18.0179,
      longitude: -76.8099,
      images: [],
    },
    {
      ownerUserId: insertedUsers[1].id,
      type: "sell",
      category: "food",
      title: "Wild Cerasee Tea Blend",
      description: "Hand-harvested cerasee (bitter melon vine) dried and blended for traditional Caribbean bush tea. Known for its health benefits.",
      price: 12.00,
      currency: "USD",
      locationText: "Ocho Rios, Jamaica",
      latitude: 18.4074,
      longitude: -77.1012,
      images: [],
    },
    {
      ownerUserId: insertedUsers[2].id,
      type: "sell",
      category: "plants",
      title: "Shadon Beni Starter Plants",
      description: "Culantro/shadon beni seedlings ready for transplanting. Essential herb for Trinidad cuisine. Pack of 6 plants.",
      price: 10.00,
      currency: "USD",
      locationText: "Port of Spain, Trinidad",
      latitude: 10.6596,
      longitude: -61.5086,
      images: [],
    },
    {
      ownerUserId: insertedUsers[3].id,
      type: "sell",
      category: "food",
      title: "Raw Trinidad Wildflower Honey",
      description: "Pure, unprocessed honey from our apiaries in San Fernando. Rich floral notes from moringa, immortelle, and citrus blossoms.",
      price: 18.00,
      currency: "USD",
      locationText: "San Fernando, Trinidad",
      latitude: 10.2796,
      longitude: -61.4577,
      images: [],
    },
    {
      ownerUserId: insertedUsers[4].id,
      type: "sell",
      category: "food",
      title: "Fresh Tilapia - Farm Raised",
      description: "Sustainably raised tilapia from our aquaponics system. Fed organic feed, no antibiotics. Available whole or filleted.",
      price: 12.99,
      currency: "USD",
      locationText: "Miami, Florida",
      latitude: 25.7617,
      longitude: -80.1918,
      images: [],
    },
    {
      ownerUserId: insertedUsers[5].id,
      type: "sell",
      category: "plants",
      title: "Tropical Fruit Tree Bundle",
      description: "Collection of 3 fruit trees: mango, avocado, and starfruit. 3-gallon containers, ready to plant. Perfect for Florida yards.",
      price: 89.00,
      currency: "USD",
      locationText: "Orlando, Florida",
      latitude: 28.5383,
      longitude: -81.3792,
      images: [],
    },
    {
      ownerUserId: insertedUsers[6].id,
      type: "sell",
      category: "food",
      title: "Organic Cacao Beans - Bahia",
      description: "Sun-dried organic cacao beans from our agroforestry system. Perfect for chocolate making or nibs. 1kg bags available.",
      price: 25.00,
      currency: "USD",
      locationText: "Salvador, Bahia, Brazil",
      latitude: -12.9714,
      longitude: -38.5014,
      images: [],
    },
    {
      ownerUserId: insertedUsers[8].id,
      type: "sell",
      category: "seeds",
      title: "Heirloom Oaxacan Corn Seeds",
      description: "Traditional Oaxacan corn varieties including Bolita, Zapalote Chico, and Mixteco. Perfect for masa and tortillas.",
      price: 8.00,
      currency: "USD",
      locationText: "Oaxaca City, Mexico",
      latitude: 17.0732,
      longitude: -96.7266,
      images: [],
    },
    {
      ownerUserId: insertedUsers[9].id,
      type: "sell",
      category: "food",
      title: "Melipona Honey - Yucatan",
      description: "Rare Melipona beecheii honey from the Yucatan. This stingless bee honey has medicinal properties and unique flavor.",
      price: 35.00,
      currency: "USD",
      locationText: "Merida, Yucatan, Mexico",
      latitude: 20.9674,
      longitude: -89.5926,
      images: [],
    },
    {
      ownerUserId: insertedUsers[5].id,
      type: "sell",
      category: "service",
      title: "Permaculture Design Consultation",
      description: "Full site assessment and permaculture design for your property. Includes soil analysis, water management plan, and planting guide.",
      price: 250.00,
      currency: "USD",
      locationText: "Orlando, Florida",
      latitude: 28.5383,
      longitude: -81.3792,
      images: [],
    },
    {
      ownerUserId: insertedUsers[2].id,
      type: "trade",
      category: "seeds",
      title: "Seed Swap - Caribbean Varieties",
      description: "Looking to trade Caribbean vegetable seeds. Have: callaloo, pigeon peas, okra. Want: local fruit tree seeds or hot pepper varieties.",
      price: null,
      currency: "USD",
      locationText: "Port of Spain, Trinidad",
      latitude: 10.6596,
      longitude: -61.5086,
      images: [],
    },
  ];

  await db.insert(listings).values(seedListings);
  console.log(`Created ${seedListings.length} listings`);

  // ============================================
  // VENDORS
  // ============================================
  console.log("Creating vendors...");

  const seedVendors = [
    {
      linkedUserId: insertedUsers[0].id,
      name: "Kingston Organic Farm",
      description: "Family-owned organic farm producing tropical fruits, vegetables, and herbs using sustainable methods.",
      type: "ecoFriendly",
      email: "info@kingstonorganicfarm.jm",
      city: "Kingston",
      country: "Jamaica",
      latitude: 18.0179,
      longitude: -76.8099,
      verified: true,
      verifiedAt: new Date(),
      rating: 4.8,
      reviewCount: 24,
    },
    {
      linkedUserId: insertedUsers[3].id,
      name: "Trinidad Bee Haven",
      description: "Sustainable apiary specializing in raw honey production and pollination services.",
      type: "ecoFriendly",
      email: "hello@trinidadbeehaven.com",
      city: "San Fernando",
      country: "Trinidad and Tobago",
      latitude: 10.2796,
      longitude: -61.4577,
      verified: true,
      verifiedAt: new Date(),
      rating: 4.9,
      reviewCount: 31,
    },
    {
      linkedUserId: insertedUsers[4].id,
      name: "Miami Aquaponics Co.",
      description: "Urban aquaponics farm producing fresh fish and vegetables year-round.",
      type: "ecoFriendly",
      email: "contact@miamiaquaponics.com",
      city: "Miami",
      country: "United States",
      latitude: 25.7617,
      longitude: -80.1918,
      verified: true,
      verifiedAt: new Date(),
      rating: 4.7,
      reviewCount: 18,
    },
    {
      linkedUserId: insertedUsers[8].id,
      name: "Semillas de Oaxaca",
      description: "Seed bank and cultural preservation project dedicated to maintaining heirloom Oaxacan corn varieties.",
      type: "indigenous",
      email: "semillas@oaxacacorn.mx",
      city: "Oaxaca City",
      country: "Mexico",
      latitude: 17.0732,
      longitude: -96.7266,
      verified: true,
      verifiedAt: new Date(),
      rating: 5.0,
      reviewCount: 8,
    },
  ];

  const insertedVendors = await db.insert(vendors).values(seedVendors).returning();
  console.log(`Created ${insertedVendors.length} vendors`);

  // ============================================
  // COUPONS
  // ============================================
  console.log("Creating coupons...");

  const seedCoupons = [
    {
      vendorId: insertedVendors[0].id,
      title: "Welcome to E.A.T.!",
      description: "New member discount on first purchase",
      discountType: "percentage",
      discountValue: 15,
      code: "WELCOME15",
      validFrom: new Date(),
      validTo: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      maxUses: 100,
      termsAndConditions: "Valid for new customers only.",
    },
    {
      vendorId: insertedVendors[1].id,
      title: "Honey Lover Special",
      description: "Buy 2 jars, get 1 free",
      discountType: "percentage",
      discountValue: 33,
      code: "HONEY3FOR2",
      validFrom: new Date(),
      validTo: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      maxUses: 50,
      termsAndConditions: "Valid on honey products only.",
    },
  ];

  await db.insert(coupons).values(seedCoupons);
  console.log(`Created ${seedCoupons.length} coupons`);

  // ============================================
  // FORAGING SPOTS
  // ============================================
  console.log("Creating foraging spots...");

  const seedForagingSpots = [
    {
      createdByUserId: insertedUsers[1].id,
      latitude: 18.4042,
      longitude: -77.1138,
      title: "Cerasee Grove - Dunn's River Area",
      plantType: "Herb",
      species: "Momordica charantia",
      description: "Abundant cerasee vines growing along the roadside. Best harvested in early morning.",
      edibleParts: "Leaves, young vines",
      seasonality: "Year-round, best after rain",
      benefits: "Traditional remedy for blood sugar regulation",
      accessNotes: "Public roadside, please harvest sustainably",
      country: "Jamaica",
      region: "St. Ann",
      isVerified: true,
      verifiedBy: insertedUsers[0].id,
    },
    {
      createdByUserId: insertedUsers[5].id,
      latitude: 25.8520,
      longitude: -80.1867,
      title: "Sea Grape Beach - North Miami",
      plantType: "Fruit",
      species: "Coccoloba uvifera",
      description: "Sea grapes growing along the beach dunes. Fruit ripens purple and has a sweet-tart flavor.",
      edibleParts: "Ripe purple fruits",
      seasonality: "August-October",
      benefits: "High in vitamin C, antioxidants",
      accessNotes: "Public beach access, harvest sustainably",
      country: "United States",
      region: "Florida",
      isVerified: true,
      verifiedBy: insertedUsers[0].id,
    },
    {
      createdByUserId: insertedUsers[4].id,
      latitude: 25.7741,
      longitude: -80.1340,
      title: "Mango Alley - Coconut Grove",
      plantType: "Fruit",
      species: "Mangifera indica",
      description: "Street lined with mature mango trees. Multiple varieties including Julie, Haden, and Valencia Pride.",
      edibleParts: "Ripe fruit",
      seasonality: "May-August",
      benefits: "Vitamin A, C, fiber",
      accessNotes: "Public trees, fruit often falls to sidewalk",
      country: "United States",
      region: "Florida",
      isVerified: true,
      verifiedBy: insertedUsers[0].id,
    },
    {
      createdByUserId: insertedUsers[8].id,
      latitude: 17.0597,
      longitude: -96.7219,
      title: "Pitaya Cactus - Monte Alban Road",
      plantType: "Fruit",
      species: "Stenocereus pruinosus",
      description: "Pitaya cactus growing on hillsides along the road to Monte Alban.",
      edibleParts: "Ripe fruit",
      seasonality: "May-June",
      benefits: "High in antioxidants, vitamin C",
      accessNotes: "Roadside access, careful of thorns",
      country: "Mexico",
      region: "Oaxaca",
      isVerified: true,
      verifiedBy: insertedUsers[0].id,
    },
  ];

  await db.insert(foragingSpots).values(seedForagingSpots);
  console.log(`Created ${seedForagingSpots.length} foraging spots`);

  // ============================================
  // GARDEN CLUBS
  // ============================================
  console.log("Creating garden clubs...");

  const seedGardenClubs = [
    {
      name: "Kingston Urban Growers",
      description: "Community of urban gardeners in Kingston transforming vacant lots into productive gardens.",
      city: "Kingston",
      country: "Jamaica",
      latitude: 18.0179,
      longitude: -76.8099,
      meetingSchedule: "First Saturday of each month, 9am",
      memberCount: 45,
    },
    {
      name: "Trinidad Permaculture Guild",
      description: "Network of permaculture practitioners sharing knowledge and resources across Trinidad and Tobago.",
      city: "Port of Spain",
      country: "Trinidad and Tobago",
      latitude: 10.6596,
      longitude: -61.5086,
      meetingSchedule: "Monthly meetups at rotating farms",
      memberCount: 78,
    },
    {
      name: "Miami Food Forest Collective",
      description: "Dedicated to creating edible food forests in public spaces throughout Miami-Dade County.",
      city: "Miami",
      country: "United States",
      latitude: 25.7617,
      longitude: -80.1918,
      meetingSchedule: "Third Sunday monthly, 10am",
      memberCount: 120,
    },
    {
      name: "Oaxaca Seed Savers",
      description: "Preserving traditional seed varieties and agricultural knowledge of Oaxaca's indigenous communities.",
      city: "Oaxaca City",
      country: "Mexico",
      latitude: 17.0732,
      longitude: -96.7266,
      meetingSchedule: "Seed swaps during full moon",
      memberCount: 65,
    },
  ];

  await db.insert(gardenClubs).values(seedGardenClubs);
  console.log(`Created ${seedGardenClubs.length} garden clubs`);

  // ============================================
  // EVENTS
  // ============================================
  console.log("Creating events...");

  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const seedEvents = [
    {
      title: "Introduction to Tropical Permaculture",
      description: "Learn the basics of permaculture design for tropical climates. This hands-on workshop covers water harvesting, food forests, and sustainable gardening techniques.",
      hostUserId: insertedUsers[0].id,
      type: "workshop",
      startDateTime: new Date(nextWeek.setHours(9, 0, 0, 0)),
      endDateTime: new Date(nextWeek.setHours(16, 0, 0, 0)),
      timeZone: "America/Jamaica",
      locationOnline: false,
      locationAddress: "Kingston Organic Farm, 14 Hope Road, Kingston",
      latitude: 18.0179,
      longitude: -76.8099,
      capacity: 20,
      price: 75,
      currency: "USD",
      status: "upcoming",
    },
    {
      title: "Caribbean Seed Swap",
      description: "Annual seed exchange bringing together gardeners from across the Caribbean. Bring your saved seeds to trade!",
      hostUserId: insertedUsers[2].id,
      type: "meetup",
      startDateTime: new Date(nextMonth.setHours(10, 0, 0, 0)),
      endDateTime: new Date(nextMonth.setHours(14, 0, 0, 0)),
      timeZone: "America/Port_of_Spain",
      locationOnline: false,
      locationAddress: "Queen's Park Savannah, Port of Spain",
      latitude: 10.6688,
      longitude: -61.5158,
      capacity: 100,
      price: 0,
      currency: "USD",
      status: "upcoming",
    },
    {
      title: "Beekeeping for Beginners",
      description: "Virtual workshop on starting your own backyard apiary. Learn about bee biology, hive management, and honey harvesting.",
      hostUserId: insertedUsers[3].id,
      type: "webinar",
      startDateTime: new Date(nextWeek.getTime() + 3 * 24 * 60 * 60 * 1000),
      endDateTime: new Date(nextWeek.getTime() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      timeZone: "America/Port_of_Spain",
      locationOnline: true,
      capacity: 50,
      price: 25,
      currency: "USD",
      status: "upcoming",
    },
    {
      title: "Aquaponics System Tour",
      description: "Visit our urban aquaponics farm in Miami. See how we raise tilapia and vegetables in a closed-loop system.",
      hostUserId: insertedUsers[4].id,
      type: "tour",
      startDateTime: new Date(nextMonth.getTime() + 10 * 24 * 60 * 60 * 1000),
      endDateTime: new Date(nextMonth.getTime() + 10 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      timeZone: "America/New_York",
      locationOnline: false,
      locationAddress: "2350 SW 32nd Ave, Miami, FL",
      latitude: 25.7617,
      longitude: -80.1918,
      capacity: 15,
      price: 20,
      currency: "USD",
      status: "upcoming",
    },
  ];

  await db.insert(events).values(seedEvents);
  console.log(`Created ${seedEvents.length} events`);

  // ============================================
  // TRAINING MODULES
  // ============================================
  console.log("Creating training modules...");

  const seedTrainingModules = [
    {
      title: "Introduction to Organic Gardening",
      category: "gardening",
      difficultyLevel: "beginner",
      description: "Learn the fundamentals of organic gardening, from soil preparation to pest management without chemicals.",
      content: `# Introduction to Organic Gardening

## What is Organic Gardening?
Organic gardening is a method of growing plants without synthetic fertilizers, pesticides, or genetically modified organisms.

## Key Principles
1. **Build Healthy Soil** - Add compost, use mulch, avoid compaction
2. **Choose the Right Plants** - Select varieties suited to your climate
3. **Natural Pest Management** - Attract beneficial insects, use physical barriers
4. **Water Wisely** - Water deeply but less frequently

## Getting Started
- Start small with a 4x4 foot bed
- Test your soil
- Add 2-3 inches of compost
- Choose 3-5 easy crops`,
      estimatedDuration: 45,
      isPremium: false,
      order: 1,
    },
    {
      title: "Composting Fundamentals",
      category: "sustainability",
      difficultyLevel: "beginner",
      description: "Master the art of composting to create rich soil amendments from kitchen and garden waste.",
      content: `# Composting Fundamentals

## Why Compost?
Transforms organic waste into valuable soil amendment while reducing landfill waste.

## Carbon-Nitrogen Balance
- **Browns (Carbon):** Dry leaves, cardboard, straw
- **Greens (Nitrogen):** Food scraps, grass clippings, coffee grounds
- **Ideal ratio:** 3 parts brown to 1 part green

## Building Your Pile
1. Start with browns (6 inches)
2. Add greens (2-3 inches)
3. Repeat layers
4. Keep moist like a wrung-out sponge
5. Turn every 1-2 weeks`,
      estimatedDuration: 30,
      isPremium: false,
      order: 2,
    },
    {
      title: "Tropical Food Forest Design",
      category: "gardening",
      difficultyLevel: "intermediate",
      description: "Design a productive food forest for tropical and subtropical climates using permaculture principles.",
      content: `# Tropical Food Forest Design

## The Seven Layers
1. **Canopy:** Coconut, breadfruit, mango
2. **Understory:** Citrus, papaya, moringa
3. **Shrub:** Coffee, cacao, banana
4. **Herbaceous:** Pigeon pea, cassava, ginger
5. **Groundcover:** Sweet potato, peanut, mint
6. **Vine:** Passionfruit, chayote, yam
7. **Root:** Taro, yuca, arrowroot

## Design Process
1. Observe your site for one full year
2. Map water flow and existing vegetation
3. Start with canopy trees first
4. Fill in layers progressively`,
      estimatedDuration: 60,
      isPremium: true,
      order: 3,
    },
    {
      title: "Seed Saving Basics",
      category: "gardening",
      difficultyLevel: "beginner",
      description: "Learn to save seeds from your garden to preserve varieties, save money, and build resilience.",
      content: `# Seed Saving Basics

## Why Save Seeds?
- Preserve adapted varieties
- Save money
- Food sovereignty

## Self-Pollinating Crops (Easiest)
- Tomatoes, peppers, beans, lettuce, peas

## Basic Steps
1. Select best plants for seed
2. Allow full maturity on the plant
3. Harvest when seeds are dry
4. Clean seeds appropriately
5. Dry thoroughly
6. Store in cool, dry, dark location`,
      estimatedDuration: 40,
      isPremium: false,
      order: 4,
    },
    {
      title: "Introduction to Beekeeping",
      category: "gardening",
      difficultyLevel: "intermediate",
      description: "Start your journey as a beekeeper with this comprehensive introduction to hive management.",
      content: `# Introduction to Beekeeping

## Why Keep Bees?
- Pollination for gardens
- Honey and wax production
- Support declining bee populations

## The Colony
- **Queen:** One per hive, lays all eggs
- **Workers:** All tasks including foraging
- **Drones:** Mating only

## Getting Started
1. Take a local beekeeping class
2. Find a mentor
3. Join local bee club
4. Start with 2 hives`,
      estimatedDuration: 50,
      isPremium: true,
      order: 5,
    },
    {
      title: "Foraging Safety and Ethics",
      category: "foraging",
      difficultyLevel: "beginner",
      description: "Essential knowledge for safe and sustainable wild food harvesting.",
      content: `# Foraging Safety and Ethics

## The Golden Rules
1. Never eat anything you cannot 100% identify
2. Start with a few species and master them
3. Always leave enough for wildlife
4. Know and follow local laws

## Sustainable Harvesting
- Never take more than 1/3 of a plant population
- Leave no trace
- Consider wildlife

## Building Skills
1. Start with easily identified species
2. Learn one new plant per season
3. Keep a foraging journal`,
      estimatedDuration: 35,
      isPremium: false,
      order: 6,
    },
  ];

  await db.insert(trainingModules).values(seedTrainingModules);
  console.log(`Created ${seedTrainingModules.length} training modules`);

  // ============================================
  // JOB POSTS
  // ============================================
  console.log("Creating job posts...");

  const seedJobPosts = [
    {
      postedByUserId: insertedUsers[0].id,
      vendorId: insertedVendors[0].id,
      title: "Farm Assistant - Organic Vegetable Production",
      description: "Kingston Organic Farm is seeking a motivated farm assistant to help with daily operations including planting, harvesting, and maintaining our organic vegetable gardens.",
      jobType: "fullTime",
      category: "farming",
      locationText: "Kingston, Jamaica",
      latitude: 18.0179,
      longitude: -76.8099,
      isRemote: false,
      compensationInfo: "Competitive salary based on experience",
      salaryMin: 600,
      salaryMax: 900,
      salaryCurrency: "USD",
      requirements: ["Physical fitness", "Willingness to work outdoors", "Basic plant knowledge helpful"],
      benefits: ["Free produce", "Training provided", "Growth opportunities"],
      applicationEmail: "jobs@kingstonorganicfarm.jm",
      status: "active",
    },
    {
      postedByUserId: insertedUsers[4].id,
      vendorId: insertedVendors[2].id,
      title: "Aquaponics Technician",
      description: "Miami Aquaponics Co. is looking for a technician to monitor and maintain our aquaponics systems.",
      jobType: "fullTime",
      category: "farming",
      locationText: "Miami, Florida",
      latitude: 25.7617,
      longitude: -80.1918,
      isRemote: false,
      compensationInfo: "Hourly rate + benefits",
      salaryMin: 18,
      salaryMax: 24,
      salaryCurrency: "USD",
      requirements: ["Knowledge of aquaponics or hydroponics", "Basic mechanical skills", "Attention to detail"],
      benefits: ["Health insurance", "401k", "Fresh fish and produce"],
      applicationEmail: "careers@miamiaquaponics.com",
      status: "active",
    },
    {
      postedByUserId: insertedUsers[5].id,
      title: "Part-time Garden Educator",
      description: "Seeking an enthusiastic garden educator to lead workshops and school programs about sustainable gardening.",
      jobType: "partTime",
      category: "education",
      locationText: "Orlando, Florida",
      latitude: 28.5383,
      longitude: -81.3792,
      isRemote: false,
      compensationInfo: "$20-30/hour depending on experience",
      salaryMin: 20,
      salaryMax: 30,
      salaryCurrency: "USD",
      requirements: ["Teaching experience", "Gardening knowledge", "Great communication skills"],
      benefits: ["Flexible schedule", "Make a difference", "Free workshops"],
      applicationEmail: "education@orlandofoodforest.org",
      status: "active",
    },
  ];

  await db.insert(jobPosts).values(seedJobPosts);
  console.log(`Created ${seedJobPosts.length} job posts`);

  console.log("\n=== Database seeding complete! ===");
  console.log("\nTest accounts created:");
  console.log("Admin: marcus@projecteat.org / Password123!");
  console.log("Moderator: ava.campbell@email.com / Password123!");
  console.log("Users: (all with password: Password123!)");
  seedUsers.slice(2).forEach((u) => console.log(`  - ${u.email}`));
}

// Run if called directly (ES module compatible)
seedDatabase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  });
