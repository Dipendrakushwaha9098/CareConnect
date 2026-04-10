import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins for local dev
  },
});
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// In-memory Mock OTP Store (For MVP/Development purposes)
const otpStore: Record<string, string> = {};

// Auth APIs
app.post("/api/auth/request-otp", (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: "Phone number is required" });
  }

  // Hardcoded to 123456 for local development so it doesn't need real SMS
  const otp = "123456";
  otpStore[phone] = otp;

  // In a real application, connect to Twilio/AWS SNS etc.
  console.log(`======== DEV SYSTEM MESSAGE ========`);
  console.log(`[OTP] Mock SMS Sent! OTP for phone ${phone}: ${otp}`);
  console.log(`====================================`);

  res.json({ success: true, message: "OTP sent successfully" });
});

app.post("/api/auth/verify-otp", async (req, res) => {
  const { phone, otp, role = "patient" } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ error: "Phone number and OTP are required" });
  }

  const validOtp = otpStore[phone];
  if (validOtp && validOtp === otp) {
    // Clear the OTP
    delete otpStore[phone];

    // Check if user exists in Database
    try {
      let user = await prisma.user.findUnique({
        where: { phone }
      });

      const isDoctor = role === "doctor";

      // Auto-register if not found
      if (!user) {
        user = await prisma.user.create({
          data: {
            phone,
            role,
            name: isDoctor ? "Dr. " + phone.substring(phone.length - 4) : "Patient " + phone.substring(phone.length - 4),
          }
        });

        // Auto-create linked Patient record if they registered as patient
        if (!isDoctor) {
          await prisma.patient.create({
            data: {
              userId: user.id,
              name: user.name,
              age: 30, // Default mock data
              gender: "Not specified",
              dosha: "Not evaluated",
              phone: user.phone,
            }
          });
        }
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: `${user.id.substring(0, 5)}@clinic.com`,
          role: user.role,
        }
      });
    } catch (err: any) {
      console.error("Auth Error:", err);
      res.status(500).json({ success: false, error: "Database authentication failed" });
    }
  } else {
    res.status(401).json({ success: false, error: "Invalid or expired OTP" });
  }
});

io.on("connection", (socket) => {
  console.log("Client connected", socket.id);
  socket.on("disconnect", () => {
    console.log("Client disconnected", socket.id);
  });
});

// Patients API
app.get("/api/patients", async (req, res) => {
  const patients = await prisma.patient.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json(patients);
});

app.post("/api/patients", async (req, res) => {
  const newPatient = await prisma.patient.create({
    data: req.body,
  });
  io.emit("patientCreated", newPatient);
  res.status(201).json(newPatient);
});

app.delete("/api/patients/:id", async (req, res) => {
  try {
    const deleted = await prisma.patient.delete({ where: { id: req.params.id } });
    io.emit("patientDeleted", deleted.id);
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: "Failed to delete" });
  }
});

// Appointments API
app.get("/api/appointments", async (req, res) => {
  const appointments = await prisma.appointment.findMany({
    include: { patient: true },
    orderBy: { createdAt: "desc" },
  });
  // Format to match frontend structure loosely
  const formatted = appointments.map((a) => ({
    id: a.id,
    patient: a.patient?.name || "Unknown",
    patientId: a.patientId,
    therapy: a.therapy,
    date: a.date,
    time: a.time,
    status: a.status,
  }));
  res.json(formatted);
});

app.delete("/api/appointments/:id", async (req, res) => {
  try {
    const deleted = await prisma.appointment.delete({ where: { id: req.params.id } });
    io.emit("appointmentDeleted", deleted.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete" });
  }
});

app.post("/api/appointments", async (req, res) => {
  const { patientId, ...data } = req.body;
  const newAppointment = await prisma.appointment.create({
    data: {
      ...data,
      patient: {
        connect: { id: patientId },
      },
    },
    include: { patient: true },
  });

  const formatted = {
    id: newAppointment.id,
    patient: newAppointment.patient.name,
    patientId: newAppointment.patientId,
    therapy: newAppointment.therapy,
    date: newAppointment.date,
    time: newAppointment.time,
    status: newAppointment.status,
  };

  io.emit("appointmentCreated", formatted);

  // Auto create a notification for scheduling
  const notif = await prisma.notification.create({
    data: {
      title: "New Appointment",
      message: `Appointment scheduled for ${formatted.patient} on ${formatted.date} at ${formatted.time}`,
      type: "info",
    },
  });
  io.emit("notificationCreated", notif);

  res.status(201).json(formatted);
});

// Notifications API
app.get("/api/notifications", async (req, res) => {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json(notifications);
});

app.patch("/api/notifications/:id/read", async (req, res) => {
  const notif = await prisma.notification.update({
    where: { id: req.params.id },
    data: { read: true },
  });
  io.emit("notificationUpdated", notif);
  res.json(notif);
});

// Treatments API
app.get("/api/treatments", async (req, res) => {
  const treatments = await prisma.treatment.findMany({
    orderBy: { category: "asc" },
  });
  res.json(treatments);
});

app.post("/api/treatments", async (req, res) => {
  const newTreatment = await prisma.treatment.create({
    data: req.body,
  });
  res.status(201).json(newTreatment);
});

// Prescriptions API
app.get("/api/prescriptions", async (req, res) => {
  const prescriptions = await prisma.prescription.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json(prescriptions);
});

app.post("/api/prescriptions", async (req, res) => {
  const newRx = await prisma.prescription.create({
    data: req.body,
  });
  res.status(201).json(newRx);
});

// Invoices API
app.get("/api/invoices", async (req, res) => {
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json(invoices);
});

app.post("/api/invoices", async (req, res) => {
  const newInvoice = await prisma.invoice.create({
    data: req.body,
  });
  res.status(201).json(newInvoice);
});

httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
