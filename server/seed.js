const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Database with Generalized Medical Services...");

  const treatments = [
    {
      name: "General Consultation",
      category: "General Medicine",
      desc: "Comprehensive evaluation of overall health, symptom review, and diagnostic recommendations.",
      duration: "15-30 min",
      type: "All ages",
      sessions: 1,
      completed: 0,
    },
    {
      name: "Physical Therapy & Rehab",
      category: "Physiotherapy",
      desc: "Targeted exercises and manual therapy to restore movement, relieve pain, and improve strength.",
      duration: "45-60 min",
      type: "Rehabilitation",
      sessions: 10,
      completed: 0,
    },
    {
      name: "Emergency Video Triage",
      category: "Telemedicine",
      desc: "Immediate assessment of urgent conditions via video call for rapid referral or prescription.",
      duration: "10-15 min",
      type: "Emergency",
      sessions: 1,
      completed: 0,
    },
    {
      name: "Abhyanga Therapy",
      category: "Ayurveda",
      desc: "Full body warm oil massage that nourishes tissues, improves circulation, and calms the nervous system.",
      duration: "60-90 min",
      type: "Wellness",
      sessions: 7,
      completed: 0,
    },
    {
      name: "Cognitive Behavioral Therapy (CBT)",
      category: "Mental Health",
      desc: "Structured, time-limited psychological treatment to address depression, anxiety, and stress.",
      duration: "45-60 min",
      type: "Psychology",
      sessions: 8,
      completed: 0,
    },
    {
      name: "Dietary & Nutrition Planning",
      category: "Nutrition",
      desc: "Personalized dietary plans to manage chronic diseases, weight, and overall wellness.",
      duration: "30-45 min",
      type: "Lifestyle",
      sessions: 3,
      completed: 0,
    }
  ];

  for (const t of treatments) {
    await prisma.treatment.create({ data: t });
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
