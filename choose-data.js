/* choose-data.js — mock listings for TrustNest StayScore */

const CH_LISTINGS = [
  {
    id: "ch01",
    title: "Sunshine PG for Girls",
    type: "PG",
    area: "Rajpura",
    address: "Near Bus Stand, Rajpura, Punjab 140401",
    distance: "8 min walk to Chitkara",
    gender: "Girls",
    rent: 6500,
    deposit: 13000,
    meals: true,
    photos: [
      "assets/choose/ch01-a.jpg",
      "assets/choose/ch01-b.jpg",
      "assets/choose/ch01-c.jpg"
    ],
    verifiedOwner: true,
    scores: { water: 8, wifi: 7, noise: 8, maintenance: 8, cleanliness: 9, transport: 9 },
    measuredWifiMbps: 28,
    advertised: [
      { ad: "24×7 hot water", reality: "Hot water 6–9 am and 7–9 pm only" },
      { ad: "50 Mbps Wi-Fi", reality: "Measured 28 Mbps on average" },
      { ad: "Home-cooked meals, 3 times daily", reality: "Matches — good food, minor delays on weekends" }
    ],
    reviews: [
      { name: "Priya Sharma", course: "B.Tech CSE", monthsStayed: 14, rating: 9, text: "Really clean place, warden is strict but fair. Food is decent. Would recommend to first-year girls.", verifiedResident: true },
      { name: "Ananya Singh", course: "MBA", monthsStayed: 6, rating: 8, text: "Good location, close to Chitkara. Wi-Fi could be faster but works for classes.", verifiedResident: true }
    ],
    ownerName: "Sunita Devi"
  },
  {
    id: "ch02",
    title: "Green View Boys PG",
    type: "PG",
    area: "Banur",
    address: "Opp. Petrol Pump, Banur, Punjab 140601",
    distance: "12 min walk to Chitkara",
    gender: "Boys",
    rent: 5500,
    deposit: 11000,
    meals: true,
    photos: [
      "assets/choose/ch02-a.jpg",
      "assets/choose/ch02-b.jpg"
    ],
    verifiedOwner: false,
    scores: { water: 5, wifi: 4, noise: 5, maintenance: 4, cleanliness: 5, transport: 7 },
    measuredWifiMbps: 6,
    advertised: [
      { ad: "100 Mbps high-speed Wi-Fi", reality: "Measured only 6 Mbps — very slow in evenings" },
      { ad: "24×7 water supply", reality: "No water after 8 pm, 3 nights a week" },
      { ad: "AC rooms available", reality: "AC only in deluxe rooms, ₹1500 extra" }
    ],
    reviews: [
      { name: "Rohit Kumar", course: "B.Tech ECE", monthsStayed: 8, rating: 5, text: "Wi-Fi is a disaster. Maintenance complaints ignored for weeks. Food is okay but nothing special.", verifiedResident: true },
      { name: "Manpreet Singh", course: "BCA", monthsStayed: 3, rating: 5, text: "Cheap but you get what you pay for. Water supply is unreliable.", verifiedResident: false }
    ],
    ownerName: "Gurpreet Arora"
  },
  {
    id: "ch03",
    title: "Maple Residency — Single Room",
    type: "Single room",
    area: "Zirakpur",
    address: "VIP Road, Zirakpur, Punjab 140603",
    distance: "6 min auto to Chitkara",
    gender: "Any",
    rent: 9500,
    deposit: 19000,
    meals: false,
    photos: [
      "assets/choose/ch03-a.jpg",
      "assets/choose/ch03-b.jpg",
      "assets/choose/ch03-c.jpg"
    ],
    verifiedOwner: true,
    scores: { water: 9, wifi: 9, noise: 7, maintenance: 9, cleanliness: 9, transport: 8 },
    measuredWifiMbps: 85,
    advertised: [
      { ad: "100 Mbps Wi-Fi", reality: "Measured 85 Mbps — very reliable" },
      { ad: "24×7 water", reality: "Matches — overhead tank + borewell backup" },
      { ad: "Furnished with study table", reality: "Matches — clean, well-maintained furniture" }
    ],
    reviews: [
      { name: "Aditya Kapoor", course: "B.Tech Mech", monthsStayed: 11, rating: 9, text: "Best place I've stayed at near Chitkara. Owner is very responsive, maintenance is same-day.", verifiedResident: true },
      { name: "Sara Malhotra", course: "B.Pharm", monthsStayed: 7, rating: 9, text: "Very clean, modern flat. A bit expensive but absolutely worth it.", verifiedResident: true }
    ],
    ownerName: "Rajesh Mehta"
  },
  {
    id: "ch04",
    title: "Campus Edge Shared Flat",
    type: "Shared flat",
    area: "Rajpura",
    address: "Chitkara University Road, Rajpura",
    distance: "4 min walk to Chitkara",
    gender: "Boys",
    rent: 4800,
    deposit: 9600,
    meals: false,
    photos: [
      "assets/choose/ch04-a.jpg",
      "assets/choose/ch04-b.jpg"
    ],
    verifiedOwner: true,
    scores: { water: 7, wifi: 8, noise: 6, maintenance: 6, cleanliness: 7, transport: 9 },
    measuredWifiMbps: 42,
    advertised: [
      { ad: "50 Mbps Wi-Fi", reality: "Measured 42 Mbps — decent" },
      { ad: "Quiet neighbourhood", reality: "Can be noisy on weekends — street market nearby" }
    ],
    reviews: [
      { name: "Vikram Nair", course: "B.Tech IT", monthsStayed: 10, rating: 7, text: "Good price for the location. Wi-Fi works well. Sometimes noisy on Sundays.", verifiedResident: true }
    ],
    ownerName: "Harinder Bhatia"
  },
  {
    id: "ch05",
    title: "Serene 1BHK — Mohali",
    type: "1BHK",
    area: "Mohali",
    address: "Phase 7, Mohali, Punjab 160059",
    distance: "18 min bus from Chitkara",
    gender: "Any",
    rent: 12000,
    deposit: 24000,
    meals: false,
    photos: [
      "assets/choose/ch05-a.jpg",
      "assets/choose/ch05-b.jpg",
      "assets/choose/ch05-c.jpg"
    ],
    verifiedOwner: true,
    scores: { water: 9, wifi: 8, noise: 9, maintenance: 8, cleanliness: 9, transport: 6 },
    measuredWifiMbps: 68,
    advertised: [
      { ad: "100 Mbps fibre Wi-Fi", reality: "Measured 68 Mbps — good but not 100" },
      { ad: "Peaceful residential area", reality: "Matches — very quiet" }
    ],
    reviews: [
      { name: "Neha Rao", course: "MBA", monthsStayed: 16, rating: 9, text: "Premium feel. Perfect for studying. Transport to Chitkara takes time but 100% worth it.", verifiedResident: true }
    ],
    ownerName: "Sushil Gupta"
  },
  {
    id: "ch06",
    title: "Budget Boys Den",
    type: "PG",
    area: "Banur",
    address: "Near Railway Station, Banur",
    distance: "15 min walk to Chitkara",
    gender: "Boys",
    rent: 3800,
    deposit: 7600,
    meals: true,
    photos: [
      "assets/choose/ch06-a.jpg"
    ],
    verifiedOwner: false,
    scores: { water: 4, wifi: 3, noise: 4, maintenance: 3, cleanliness: 4, transport: 6 },
    measuredWifiMbps: 2,
    advertised: [
      { ad: "Wi-Fi included", reality: "Wi-Fi barely works — measured 2 Mbps" },
      { ad: "Clean rooms", reality: "Common areas not cleaned regularly" },
      { ad: "Hot meals daily", reality: "Meals often late or skipped on Sundays" }
    ],
    reviews: [
      { name: "Suraj Yadav", course: "B.Tech Civil", monthsStayed: 5, rating: 4, text: "Very cheap but terrible Wi-Fi. Can't attend online classes. Food is inconsistent.", verifiedResident: true },
      { name: "Deepak Mishra", course: "BBA", monthsStayed: 2, rating: 3, text: "Left after 2 months. No maintenance response, water problems constantly.", verifiedResident: false }
    ],
    ownerName: "Balwant Singh"
  },
  {
    id: "ch07",
    title: "Chandigarh Co-Living Studio",
    type: "Single room",
    area: "Chandigarh",
    address: "Sector 22, Chandigarh 160022",
    distance: "35 min bus from Chitkara",
    gender: "Any",
    rent: 11000,
    deposit: 22000,
    meals: false,
    photos: [
      "assets/choose/ch07-a.jpg",
      "assets/choose/ch07-b.jpg"
    ],
    verifiedOwner: true,
    scores: { water: 9, wifi: 9, noise: 8, maintenance: 9, cleanliness: 9, transport: 5 },
    measuredWifiMbps: 92,
    advertised: [
      { ad: "100 Mbps Wi-Fi", reality: "Measured 92 Mbps — excellent" },
      { ad: "Modern furnished room", reality: "Matches — new furniture, good natural light" }
    ],
    reviews: [
      { name: "Kavya Menon", course: "B.Des", monthsStayed: 9, rating: 9, text: "Amazing place, feels like a proper flat. Long commute but the quality is unmatched.", verifiedResident: true }
    ],
    ownerName: "Ravi Chadha"
  },
  {
    id: "ch08",
    title: "Zirakpur Girls Hostel",
    type: "PG",
    area: "Zirakpur",
    address: "Ambala Highway, Zirakpur",
    distance: "10 min auto to Chitkara",
    gender: "Girls",
    rent: 7000,
    deposit: 14000,
    meals: true,
    photos: [
      "assets/choose/ch08-a.jpg",
      "assets/choose/ch08-b.jpg"
    ],
    verifiedOwner: true,
    scores: { water: 8, wifi: 6, noise: 7, maintenance: 7, cleanliness: 8, transport: 8 },
    measuredWifiMbps: 18,
    advertised: [
      { ad: "High-speed Wi-Fi", reality: "Measured 18 Mbps — struggles with video calls" },
      { ad: "Meals 3 times daily", reality: "Matches — good Punjabi food" }
    ],
    reviews: [
      { name: "Simran Kaur", course: "B.Tech CSE", monthsStayed: 12, rating: 8, text: "Safe and clean. Warden is very helpful. Wi-Fi is average but food is genuinely good.", verifiedResident: true },
      { name: "Tanya Verma", course: "B.Com", monthsStayed: 4, rating: 7, text: "Good security, friendly environment. Worth the price.", verifiedResident: true }
    ],
    ownerName: "Pooja Sharma"
  },
  {
    id: "ch09",
    title: "Rajpura 2BHK — Share",
    type: "2BHK",
    area: "Rajpura",
    address: "Model Town, Rajpura, Punjab",
    distance: "6 min walk to Chitkara",
    gender: "Any",
    rent: 6000,
    deposit: 12000,
    meals: false,
    photos: [
      "assets/choose/ch09-a.jpg",
      "assets/choose/ch09-b.jpg"
    ],
    verifiedOwner: false,
    scores: { water: 7, wifi: 7, noise: 6, maintenance: 5, cleanliness: 6, transport: 9 },
    measuredWifiMbps: 35,
    advertised: [
      { ad: "Fully furnished", reality: "Only partially — no fridge, no washing machine" },
      { ad: "50 Mbps Wi-Fi", reality: "Measured 35 Mbps — acceptable" }
    ],
    reviews: [
      { name: "Gaurav Bansal", course: "B.Tech EEE", monthsStayed: 7, rating: 6, text: "Close to college is the best part. Maintenance is slow. Owner rarely responds quickly.", verifiedResident: true }
    ],
    ownerName: "Kuldeep Sharma"
  },
  {
    id: "ch10",
    title: "Tranquil Stay PG — Girls",
    type: "PG",
    area: "Mohali",
    address: "Phase 5, Mohali, Punjab",
    distance: "20 min bus from Chitkara",
    gender: "Girls",
    rent: 8500,
    deposit: 17000,
    meals: true,
    photos: [
      "assets/choose/ch10-a.jpg",
      "assets/choose/ch10-b.jpg",
      "assets/choose/ch10-c.jpg"
    ],
    verifiedOwner: true,
    scores: { water: 9, wifi: 8, noise: 9, maintenance: 9, cleanliness: 9, transport: 6 },
    measuredWifiMbps: 55,
    advertised: [
      { ad: "60 Mbps Wi-Fi", reality: "Measured 55 Mbps — reliable" },
      { ad: "Nutritious home-cooked food", reality: "Matches — excellent food, students love it" }
    ],
    reviews: [
      { name: "Divya Iyer", course: "B.Tech BioTech", monthsStayed: 18, rating: 10, text: "Best PG I've ever seen. Food is amazing, management is extremely helpful. Highly recommend.", verifiedResident: true },
      { name: "Rhea Pillai", course: "MCA", monthsStayed: 8, rating: 9, text: "Very safe, very clean. A bit far from Chitkara but the quality makes up for it.", verifiedResident: true }
    ],
    ownerName: "Meena Khanna"
  },
  {
    id: "ch11",
    title: "Banur Budget Shared Flat",
    type: "Shared flat",
    area: "Banur",
    address: "GT Road, Banur, Punjab",
    distance: "11 min walk to Chitkara",
    gender: "Boys",
    rent: 4200,
    deposit: 8400,
    meals: false,
    photos: [
      "assets/choose/ch11-a.jpg"
    ],
    verifiedOwner: false,
    scores: { water: 6, wifi: 5, noise: 5, maintenance: 5, cleanliness: 5, transport: 7 },
    measuredWifiMbps: 12,
    advertised: [
      { ad: "Wi-Fi included", reality: "Measured 12 Mbps — okay for browsing, bad for streaming" },
      { ad: "Peaceful area", reality: "GT Road noise — can be loud during day" }
    ],
    reviews: [
      { name: "Arun Thakur", course: "B.Tech Mech", monthsStayed: 6, rating: 5, text: "It does the job for the price. Nothing great, nothing terrible. Decent for budget students.", verifiedResident: true }
    ],
    ownerName: "Jarnail Singh"
  },
  {
    id: "ch12",
    title: "Elite Suites — Zirakpur",
    type: "1BHK",
    area: "Zirakpur",
    address: "Patiala Road, Zirakpur, Punjab",
    distance: "8 min auto to Chitkara",
    gender: "Any",
    rent: 14500,
    deposit: 29000,
    meals: false,
    photos: [
      "assets/choose/ch12-a.jpg",
      "assets/choose/ch12-b.jpg",
      "assets/choose/ch12-c.jpg"
    ],
    verifiedOwner: true,
    scores: { water: 10, wifi: 9, noise: 9, maintenance: 10, cleanliness: 10, transport: 7 },
    measuredWifiMbps: 95,
    advertised: [
      { ad: "100 Mbps fibre", reality: "Measured 95 Mbps — excellent" },
      { ad: "24×7 water with RO", reality: "Matches — RO filter in kitchen, overhead tank" },
      { ad: "Same-day maintenance", reality: "Matches — owner lives on premises" }
    ],
    reviews: [
      { name: "Ishaan Patel", course: "B.Tech CSE", monthsStayed: 20, rating: 10, text: "Premium in every way. Best Wi-Fi, perfect maintenance, total peace. Worth every rupee.", verifiedResident: true },
      { name: "Nisha Joshi", course: "MBA", monthsStayed: 10, rating: 9, text: "Clean, modern, and secure. The owner is incredibly responsive. Recommend for serious students.", verifiedResident: true }
    ],
    ownerName: "Sanjeev Kumar"
  }
];
