import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

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
app.post("/api/auth/request-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email address is required" });
  }

  // Generate a random 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = otp;

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"CareConnect" <no-reply@careconnect.com>',
      to: email,
      subject: "CareConnect Verification Code",
      text: `Your CareConnect verification code is: ${otp}`,
      html: `<b>Your CareConnect verification code is:</b> <h2 style="color:#2563eb;letter-spacing:4px;">${otp}</h2>`,
    });

    console.log(`======== DEV SYSTEM MESSAGE ========`);
    console.log(`[OTP] Real Email Sent via Nodemailer! Message ID: ${info.messageId}`);
    console.log(`[OTP] The OTP is: ${otp}`);
    console.log(`====================================`);

    res.json({ success: true, message: "OTP sent successfully" });
  } catch (error: any) {
    console.error("Nodemailer Error:", error);
    res.status(500).json({ error: "Failed to send OTP via Email. " + error.message });
  }
});

app.post("/api/auth/verify-otp", async (req, res) => {
  const { email, otp, role = "patient", name } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required" });
  }

  const validOtp = otpStore[email];
  if (validOtp && validOtp === otp) {
    // Clear the OTP
    delete otpStore[email];

    // Check if user exists in Database
    try {
      let user = await prisma.user.findUnique({
        where: { email }
      });

      const isDoctor = role === "doctor";

      // Auto-register if not found
      if (!user) {
        const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
        const finalName = name && name.trim() !== "" ? name : (isDoctor ? "Dr. " + uniqueSuffix : "Patient " + uniqueSuffix);
        user = await prisma.user.create({
          data: {
            email,
            role,
            name: finalName,
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
              email: user.email,
            }
          });
        }
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone || "",
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
  const { patientId, patientName, patientPhone, ...data } = req.body;
  
  try {
    let resolvedPatientId = patientId;
    
    // If patientId is not provided but patientName is, find or create the patient
    if (!resolvedPatientId && patientName) {
      let existingPatient = await prisma.patient.findFirst({
        where: {
          OR: [
            { name: patientName },
            { phone: patientPhone || undefined }
          ]
        }
      });

      if (!existingPatient) {
        existingPatient = await prisma.patient.create({
          data: {
            name: patientName,
            phone: patientPhone || "Not specified",
            age: 30,
            gender: "Not specified",
            dosha: "Not evaluated",
            status: "Active"
          }
        });
      }
      resolvedPatientId = existingPatient.id;
    } else if (resolvedPatientId && patientName) {
      // Update the existing patient's name and phone based on the booking form
      await prisma.patient.update({
        where: { id: resolvedPatientId },
        data: {
          name: patientName,
          ...(patientPhone && { phone: patientPhone })
        }
      });
    }

    if (!resolvedPatientId) {
      return res.status(400).json({ error: "Patient ID or Patient Name is required" });
    }

    const newAppointment = await prisma.appointment.create({
      data: {
        ...data,
        status: data.status || "Pending", // Default new appointments to Pending
        patient: {
          connect: { id: resolvedPatientId },
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
        title: "New Appointment Request",
        message: `New booking request for ${formatted.patient} on ${formatted.date} at ${formatted.time}`,
        type: "info",
      },
    });
    io.emit("notificationCreated", notif);

    res.status(201).json(formatted);
  } catch (err: any) {
    console.error("Failed to create appointment:", err);
    res.status(500).json({ error: "Failed to create appointment: " + err.message });
  }
});

app.put("/api/appointments/:id", async (req, res) => {
  const { date, time, status } = req.body;
  try {
    const updatedAppointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: {
        date,
        time,
        status,
      },
      include: { patient: true },
    });

    const formatted = {
      id: updatedAppointment.id,
      patient: updatedAppointment.patient.name,
      patientId: updatedAppointment.patientId,
      therapy: updatedAppointment.therapy,
      date: updatedAppointment.date,
      time: updatedAppointment.time,
      status: updatedAppointment.status,
    };

    io.emit("appointmentUpdated", formatted);

    // Create a notification for update
    const notif = await prisma.notification.create({
      data: {
        title: "Appointment Approved/Updated",
        message: `Appointment for ${formatted.patient} is now scheduled for ${formatted.date} at ${formatted.time} (${formatted.status})`,
        type: "info",
      },
    });
    io.emit("notificationCreated", notif);

    res.json(formatted);
  } catch (err: any) {
    console.error("Failed to update appointment:", err);
    res.status(500).json({ error: "Failed to update appointment: " + err.message });
  }
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
