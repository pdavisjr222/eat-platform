import { db } from "./db";
import {
  users,
  listings,
  vendors,
  foragingSpots,
  gardenClubs,
  seedBanks,
  resourceHubs,
  events,
  trainingModules,
  jobPosts,
} from "@shared/schema";
import { hashPassword } from "./auth";
import { nanoid } from "nanoid";

export async function seedDatabase() {
  console.log("Starting database seeding...");

  // Seed users
  const passwordHash = await hashPassword("password123");
  
  const [user1] = await db.insert(users).values({
    name: "Sarah Green",
    email: "sarah@example.com",
    passwordHash,
    country: "Jamaica",
    region: "Caribbean",
    city: "Kingston",
    geographicRegion: "Caribbean",
    bio: "Passionate about organic farming and sustainable living. Growing my own food for 10+ years.",
    interests: ["Gardening", "Permaculture", "Composting", "Seed saving"],
    skills: ["Organic farming", "Seed propagation", "Composting"],
    offerings: ["Organic vegetables", "Seeds", "Gardening workshops"],
    referralCode: nanoid(10).toUpperCase(),
  }).returning();

  const [user2] = await db.insert(users).values({
    name: "Marcus Thompson",
    email: "marcus@example.com",
    passwordHash,
    country: "Ghana",
    region: "West Africa",
    city: "Accra",
    geographicRegion: "Africa",
    bio: "Solar energy enthusiast and eco-builder. Helping communities transition to clean energy.",
    interests: ["Clean Energy", "Solar Power", "Eco-construction"],
    skills: ["Solar installation", "Green building", "Energy consulting"],
    offerings: ["Solar panels", "Installation services"],
    referralCode: nanoid(10).toUpperCase(),
  }).returning();

  const [user3] = await db.insert(users).values({
    name: "Maya Rodriguez",
    email: "maya@example.com",
    passwordHash,
    country: "Trinidad and Tobago",
    region: "Caribbean",
    city: "Port of Spain",
    geographicRegion: "Caribbean",
    bio: "Herbalist and natural healer. Sharing traditional plant knowledge with the community.",
    interests: ["Herbalism", "Foraging", "Traditional medicine"],
    skills: ["Plant identification", "Herbal remedies", "Wildcrafting"],
    offerings: ["Herbal teas", "Natural remedies", "Workshops"],
    referralCode: nanoid(10).toUpperCase(),
  }).returning();

  console.log("✓ Created 3 users");

  // Seed listings
  await db.insert(listings).values([
    {
      ownerUserId: user1.id,
      type: "sell",
      category: "food",
      title: "Fresh Organic Tomatoes - 5 lbs",
      description: "Locally grown organic tomatoes, pesticide-free. Perfect for salads, sauces, and cooking.",
      price: 12.99,
      locationText: "Kingston, Jamaica",
      availabilityStatus: "active",
    },
    {
      ownerUserId: user1.id,
      type: "trade",
      category: "seeds",
      title: "Heirloom Vegetable Seeds Collection",
      description: "Collection of heirloom seeds including peppers, squash, and beans. Looking to trade for fruit tree seedlings.",
      locationText: "Kingston, Jamaica",
      availabilityStatus: "active",
    },
    {
      ownerUserId: user2.id,
      type: "sell",
      category: "service",
      title: "Solar Panel Installation Service",
      description: "Professional solar panel installation for homes and small businesses. Consultation included.",
      price: 2500.00,
      locationText: "Accra, Ghana",
      availabilityStatus: "active",
    },
    {
      ownerUserId: user3.id,
      type: "sell",
      category: "handmade",
      title: "Herbal Tea Blend - Relaxation",
      description: "Hand-blended herbal tea with chamomile, lavender, and lemon balm. Promotes relaxation and better sleep.",
      price: 8.50,
      locationText: "Port of Spain, Trinidad and Tobago",
      availabilityStatus: "active",
    },
  ]);

  console.log("✓ Created 4 marketplace listings");

  // Seed vendors
  await db.insert(vendors).values([
    {
      name: "EcoRoots Farm Supply",
      description: "Sustainable farming supplies and organic seeds. Supporting small farmers since 2015.",
      type: "ecoFriendly",
      verified: true,
      website: "https://ecoroots.example.com",
    },
    {
      name: "Caribbean Solar Solutions",
      description: "Leading provider of solar energy solutions across the Caribbean region.",
      type: "serviceProvider",
      verified: true,
      website: "https://caribbeansolar.example.com",
    },
    {
      name: "Island Herbal Remedies",
      description: "Traditional herbal products made from indigenous Caribbean plants.",
      type: "indigenous",
      verified: false,
      contactInfo: "WhatsApp: +1-868-555-0123",
    },
  ]);

  console.log("✓ Created 3 vendors");

  // Seed foraging spots
  await db.insert(foragingSpots).values([
    {
      createdByUserId: user3.id,
      latitude: 10.6549,
      longitude: -61.5019,
      title: "Mango Tree - Public Park",
      plantType: "fruit",
      species: "Mangifera indica",
      description: "Large mango tree in the corner of Central Park. Produces sweet Julie mangoes in season.",
      edibleParts: "Fruit",
      seasonality: "March - July",
      benefits: "Rich in vitamins A and C, high in fiber",
      accessNotes: "Public park, accessible during daylight hours",
    },
    {
      createdByUserId: user1.id,
      latitude: 18.0179,
      longitude: -76.8099,
      title: "Wild Callaloo Patch",
      plantType: "edible-green",
      species: "Amaranthus viridis",
      description: "Wild callaloo growing along the roadside near the community garden.",
      edibleParts: "Leaves and stems",
      seasonality: "Year-round",
      benefits: "High in iron, calcium, and vitamins A and C",
      accessNotes: "Roadside, publicly accessible",
    },
    {
      createdByUserId: user3.id,
      latitude: 10.6918,
      longitude: -61.2225,
      title: "Breadfruit Trees - Coastal Area",
      plantType: "fruit",
      species: "Artocarpus altilis",
      description: "Several breadfruit trees along the coastal walking path.",
      edibleParts: "Fruit",
      seasonality: "June - November",
      benefits: "Good source of complex carbohydrates and fiber",
      accessNotes: "Public walking path, free access",
    },
  ]);

  console.log("✓ Created 3 foraging spots");

  // Seed garden clubs
  await db.insert(gardenClubs).values([
    {
      name: "Kingston Community Gardeners",
      description: "A vibrant community of gardeners sharing knowledge, seeds, and produce in Kingston.",
      city: "Kingston",
      country: "Jamaica",
      region: "Caribbean",
      latitude: 18.0179,
      longitude: -76.8099,
      meetingSchedule: "Every Saturday at 9 AM",
      website: "https://kingstongardeners.example.com",
    },
    {
      name: "Accra Urban Farmers",
      description: "Urban farming collective promoting food security and sustainable agriculture in Accra.",
      city: "Accra",
      country: "Ghana",
      region: "West Africa",
      latitude: 5.6037,
      longitude: -0.1870,
      meetingSchedule: "First Sunday of each month",
      contactInfo: "Email: info@accrafarmers.gh",
    },
  ]);

  console.log("✓ Created 2 garden clubs");

  // Seed events
  await db.insert(events).values([
    {
      title: "Permaculture Design Workshop",
      description: "Learn the principles of permaculture design and how to apply them to your garden or farm. Hands-on activities included.",
      hostUserId: user1.id,
      type: "workshop",
      startDateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endDateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
      timeZone: "America/Jamaica",
      locationOnline: false,
      locationAddress: "Community Center, Kingston, Jamaica",
      latitude: 18.0179,
      longitude: -76.8099,
      capacity: 25,
    },
    {
      title: "Farmers Market - Weekly",
      description: "Weekly farmers market featuring local organic produce, handmade goods, and artisan products.",
      type: "farmersMarket",
      startDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      endDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000),
      timeZone: "Africa/Accra",
      locationOnline: false,
      locationAddress: "Central Square, Accra, Ghana",
      latitude: 5.6037,
      longitude: -0.1870,
    },
    {
      title: "Solar Energy Basics - Online Webinar",
      description: "Introduction to solar energy systems for homes. Learn about costs, installation, and maintenance.",
      hostUserId: user2.id,
      type: "onlineWebinar",
      startDateTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      endDateTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      timeZone: "UTC",
      locationOnline: true,
      capacity: 100,
    },
  ]);

  console.log("✓ Created 3 events");

  // Seed training modules
  await db.insert(trainingModules).values([
    {
      title: "Starting a Seed Bank: A Complete Guide",
      category: "seedBank",
      difficultyLevel: "beginner",
      content: "Learn how to establish and maintain a community seed bank. Covers seed collection, storage, cataloging, and distribution...",
      estimatedDuration: 45,
    },
    {
      title: "Organizing Your First Farmers Market",
      category: "farmersMarket",
      difficultyLevel: "intermediate",
      content: "Step-by-step guide to planning and running a successful farmers market in your community...",
      estimatedDuration: 60,
    },
    {
      title: "Solar Power 101: Clean Energy Basics",
      category: "cleanEnergy",
      difficultyLevel: "beginner",
      content: "Introduction to solar energy systems, components, and how they work. Perfect for beginners...",
      videoUrl: "https://example.com/solar-basics",
      estimatedDuration: 30,
    },
    {
      title: "Building Eco-Friendly Homes with Local Materials",
      category: "ecoHomes",
      difficultyLevel: "advanced",
      content: "Advanced techniques for constructing sustainable homes using locally-sourced, natural materials...",
      estimatedDuration: 90,
    },
  ]);

  console.log("✓ Created 4 training modules");

  // Seed job posts
  await db.insert(jobPosts).values([
    {
      postedByUserId: user1.id,
      title: "Farm Assistant Needed",
      description: "Looking for a reliable assistant to help with daily farm operations including planting, harvesting, and general maintenance.",
      jobType: "part-time",
      category: "farmLabor",
      locationText: "Kingston, Jamaica",
      compensationInfo: "$15/hour, flexible schedule",
    },
    {
      postedByUserId: user2.id,
      title: "Solar Panel Installer",
      description: "Experienced solar panel installer needed for growing clean energy company. Training provided.",
      jobType: "full-time",
      category: "cleanEnergy",
      locationText: "Accra, Ghana",
      compensationInfo: "Competitive salary + benefits",
    },
  ]);

  console.log("✓ Created 2 job posts");
  console.log("✅ Database seeding completed successfully!");
}

// Run seed if this file is executed directly
seedDatabase()
  .then(() => {
    console.log("Seeding complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });
