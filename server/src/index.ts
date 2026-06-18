import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import crypto from "crypto";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "careconnect-super-secret-key-12345";

function generateToken(payload: object) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${data}`).digest("base64url");
  return `${header}.${data}.${signature}`;
}

function verifyToken(token: string) {
  try {
    const [header, data, signature] = token.split(".");
    const expectedSignature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${data}`).digest("base64url");
    if (signature !== expectedSignature) return null;
    return JSON.parse(Buffer.from(data, "base64url").toString());
  } catch {
    return null;
  }
}

const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Access token required" });
  
  const user = verifyToken(token);
  if (!user) return res.status(403).json({ error: "Invalid or expired token" });
  
  req.user = user;
  next();
};

const requireRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied. Insufficient permissions." });
    }
    next();
  };
};


let transporter: any;

if (process.env.NODE_ENV === "test" || !process.env.SMTP_HOST) {
  transporter = {
    sendMail: async (options: any) => {
      console.log(`[SMTP Mock] Bypassing real SMTP mail transmission. Recipient: ${options.to}`);
      return { messageId: "mock-message-id" };
    }
  };
} else {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

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

    res.json({ success: true, message: "OTP sent successfully", otp });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.warn("Nodemailer Error (falling back to console logging):", errMsg);
    console.log(`======== DEV SYSTEM MESSAGE ========`);
    console.log(`[OTP Mock Fallback] Real Email failed, logged to console.`);
    console.log(`[OTP] The OTP is: ${otp}`);
    console.log(`====================================`);
    res.json({ success: true, message: "OTP generated successfully (check backend console logs)", otp });
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

        if (user) {
          // If the role selected during login is different from the database role, update it!
          if (user.role !== role) {
            const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
            const finalName = name && name.trim() !== "" ? name : (isDoctor ? "Dr. " + uniqueSuffix : "Patient " + uniqueSuffix);
            
            user = await prisma.user.update({
              where: { email },
              data: {
                role,
                name: finalName,
              }
            });
            
            // Also update or link Patient record if switching to patient
            if (!isDoctor) {
              const existingPatient = await prisma.patient.findFirst({ where: { userId: user.id } });
              if (!existingPatient) {
                await prisma.patient.create({
                  data: {
                    userId: user.id,
                    name: user.name,
                    age: 30,
                    gender: "Not specified",
                    dosha: "Not evaluated",
                    email: user.email,
                  }
                });
              } else {
                await prisma.patient.update({
                  where: { id: existingPatient.id },
                  data: { name: user.name }
                });
              }
            }
          }
        } else {
          // Auto-register if not found
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

      const token = generateToken({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });

      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone || "",
          role: user.role,
          token,
        }
      });
    } catch (err: unknown) {
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
app.get("/api/patients", authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role === "doctor" || req.user.role === "admin") {
      const patients = await prisma.patient.findMany({
        orderBy: { createdAt: "desc" },
      });
      return res.json(patients);
    } else {
      const patients = await prisma.patient.findMany({
        where: {
          OR: [
            { userId: req.user.id },
            { email: req.user.email },
            { name: req.user.name }
          ]
        },
        orderBy: { createdAt: "desc" },
      });
      return res.json(patients);
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to fetch patients: " + errMsg });
  }
});

app.post("/api/patients", authenticateToken, requireRole(["doctor", "admin"]), async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.lastVisit) {
      data.lastVisit = new Date(data.lastVisit);
    }
    if (data.age) {
      data.age = parseInt(data.age.toString(), 10);
    }
    const newPatient = await prisma.patient.create({
      data,
    });
    io.emit("patientCreated", newPatient);
    res.status(201).json(newPatient);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Failed to create patient:", errMsg);
    res.status(500).json({ error: "Failed to create patient: " + errMsg });
  }
});

app.delete("/api/patients/:id", authenticateToken, requireRole(["doctor", "admin"]), async (req, res) => {
  try {
    const deleted = await prisma.patient.delete({ where: { id: req.params.id } });
    io.emit("patientDeleted", deleted.id);
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: "Failed to delete" });
  }
});

// Appointments API
app.get("/api/appointments", authenticateToken, async (req: any, res) => {
  let queryOptions = {};
  if (req.user.role === "patient") {
    queryOptions = {
      where: {
        patient: {
          OR: [
            { userId: req.user.id },
            { email: req.user.email },
            { name: req.user.name }
          ]
        }
      }
    };
  }

  const appointments = await prisma.appointment.findMany({
    ...queryOptions,
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
    notes: a.notes,
    cancelReason: a.cancelReason,
  }));
  res.json(formatted);
});

app.delete("/api/appointments/:id", authenticateToken, requireRole(["doctor", "admin"]), async (req, res) => {
  try {
    const deleted = await prisma.appointment.delete({ where: { id: req.params.id } });
    io.emit("appointmentDeleted", deleted.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete" });
  }
});

app.post("/api/appointments", authenticateToken, async (req: any, res) => {
  const { patientId, patientName, patientPhone, patientAge, patientGender, ...data } = req.body;
  
  try {
    let resolvedPatientId = patientId;
    
    // If patientId is not provided but patientName is, find or create the patient
    if (!resolvedPatientId && patientName) {
      let existingPatient;
      if (req.user.role === "patient") {
        existingPatient = await prisma.patient.findFirst({
          where: {
            name: patientName,
            userId: req.user.id
          }
        });
      } else {
        existingPatient = await prisma.patient.findFirst({
          where: {
            OR: [
              { name: patientName },
              { phone: patientPhone || undefined }
            ]
          }
        });
      }

      if (!existingPatient) {
        existingPatient = await prisma.patient.create({
          data: {
            name: patientName,
            phone: patientPhone || "Not specified",
            age: patientAge ? parseInt(patientAge.toString(), 10) : 30,
            gender: patientGender || "Not specified",
            dosha: "Not evaluated",
            status: "Active",
            userId: req.user.role === "patient" ? req.user.id : null
          }
        });
      }
      resolvedPatientId = existingPatient.id;
    } else if (resolvedPatientId && patientName) {
      // Update the existing patient's details based on the booking form
      await prisma.patient.update({
        where: { id: resolvedPatientId },
        data: {
          name: patientName,
          ...(patientPhone && { phone: patientPhone }),
          ...(patientAge && { age: parseInt(patientAge.toString(), 10) }),
          ...(patientGender && { gender: patientGender })
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
      notes: newAppointment.notes,
      cancelReason: newAppointment.cancelReason,
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
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Failed to create appointment:", errMsg);
    res.status(500).json({ error: "Failed to create appointment: " + errMsg });
  }
});

app.put("/api/appointments/:id", authenticateToken, async (req: any, res) => {
  const { date, time, status, cancelReason } = req.body;
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: { patient: true }
    });
    if (!appt) return res.status(404).json({ error: "Appointment not found" });

    if (req.user.role === "patient") {
      const isOwner = appt.patient.userId === req.user.id || appt.patient.email === req.user.email || appt.patient.name === req.user.name;
      if (!isOwner) return res.status(403).json({ error: "Access denied. You can only modify your own appointments." });
      if (status !== "Cancel Requested") return res.status(403).json({ error: "Access denied. Patients can only request cancellation." });
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: {
        date,
        time,
        status,
        cancelReason,
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
      notes: updatedAppointment.notes,
      cancelReason: updatedAppointment.cancelReason,
    };

    io.emit("appointmentUpdated", formatted);

    // Create a notification for update or cancellation request
    let notifTitle = "Appointment Approved/Updated";
    let notifMessage = `Appointment for ${formatted.patient} is now scheduled for ${formatted.date} at ${formatted.time} (${formatted.status})`;
    let notifType = "info";

    if (status === "Cancel Requested") {
      notifTitle = "⚠️ Cancellation Request";
      notifMessage = `Patient ${formatted.patient} has requested to cancel their appointment on ${formatted.date} for: "${cancelReason || "No reason specified"}"`;
      notifType = "warning";
    }

    const notif = await prisma.notification.create({
      data: {
        title: notifTitle,
        message: notifMessage,
        type: notifType,
      },
    });
    io.emit("notificationCreated", notif);

    // Send email notification to patient if email is available
    const patientEmail = updatedAppointment.patient.email;
    if (patientEmail && status === "Scheduled") {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || '"CareConnect" <no-reply@careconnect.com>',
          to: patientEmail,
          subject: "Your CareConnect Appointment is Approved! 🎉",
          text: `Dear ${updatedAppointment.patient.name},\n\nYour appointment for ${updatedAppointment.therapy} has been approved by the doctor!\n\nDetails:\nDate: ${updatedAppointment.date}\nTime: ${updatedAppointment.time}\nStatus: ${updatedAppointment.status}\n\nThank you,\nCareConnect Team`,
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="font-size: 40px;">🎉</span>
              </div>
              <h2 style="color: #2563eb; margin-bottom: 16px; text-align: center; font-weight: 800; font-size: 24px;">Appointment Approved!</h2>
              <p style="font-size: 16px; color: #334155; line-height: 1.6;">Dear <strong>${updatedAppointment.patient.name}</strong>,</p>
              <p style="font-size: 15px; color: #475569; line-height: 1.6;">Great news! Your clinical appointment request has been reviewed and approved by your healthcare provider.</p>
              
              <div style="background-color: #f8fafc; padding: 24px; border-radius: 12px; margin: 24px 0; border: 1px solid #f1f5f9;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: bold;">Therapy/Consultation</td>
                    <td style="padding: 8px 0; color: #0f172a; font-size: 15px; font-weight: 800; text-align: right;">${updatedAppointment.therapy}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: bold;">Date</td>
                    <td style="padding: 8px 0; color: #0f172a; font-size: 15px; font-weight: 800; text-align: right;">${updatedAppointment.date}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: bold;">Time Slot</td>
                    <td style="padding: 8px 0; color: #0f172a; font-size: 15px; font-weight: 800; text-align: right;">${updatedAppointment.time}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: bold;">Session Status</td>
                    <td style="padding: 8px 0; text-align: right;">
                      <span style="background-color: #d1fae5; color: #065f46; padding: 6px 12px; border-radius: 9999px; font-size: 12px; font-weight: 800; text-transform: uppercase; tracking-wider: 0.05em;">${updatedAppointment.status}</span>
                    </td>
                  </tr>
                </table>
              </div>
              
              <p style="font-size: 14px; color: #64748b; line-height: 1.6; text-align: center; margin-top: 32px;">
                You can view details or chat with emergency support directly in the <a href="http://localhost:8080" style="color: #2563eb; text-decoration: none; font-weight: bold;">CareConnect Portal</a>.
              </p>
              
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
              <p style="font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.4;">
                This is an automated notification from CareConnect.<br />Please do not reply directly to this email message.
              </p>
            </div>
          `,
        });

        console.log(`======== DEV SYSTEM MESSAGE ========`);
        console.log(`[Email] Appointment approved email sent to: ${patientEmail}`);
        console.log(`====================================`);
      } catch (mailError) {
        console.error("Failed to send appointment approval email:", mailError);
      }
    }

    res.json(formatted);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Failed to update appointment:", errMsg);
    res.status(500).json({ error: "Failed to update appointment: " + errMsg });
  }
});

// Notifications API
app.get("/api/notifications", authenticateToken, async (req: any, res) => {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
  });
  if (req.user.role === "patient") {
    const filtered = notifications.filter((n) => 
      n.message.toLowerCase().includes(req.user.name.toLowerCase()) ||
      n.message.toLowerCase().includes(req.user.email.toLowerCase())
    );
    return res.json(filtered);
  }
  res.json(notifications);
});

app.patch("/api/notifications/:id/read", authenticateToken, async (req, res) => {
  const notif = await prisma.notification.update({
    where: { id: req.params.id },
    data: { read: true },
  });
  io.emit("notificationUpdated", notif);
  res.json(notif);
});

// Treatments API
app.get("/api/treatments", authenticateToken, async (req, res) => {
  const treatments = await prisma.treatment.findMany({
    orderBy: { category: "asc" },
  });
  res.json(treatments);
});

app.post("/api/treatments", authenticateToken, requireRole(["doctor", "admin"]), async (req, res) => {
  const newTreatment = await prisma.treatment.create({
    data: req.body,
  });
  res.status(201).json(newTreatment);
});

// Prescriptions API
app.get("/api/prescriptions", authenticateToken, async (req: any, res) => {
  let queryOptions = {};
  if (req.user.role === "patient") {
    const associatedPatients = await prisma.patient.findMany({
      where: {
        OR: [
          { userId: req.user.id },
          { email: req.user.email },
          { name: req.user.name }
        ]
      },
      select: { name: true }
    });
    const patientNames = [req.user.name, ...associatedPatients.map(p => p.name)];

    queryOptions = {
      where: {
        patient: {
          in: patientNames
        }
      }
    };
  }

  const prescriptions = await prisma.prescription.findMany({
    ...queryOptions,
    orderBy: { createdAt: "desc" },
  });
  res.json(prescriptions);
});

app.post("/api/prescriptions", authenticateToken, requireRole(["doctor", "admin"]), async (req, res) => {
  const newRx = await prisma.prescription.create({
    data: req.body,
  });
  res.status(201).json(newRx);
});

// Invoices API
app.get("/api/invoices", authenticateToken, async (req: any, res) => {
  let queryOptions = {};
  if (req.user.role === "patient") {
    queryOptions = {
      where: {
        OR: [
          { patient: req.user.name },
          { patient: { contains: req.user.name } }
        ]
      }
    };
  }

  const invoices = await prisma.invoice.findMany({
    ...queryOptions,
    orderBy: { createdAt: "desc" },
  });
  res.json(invoices);
});

app.post("/api/invoices", authenticateToken, requireRole(["doctor", "admin"]), async (req, res) => {
  const newInvoice = await prisma.invoice.create({
    data: req.body,
  });
  res.status(201).json(newInvoice);
});

// Doctors API
app.get("/api/doctors", authenticateToken, async (req, res) => {
  try {
    const doctors = await prisma.user.findMany({
      where: { role: "doctor" },
      orderBy: { name: "asc" },
    });
    res.json(doctors);
  } catch (err: unknown) {
    res.status(500).json({ error: "Failed to fetch doctors" });
  }
});

// Telemedicine Instant Call API
app.post("/api/telemedicine/call", authenticateToken, async (req, res) => {
  const { patientName, doctorId } = req.body;
  try {
    let doctor;
    if (doctorId) {
      doctor = await prisma.user.findUnique({ where: { id: doctorId } });
    } else {
      doctor = await prisma.user.findFirst({ where: { role: "doctor" } });
    }

    if (!doctor) {
      return res.status(404).json({ error: "No available doctors found." });
    }

    const sanitizedDocName = doctor.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const roomName = `careconnect-room-${sanitizedDocName}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Store Telemedicine session details in SQLite!
    const session = await prisma.telemedicineSession.create({
      data: {
        patientName: patientName || "Anonymous",
        doctorName: doctor.name,
        roomName,
      },
    });

    // Notify doctors immediately in real-time
    io.emit("telemedicineSessionCreated", session);
    io.emit("telemedicineSessionsUpdated");

    const notif = await prisma.notification.create({
      data: {
        title: "📞 LIVE Telehealth Call",
        message: `Patient ${patientName || "Anonymous"} is calling Dr. ${doctor.name} live.`,
        type: "warning",
      },
    });
    io.emit("notificationCreated", notif);

    const doctorEmail = doctor.email;
    if (doctorEmail) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || '"CareConnect Telehealth" <no-reply@careconnect.com>',
          to: doctorEmail,
          subject: `📞 URGENT: Live Telehealth Call from Patient ${patientName || "Anonymous"}!`,
          text: `Dear Dr. ${doctor.name},\n\nA patient is calling you live for an immediate telemedicine consult!\n\nPatient Name: ${patientName || "Anonymous"}\nRoom: ${roomName}\n\nJoin the live call here: http://localhost:8080/advanced-tools?tab=telemedicine&room=${roomName}\n\nCareConnect Team`,
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="font-size: 40px;">📞</span>
              </div>
              <h2 style="color: #6366f1; margin-bottom: 16px; text-align: center; font-weight: 800; font-size: 24px;">Live Telehealth Call!</h2>
              <p style="font-size: 16px; color: #334155; line-height: 1.6;">Dear <strong>Dr. ${doctor.name}</strong>,</p>
              <p style="font-size: 15px; color: #475569; line-height: 1.6;">An immediate telehealth video consultation request has been initiated by a patient. They are waiting for you live in the consultation room.</p>
              
              <div style="background-color: #faf5ff; padding: 24px; border-radius: 12px; margin: 24px 0; border: 1px solid #f3e8ff;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b21a8; font-size: 14px; font-weight: bold;">Calling Patient</td>
                    <td style="padding: 8px 0; color: #581c87; font-size: 15px; font-weight: 800; text-align: right;">${patientName || "Anonymous"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b21a8; font-size: 14px; font-weight: bold;">Video Platform</td>
                    <td style="padding: 8px 0; color: #581c87; font-size: 15px; font-weight: 800; text-align: right;">CareConnect HD WebRTC</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b21a8; font-size: 14px; font-weight: bold;">Room ID</td>
                    <td style="padding: 8px 0; color: #581c87; font-size: 15px; font-weight: 800; text-align: right;"><code>${roomName}</code></td>
                  </tr>
                </table>
                <div style="text-align: center; margin-top: 20px;">
                  <a href="http://localhost:8080/advanced-tools?tab=telemedicine&room=${roomName}" style="background-color: #6366f1; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: bold; text-decoration: none; display: inline-block;">
                    Receive Call & Connect Live
                  </a>
                </div>
              </div>
              
              <p style="font-size: 13px; color: #64748b; line-height: 1.6; text-align: center; margin-top: 32px;">
                You can receive this call on any browser even if the portal is currently closed.
              </p>
            </div>
          `,
        });

        console.log(`======== DEV SYSTEM MESSAGE ========`);
        console.log(`[Telemedicine] Live call email sent to: ${doctorEmail}`);
        console.log(`====================================`);
      } catch (mailError) {
        console.error("Failed to send telehealth email:", mailError);
      }
    }

    res.json({ success: true, doctor, roomName });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Failed to initiate telehealth call:", errorMsg);
    res.status(500).json({ error: "Failed to initiate telehealth call: " + errorMsg });
  }
});

// POST Accept Telemedicine Call API
app.post("/api/telemedicine/call/:roomName/accept", authenticateToken, requireRole(["doctor", "admin"]), async (req, res) => {
  const { roomName } = req.params;
  const { doctorName } = req.body;
  try {
    const session = await prisma.telemedicineSession.findFirst({
      where: { roomName },
    });

    if (!session) {
      return res.status(404).json({ error: "Session room not found or already closed." });
    }

    // Emit live socket event to notify the patient that the doctor accepted
    io.emit("telemedicineCallAccepted", { roomName, doctorName: doctorName || session.doctorName });

    res.json({ success: true, session });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to accept telehealth call: " + errorMsg });
  }
});

// DELETE/Disconnect Telemedicine Call API
app.delete("/api/telemedicine/call/:roomName", authenticateToken, async (req, res) => {
  const { roomName } = req.params;
  try {
    // Delete any session matching this roomName
    const checkSession = await prisma.telemedicineSession.findFirst({
      where: { roomName },
    });

    if (checkSession) {
      await prisma.telemedicineSession.delete({
        where: { id: checkSession.id },
      });
    }

    // Emit live socket events to notify both parties and update lists
    io.emit("telemedicineSessionEnded", { roomName });
    io.emit("telemedicineSessionsUpdated");

    res.json({ success: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to end telehealth call: " + errorMsg });
  }
});

// GET Telemedicine Sessions List
app.get("/api/telemedicine-sessions", authenticateToken, requireRole(["doctor", "admin"]), async (req, res) => {
  try {
    const sessions = await prisma.telemedicineSession.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(sessions);
  } catch (err: unknown) {
    res.status(500).json({ error: "Failed to fetch telemedicine sessions" });
  }
});

// Medicine Reminders API
app.get("/api/reminders", authenticateToken, async (req: any, res) => {
  try {
    let queryOptions = {};
    if (req.user.role === "patient") {
      queryOptions = {
        where: { patientId: req.user.id }
      };
    }
    const reminders = await prisma.medicineReminder.findMany({
      ...queryOptions,
      orderBy: { createdAt: "desc" },
    });
    res.json(reminders);
  } catch (err: unknown) {
    res.status(500).json({ error: "Failed to fetch reminders" });
  }
});

app.post("/api/reminders", authenticateToken, async (req: any, res) => {
  try {
    const newReminder = await prisma.medicineReminder.create({
      data: {
        name: req.body.name,
        time: req.body.time,
        freq: req.body.freq,
        status: req.body.status || "Active",
        patientId: req.user.role === "patient" ? req.user.id : req.body.patientId || null,
      },
    });
    res.status(201).json(newReminder);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to create reminder: " + errorMsg });
  }
});

app.delete("/api/reminders/:id", authenticateToken, async (req: any, res) => {
  try {
    const reminder = await prisma.medicineReminder.findUnique({
      where: { id: req.params.id }
    });
    if (!reminder) return res.status(404).json({ error: "Reminder not found" });
    if (req.user.role === "patient" && reminder.patientId !== req.user.id) {
      return res.status(403).json({ error: "Access denied. You can only delete your own reminders." });
    }

    await prisma.medicineReminder.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: "Failed to delete reminder" });
  }
});

// AI Symptom Checks API
app.get("/api/symptom-checks", authenticateToken, async (req: any, res) => {
  try {
    let queryOptions = {};
    if (req.user.role === "patient") {
      queryOptions = {
        where: { patientId: req.user.id }
      };
    }
    const checks = await prisma.symptomCheck.findMany({
      ...queryOptions,
      orderBy: { createdAt: "desc" },
    });
    res.json(checks);
  } catch (err: unknown) {
    res.status(500).json({ error: "Failed to fetch symptom checks" });
  }
});

app.post("/api/symptom-checks", authenticateToken, async (req: any, res) => {
  try {
    const newCheck = await prisma.symptomCheck.create({
      data: {
        symptoms: req.body.symptoms,
        diagnosis: req.body.diagnosis,
        urgency: req.body.urgency,
        specialist: req.body.specialist,
        patientId: req.user.role === "patient" ? req.user.id : req.body.patientId || null,
      },
    });
    res.status(201).json(newCheck);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to save symptom check: " + errorMsg });
  }
});

// Voice Notes API
app.get("/api/voice-notes", authenticateToken, requireRole(["doctor", "admin"]), async (req, res) => {
  try {
    const notes = await prisma.voiceConsultationNote.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(notes);
  } catch (err: unknown) {
    res.status(500).json({ error: "Failed to fetch voice notes" });
  }
});

app.post("/api/voice-notes", authenticateToken, requireRole(["doctor", "admin"]), async (req, res) => {
  try {
    const newNote = await prisma.voiceConsultationNote.create({
      data: {
        patientName: req.body.patientName || "Anonymous",
        notes: req.body.notes,
      },
    });
    res.status(201).json(newNote);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to save voice note: " + errorMsg });
  }
});

httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
