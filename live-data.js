/* live-data.js — mock households for TrustNest Live / Flatmates */

var LV_HOUSEHOLDS = [
  {
    id: "lv01",
    members: [
      { name: "Ananya Sharma", course: "B.Tech CSE", year: 3 },
      { name: "Kavya Nair", course: "B.Tech CSE", year: 3 }
    ],
    area: "Rajpura",
    flatType: "2BHK",
    rentShare: 6000,
    deposit: 12000,
    moveInDate: "2025-08-01",
    leavingReason: "Internship in Bengaluru",
    vibe: {
      sleep: "early bird",
      cleanliness: "very clean",
      food: "veg only",
      guests: "rare",
      noise: "quiet",
      smoking: "no",
      studyHabits: "regular schedule",
      sharing: "share everything"
    },
    houseRules: ["No smoking inside", "Quiet hours after 11 pm", "Clean common areas weekly", "Guests allowed till 9 pm"],
    photo: "assets/live/lv01.jpg"
  },
  {
    id: "lv02",
    members: [
      { name: "Rohan Mehta", course: "B.Tech Mech", year: 4 },
      { name: "Siddharth Jain", course: "B.Tech Mech", year: 4 },
      { name: "Akash Verma", course: "BBA", year: 2 }
    ],
    area: "Banur",
    flatType: "3BHK",
    rentShare: 5000,
    deposit: 10000,
    moveInDate: "2025-07-15",
    leavingReason: "Got placed, moving to job city",
    vibe: {
      sleep: "night owl",
      cleanliness: "clean enough",
      food: "non-veg ok",
      guests: "sometimes",
      noise: "moderate",
      smoking: "no",
      studyHabits: "flexible",
      sharing: "share basics"
    },
    houseRules: ["No smoking indoors", "Share electricity costs equally", "Maintain kitchen cleanliness"],
    photo: "assets/live/lv02.jpg"
  },
  {
    id: "lv03",
    members: [
      { name: "Priya Kapoor", course: "MBA", year: 1 },
      { name: "Divya Iyer", course: "MBA", year: 1 }
    ],
    area: "Mohali",
    flatType: "2BHK",
    rentShare: 8500,
    deposit: 17000,
    moveInDate: "2025-09-01",
    leavingReason: "Going home for personal reasons",
    vibe: {
      sleep: "flexible",
      cleanliness: "very clean",
      food: "veg only",
      guests: "no overnight",
      noise: "quiet",
      smoking: "no",
      studyHabits: "regular schedule",
      sharing: "split costs"
    },
    houseRules: ["No overnight guests", "No non-veg cooking in flat", "Clean bathroom after use", "Quiet after 10:30 pm"],
    photo: "assets/live/lv03.jpg"
  },
  {
    id: "lv04",
    members: [
      { name: "Gurpreet Singh", course: "B.Tech EEE", year: 2 },
      { name: "Harjot Kaur", course: "B.Tech IT", year: 2 }
    ],
    area: "Zirakpur",
    flatType: "2BHK",
    rentShare: 7000,
    deposit: 14000,
    moveInDate: "2025-08-15",
    leavingReason: "Parents called back home — health reasons",
    vibe: {
      sleep: "flexible",
      cleanliness: "clean enough",
      food: "non-veg ok",
      guests: "sometimes",
      noise: "moderate",
      smoking: "no",
      studyHabits: "flexible",
      sharing: "share basics"
    },
    houseRules: ["Shared grocery costs", "Clean kitchen after cooking", "Lock door when leaving"],
    photo: "assets/live/lv04.jpg"
  },
  {
    id: "lv05",
    members: [
      { name: "Neha Rao", course: "B.Pharm", year: 3 },
      { name: "Tanya Verma", course: "B.Pharm", year: 3 },
      { name: "Simran Bhatia", course: "B.Pharm", year: 3 }
    ],
    area: "Rajpura",
    flatType: "3BHK",
    rentShare: 5500,
    deposit: 11000,
    moveInDate: "2025-07-20",
    leavingReason: "Internship at hospital in Chandigarh",
    vibe: {
      sleep: "early bird",
      cleanliness: "very clean",
      food: "veg only",
      guests: "rare",
      noise: "quiet",
      smoking: "no",
      studyHabits: "very disciplined",
      sharing: "share everything"
    },
    houseRules: ["No boys allowed after 8 pm", "Veg only in the kitchen", "Study hours 8 pm–11 pm", "No loud music"],
    photo: "assets/live/lv05.jpg"
  },
  {
    id: "lv06",
    members: [
      { name: "Vikram Nair", course: "B.Tech CSE", year: 1 },
      { name: "Aarav Patel", course: "B.Tech CSE", year: 1 }
    ],
    area: "Banur",
    flatType: "Shared flat",
    rentShare: 4500,
    deposit: 9000,
    moveInDate: "2025-08-01",
    leavingReason: "Transferred to Hyderabad campus",
    vibe: {
      sleep: "night owl",
      cleanliness: "clean enough",
      food: "non-veg ok",
      guests: "sometimes",
      noise: "moderate",
      smoking: "no",
      studyHabits: "flexible",
      sharing: "split costs"
    },
    houseRules: ["Split electricity equally", "No parties on weeknights"],
    photo: "assets/live/lv06.jpg"
  },
  {
    id: "lv07",
    members: [
      { name: "Ishaan Gupta", course: "B.Des", year: 4 }
    ],
    area: "Chandigarh",
    flatType: "1BHK",
    rentShare: 9000,
    deposit: 18000,
    moveInDate: "2025-09-15",
    leavingReason: "Placement — job starts in Pune",
    vibe: {
      sleep: "flexible",
      cleanliness: "very clean",
      food: "non-veg ok",
      guests: "no overnight",
      noise: "quiet",
      smoking: "no",
      studyHabits: "regular schedule",
      sharing: "split costs"
    },
    houseRules: ["No overnight guests", "Keep flat clean at all times", "No smoking"],
    photo: "assets/live/lv07.jpg"
  },
  {
    id: "lv08",
    members: [
      { name: "Manpreet Singh", course: "B.Tech Civil", year: 3 },
      { name: "Diljeet Kaur", course: "B.Tech Civil", year: 2 }
    ],
    area: "Rajpura",
    flatType: "2BHK",
    rentShare: 5800,
    deposit: 11600,
    moveInDate: "2025-08-10",
    leavingReason: "Dropout — going back home",
    vibe: {
      sleep: "early bird",
      cleanliness: "clean enough",
      food: "veg only",
      guests: "rare",
      noise: "quiet",
      smoking: "no",
      studyHabits: "regular schedule",
      sharing: "share basics"
    },
    houseRules: ["Morning pooja — no disturbance 6–7 am", "No non-veg cooking", "Shared cleaning schedule"],
    photo: "assets/live/lv08.jpg"
  },
  {
    id: "lv09",
    members: [
      { name: "Riya Joshi", course: "MCA", year: 2 },
      { name: "Pooja Malhotra", course: "MCA", year: 1 },
      { name: "Sneha Pillai", course: "MCA", year: 2 }
    ],
    area: "Zirakpur",
    flatType: "3BHK",
    rentShare: 6500,
    deposit: 13000,
    moveInDate: "2025-07-25",
    leavingReason: "Internship in Bengaluru",
    vibe: {
      sleep: "flexible",
      cleanliness: "very clean",
      food: "veg only",
      guests: "sometimes",
      noise: "moderate",
      smoking: "no",
      studyHabits: "regular schedule",
      sharing: "share everything"
    },
    houseRules: ["Keep terrace clean", "No smoking", "Guests can stay till 10 pm"],
    photo: "assets/live/lv09.jpg"
  },
  {
    id: "lv10",
    members: [
      { name: "Gaurav Bansal", course: "B.Tech ECE", year: 3 },
      { name: "Nitin Sharma", course: "B.Tech ECE", year: 3 }
    ],
    area: "Mohali",
    flatType: "2BHK",
    rentShare: 7500,
    deposit: 15000,
    moveInDate: "2025-09-01",
    leavingReason: "Exchange semester abroad",
    vibe: {
      sleep: "night owl",
      cleanliness: "clean enough",
      food: "non-veg ok",
      guests: "sometimes",
      noise: "moderate",
      smoking: "no",
      studyHabits: "flexible",
      sharing: "split costs"
    },
    houseRules: ["Split utilities equally", "Maintain kitchen hygiene", "No loud music after midnight"],
    photo: "assets/live/lv10.jpg"
  }
];

var LV_VIBE_QUESTIONS = [
  {
    key: "sleep",
    question: "When do you usually sleep?",
    options: [
      { value: "early bird", label: "Early bird (before 11 pm)" },
      { value: "flexible", label: "Flexible" },
      { value: "night owl", label: "Night owl (after 1 am)" }
    ]
  },
  {
    key: "cleanliness",
    question: "How do you feel about cleanliness?",
    options: [
      { value: "very clean", label: "Very clean — everything in its place" },
      { value: "clean enough", label: "Clean enough — tidy when needed" }
    ]
  },
  {
    key: "food",
    question: "What's your food preference?",
    options: [
      { value: "veg only", label: "Vegetarian only" },
      { value: "non-veg ok", label: "Non-veg is fine" }
    ]
  },
  {
    key: "guests",
    question: "How often do you have guests?",
    options: [
      { value: "rare", label: "Rarely — maybe once a month" },
      { value: "sometimes", label: "Sometimes — weekends occasionally" },
      { value: "no overnight", label: "Day guests only, no overnight" }
    ]
  },
  {
    key: "noise",
    question: "What noise level do you prefer at home?",
    options: [
      { value: "quiet", label: "Quiet — I need to focus" },
      { value: "moderate", label: "Moderate — some music and talking is fine" }
    ]
  },
  {
    key: "smoking",
    question: "Do you smoke?",
    options: [
      { value: "no", label: "No, and prefer non-smoking flat" },
      { value: "outside only", label: "Yes, but only outside" }
    ]
  },
  {
    key: "studyHabits",
    question: "How do you study?",
    options: [
      { value: "very disciplined", label: "Very disciplined — fixed hours" },
      { value: "regular schedule", label: "Regular schedule" },
      { value: "flexible", label: "Flexible — whenever I can" }
    ]
  },
  {
    key: "sharing",
    question: "How do you like to handle shared costs?",
    options: [
      { value: "share everything", label: "Share everything equally" },
      { value: "share basics", label: "Share rent + utilities, own groceries" },
      { value: "split costs", label: "Split everything individually" }
    ]
  }
];
