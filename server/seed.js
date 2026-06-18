const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning Database and Seeding Initial Clinic Configuration...");

  // Clean existing patient and transactional data completely
  await prisma.invoice.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.treatment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();

  console.log("Successfully removed all old transactional, patient, and doctor data.");

  // Seed only the official Doctors (necessary for clinic operation and login)
  const doctors = [
    { email: "dr.alexander@careconnect.com", name: "Alexander", role: "doctor", phone: "+1 555-0199" },
    { email: "dr.elena@careconnect.com", name: "Elena Rosa", role: "doctor", phone: "+1 555-0188" },
  ];

  for (const d of doctors) {
    await prisma.user.create({ data: d });
  }
  console.log("Seeded Clinical Lead User accounts.");

  // Seed standard medical treatment options (system configuration)
  const treatments = [
    {
      name: "Comprehensive Cardiac Audit",
      category: "Cardiology",
      desc: "Full evaluation of heart health using AI-assisted ECG and ultrasound analytics.",
      duration: "45-60 min",
      type: "High-risk / Routine",
      sessions: 1,
      completed: 0,
    },
    {
      name: "Neurological Pathway Mapping",
      category: "Neurology",
      desc: "Deep-brain structural analysis for cognitive performance and diagnostic screening.",
      duration: "90 min",
      type: "Diagnostic",
      sessions: 1,
      completed: 0,
    },
    {
      name: "Pediatric Wellness Protocol",
      category: "Pediatrics",
      desc: "Holistic growth and immunity assessment for infants and children up to 12 years.",
      duration: "30-45 min",
      type: "Preventative",
      sessions: 1,
      completed: 0,
    },
    {
      name: "Advanced Ayurvedic Detox",
      category: "Integrative Medicine",
      desc: "Panchakarma-based clinical detoxification with controlled modern monitoring.",
      duration: "120 min",
      type: "Rehabilitation",
      sessions: 7,
      completed: 0,
    }
  ];

  for (const t of treatments) {
    await prisma.treatment.create({ data: t });
  }
  console.log("Seeded standard Treatment catalogue.");

  console.log("Clinic is now configured with zero dummy patients, dummy appointments, or dummy invoices!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
