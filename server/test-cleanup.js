const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning up test-generated database records...");

  // Delete test appointments
  const appointmentsDeleted = await prisma.appointment.deleteMany({
    where: {
      OR: [
        { patient: { email: { contains: "test" } } },
        { patient: { email: { contains: "e2e" } } },
        { patient: { name: { contains: "Test" } } }
      ]
    }
  });
  console.log(`Deleted ${appointmentsDeleted.count} test appointments.`);

  // Delete test medicine reminders
  const remindersDeleted = await prisma.medicineReminder.deleteMany({
    where: {
      name: { contains: "Test" }
    }
  });
  console.log(`Deleted ${remindersDeleted.count} test medicine reminders.`);

  // Delete test symptom checks
  const symptomChecksDeleted = await prisma.symptomCheck.deleteMany({
    where: {
      symptoms: { contains: "Test" }
    }
  });
  console.log(`Deleted ${symptomChecksDeleted.count} test symptom checks.`);

  // Delete test patients
  const patientsDeleted = await prisma.patient.deleteMany({
    where: {
      OR: [
        { email: { contains: "test" } },
        { email: { contains: "e2e" } },
        { name: { contains: "Test" } }
      ]
    }
  });
  console.log(`Deleted ${patientsDeleted.count} test patients.`);

  // Delete test users
  const usersDeleted = await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { contains: "test" } },
        { email: { contains: "e2e" } },
        { name: { contains: "Test" } }
      ]
    }
  });
  console.log(`Deleted ${usersDeleted.count} test users.`);

  console.log("Cleanup of test-generated records completed successfully.");
}

main()
  .catch((e) => {
    console.error("Failed to clean up test records:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
