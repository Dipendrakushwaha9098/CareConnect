const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Database with Realistic Medical Data...");

  // Clean existing data
  await prisma.appointment.deleteMany();
  await prisma.treatment.deleteMany();
  await prisma.patient.deleteMany();

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

  const patients = [
    { name: "Julian Voss", phone: "1234567890", email: "julian@example.com", age: 45, gender: "Male", bloodGroup: "O+", address: "Berlin, Germany" },
    { name: "Elena Rosa", phone: "0987654321", email: "elena@example.com", age: 32, gender: "Female", bloodGroup: "A-", address: "Madrid, Spain" },
    { name: "Sarah Chen", phone: "1122334455", email: "sarah@example.com", age: 28, gender: "Female", bloodGroup: "B+", address: "Toronto, Canada" }
  ];

  for (const p of patients) {
    const { email, ...patientData } = p; // email is not on Patient model directly
    const createdPatient = await prisma.patient.create({ data: patientData });
    
    // Create some appointments for each patient
    await prisma.appointment.create({
        data: {
            patientId: createdPatient.id,
            therapy: "Cardiology Consultation",
            status: "Completed",
            date: "2024-04-20",
            time: "10:30 AM",
        }
    });
  }

  console.log("Realistic seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
