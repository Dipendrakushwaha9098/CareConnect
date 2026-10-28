import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import crypto from "crypto";
import fs from "fs";
import path from "path";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "careconnect-super-secret-key-12345";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;
    const derived = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(derived, "hex"));
  } catch {
    return false;
  }
}

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

const requireVerifiedDoctor = async (req: any, res: any, next: any) => {
  if (req.user?.role === "admin") return next();
  if (req.user?.role !== "doctor") {
    return res.status(403).json({ error: "Access denied. Doctor permissions required." });
  }
  try {
    const doctor = await prisma.doctorProfile.findUnique({
      where: { userId: req.user.id }
    });
    if (!doctor || doctor.verificationStatus !== "VERIFIED") {
      return res.status(403).json({
        error: "Doctor credentials are currently pending administrative verification.",
        code: "VERIFICATION_PENDING",
        verificationStatus: doctor?.verificationStatus || "PENDING"
      });
    }
    req.doctorProfile = doctor;
    next();
  } catch (err) {
    return res.status(500).json({ error: "Failed to verify doctor status" });
  }
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
    secure: false,
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
    origin: "*",
  },
});
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ── AUDIT LOGGING & SECURITY HELPERS ──────────────────────────────────────
function getClientMeta(req: any) {
  const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket?.remoteAddress || req.ip || "127.0.0.1";
  const userAgent = (req.headers["user-agent"] as string) || "unknown";
  return {
    ipAddress: String(ipAddress).split(",")[0].trim(),
    userAgent: String(userAgent).substring(0, 255)
  };
}

async function logAuditEvent({
  userId,
  action,
  entity,
  entityId,
  ipAddress,
  userAgent,
  details,
  severity = "INFO"
}: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: any;
  severity?: "INFO" | "WARN" | "CRITICAL";
}) {
  try {
    const detailsStr = details ? (typeof details === "string" ? details : JSON.stringify(details)) : null;
    return await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entity,
        entityId: entityId || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent ? String(userAgent).substring(0, 255) : null,
        details: detailsStr,
        severity: severity || "INFO"
      }
    });
  } catch (err) {
    console.error("[AuditLog Error]", err);
    return null;
  }
}

// ── CARE RELATIONSHIP VERIFICATION (LEAST-PRIVILEGE ACCESS) ────────────────
async function hasCareRelationship(doctorId: string, patientId: string): Promise<boolean> {
  try {
    // 1. Direct appointment between doctor and patient
    const appt = await prisma.appointment.findFirst({
      where: {
        doctorId,
        patientId,
        status: { notIn: ["Rejected"] }
      }
    });
    if (appt) return true;

    // 2. Clinical consultation note authored by doctor for patient
    const note = await prisma.consultationNote.findFirst({
      where: {
        doctorId,
        patientId
      }
    });
    if (note) return true;

    // 3. Medical record authored by doctor for patient
    const record = await prisma.medicalRecord.findFirst({
      where: {
        doctorId,
        patientId
      }
    });
    if (record) return true;

    // 4. Prescription issued by doctor for patient
    const rx = await prisma.prescription.findFirst({
      where: {
        doctorId,
        patientId
      }
    });
    if (rx) return true;

    return false;
  } catch {
    return false;
  }
}

// ── PRIVATE STORAGE & SHORT-LIVED SIGNED DOWNLOAD URLS ─────────────────────
const PRIVATE_STORAGE_DIR = process.env.PRIVATE_UPLOAD_DIR
  ? path.resolve(process.env.PRIVATE_UPLOAD_DIR)
  : path.join(__dirname, "..", "uploads", "private");

if (!fs.existsSync(PRIVATE_STORAGE_DIR)) {
  fs.mkdirSync(PRIVATE_STORAGE_DIR, { recursive: true });
}

const SIGNED_URL_EXPIRY_SECONDS = parseInt(process.env.SIGNED_URL_EXPIRY_SECONDS || "900", 10); // 15 mins default

function generateFileSignedToken(fileId: string, userId: string, expirySeconds: number = SIGNED_URL_EXPIRY_SECONDS): string {
  const expiresAt = Math.floor(Date.now() / 1000) + expirySeconds;
  const payload = `${fileId}:${userId}:${expiresAt}`;
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(payload).digest("hex");
  return `${expiresAt}.${signature}`;
}

function verifyFileSignedToken(fileId: string, userId: string, token: string): boolean {
  try {
    const [expiresAtStr, signature] = token.split(".");
    if (!expiresAtStr || !signature) return false;
    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt) || Math.floor(Date.now() / 1000) > expiresAt) {
      return false; // Expired
    }
    const payload = `${fileId}:${userId}:${expiresAt}`;
    const expectedSignature = crypto.createHmac("sha256", JWT_SECRET).update(payload).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSignature, "hex"));
  } catch {
    return false;
  }
}

// ── TRANSACTIONAL EMAIL DELIVERY SERVICE (AUDITED & DEDUPLICATED) ──────────
async function sendTransactionalEmail({
  recipient,
  template,
  subject,
  htmlContent,
  idempotencyKey,
  metadata,
}: {
  recipient: string;
  template: "APPOINTMENT_REQUESTED" | "APPOINTMENT_CONFIRMED" | "APPOINTMENT_REJECTED" | "APPOINTMENT_CANCELLED" | "APPOINTMENT_RESCHEDULED" | "PRESCRIPTION_ISSUED" | "ACCOUNT_UPDATE" | "REMINDER";
  subject: string;
  htmlContent: string;
  idempotencyKey?: string;
  metadata?: any;
}): Promise<{ success: boolean; messageId?: string; error?: string; skippedDuplicate?: boolean }> {
  // 1. Idempotency Check: Avoid duplicate emails when requests are retried
  if (idempotencyKey) {
    try {
      const existingLog = await prisma.emailLog.findUnique({
        where: { idempotencyKey }
      });
      if (existingLog && existingLog.deliveryStatus === "SENT") {
        console.log(`[Email] Skipping duplicate delivery for idempotencyKey: ${idempotencyKey}`);
        return { success: true, messageId: existingLog.id, skippedDuplicate: true };
      }
    } catch (e) {
      // Continue if log check fails
    }
  }

  const metaStr = metadata ? (typeof metadata === "string" ? metadata : JSON.stringify(metadata)) : null;

  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || `"CareConnect Health" <noreply@careconnect.health>`,
      to: recipient,
      subject,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    if (!info || (!info.messageId && !info.accepted)) {
      throw new Error("SMTP server did not accept message");
    }

    // Record delivery attempt and successful acceptance
    try {
      await prisma.emailLog.upsert({
        where: { idempotencyKey: idempotencyKey || crypto.randomUUID() },
        create: {
          recipient,
          template,
          subject,
          idempotencyKey: idempotencyKey || null,
          deliveryStatus: "SENT",
          attempts: 1,
          metadata: metaStr,
          sentAt: new Date(),
        },
        update: {
          deliveryStatus: "SENT",
          attempts: { increment: 1 },
          sentAt: new Date(),
          error: null,
        }
      });
    } catch (dbErr) {
      console.error("[EmailLog DB Error]", dbErr);
    }

    return { success: true, messageId: info.messageId || "delivered" };
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.error(`[Email Error] Failed delivery to ${recipient}:`, errMsg);

    try {
      await prisma.emailLog.upsert({
        where: { idempotencyKey: idempotencyKey || crypto.randomUUID() },
        create: {
          recipient,
          template,
          subject,
          idempotencyKey: idempotencyKey || null,
          deliveryStatus: "FAILED",
          attempts: 1,
          error: errMsg,
          metadata: metaStr,
        },
        update: {
          deliveryStatus: "FAILED",
          attempts: { increment: 1 },
          error: errMsg,
        }
      });
    } catch (dbErr) {
      // ignore
    }

    return { success: false, error: errMsg };
  }
}

// ── HEALTHCARE PRIVACY-COMPLIANT EMAIL TEMPLATE GENERATOR ──────────────────
function buildCareConnectEmailTemplate({
  headline,
  recipientName,
  bodyParagraphs,
  actionButtonText,
  actionButtonUrl,
  noticeText
}: {
  headline: string;
  recipientName: string;
  bodyParagraphs: string[];
  actionButtonText?: string;
  actionButtonUrl?: string;
  noticeText?: string;
}): string {
  const portalUrl = actionButtonUrl || "http://localhost:8080";
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 16px;">
      <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
        <div style="background-color: #0f172a; padding: 24px 32px; border-bottom: 2px solid #0d9488;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">
            Care<span style="color: #14b8a6;">Connect</span>
          </h1>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px;">Clinical Telemedicine & Health Portal</p>
        </div>
        
        <div style="padding: 32px;">
          <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 18px; font-weight: 700;">${headline}</h2>
          <p style="color: #334155; font-size: 14px; line-height: 1.5; margin: 0 0 14px 0;">
            Hello <strong>${recipientName || "Valued User"}</strong>,
          </p>
          ${bodyParagraphs.map(p => `<p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;">${p}</p>`).join("")}
          
          ${actionButtonText ? `
            <div style="margin: 28px 0; text-align: center;">
              <a href="${portalUrl}" style="background-color: #0d9488; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block;">
                ${actionButtonText}
              </a>
            </div>
          ` : ""}
          
          ${noticeText ? `
            <div style="background-color: #f1f5f9; border-radius: 8px; padding: 12px 16px; margin-top: 24px;">
              <p style="color: #64748b; font-size: 12px; margin: 0; line-height: 1.5;">
                🔒 <strong>Privacy Notice:</strong> ${noticeText}
              </p>
            </div>
          ` : ""}
        </div>
        
        <div style="background-color: #f8fafc; padding: 18px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="color: #94a3b8; font-size: 11px; margin: 0;">
            CareConnect Health Services &bull; Confirmed Transactional Notification
          </p>
        </div>
      </div>
    </div>
  `;
}

// ── UNIFIED IN-APP & REAL-TIME DISPATCH SERVICE ────────────────────────────
interface SendNotificationParams {
  userId?: string | null;
  recipientEmail?: string | null;
  recipientName?: string | null;
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  category?: "appointment" | "prescription" | "account" | "general";
  link?: string;
  emailTemplate?: "APPOINTMENT_REQUESTED" | "APPOINTMENT_CONFIRMED" | "APPOINTMENT_REJECTED" | "APPOINTMENT_CANCELLED" | "APPOINTMENT_RESCHEDULED" | "PRESCRIPTION_ISSUED" | "ACCOUNT_UPDATE" | "REMINDER";
  emailSubject?: string;
  emailHtml?: string;
  idempotencyKey?: string;
}

async function createAndDispatchNotification(params: SendNotificationParams) {
  const {
    userId,
    recipientEmail,
    title,
    message,
    type = "info",
    category = "general",
    link,
    emailTemplate,
    emailSubject,
    emailHtml,
    idempotencyKey,
  } = params;

  // 1. In-App Notification (Database)
  const notif = await prisma.notification.create({
    data: {
      userId: userId || null,
      title,
      message,
      type,
      category,
      link: link || null,
    }
  });

  // 2. Real-Time Delivery (Targeted User Room + Broadcast Fallback)
  if (userId) {
    io.to(`user:${userId}`).emit("notificationCreated", notif);
  } else {
    io.emit("notificationCreated", notif);
  }

  // 3. Transactional Email Delivery (if email delivery configured)
  let emailResult: any = null;
  if (recipientEmail && emailTemplate && emailSubject && emailHtml) {
    emailResult = await sendTransactionalEmail({
      recipient: recipientEmail,
      template: emailTemplate,
      subject: emailSubject,
      htmlContent: emailHtml,
      idempotencyKey,
      metadata: { userId, title, category, notifId: notif.id }
    });
  }

  return { notification: notif, emailResult };
}

// In-memory OTP Store for email validation
const otpStore: Record<string, string> = {};

// ==========================================
// 🔐 AUTHENTICATION ENDPOINTS
// ==========================================

// 1. PATIENT REGISTRATION
app.post("/api/auth/register-patient", async (req, res) => {
  const { name, email, phone, password, age, gender, bloodGroup, address } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long." });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: "An account with this email already exists." });
    }

    const passwordHash = hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        passwordHash,
        role: "patient",
        isEmailVerified: false,
        status: "Active",
      }
    });

    // Create linked Patient Profile
    const patientRecord = await prisma.patient.create({
      data: {
        userId: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || "Not specified",
        age: age ? parseInt(age.toString(), 10) : 30,
        gender: gender || "Not specified",
        bloodGroup: bloodGroup || "Unknown",
        address: address || null,
        status: "Active",
      }
    });

    // Generate 6-digit verification OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = otp;

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"CareConnect" <no-reply@careconnect.com>',
        to: email,
        subject: "Welcome to CareConnect - Verify Your Account",
        text: `Welcome ${name}! Your email verification code is: ${otp}`,
        html: `<h2>Welcome to CareConnect</h2><p>Your verification code is: <b style="font-size:24px;color:#2563eb;">${otp}</b></p>`,
      });
      console.log(`[Verification OTP] Sent to ${email}: ${otp}`);
    } catch (mailErr) {
      console.warn("Mail send warning:", mailErr);
    }

    const token = generateToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: "patient",
      status: "Active",
    });

    res.status(201).json({
      success: true,
      message: "Patient registered successfully.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: "patient",
        isEmailVerified: false,
        patientId: patientRecord.id,
        token,
      },
      devOtp: process.env.NODE_ENV !== "production" ? otp : undefined
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Patient registration error:", errorMsg);
    res.status(500).json({ error: "Failed to register patient: " + errorMsg });
  }
});

// 2. DOCTOR REGISTRATION & CREDENTIAL APPLICATION
app.post("/api/auth/register-doctor", async (req, res) => {
  const {
    name,
    email,
    phone,
    password,
    specialization,
    qualifications,
    experienceYears,
    hospitalAffiliation,
    medicalLicenseNumber,
    consultationFee
  } = req.body;

  if (!name || !email || !password || !specialization || !medicalLicenseNumber) {
    return res.status(400).json({
      error: "Full name, professional email, password, specialization, and medical license number are required."
    });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long." });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: "An account with this email already exists." });
    }

    const passwordHash = hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name: name.startsWith("Dr.") ? name : `Dr. ${name}`,
        email,
        phone: phone || null,
        passwordHash,
        role: "doctor",
        isEmailVerified: false,
        status: "Active",
      }
    });

    // Create linked Doctor Profile with PENDING status
    const doctorProfile = await prisma.doctorProfile.create({
      data: {
        userId: user.id,
        specialization,
        qualifications: qualifications || "MBBS",
        experienceYears: experienceYears ? parseInt(experienceYears.toString(), 10) : 1,
        hospitalAffiliation: hospitalAffiliation || "CareConnect Clinical Network",
        medicalLicenseNumber,
        consultationFee: consultationFee ? parseFloat(consultationFee.toString()) : 500,
        verificationStatus: "PENDING",
      }
    });

    // Notify admins about new doctor credential review
    const notif = await prisma.notification.create({
      data: {
        title: "👨‍⚕️ New Doctor Credential Review",
        message: `${user.name} (${specialization}) submitted license #${medicalLicenseNumber} for verification.`,
        type: "warning",
      }
    });
    io.emit("notificationCreated", notif);
    io.emit("doctorRegistered", { userId: user.id, name: user.name, specialization });

    const token = generateToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: "doctor",
      verificationStatus: "PENDING",
      status: "Active",
    });

    res.status(201).json({
      success: true,
      message: "Doctor application submitted successfully. Verification is pending administrative review.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: "doctor",
        verificationStatus: "PENDING",
        doctorProfile,
        token,
      }
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Doctor registration error:", errorMsg);
    res.status(500).json({ error: "Failed to register doctor: " + errorMsg });
  }
});

// 3. SECURE UNIFIED LOGIN
app.post("/api/auth/login", async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        doctorProfile: true,
        patients: true,
      }
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email address or password." });
    }

    if (user.status === "Suspended") {
      return res.status(403).json({ error: "Your account has been suspended. Please contact hospital administration." });
    }

    // Role mismatch check if role was specifically requested in the portal tab
    if (role && user.role !== role) {
      // If user is admin logging in, allow them
      if (user.role !== "admin") {
        return res.status(403).json({
          error: `Account role mismatch. You are registered as a ${user.role}, but tried to sign in as a ${role}.`
        });
      }
    }

    // Password verification
    let isPasswordValid = false;
    if (user.passwordHash) {
      isPasswordValid = verifyPassword(password, user.passwordHash);
    } else {
      // Legacy user without password - allow initial password setup if password provided matches OTP or setup
      if (password === "CareConnect@123" || password.length >= 6) {
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: hashPassword(password) }
        });
        isPasswordValid = true;
      }
    }

    if (!isPasswordValid) {
      await logAuditEvent({
        userId: user ? user.id : null,
        action: "LOGIN_FAILED",
        entity: "User",
        details: { email, reason: "Invalid credentials" },
        severity: "WARN",
        ...getClientMeta(req)
      });
      return res.status(401).json({ error: "Invalid email address or password." });
    }

    // Get doctor verification status
    let verificationStatus = "VERIFIED";
    if (user.role === "doctor") {
      if (!user.doctorProfile) {
        // Auto-create default profile if missing
        const newDocProfile = await prisma.doctorProfile.create({
          data: {
            userId: user.id,
            specialization: "General Practice",
            qualifications: "MBBS",
            experienceYears: 5,
            medicalLicenseNumber: `MED-${Math.floor(10000 + Math.random() * 90000)}`,
            verificationStatus: "VERIFIED",
          }
        });
        verificationStatus = newDocProfile.verificationStatus;
      } else {
        verificationStatus = user.doctorProfile.verificationStatus;
      }
    }

    const token = generateToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      verificationStatus,
      status: user.status,
    });

    await logAuditEvent({
      userId: user.id,
      action: "LOGIN",
      entity: "User",
      entityId: user.id,
      details: { email: user.email, role: user.role },
      severity: "INFO",
      ...getClientMeta(req)
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
        verificationStatus,
        isEmailVerified: user.isEmailVerified,
        doctorProfile: user.doctorProfile,
        patientId: user.patients?.[0]?.id,
        token,
      }
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Login error:", errorMsg);
    res.status(500).json({ error: "Authentication service error. Please try again later." });
  }
});

// 4. VERIFY SESSION & CURRENT USER PROFILE (ME)
app.get("/api/auth/me", authenticateToken, async (req: any, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        doctorProfile: true,
        patients: true,
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User session expired or not found." });
    }

    if (user.status === "Suspended") {
      return res.status(403).json({ error: "Your account is currently suspended." });
    }

    const verificationStatus = user.doctorProfile?.verificationStatus || (user.role === "doctor" ? "PENDING" : "VERIFIED");

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
        status: user.status,
        verificationStatus,
        isEmailVerified: user.isEmailVerified,
        doctorProfile: user.doctorProfile,
        patientId: user.patients?.[0]?.id,
      }
    });
  } catch (err: unknown) {
    res.status(500).json({ error: "Failed to retrieve user profile" });
  }
});

// 5. PASSWORD RESET REQUEST
app.post("/api/auth/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email address is required." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return generic success to prevent email enumeration
      return res.json({ success: true, message: "If your email is registered, a reset code has been sent." });
    }

    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt,
      }
    });

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"CareConnect Security" <no-reply@careconnect.com>',
        to: email,
        subject: "CareConnect Password Reset Request",
        text: `Your password reset code is: ${resetToken}. It expires in 15 minutes.`,
        html: `<h2>Password Reset Request</h2><p>Use the following 6-digit code to reset your password:</p><h1 style="color:#2563eb;letter-spacing:4px;">${resetToken}</h1><p>This code will expire in 15 minutes.</p>`,
      });
      console.log(`[Password Reset] Code sent to ${email}: ${resetToken}`);
    } catch (mailErr) {
      console.warn("Mail error:", mailErr);
    }

    res.json({
      success: true,
      message: "If your email is registered, a reset code has been sent.",
      devResetToken: process.env.NODE_ENV !== "production" ? resetToken : undefined
    });
  } catch (err: unknown) {
    res.status(500).json({ error: "Failed to process password reset request." });
  }
});

// 6. PASSWORD RESET CONFIRMATION
app.post("/api/auth/reset-password", async (req, res) => {
  const { email, resetToken, newPassword } = req.body;
  if (!email || !resetToken || !newPassword) {
    return res.status(400).json({ error: "Email, reset code, and new password are required." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: "Invalid reset token or email." });
    }

    const resetRecord = await prisma.passwordReset.findFirst({
      where: {
        userId: user.id,
        token: resetToken,
        used: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!resetRecord) {
      return res.status(400).json({ error: "Invalid or expired reset code." });
    }

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashPassword(newPassword)
      }
    });

    // Invalidate reset code
    await prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { used: true }
    });

    res.json({ success: true, message: "Your password has been reset successfully. Please log in with your new password." });
  } catch (err: unknown) {
    res.status(500).json({ error: "Failed to reset password." });
  }
});

// 7. EMAIL VERIFICATION
app.post("/api/auth/verify-email", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required." });
  }

  const validOtp = otpStore[email];
  if (validOtp && validOtp === otp) {
    delete otpStore[email];
    await prisma.user.update({
      where: { email },
      data: { isEmailVerified: true }
    });
    return res.json({ success: true, message: "Email successfully verified!" });
  }
  return res.status(400).json({ error: "Invalid or expired verification code." });
});

// 8. LEGACY OTP REQUEST & VERIFY (Backwards Compatibility preserved)
app.post("/api/auth/request-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email address is required" });
  }

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

    console.log(`[OTP] Sent to ${email}: ${otp}`);
    res.json({ success: true, message: "OTP sent successfully", otp });
  } catch (error: unknown) {
    console.log(`[OTP Mock Fallback] Real Email failed, logged to console. OTP: ${otp}`);
    res.json({ success: true, message: "OTP generated successfully", otp });
  }
});

app.post("/api/auth/verify-otp", async (req, res) => {
  const { email, otp, role = "patient", name } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required" });
  }

  const validOtp = otpStore[email];
  if (validOtp && validOtp === otp) {
    delete otpStore[email];

    try {
      let user = await prisma.user.findUnique({
        where: { email },
        include: { doctorProfile: true }
      });

      // SECURITY: Disallow self-assignment of admin role upon OTP verification
      let assignedRole = role === "doctor" ? "doctor" : "patient";
      if (user && user.role === "admin") {
        assignedRole = "admin"; // preserve existing admin account
      }
      const isDoctor = assignedRole === "doctor";


      if (user) {
        if (user.role !== assignedRole && user.role !== "admin") {
          user = await prisma.user.update({
            where: { email },
            data: { role: assignedRole },
            include: { doctorProfile: true }
          });
        }
      } else {
        const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
        const finalName = name && name.trim() !== "" ? name : (assignedRole === "doctor" ? "Dr. " + uniqueSuffix : "Patient " + uniqueSuffix);
        user = await prisma.user.create({
          data: {
            email,
            role: assignedRole,
            name: finalName,
            isEmailVerified: true,
          },
          include: { doctorProfile: true }
        });

        if (!isDoctor) {
          await prisma.patient.create({
            data: {
              userId: user.id,
              name: user.name,
              age: 30,
              gender: "Not specified",
              email: user.email,
            }
          });
        } else {
          await prisma.doctorProfile.create({
            data: {
              userId: user.id,
              specialization: "General Practice",
              qualifications: "MBBS",
              medicalLicenseNumber: `MED-${uniqueSuffix}`,
              verificationStatus: "PENDING",
            }
          });
        }
      }

      let verificationStatus = user.doctorProfile?.verificationStatus || (user.role === "doctor" ? "PENDING" : "VERIFIED");

      const token = generateToken({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        verificationStatus,
      });

      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone || "",
          role: user.role,
          verificationStatus,
          isEmailVerified: user.isEmailVerified,
          doctorProfile: user.doctorProfile,
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

  socket.on("authenticate", (data: any) => {
    let targetUserId = data?.userId;
    if (!targetUserId && data?.token) {
      const decoded = verifyToken(data.token);
      if (decoded?.id) targetUserId = decoded.id;
    }
    if (targetUserId) {
      socket.join(`user:${targetUserId}`);
    }
  });

  socket.on("joinUserRoom", (userId: string) => {
    if (userId) {
      socket.join(`user:${userId}`);
    }
  });

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

// ==========================================
// 📅 APPOINTMENTS SUITE & BOOKING INTEGRITY
// ==========================================

const PERMITTED_STATUS_TRANSITIONS: Record<string, string[]> = {
  "Pending": ["Confirmed", "Rejected", "Cancelled", "Reschedule Requested", "Scheduled"],
  "Confirmed": ["Completed", "Cancelled", "Reschedule Requested"],
  "Scheduled": ["Completed", "Cancelled", "Reschedule Requested"], // legacy alias for Confirmed
  "Reschedule Requested": ["Confirmed", "Cancelled", "Rejected", "Scheduled"],
  "Rescheduled": ["Completed", "Cancelled", "Reschedule Requested"], // legacy alias
  "Completed": [], // Terminal
  "Cancelled": [], // Terminal
  "Rejected": [], // Terminal
};

function parseTimeToMinutes(tStr: string): number {
  if (!tStr) return 0;
  const cleaned = tStr.trim();
  const parts = cleaned.split(" ");
  const timePart = parts[0];
  const ampm = parts[1] ? parts[1].toUpperCase() : "AM";
  const [h, m] = timePart.split(":").map(Number);
  let hours = (h % 12);
  if (ampm === "PM") hours += 12;
  return hours * 60 + (m || 0);
}

function minutesToTimeStr(mins: number): string {
  const totalMins = mins % (24 * 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m < 10 ? `0${m}` : `${m}`;
  return `${displayH < 10 ? `0${displayH}` : displayH}:${displayM} ${ampm}`;
}

function calculateEndTime(startTimeStr: string, durationMinutes = 30): string {
  const startMins = parseTimeToMinutes(startTimeStr);
  const endMins = startMins + durationMinutes;
  return minutesToTimeStr(endMins);
}

function isValidDateString(dateStr: string): boolean {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) return false;
  const [y, m, d] = dateStr.trim().split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function isValidTimeString(timeStr: string): boolean {
  if (!timeStr) return false;
  return /^(0?[1-9]|1[0-2]):[0-5][0-9]\s*(AM|PM)$/i.test(timeStr.trim());
}

function isSlotInThePast(dateStr: string, timeStr: string): boolean {
  if (!isValidDateString(dateStr) || !isValidTimeString(timeStr)) return true;
  const mins = parseTimeToMinutes(timeStr);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const [y, mon, d] = dateStr.trim().split("-").map(Number);
  const slotDate = new Date(y, mon - 1, d, h, m, 0, 0);
  const now = new Date();
  return slotDate.getTime() <= now.getTime();
}

function formatAppointment(a: any) {
  const appointmentDate = a.date || a.appointmentDate || "";
  const startTime = a.time || a.startTime || "";
  const endTime = a.endTime || (startTime ? calculateEndTime(startTime, 30) : "");
  const consultationType = a.consultationType || "In-Person";
  const reasonForVisit = a.reasonForVisit || a.therapy || a.notes || "General Clinical Consultation";
  const cancellationReason = a.cancellationReason || a.cancelReason || null;
  const status = a.status === "Scheduled" ? "Confirmed" : a.status;

  return {
    id: a.id,
    patient_id: a.patientId,
    patientId: a.patientId,
    doctor_id: a.doctorId,
    doctorId: a.doctorId,
    appointment_date: appointmentDate,
    appointmentDate: appointmentDate,
    date: appointmentDate,
    start_time: startTime,
    startTime: startTime,
    time: startTime,
    end_time: endTime,
    endTime: endTime,
    consultation_type: consultationType,
    consultationType: consultationType,
    reason_for_visit: reasonForVisit,
    reasonForVisit: reasonForVisit,
    therapy: reasonForVisit,
    status: status,
    cancellation_reason: cancellationReason,
    cancellationReason: cancellationReason,
    cancelReason: cancellationReason,
    suggested_date: a.suggestedDate,
    suggestedDate: a.suggestedDate,
    suggested_time: a.suggestedTime,
    suggestedTime: a.suggestedTime,
    reschedule_reason: a.rescheduleReason,
    rescheduleReason: a.rescheduleReason,
    rescheduled_by: a.rescheduledBy,
    rescheduledBy: a.rescheduledBy,
    notes: a.notes,
    amount: a.amount,
    completedAt: a.completedAt,
    created_at: a.createdAt,
    createdAt: a.createdAt,
    updated_at: a.updatedAt,
    updatedAt: a.updatedAt,
    patient: a.patient?.name || "Unknown Patient",
    patientDetails: a.patient ? {
      id: a.patient.id,
      name: a.patient.name,
      age: a.patient.age,
      gender: a.patient.gender,
      phone: a.patient.phone,
      email: a.patient.email,
      bloodGroup: a.patient.bloodGroup,
      allergies: a.patient.allergies,
      medicalHistory: a.patient.medicalHistory,
      lastVisit: a.patient.lastVisit,
    } : null,
    doctor: a.doctor ? {
      id: a.doctor.id,
      name: a.doctor.name,
      email: a.doctor.email,
      phone: a.doctor.phone,
      specialization: a.doctor.doctorProfile?.specialization || "General Medicine",
      qualifications: a.doctor.doctorProfile?.qualifications || "MBBS",
      hospitalAffiliation: a.doctor.doctorProfile?.hospitalAffiliation || "CareConnect Clinic",
      consultationFee: a.doctor.doctorProfile?.consultationFee || 500,
      verificationStatus: a.doctor.doctorProfile?.verificationStatus || "VERIFIED"
    } : null
  };
}

// 1. Fetch Appointments (Role-Protected & Filtered)
app.get("/api/appointments", authenticateToken, async (req: any, res) => {
  try {
    let queryOptions: any = {};
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
    } else if (req.user.role === "doctor") {
      queryOptions = {
        where: {
          OR: [
            { doctorId: req.user.id },
            { doctorId: null }
          ]
        }
      };
    }

    if (req.query.status) {
      const qStatus = req.query.status as string;
      if (qStatus === "Confirmed") {
        queryOptions.where = { ...(queryOptions.where || {}), status: { in: ["Confirmed", "Scheduled"] } };
      } else {
        queryOptions.where = { ...(queryOptions.where || {}), status: qStatus };
      }
    }
    if (req.query.date) {
      queryOptions.where = { ...(queryOptions.where || {}), date: req.query.date };
    }
    if (req.query.patientId) {
      queryOptions.where = { ...(queryOptions.where || {}), patientId: req.query.patientId };
    }
    if (req.query.doctorId) {
      queryOptions.where = { ...(queryOptions.where || {}), doctorId: req.query.doctorId };
    }

    const appointments = await prisma.appointment.findMany({
      ...queryOptions,
      include: {
        patient: true,
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            doctorProfile: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = appointments.map((a: any) => formatAppointment(a));
    res.json(formatted);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to fetch appointments: " + errMsg });
  }
});

// 2. Fetch Single Appointment Details (Strict Authorization)
app.get("/api/appointments/:id", authenticateToken, async (req: any, res) => {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: {
        patient: true,
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            doctorProfile: true,
          }
        }
      }
    });

    if (!appt) {
      return res.status(404).json({ error: "Appointment not found." });
    }

    // Check authorization
    if (req.user.role === "patient") {
      const isOwner = appt.patient.userId === req.user.id || appt.patient.email === req.user.email || appt.patient.name === req.user.name;
      if (!isOwner) {
        return res.status(403).json({ error: "Access denied. You are not authorized to view this appointment." });
      }
    } else if (req.user.role === "doctor") {
      const isAssigned = !appt.doctorId || appt.doctorId === req.user.id;
      if (!isAssigned) {
        return res.status(403).json({ error: "Access denied. You are not authorized to view this appointment." });
      }
    }

    res.json(formatAppointment(appt));
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to fetch appointment: " + errMsg });
  }
});

// 3. Delete Appointment
app.delete("/api/appointments/:id", authenticateToken, async (req: any, res) => {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: { patient: true }
    });
    if (!appt) return res.status(404).json({ error: "Appointment not found." });

    if (req.user.role === "patient") {
      const isOwner = appt.patient.userId === req.user.id || appt.patient.email === req.user.email || appt.patient.name === req.user.name;
      if (!isOwner) return res.status(403).json({ error: "Access denied. You can only delete your own appointments." });
    } else if (req.user.role === "doctor") {
      if (appt.doctorId && appt.doctorId !== req.user.id) {
        return res.status(403).json({ error: "Access denied." });
      }
    }

    const deleted = await prisma.appointment.delete({ where: { id: req.params.id } });
    io.emit("appointmentDeleted", deleted.id);
    res.json({ success: true });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to delete: " + errMsg });
  }
});

// 4. Create New Appointment (Patient Workflow with Server-Side Availability & Integrity)
app.post("/api/appointments", authenticateToken, async (req: any, res) => {
  const {
    patientId,
    patientName,
    patientPhone,
    patientAge,
    patientGender,
    doctorId,
    date,
    appointment_date,
    appointmentDate,
    time,
    start_time,
    startTime,
    endTime,
    end_time,
    consultationType,
    consultation_type,
    therapy,
    reason_for_visit,
    reasonForVisit,
    notes,
    amount,
    status
  } = req.body;

  try {
    const reqDate = (date || appointment_date || appointmentDate || "").trim();
    const reqTime = (time || start_time || startTime || "").trim();
    const reqConsultType = consultationType || consultation_type || "In-Person";
    const reqReason = reason_for_visit || reasonForVisit || therapy || notes || "General Clinical Consultation";

    // 1. Validate date & time format
    if (!reqDate || !isValidDateString(reqDate)) {
      return res.status(400).json({ error: "Invalid appointment date format. Use YYYY-MM-DD." });
    }
    if (!reqTime || !isValidTimeString(reqTime)) {
      return res.status(400).json({ error: "Invalid appointment time format. Use HH:MM AM/PM (e.g. 09:30 AM)." });
    }

    // 2. Reject bookings in the past
    if (isSlotInThePast(reqDate, reqTime)) {
      return res.status(400).json({ error: "Cannot book appointments in the past. Please select an upcoming date and time." });
    }

    // 3. Resolve or create patient
    let resolvedPatientId = patientId;
    if (!resolvedPatientId) {
      let existingPatient;
      if (req.user.role === "patient") {
        existingPatient = await prisma.patient.findFirst({
          where: {
            OR: [
              { userId: req.user.id },
              { email: req.user.email },
              { name: req.user.name }
            ]
          }
        });
      } else if (patientName) {
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
        let validUserId: string | null = null;
        if (req.user?.id) {
          const userRec = await prisma.user.findUnique({ where: { id: req.user.id } });
          if (userRec) validUserId = userRec.id;
        }

        existingPatient = await prisma.patient.create({
          data: {
            name: patientName || req.user.name || "CareConnect Patient",
            phone: patientPhone || req.user.phone || "Not specified",
            age: patientAge ? parseInt(patientAge.toString(), 10) : 30,
            gender: patientGender || "Not specified",
            dosha: "Not evaluated",
            status: "Active",
            userId: validUserId,
            email: req.user.role === "patient" ? req.user.email : null
          }
        });
      }
      resolvedPatientId = existingPatient.id;
    }

    if (!resolvedPatientId) {
      return res.status(400).json({ error: "Unable to associate appointment with a valid patient record." });
    }

    // 4. Validate doctor availability settings if doctorId is provided
    let slotDurationMinutes = 30;
    if (doctorId) {
      const doctorUser = await prisma.user.findUnique({
        where: { id: doctorId },
        include: { doctorProfile: true }
      });
      if (!doctorUser || doctorUser.role !== "doctor") {
        return res.status(404).json({ error: "Selected doctor was not found or is not registered as a doctor." });
      }

      const profile = doctorUser.doctorProfile;
      if (profile) {
        slotDurationMinutes = profile.slotDurationMinutes || 30;
        // Verify doctor working days
        const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const dayName = daysOfWeek[new Date(reqDate + "T00:00:00").getDay()];
        const workingDaysList = (profile.workingDays || "Monday,Tuesday,Wednesday,Thursday,Friday").split(",").map(d => d.trim());
        if (!workingDaysList.includes(dayName)) {
          return res.status(400).json({ error: `Dr. ${doctorUser.name} does not conduct consultations on ${dayName}s.` });
        }

        // Verify unavailable dates
        const unavailableDates = profile.unavailableDates ? JSON.parse(profile.unavailableDates) : [];
        if (unavailableDates.includes(reqDate)) {
          return res.status(400).json({ error: `Dr. ${doctorUser.name} has marked ${reqDate} as unavailable.` });
        }

        // Verify leave range
        if (profile.leaveStartDate && profile.leaveEndDate && reqDate >= profile.leaveStartDate && reqDate <= profile.leaveEndDate) {
          return res.status(400).json({ error: `Dr. ${doctorUser.name} is on scheduled leave between ${profile.leaveStartDate} and ${profile.leaveEndDate}.` });
        }

        // Verify working hours & break time
        const slotMins = parseTimeToMinutes(reqTime);
        const startMins = parseTimeToMinutes(profile.startTime || "09:00 AM");
        const endMins = parseTimeToMinutes(profile.endTime || "05:00 PM");
        const breakStartMins = parseTimeToMinutes(profile.breakStartTime || "01:00 PM");
        const breakEndMins = parseTimeToMinutes(profile.breakEndTime || "02:00 PM");

        if (slotMins < startMins || slotMins + slotDurationMinutes > endMins) {
          return res.status(400).json({ error: `Requested time ${reqTime} is outside Dr. ${doctorUser.name}'s consultation hours (${profile.startTime} - ${profile.endTime}).` });
        }
        if (slotMins >= breakStartMins && slotMins < breakEndMins) {
          return res.status(400).json({ error: `Requested time ${reqTime} falls during Dr. ${doctorUser.name}'s scheduled break period.` });
        }
      }
    }

    const calculatedEndTime = endTime || end_time || calculateEndTime(reqTime, slotDurationMinutes);

    // 5. Duplicate Submission Guard (Within 15 seconds)
    const duplicateWindow = new Date(Date.now() - 15000);
    const recentDuplicate = await prisma.appointment.findFirst({
      where: {
        patientId: resolvedPatientId,
        doctorId: doctorId || null,
        date: reqDate,
        time: reqTime,
        createdAt: { gte: duplicateWindow }
      },
      include: {
        patient: true,
        doctor: {
          select: { id: true, name: true, email: true, phone: true, doctorProfile: true }
        }
      }
    });
    if (recentDuplicate) {
      return res.status(200).json(formatAppointment(recentDuplicate));
    }

    // 6. Database Transaction to prevent race conditions & double-bookings
    const newAppointment = await prisma.$transaction(async (tx) => {
      // Check doctor conflict
      if (doctorId) {
        const doctorConflict = await tx.appointment.findFirst({
          where: {
            doctorId: doctorId,
            date: reqDate,
            time: reqTime,
            status: { in: ["Pending", "Confirmed", "Scheduled", "Reschedule Requested"] }
          }
        });
        if (doctorConflict) {
          throw new Error(`CONFLICT_DOCTOR: Dr. is already booked on ${reqDate} at ${reqTime}. Please select an alternative available slot.`);
        }
      }

      // Check patient conflict
      const patientConflict = await tx.appointment.findFirst({
        where: {
          patientId: resolvedPatientId,
          date: reqDate,
          time: reqTime,
          status: { in: ["Pending", "Confirmed", "Scheduled", "Reschedule Requested"] }
        }
      });
      if (patientConflict) {
        throw new Error(`CONFLICT_PATIENT: You already have an active appointment scheduled on ${reqDate} at ${reqTime}.`);
      }

      return await tx.appointment.create({
        data: {
          patientId: resolvedPatientId,
          doctorId: doctorId || null,
          date: reqDate,
          appointmentDate: reqDate,
          time: reqTime,
          startTime: reqTime,
          endTime: calculatedEndTime,
          consultationType: reqConsultType,
          therapy: reqReason,
          reasonForVisit: reqReason,
          notes: notes || null,
          status: status || "Pending",
          amount: amount ? parseFloat(amount.toString()) : 500,
        },
        include: {
          patient: true,
          doctor: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              doctorProfile: true,
            }
          }
        }
      });
    });

    const formatted = formatAppointment(newAppointment);

    // Broadcast real-time update
    io.emit("appointmentCreated", formatted);

    // 1. Targeted notification & transactional email for doctor
    if (doctorId) {
      await createAndDispatchNotification({
        userId: doctorId,
        recipientEmail: newAppointment.doctor?.email,
        recipientName: newAppointment.doctor?.name,
        title: "New Appointment Request",
        message: `Patient ${formatted.patient} requested a ${formatted.consultationType} consultation on ${formatted.date} at ${formatted.time}.`,
        type: "info",
        category: "appointment",
        link: "/doctor/dashboard?tab=requests",
        emailTemplate: "APPOINTMENT_REQUESTED",
        emailSubject: `CareConnect: New Appointment Request from ${formatted.patient}`,
        emailHtml: buildCareConnectEmailTemplate({
          headline: "New Appointment Request",
          recipientName: `Dr. ${newAppointment.doctor?.name || "Doctor"}`,
          bodyParagraphs: [
            `A new appointment request has been submitted by <strong>${formatted.patient}</strong>.`,
            `<strong>Date & Time:</strong> ${formatted.date} at ${formatted.time} (${formatted.consultationType})`,
            `Please review and confirm or reschedule this request in your doctor workspace.`
          ],
          actionButtonText: "Review Appointment Requests",
          actionButtonUrl: "http://localhost:8080/doctor/dashboard?tab=requests",
          noticeText: "CareConnect protects patient medical privacy. Full charts and histories are accessible only within your authenticated clinical workspace."
        }),
        idempotencyKey: `appt_req_doc_${newAppointment.id}`
      });
    }

    // 2. Targeted notification & transactional email for patient
    if (newAppointment.patient?.userId) {
      await createAndDispatchNotification({
        userId: newAppointment.patient.userId,
        recipientEmail: newAppointment.patient.email,
        recipientName: newAppointment.patient.name,
        title: "Appointment Request Submitted",
        message: `Your appointment request with Dr. ${newAppointment.doctor?.name || "CareConnect Doctor"} for ${formatted.date} at ${formatted.time} has been submitted.`,
        type: "info",
        category: "appointment",
        link: "/appointments",
        emailTemplate: "APPOINTMENT_REQUESTED",
        emailSubject: "CareConnect: Appointment Request Received",
        emailHtml: buildCareConnectEmailTemplate({
          headline: "Appointment Request Received",
          recipientName: newAppointment.patient.name,
          bodyParagraphs: [
            `Your appointment request with <strong>Dr. ${newAppointment.doctor?.name || "CareConnect Doctor"}</strong> has been received.`,
            `<strong>Requested Date & Time:</strong> ${formatted.date} at ${formatted.time} (${formatted.consultationType})`,
            `You will receive an update as soon as the doctor reviews your request.`
          ],
          actionButtonText: "View Your Appointments",
          actionButtonUrl: "http://localhost:8080/appointments",
          noticeText: "For your privacy, specific symptoms or visit reasons are not included in email notifications."
        }),
        idempotencyKey: `appt_req_pt_${newAppointment.id}`
      });
    }

    res.status(201).json(formatted);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.startsWith("CONFLICT_DOCTOR:")) {
      return res.status(409).json({ error: errMsg.replace("CONFLICT_DOCTOR: ", "") });
    }
    if (errMsg.startsWith("CONFLICT_PATIENT:")) {
      return res.status(409).json({ error: errMsg.replace("CONFLICT_PATIENT: ", "") });
    }
    console.error("Failed to create appointment:", errMsg);
    res.status(500).json({ error: "Failed to create appointment: " + errMsg });
  }
});

// 5. Update Appointment (State Transitions, Rescheduling, Confirming, Cancelling)
app.put("/api/appointments/:id", authenticateToken, async (req: any, res) => {
  const {
    date,
    appointment_date,
    appointmentDate,
    time,
    start_time,
    startTime,
    endTime,
    end_time,
    status,
    cancelReason,
    cancellationReason,
    cancellation_reason,
    notes,
    consultationType,
    consultation_type,
    suggestedDate,
    suggested_date,
    suggestedTime,
    suggested_time,
    rescheduleReason,
    reschedule_reason
  } = req.body;

  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: { patient: true, doctor: true }
    });
    if (!appt) return res.status(404).json({ error: "Appointment not found." });

    const currentStatus = appt.status === "Scheduled" ? "Confirmed" : appt.status;
    let targetStatus = status ? (status === "Scheduled" ? "Confirmed" : status) : currentStatus;

    // 1. Authorization check
    let isPatientOwner = false;
    let isAssignedDoctor = false;

    if (req.user.role === "patient") {
      isPatientOwner = appt.patient.userId === req.user.id || appt.patient.email === req.user.email || appt.patient.name === req.user.name;
      if (!isPatientOwner) {
        return res.status(403).json({ error: "Access denied. You can only modify your own appointments." });
      }
    } else if (req.user.role === "doctor") {
      isAssignedDoctor = !appt.doctorId || appt.doctorId === req.user.id;
      if (!isAssignedDoctor) {
        return res.status(403).json({ error: "Access denied. You can only manage appointments assigned to you." });
      }
    }

    // 2. Terminal state check
    if (["Completed", "Cancelled", "Rejected"].includes(currentStatus)) {
      return res.status(400).json({
        error: `Cannot modify appointment: appointments in '${currentStatus}' status are terminal and cannot be transitioned.`
      });
    }

    // 3. State transition validity
    if (targetStatus !== currentStatus) {
      const allowed = PERMITTED_STATUS_TRANSITIONS[currentStatus] || [];
      if (!allowed.includes(targetStatus)) {
        return res.status(400).json({
          error: `Invalid status transition: Cannot move appointment from '${currentStatus}' to '${targetStatus}'.`
        });
      }

      // Role-specific transition rules
      if (targetStatus === "Completed" && req.user.role !== "doctor" && req.user.role !== "admin") {
        return res.status(403).json({ error: "Only the consulting doctor or administrator can mark an appointment as Completed." });
      }
      if (targetStatus === "Rejected" && req.user.role !== "doctor" && req.user.role !== "admin") {
        return res.status(403).json({ error: "Only the doctor can reject an appointment request." });
      }
    }

    // 4. Cancellation rules
    const effectiveCancelReason = cancellationReason || cancellation_reason || cancelReason;
    if (targetStatus === "Cancelled") {
      if (!effectiveCancelReason || !effectiveCancelReason.trim()) {
        return res.status(400).json({ error: "A valid cancellation reason is required to cancel an appointment." });
      }
      if (isSlotInThePast(appt.date, appt.time)) {
        return res.status(400).json({ error: "Cannot cancel an appointment that has already elapsed." });
      }
    }

    // 5. Rescheduling rules
    const targetDate = (date || appointment_date || appointmentDate || appt.date).trim();
    const targetTime = (time || start_time || startTime || appt.time).trim();
    const isSlotChanging = targetDate !== appt.date || targetTime !== appt.time;

    if (isSlotChanging) {
      if (!isValidDateString(targetDate) || !isValidTimeString(targetTime)) {
        return res.status(400).json({ error: "Invalid date or time format for rescheduled appointment." });
      }
      if (isSlotInThePast(targetDate, targetTime)) {
        return res.status(400).json({ error: "Cannot reschedule an appointment to a date and time in the past." });
      }
    }

    // 6. Transactional update & conflict validation
    const targetDoctorId = appt.doctorId || (req.user.role === "doctor" ? req.user.id : null);

    const updatedAppointment = await prisma.$transaction(async (tx) => {
      // If confirming or changing slot, revalidate availability and conflicts
      if (targetStatus === "Confirmed" || isSlotChanging) {
        if (targetDoctorId) {
          const docConflict = await tx.appointment.findFirst({
            where: {
              id: { not: appt.id },
              doctorId: targetDoctorId,
              date: targetDate,
              time: targetTime,
              status: { in: ["Pending", "Confirmed", "Scheduled", "Reschedule Requested"] }
            }
          });
          if (docConflict) {
            throw new Error(`CONFLICT_DOCTOR: Doctor is already booked on ${targetDate} at ${targetTime}.`);
          }
        }

        const patientConflict = await tx.appointment.findFirst({
          where: {
            id: { not: appt.id },
            patientId: appt.patientId,
            date: targetDate,
            time: targetTime,
            status: { in: ["Pending", "Confirmed", "Scheduled", "Reschedule Requested"] }
          }
        });
        if (patientConflict) {
          throw new Error(`CONFLICT_PATIENT: Patient already has another appointment on ${targetDate} at ${targetTime}.`);
        }
      }

      const calculatedEndTime = endTime || end_time || (targetTime ? calculateEndTime(targetTime, 30) : appt.endTime);
      const isCompleting = targetStatus === "Completed";
      const assigningDoctor = req.user.role === "doctor" && !appt.doctorId;

      return await tx.appointment.update({
        where: { id: req.params.id },
        data: {
          date: targetDate,
          appointmentDate: targetDate,
          time: targetTime,
          startTime: targetTime,
          endTime: calculatedEndTime,
          status: targetStatus,
          cancelReason: effectiveCancelReason !== undefined ? effectiveCancelReason : appt.cancelReason,
          cancellationReason: effectiveCancelReason !== undefined ? effectiveCancelReason : appt.cancellationReason,
          notes: notes !== undefined ? notes : appt.notes,
          consultationType: consultationType || consultation_type || appt.consultationType,
          suggestedDate: suggestedDate || suggested_date || (targetStatus === "Reschedule Requested" ? targetDate : appt.suggestedDate),
          suggestedTime: suggestedTime || suggested_time || (targetStatus === "Reschedule Requested" ? targetTime : appt.suggestedTime),
          rescheduleReason: rescheduleReason || reschedule_reason || appt.rescheduleReason,
          rescheduledBy: targetStatus === "Reschedule Requested" ? req.user.role : appt.rescheduledBy,
          ...(isCompleting && { completedAt: new Date() }),
          ...(assigningDoctor && { doctorId: req.user.id }),
        },
        include: {
          patient: true,
          doctor: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              doctorProfile: true,
            }
          }
        }
      });
    });

    const formatted = formatAppointment(updatedAppointment);

    // Emit real-time socket update
    io.emit("appointmentUpdated", formatted);

    // Targeted notifications and transactional email dispatch
    const patientUserId = updatedAppointment.patient?.userId;
    const patientEmail = updatedAppointment.patient?.email;
    const patientName = updatedAppointment.patient?.name || "Patient";
    const doctorUserId = updatedAppointment.doctorId;
    const doctorEmail = updatedAppointment.doctor?.email;
    const doctorName = updatedAppointment.doctor?.name || "Doctor";

    if (isSlotChanging) {
      // Slot changed and confirmed
      if (patientUserId) {
        await createAndDispatchNotification({
          userId: patientUserId,
          recipientEmail: patientEmail,
          recipientName: patientName,
          title: "Appointment Rescheduled",
          message: `Your appointment with Dr. ${doctorName} has been rescheduled to ${formatted.date} at ${formatted.time}.`,
          type: "info",
          category: "appointment",
          link: "/appointments",
          emailTemplate: "APPOINTMENT_RESCHEDULED",
          emailSubject: "CareConnect: Appointment Reschedule Details",
          emailHtml: buildCareConnectEmailTemplate({
            headline: "Appointment Rescheduled",
            recipientName: patientName,
            bodyParagraphs: [
              `Your appointment with <strong>Dr. ${doctorName}</strong> has been updated to a new time.`,
              `<strong>New Date & Time:</strong> ${formatted.date} at ${formatted.time} (${formatted.consultationType})`,
              `Please log in to your patient dashboard to view your updated schedule.`
            ],
            actionButtonText: "View Updated Schedule",
            actionButtonUrl: "http://localhost:8080/appointments"
          }),
          idempotencyKey: `appt_resched_confirmed_${updatedAppointment.id}_${formatted.date}_${formatted.time}`
        });
      }
    } else if (targetStatus === "Confirmed") {
      // 1. Patient Notification & Email
      if (patientUserId) {
        await createAndDispatchNotification({
          userId: patientUserId,
          recipientEmail: patientEmail,
          recipientName: patientName,
          title: "Appointment Confirmed",
          message: `Your appointment with Dr. ${doctorName} on ${formatted.date} at ${formatted.time} has been confirmed.`,
          type: "success",
          category: "appointment",
          link: "/appointments",
          emailTemplate: "APPOINTMENT_CONFIRMED",
          emailSubject: `CareConnect: Appointment Confirmed with Dr. ${doctorName}`,
          emailHtml: buildCareConnectEmailTemplate({
            headline: "Your Appointment is Confirmed! 🎉",
            recipientName: patientName,
            bodyParagraphs: [
              `Great news! Your clinical appointment with <strong>Dr. ${doctorName}</strong> has been officially confirmed.`,
              `<strong>Date & Time:</strong> ${formatted.date} at ${formatted.time} (${formatted.consultationType})`,
              `You can view details and prepare for your visit directly in the portal.`
            ],
            actionButtonText: "View Confirmed Appointment",
            actionButtonUrl: "http://localhost:8080/appointments",
            noticeText: "For your privacy, specific symptoms or medical notes are never transmitted via unencrypted email notifications."
          }),
          idempotencyKey: `appt_conf_pt_${updatedAppointment.id}`
        });
      }

      // 2. Doctor Notification
      if (doctorUserId && req.user.role !== "doctor") {
        await createAndDispatchNotification({
          userId: doctorUserId,
          recipientEmail: doctorEmail,
          recipientName: `Dr. ${doctorName}`,
          title: "Appointment Confirmed",
          message: `Appointment with ${patientName} on ${formatted.date} at ${formatted.time} is confirmed.`,
          type: "success",
          category: "appointment",
          link: "/doctor/dashboard?tab=appointments",
          idempotencyKey: `appt_conf_doc_${updatedAppointment.id}`
        });
      }
    } else if (targetStatus === "Rejected") {
      // Patient Notification & Email on Rejection
      if (patientUserId) {
        await createAndDispatchNotification({
          userId: patientUserId,
          recipientEmail: patientEmail,
          recipientName: patientName,
          title: "Appointment Request Declined",
          message: `Dr. ${doctorName} was unable to accept your appointment on ${formatted.date}. ${effectiveCancelReason ? `Reason: "${effectiveCancelReason}"` : "Please select another available slot."}`,
          type: "warning",
          category: "appointment",
          link: "/book-appointment",
          emailTemplate: "APPOINTMENT_REJECTED",
          emailSubject: "CareConnect: Update Regarding Your Appointment Request",
          emailHtml: buildCareConnectEmailTemplate({
            headline: "Appointment Request Update",
            recipientName: patientName,
            bodyParagraphs: [
              `We wanted to let you know that <strong>Dr. ${doctorName}</strong> was unable to accept the requested appointment slot on ${formatted.date} at ${formatted.time}.`,
              effectiveCancelReason ? `<strong>Reason provided:</strong> ${effectiveCancelReason}` : `The doctor's schedule was unavailable at that time.`,
              `We encourage you to choose another available date and time that fits your schedule.`
            ],
            actionButtonText: "Select Another Slot",
            actionButtonUrl: "http://localhost:8080/book-appointment",
            noticeText: "CareConnect respects your medical confidentiality. Log in to your secure account to manage bookings."
          }),
          idempotencyKey: `appt_rej_pt_${updatedAppointment.id}`
        });
      }
    } else if (targetStatus === "Cancelled") {
      const isCancelledByPatient = req.user.role === "patient";

      // Notify Doctor
      if (doctorUserId) {
        await createAndDispatchNotification({
          userId: doctorUserId,
          recipientEmail: doctorEmail,
          recipientName: `Dr. ${doctorName}`,
          title: isCancelledByPatient ? "Appointment Cancelled by Patient" : "Appointment Cancelled",
          message: isCancelledByPatient
            ? `${patientName} has cancelled their appointment scheduled for ${formatted.date} at ${formatted.time}. ${effectiveCancelReason ? `Reason: "${effectiveCancelReason}"` : ""}`
            : `Appointment with ${patientName} on ${formatted.date} has been cancelled.`,
          type: "warning",
          category: "appointment",
          link: "/doctor/dashboard?tab=appointments",
          emailTemplate: "APPOINTMENT_CANCELLED",
          emailSubject: `CareConnect: Appointment Cancelled - ${patientName}`,
          emailHtml: buildCareConnectEmailTemplate({
            headline: "Appointment Cancellation Notice",
            recipientName: `Dr. ${doctorName}`,
            bodyParagraphs: [
              `The following appointment has been cancelled ${isCancelledByPatient ? "by the patient" : ""}:`,
              `<strong>Patient:</strong> ${patientName}`,
              `<strong>Original Slot:</strong> ${formatted.date} at ${formatted.time}`,
              effectiveCancelReason ? `<strong>Reason:</strong> ${effectiveCancelReason}` : ""
            ].filter(Boolean),
            actionButtonText: "View Clinical Calendar",
            actionButtonUrl: "http://localhost:8080/doctor/dashboard?tab=appointments"
          }),
          idempotencyKey: `appt_canc_doc_${updatedAppointment.id}_${Date.now()}`
        });
      }

      // Notify Patient
      if (patientUserId) {
        await createAndDispatchNotification({
          userId: patientUserId,
          recipientEmail: patientEmail,
          recipientName: patientName,
          title: "Appointment Cancelled",
          message: `The appointment with Dr. ${doctorName} on ${formatted.date} at ${formatted.time} has been cancelled. ${effectiveCancelReason ? `Reason: "${effectiveCancelReason}"` : ""}`,
          type: "warning",
          category: "appointment",
          link: "/appointments",
          emailTemplate: "APPOINTMENT_CANCELLED",
          emailSubject: "CareConnect: Appointment Cancellation Notice",
          emailHtml: buildCareConnectEmailTemplate({
            headline: "Appointment Cancellation Confirmation",
            recipientName: patientName,
            bodyParagraphs: [
              `Your appointment scheduled with <strong>Dr. ${doctorName}</strong> on ${formatted.date} at ${formatted.time} has been cancelled.`,
              effectiveCancelReason ? `<strong>Reason:</strong> ${effectiveCancelReason}` : "",
              `If you need medical assistance, you can schedule a new consultation anytime through the portal.`
            ].filter(Boolean),
            actionButtonText: "Book New Appointment",
            actionButtonUrl: "http://localhost:8080/book-appointment"
          }),
          idempotencyKey: `appt_canc_pt_${updatedAppointment.id}_${Date.now()}`
        });
      }
    } else if (targetStatus === "Reschedule Requested") {
      const isRequestedByPatient = req.user.role === "patient";

      if (isRequestedByPatient && doctorUserId) {
        await createAndDispatchNotification({
          userId: doctorUserId,
          recipientEmail: doctorEmail,
          recipientName: `Dr. ${doctorName}`,
          title: "Rescheduling Request",
          message: `${patientName} requested to reschedule appointment to ${formatted.suggestedDate || formatted.date} at ${formatted.suggestedTime || formatted.time}.`,
          type: "info",
          category: "appointment",
          link: "/doctor/dashboard?tab=requests",
          idempotencyKey: `appt_resched_doc_${updatedAppointment.id}_${formatted.suggestedDate}_${formatted.suggestedTime}`
        });
      } else if (!isRequestedByPatient && patientUserId) {
        await createAndDispatchNotification({
          userId: patientUserId,
          recipientEmail: patientEmail,
          recipientName: patientName,
          title: "Appointment Reschedule Suggested",
          message: `Dr. ${doctorName} suggested rescheduling your appointment to ${formatted.suggestedDate || formatted.date} at ${formatted.suggestedTime || formatted.time}.`,
          type: "info",
          category: "appointment",
          link: "/appointments",
          idempotencyKey: `appt_resched_pt_${updatedAppointment.id}_${formatted.suggestedDate}_${formatted.suggestedTime}`
        });
      }
    }

    res.json(formatted);
  } catch (err: unknown) {

    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.startsWith("CONFLICT_DOCTOR:")) {
      return res.status(409).json({ error: errMsg.replace("CONFLICT_DOCTOR: ", "") });
    }
    if (errMsg.startsWith("CONFLICT_PATIENT:")) {
      return res.status(409).json({ error: errMsg.replace("CONFLICT_PATIENT: ", "") });
    }
    console.error("Failed to update appointment:", errMsg);
    res.status(500).json({ error: "Failed to update appointment: " + errMsg });
  }
});

// Notifications API (Strict Recipient Isolation & Real-Time)
app.get("/api/notifications", authenticateToken, async (req: any, res) => {
  try {
    const page = req.query.page ? Math.max(1, parseInt(req.query.page as string || "1", 10)) : null;
    const limit = req.query.limit ? Math.min(100, Math.max(1, parseInt(req.query.limit as string || "20", 10))) : null;
    const status = req.query.status as string; // 'all' | 'unread' | 'read'
    const category = req.query.category as string; // 'all' | 'appointment' | 'prescription' | 'account' | 'general'

    const whereClause: any = {
      OR: [
        { userId: req.user.id },
        { userId: null }, // Global announcements
      ]
    };

    if (status === "unread") {
      whereClause.read = false;
    } else if (status === "read") {
      whereClause.read = true;
    }

    if (category && category !== "all") {
      whereClause.category = category;
    }

    const total = await prisma.notification.count({ where: whereClause });
    const unreadCount = await prisma.notification.count({
      where: {
        OR: [{ userId: req.user.id }, { userId: null }],
        read: false
      }
    });

    let notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      ...(page && limit ? { skip: (page - 1) * limit, take: limit } : {}),
    });

    if (notifications.length === 0 && req.user.role === "patient" && (!status || status === "all") && (!category || category === "all")) {
      const welcomeNotif = await prisma.notification.create({
        data: {
          userId: req.user.id,
          title: "👋 Welcome to CareConnect",
          message: `Hello ${req.user.name}! Your patient portal is activated. You can search verified doctors, book appointments, and upload medical records securely.`,
          type: "info",
          category: "account",
          link: "/patient/dashboard"
        }
      });
      notifications = [welcomeNotif];
    }

    if (page && limit) {
      return res.json({
        data: notifications,
        pagination: { total, unreadCount, page, limit, totalPages: Math.ceil(total / limit) }
      });
    }
    res.json(notifications);
  } catch (err) {
    console.error("Failed to fetch notifications:", err);
    res.status(500).json({ error: "Failed to fetch notifications." });
  }
});

app.patch("/api/notifications/:id/read", authenticateToken, async (req: any, res) => {
  try {
    const existing = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Notification not found" });
    if (existing.userId && existing.userId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Cannot modify another user's notification." });
    }

    const notif = await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true },
    });
    io.to(`user:${req.user.id}`).emit("notificationUpdated", notif);
    io.emit("notificationUpdated", notif);
    res.json(notif);
  } catch (err) {
    res.status(500).json({ error: "Failed to mark notification read" });
  }
});

app.patch("/api/notifications/:id/unread", authenticateToken, async (req: any, res) => {
  try {
    const existing = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Notification not found" });
    if (existing.userId && existing.userId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Cannot modify another user's notification." });
    }

    const notif = await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: false },
    });
    io.to(`user:${req.user.id}`).emit("notificationUpdated", notif);
    io.emit("notificationUpdated", notif);
    res.json(notif);
  } catch (err) {
    res.status(500).json({ error: "Failed to mark notification unread" });
  }
});

app.post("/api/notifications/mark-all-read", authenticateToken, async (req: any, res) => {
  try {
    await prisma.notification.updateMany({
      where: {
        OR: [{ userId: req.user.id }, { userId: null }],
        read: false
      },
      data: { read: true },
    });
    io.to(`user:${req.user.id}`).emit("notificationsAllRead", { userId: req.user.id });
    io.emit("notificationsAllRead", { userId: req.user.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark all notifications read" });
  }
});

app.delete("/api/notifications/:id", authenticateToken, async (req: any, res) => {
  try {
    const existing = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Notification not found" });
    if (existing.userId && existing.userId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Cannot delete another user's notification." });
    }

    await prisma.notification.delete({ where: { id: req.params.id } });
    io.to(`user:${req.user.id}`).emit("notificationDeleted", { id: req.params.id });
    io.emit("notificationDeleted", { id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete notification" });
  }
});

// Send upcoming 24-hour appointment reminders
app.post("/api/notifications/reminders/send-upcoming", authenticateToken, async (req: any, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const tomorrowObj = new Date();
    tomorrowObj.setDate(tomorrowObj.getDate() + 1);
    const tomorrow = tomorrowObj.toISOString().split("T")[0];

    const upcomingAppts = await prisma.appointment.findMany({
      where: {
        status: { in: ["Confirmed", "Scheduled"] },
        date: { in: [today, tomorrow] }
      },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { doctorProfile: true } }
      }
    });

    let sentCount = 0;
    for (const appt of upcomingAppts) {
      const isToday = appt.date === today;
      const timeDescription = isToday ? `Today at ${appt.time}` : `Tomorrow (${appt.date}) at ${appt.time}`;

      // Notify Patient
      if (appt.patient.userId) {
        await createAndDispatchNotification({
          userId: appt.patient.userId,
          recipientEmail: appt.patient.email || appt.patient.user?.email,
          recipientName: appt.patient.name,
          title: "Upcoming Appointment Reminder",
          message: `Reminder: You have a consultation with Dr. ${appt.doctor?.name || "Doctor"} ${timeDescription}.`,
          type: "info",
          category: "appointment",
          link: "/appointments",
          emailTemplate: "REMINDER",
          emailSubject: `CareConnect: Reminder for Your Appointment ${timeDescription}`,
          emailHtml: buildCareConnectEmailTemplate({
            headline: "Upcoming Consultation Reminder",
            recipientName: appt.patient.name,
            bodyParagraphs: [
              `This is a friendly reminder that you have a scheduled appointment with <strong>Dr. ${appt.doctor?.name || "CareConnect Doctor"}</strong>.`,
              `<strong>Date & Time:</strong> ${appt.date} at ${appt.time} (${appt.consultationType || "In-Person"})`,
              `Please log in to your patient portal 10 minutes prior to your visit.`
            ],
            actionButtonText: "View Appointment Details",
            actionButtonUrl: "http://localhost:8080/appointments",
            noticeText: "For your medical privacy, clinical notes or reasons for visit are not sent in unencrypted email notifications."
          }),
          idempotencyKey: `reminder_pt_${appt.id}_${appt.date}`
        });
        sentCount++;
      }

      // Notify Doctor
      if (appt.doctorId) {
        await createAndDispatchNotification({
          userId: appt.doctorId,
          recipientEmail: appt.doctor?.email,
          recipientName: appt.doctor?.name,
          title: "Upcoming Patient Consultation",
          message: `Consultation with ${appt.patient.name} scheduled for ${timeDescription}.`,
          type: "info",
          category: "appointment",
          link: "/doctor/dashboard?tab=appointments",
          emailTemplate: "REMINDER",
          emailSubject: `CareConnect: Patient Consultation Reminder (${appt.patient.name})`,
          emailHtml: buildCareConnectEmailTemplate({
            headline: "Clinical Schedule Reminder",
            recipientName: `Dr. ${appt.doctor?.name || "Doctor"}`,
            bodyParagraphs: [
              `You have an upcoming consultation with patient <strong>${appt.patient.name}</strong>.`,
              `<strong>Date & Time:</strong> ${appt.date} at ${appt.time} (${appt.consultationType || "In-Person"})`
            ],
            actionButtonText: "Open Clinical Workspace",
            actionButtonUrl: "http://localhost:8080/doctor/dashboard?tab=appointments",
            noticeText: "Patient clinical charts and diagnostic files remain protected under HIPAA-compliant access controls in the doctor portal."
          }),
          idempotencyKey: `reminder_doc_${appt.id}_${appt.date}`
        });
        sentCount++;
      }
    }

    res.json({ success: true, count: upcomingAppts.length, notificationsDispatched: sentCount });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Failed to process upcoming reminders:", errMsg);
    res.status(500).json({ error: "Failed to send reminders: " + errMsg });
  }
});

// Patient Profile Management
app.get("/api/patient/profile", authenticateToken, async (req: any, res) => {
  try {
    let patient = await prisma.patient.findFirst({
      where: {
        OR: [
          { userId: req.user.id },
          { email: req.user.email },
          { name: req.user.name }
        ]
      }
    });

    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          userId: req.user.id,
          name: req.user.name || "CareConnect Patient",
          email: req.user.email || null,
          phone: req.user.phone || null,
          age: 30,
          gender: "Not specified",
          bloodGroup: "O+",
          dosha: "Not evaluated",
          status: "Active",
        }
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, phone: true, role: true, isEmailVerified: true, createdAt: true }
    });

    res.json({ patient, user });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to fetch patient profile: " + errMsg });
  }
});

app.put("/api/patient/profile", authenticateToken, async (req: any, res) => {
  const { name, phone, age, gender, bloodGroup, address, emergencyContact, allergies, medicalHistory } = req.body;
  try {
    let patient = await prisma.patient.findFirst({
      where: {
        OR: [
          { userId: req.user.id },
          { email: req.user.email },
          { name: req.user.name }
        ]
      }
    });

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (age !== undefined) updateData.age = parseInt(age.toString(), 10) || 30;
    if (gender !== undefined) updateData.gender = gender;
    if (bloodGroup !== undefined) updateData.bloodGroup = bloodGroup;
    if (address !== undefined) updateData.address = address;
    if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact;
    if (allergies !== undefined) updateData.allergies = allergies;
    if (medicalHistory !== undefined) updateData.medicalHistory = medicalHistory;

    if (patient) {
      patient = await prisma.patient.update({
        where: { id: patient.id },
        data: updateData
      });
    } else {
      patient = await prisma.patient.create({
        data: {
          userId: req.user.id,
          email: req.user.email,
          name: name || req.user.name,
          phone: phone || req.user.phone,
          age: age ? parseInt(age.toString(), 10) : 30,
          gender: gender || "Not specified",
          bloodGroup: bloodGroup || "O+",
          address: address || null,
          emergencyContact: emergencyContact || null,
          allergies: allergies || null,
          medicalHistory: medicalHistory || null,
        }
      });
    }

    // Sync User record name and phone
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(phone !== undefined && { phone: phone.trim() }),
      }
    });

    res.json({ success: true, patient });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to update profile: " + errMsg });
  }
});

// Medical Records API (Least-Privilege Care Relationship & Pagination)
app.get("/api/medical-records", authenticateToken, async (req: any, res) => {
  try {
    const page = req.query.page ? Math.max(1, parseInt(req.query.page as string || "1", 10)) : null;
    const limit = req.query.limit ? Math.min(100, Math.max(1, parseInt(req.query.limit as string || "20", 10))) : null;

    let whereClause: any = {};
    if (req.user.role === "patient") {
      const associatedPatients = await prisma.patient.findMany({
        where: {
          OR: [
            { userId: req.user.id },
            { email: req.user.email },
            { name: req.user.name }
          ]
        },
        select: { id: true }
      });
      const patientIds = associatedPatients.map(p => p.id);
      whereClause = { patientId: { in: patientIds } };
    } else if (req.user.role === "doctor") {
      if (req.query.patientId) {
        const allowed = await hasCareRelationship(req.user.id, req.query.patientId as string);
        if (!allowed && req.user.role !== "admin") {
          return res.status(403).json({
            error: "Access denied. Doctors can only view records of patients under their direct care."
          });
        }
        whereClause = { patientId: req.query.patientId as string };
      } else {
        // Only return records for patients under this doctor's care or authored by this doctor
        const careAppts = await prisma.appointment.findMany({
          where: { doctorId: req.user.id, status: { notIn: ["Rejected"] } },
          select: { patientId: true }
        });
        const carePatientIds = Array.from(new Set(careAppts.map(a => a.patientId)));
        whereClause = {
          OR: [
            { doctorId: req.user.id },
            { patientId: { in: carePatientIds } }
          ]
        };
      }
    } else if (req.query.patientId) {
      whereClause = { patientId: req.query.patientId as string };
    }

    const total = await prisma.medicalRecord.count({ where: whereClause });
    const records = await prisma.medicalRecord.findMany({
      where: whereClause,
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        doctor: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      ...(page && limit ? { skip: (page - 1) * limit, take: limit } : {}),
    });

    await logAuditEvent({
      userId: req.user.id,
      action: "VIEW_MEDICAL_RECORDS",
      entity: "MedicalRecord",
      details: { queriedPatientId: req.query.patientId || null, count: records.length },
      severity: "INFO",
      ...getClientMeta(req)
    });

    if (page && limit) {
      return res.json({
        data: records,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
      });
    }
    res.json(records);
  } catch (err: unknown) {
    console.error("Failed to fetch medical records:", err);
    res.status(500).json({ error: "Failed to fetch medical records." });
  }
});

app.post("/api/medical-records", authenticateToken, async (req: any, res) => {
  try {
    const { title, description, recordType, diagnosis, recordDate, attachments, patientId, doctorId } = req.body;
    if (!title || !recordType) {
      return res.status(400).json({ error: "Title and record type are required." });
    }

    let resolvedPatientId = patientId;
    if (!resolvedPatientId && req.user.role === "patient") {
      const pt = await prisma.patient.findFirst({
        where: {
          OR: [
            { userId: req.user.id },
            { email: req.user.email },
            { name: req.user.name }
          ]
        }
      });
      if (pt) resolvedPatientId = pt.id;
    }

    if (!resolvedPatientId) {
      return res.status(400).json({ error: "Patient identification is required." });
    }

    if (req.user.role === "doctor") {
      const allowed = await hasCareRelationship(req.user.id, resolvedPatientId);
      if (!allowed) {
        const patientExists = await prisma.patient.findUnique({ where: { id: resolvedPatientId } });
        if (!patientExists) {
          return res.status(404).json({ error: "Patient record not found." });
        }
      }
    }

    const newRecord = await prisma.medicalRecord.create({
      data: {
        title,
        description: description || "",
        recordType,
        diagnosis: diagnosis || null,
        recordDate: recordDate || new Date().toISOString().split("T")[0],
        attachments: attachments ? (typeof attachments === "string" ? attachments : JSON.stringify(attachments)) : null,
        patient: { connect: { id: resolvedPatientId } },
        ...(doctorId ? { doctor: { connect: { id: doctorId } } } : (req.user.role === "doctor" ? { doctor: { connect: { id: req.user.id } } } : {})),
      },
      include: {
        patient: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true, email: true } },
      }
    });

    await logAuditEvent({
      userId: req.user.id,
      action: "CREATE_MEDICAL_RECORD",
      entity: "MedicalRecord",
      entityId: newRecord.id,
      details: { patientId: resolvedPatientId, recordType, title },
      severity: "INFO",
      ...getClientMeta(req)
    });

    io.emit("medicalRecordCreated", newRecord);
    res.status(201).json(newRecord);
  } catch (err: unknown) {
    console.error("Failed to create medical record:", err);
    res.status(500).json({ error: "Failed to create medical record." });
  }
});

app.delete("/api/medical-records/:id", authenticateToken, async (req: any, res) => {
  try {
    const record = await prisma.medicalRecord.findUnique({
      where: { id: req.params.id },
      include: { patient: true }
    });
    if (!record) return res.status(404).json({ error: "Record not found" });

    if (req.user.role === "patient") {
      const isOwner = record.patient.userId === req.user.id || record.patient.email === req.user.email || record.patient.name === req.user.name;
      if (!isOwner) return res.status(403).json({ error: "Access denied." });
    } else if (req.user.role === "doctor") {
      if (record.doctorId !== req.user.id) {
        return res.status(403).json({ error: "Access denied. Only the authoring doctor can delete this record." });
      }
    }

    await prisma.medicalRecord.delete({ where: { id: req.params.id } });

    await logAuditEvent({
      userId: req.user.id,
      action: "DELETE_MEDICAL_RECORD",
      entity: "MedicalRecord",
      entityId: req.params.id,
      severity: "WARN",
      ...getClientMeta(req)
    });

    res.json({ success: true });
  } catch (err: unknown) {
    console.error("Failed to delete medical record:", err);
    res.status(500).json({ error: "Failed to delete medical record." });
  }
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

// Prescriptions API (Role-Scoped & Paginated)
app.get("/api/prescriptions", authenticateToken, async (req: any, res) => {
  try {
    const page = req.query.page ? Math.max(1, parseInt(req.query.page as string || "1", 10)) : null;
    const limit = req.query.limit ? Math.min(100, Math.max(1, parseInt(req.query.limit as string || "20", 10))) : null;

    let whereClause: any = {};
    if (req.user.role === "patient") {
      const associatedPatients = await prisma.patient.findMany({
        where: {
          OR: [
            { userId: req.user.id },
            { email: req.user.email },
            { name: req.user.name }
          ]
        },
        select: { id: true, name: true }
      });
      const patientIds = associatedPatients.map(p => p.id);
      const patientNames = [req.user.name, ...associatedPatients.map(p => p.name)];

      whereClause = {
        OR: [
          { patientId: { in: patientIds } },
          { patient: { in: patientNames } }
        ]
      };
    } else if (req.user.role === "doctor") {
      if (req.query.patientId) {
        const allowed = await hasCareRelationship(req.user.id, req.query.patientId as string);
        if (!allowed && req.user.role !== "admin") {
          return res.status(403).json({ error: "Access denied. Cannot view prescriptions for patients outside your care." });
        }
        whereClause = { patientId: req.query.patientId as string };
      } else {
        whereClause = { doctorId: req.user.id };
      }
    } else if (req.query.patientId) {
      whereClause = { patientId: req.query.patientId as string };
    }

    const total = await prisma.prescription.count({ where: whereClause });
    const prescriptions = await prisma.prescription.findMany({
      where: whereClause,
      include: {
        patientRel: { select: { id: true, name: true, phone: true } },
        doctorRel: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      ...(page && limit ? { skip: (page - 1) * limit, take: limit } : {}),
    });

    if (page && limit) {
      return res.json({
        data: prescriptions,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
      });
    }
    res.json(prescriptions);
  } catch (err) {
    console.error("Failed to fetch prescriptions:", err);
    res.status(500).json({ error: "Failed to fetch prescriptions." });
  }
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

// Doctors API (Only verified doctors appear as providers)
app.get("/api/doctors", authenticateToken, async (req, res) => {
  try {
    const doctors = await prisma.user.findMany({
      where: {
        role: "doctor",
        doctorProfile: {
          verificationStatus: "VERIFIED"
        }
      },
      include: {
        doctorProfile: true
      },
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

// Voice Notes API (Scoped to doctor's own notes for clinical confidentiality)
app.get("/api/voice-notes", authenticateToken, requireRole(["doctor", "admin"]), async (req: any, res) => {
  try {
    let whereClause: any = {};
    if (req.user.role === "doctor") {
      whereClause = {
        OR: [
          { doctorId: req.user.id },
          { doctorId: null }
        ]
      };
    }
    const notes = await prisma.voiceConsultationNote.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });
    res.json(notes);
  } catch (err: unknown) {
    res.status(500).json({ error: "Failed to fetch voice notes" });
  }
});

app.post("/api/voice-notes", authenticateToken, requireVerifiedDoctor, async (req: any, res) => {
  try {
    const newNote = await prisma.voiceConsultationNote.create({
      data: {
        doctorId: req.user.id,
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

// ==========================================
// 🩺 DOCTOR DASHBOARD & CLINICAL SUITE ENDPOINTS
// ==========================================


// 1. Doctor Overview Dashboard Metrics & Recent Activity
app.get("/api/doctor/overview", authenticateToken, requireVerifiedDoctor, async (req: any, res) => {
  try {
    const doctorId = req.user.role === "admin" && req.query.doctorId ? (req.query.doctorId as string) : req.user.id;
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    const whereDoctor = req.user.role === "admin" && !req.query.doctorId
      ? {}
      : {
          OR: [
            { doctorId: doctorId },
            { doctorId: null, status: "Pending" }
          ]
        };

    const appointments = await prisma.appointment.findMany({
      where: whereDoctor,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            age: true,
            gender: true,
            phone: true,
            email: true,
            bloodGroup: true,
            allergies: true,
            medicalHistory: true,
          }
        },
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
            doctorProfile: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    const todayAppointments = appointments.filter(a => a.date === today && a.status !== "Cancelled" && a.status !== "Rejected");
    const upcomingAppointments = appointments.filter(a => a.date >= today && (a.status === "Scheduled" || a.status === "Pending"));
    const pendingRequests = appointments.filter(a => a.status === "Pending");
    const completedConsultations = appointments.filter(a => a.status === "Completed");
    const cancelledAppointments = appointments.filter(a => a.status === "Cancelled" || a.status === "Rejected");

    // Unique patients seen by this doctor
    const uniqueSeenPatientIds = new Set(
      appointments
        .filter(a => a.status === "Completed" || a.status === "Scheduled")
        .map(a => a.patientId)
    );

    // Recent patient activity
    const recentActivity = appointments.slice(0, 8).map(a => ({
      id: a.id,
      patientName: a.patient?.name || "Patient",
      patientId: a.patientId,
      date: a.date,
      time: a.time,
      therapy: a.therapy,
      consultationType: a.consultationType || "In-Person",
      status: a.status,
      updatedAt: a.updatedAt,
      cancelReason: a.cancelReason,
      notes: a.notes,
    }));

    // Notifications for this doctor
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { userId: req.user.id },
          { userId: null }
        ]
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    res.json({
      counts: {
        today: todayAppointments.length,
        upcoming: upcomingAppointments.length,
        pending: pendingRequests.length,
        completed: completedConsultations.length,
        cancelled: cancelledAppointments.length,
        totalPatients: uniqueSeenPatientIds.size,
      },
      todayAppointments: todayAppointments.slice(0, 6),
      upcomingAppointments: upcomingAppointments.slice(0, 6),
      pendingRequests: pendingRequests.slice(0, 6),
      recentActivity,
      notifications,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to fetch doctor overview: " + errMsg });
  }
});

// 2. Doctor Availability Configuration & Slot Generator (Accessible to Patients for Booking & Doctors for Schedule Management)
app.get("/api/doctor/availability", authenticateToken, async (req: any, res) => {
  try {
    let targetUserId = req.user.id;
    if (req.query.doctorId) {
      targetUserId = req.query.doctorId as string;
    } else if (req.user.role !== "doctor" && req.user.role !== "admin") {
      return res.status(400).json({ error: "doctorId query parameter is required to view availability." });
    }

    let profile = await prisma.doctorProfile.findUnique({
      where: { userId: targetUserId }
    });

    if (!profile) {
      return res.status(404).json({ error: "Doctor profile not found." });
    }

    const workingDays = profile.workingDays || "Monday,Tuesday,Wednesday,Thursday,Friday";
    const startTime = profile.startTime || "09:00 AM";
    const endTime = profile.endTime || "05:00 PM";
    const slotDurationMinutes = profile.slotDurationMinutes || 30;
    const breakStartTime = profile.breakStartTime || "01:00 PM";
    const breakEndTime = profile.breakEndTime || "02:00 PM";
    const unavailableDates = profile.unavailableDates ? JSON.parse(profile.unavailableDates) : [];
    const leaveStartDate = profile.leaveStartDate || null;
    const leaveEndDate = profile.leaveEndDate || null;
    const maxDailyAppointments = profile.maxDailyAppointments || 20;

    let targetDate = req.query.date as string;
    let slotSchedule: any = null;

    if (targetDate) {
      const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dateObj = new Date(targetDate + "T00:00:00");
      const dayOfWeek = daysOfWeek[dateObj.getDay()];
      const workingDaysList = workingDays.split(",").map(d => d.trim());

      const isWorkingDay = workingDaysList.includes(dayOfWeek);
      const isUnavailable = unavailableDates.includes(targetDate);
      const isOnLeave = Boolean(
        leaveStartDate && leaveEndDate && targetDate >= leaveStartDate && targetDate <= leaveEndDate
      );

      if (!isWorkingDay) {
        slotSchedule = {
          date: targetDate,
          dayOfWeek,
          isAvailable: false,
          reason: `Doctor does not consult on ${dayOfWeek}s.`,
          slots: [],
        };
      } else if (isUnavailable) {
        slotSchedule = {
          date: targetDate,
          dayOfWeek,
          isAvailable: false,
          reason: `Doctor has marked this date (${targetDate}) as unavailable.`,
          slots: [],
        };
      } else if (isOnLeave) {
        slotSchedule = {
          date: targetDate,
          dayOfWeek,
          isAvailable: false,
          reason: `Doctor is on scheduled leave from ${leaveStartDate} to ${leaveEndDate}.`,
          slots: [],
        };
      } else {
        const startMins = parseTimeToMinutes(startTime);
        const endMins = parseTimeToMinutes(endTime);
        const breakStartMins = parseTimeToMinutes(breakStartTime);
        const breakEndMins = parseTimeToMinutes(breakEndTime);

        // Fetch booked appointments on this date
        const bookedAppts = await prisma.appointment.findMany({
          where: {
            doctorId: targetUserId,
            date: targetDate,
            status: { in: ["Pending", "Confirmed", "Scheduled", "Reschedule Requested"] }
          },
          include: { patient: { select: { name: true } } }
        });

        const bookedMap = new Map();
        bookedAppts.forEach(b => {
          bookedMap.set(b.time.trim(), b);
        });

        const isDoctorOwnerOrAdmin = (req.user.role === "doctor" && targetUserId === req.user.id) || req.user.role === "admin";
        const slots = [];
        let totalGenerated = 0;
        let availableSlotsCount = 0;

        for (let m = startMins; m + slotDurationMinutes <= endMins; m += slotDurationMinutes) {
          // Check if slot falls in break
          const isBreak = m >= breakStartMins && m < breakEndMins;
          if (isBreak) continue;

          totalGenerated++;
          const timeSlotStr = minutesToTimeStr(m);
          const booking = bookedMap.get(timeSlotStr);
          const isBooked = Boolean(booking);
          const isPast = isSlotInThePast(targetDate, timeSlotStr);

          let isAvailable = !isBooked && !isPast;
          if (isAvailable) availableSlotsCount++;

          let slotStatus = "Available";
          if (isBooked) {
            slotStatus = booking.status === "Scheduled" ? "Confirmed" : booking.status;
          } else if (isPast) {
            slotStatus = "Past Slot";
          }

          slots.push({
            time: timeSlotStr,
            isAvailable,
            status: slotStatus,
            patientName: isDoctorOwnerOrAdmin ? (booking?.patient?.name || null) : null,
            appointmentId: isDoctorOwnerOrAdmin ? (booking?.id || null) : null,
          });
        }

        const capacityReached = bookedAppts.length >= maxDailyAppointments;

        slotSchedule = {
          date: targetDate,
          dayOfWeek,
          isAvailable: !capacityReached,
          reason: capacityReached ? "Maximum daily consultation capacity reached." : "Doctor available",
          totalSlots: totalGenerated,
          availableSlotsCount: capacityReached ? 0 : availableSlotsCount,
          maxCapacity: maxDailyAppointments,
          bookedCount: bookedAppts.length,
          slots: capacityReached
            ? slots.map(s => ({ ...s, isAvailable: false, status: s.isAvailable ? "Capacity Full" : s.status }))
            : slots,
        };
      }
    }

    res.json({
      settings: {
        workingDays,
        startTime,
        endTime,
        slotDurationMinutes,
        breakStartTime,
        breakEndTime,
        unavailableDates,
        leaveStartDate,
        leaveEndDate,
        maxDailyAppointments,
      },
      schedule: slotSchedule,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to fetch availability: " + errMsg });
  }
});

app.put("/api/doctor/availability", authenticateToken, requireVerifiedDoctor, async (req: any, res) => {
  try {
    const targetUserId = req.user.role === "admin" && req.body.doctorId ? req.body.doctorId : req.user.id;
    const {
      workingDays,
      startTime,
      endTime,
      slotDurationMinutes,
      breakStartTime,
      breakEndTime,
      unavailableDates,
      leaveStartDate,
      leaveEndDate,
      maxDailyAppointments
    } = req.body;

    const updated = await prisma.doctorProfile.update({
      where: { userId: targetUserId },
      data: {
        ...(workingDays !== undefined && { workingDays: Array.isArray(workingDays) ? workingDays.join(",") : workingDays }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(slotDurationMinutes !== undefined && { slotDurationMinutes: parseInt(slotDurationMinutes.toString(), 10) }),
        ...(breakStartTime !== undefined && { breakStartTime }),
        ...(breakEndTime !== undefined && { breakEndTime }),
        ...(unavailableDates !== undefined && {
          unavailableDates: typeof unavailableDates === "string" ? unavailableDates : JSON.stringify(unavailableDates)
        }),
        ...(leaveStartDate !== undefined && { leaveStartDate: leaveStartDate || null }),
        ...(leaveEndDate !== undefined && { leaveEndDate: leaveEndDate || null }),
        ...(maxDailyAppointments !== undefined && { maxDailyAppointments: parseInt(maxDailyAppointments.toString(), 10) }),
      }
    });

    res.json({ success: true, availability: updated });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to update doctor availability: " + errMsg });
  }
});

// 3. Doctor Patient Management (Enforcing strict care-relationship access permissions)
app.get("/api/doctor/patients", authenticateToken, requireVerifiedDoctor, async (req: any, res) => {
  try {
    const doctorId = req.user.role === "admin" && req.query.doctorId ? (req.query.doctorId as string) : req.user.id;
    const search = req.query.search ? (req.query.search as string).toLowerCase().trim() : "";

    // Strictly enforce doctor-patient care relationship:
    // Only return patients who have had appointments with this doctor, or clinical records/prescriptions authored by this doctor
    const patients = await prisma.patient.findMany({
      where: req.user.role === "admin" && !req.query.doctorId
        ? {}
        : {
            OR: [
              { appointments: { some: { doctorId: doctorId } } },
              { medicalRecords: { some: { doctorId: doctorId } } },
            ]
          },
      include: {
        appointments: {
          where: req.user.role === "admin" && !req.query.doctorId ? {} : { doctorId: doctorId },
          orderBy: { date: "desc" },
          take: 3,
        },
        medicalRecords: {
          where: req.user.role === "admin" && !req.query.doctorId ? {} : { doctorId: doctorId },
          orderBy: { createdAt: "desc" },
          take: 2,
        }
      },
      orderBy: { updatedAt: "desc" },
    });

    let filtered = patients;
    if (search) {
      filtered = patients.filter(p =>
        p.name.toLowerCase().includes(search) ||
        (p.email && p.email.toLowerCase().includes(search)) ||
        (p.phone && p.phone.toLowerCase().includes(search)) ||
        (p.bloodGroup && p.bloodGroup.toLowerCase().includes(search))
      );
    }

    const formatted = filtered.map(p => ({
      id: p.id,
      name: p.name,
      age: p.age,
      gender: p.gender,
      bloodGroup: p.bloodGroup || "Not specified",
      phone: p.phone || "Not specified",
      email: p.email || "Not specified",
      address: p.address || "Not specified",
      emergencyContact: p.emergencyContact || "Not specified",
      allergies: p.allergies || "None reported",
      medicalHistory: p.medicalHistory || "None recorded",
      status: p.status,
      lastVisit: p.lastVisit,
      totalVisits: p.appointments.length,
      recentAppointments: p.appointments,
      recentRecords: p.medicalRecords,
    }));

    res.json(formatted);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to fetch doctor patients: " + errMsg });
  }
});

app.get("/api/doctor/patients/:id", authenticateToken, requireVerifiedDoctor, async (req: any, res) => {
  try {
    const doctorId = req.user.role === "admin" ? null : req.user.id;
    const patientId = req.params.id;

    // Check care relationship unless admin
    if (doctorId) {
      const hasRelationship = await prisma.patient.findFirst({
        where: {
          id: patientId,
          OR: [
            { appointments: { some: { doctorId: doctorId } } },
            { medicalRecords: { some: { doctorId: doctorId } } },
          ]
        }
      });

      if (!hasRelationship) {
        return res.status(403).json({
          error: "Access Denied: You do not have an authorized clinical care relationship with this patient."
        });
      }
    }

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        appointments: {
          where: doctorId ? { doctorId } : {},
          orderBy: { date: "desc" }
        },
        medicalRecords: {
          where: doctorId ? { doctorId } : {},
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!patient) return res.status(404).json({ error: "Patient not found." });

    // Prescriptions for this patient by this doctor
    const prescriptions = await prisma.prescription.findMany({
      where: {
        patientId: patientId,
        ...(doctorId && { doctorId })
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({
      patient,
      appointments: patient.appointments,
      medicalRecords: patient.medicalRecords,
      prescriptions,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to fetch patient clinical file: " + errMsg });
  }
});

// 4. Clinical Consultation Workspace (Atomic ConsultationNote & MedicalRecord Transaction)
app.post("/api/consultations", authenticateToken, requireVerifiedDoctor, async (req: any, res) => {
  try {
    const {
      patientId,
      appointmentId,
      chiefComplaint,
      observations,
      diagnosis,
      treatmentPlan,
      followUpDate,
      status,
      notes,
      attachments
    } = req.body;

    if (!patientId) {
      return res.status(400).json({ error: "Patient ID is required for clinical consultation." });
    }

    const consultationStatus = status === "Draft" ? "Draft" : "Finalized";

    const [newRecord, newConsultationNote] = await prisma.$transaction(async (tx) => {
      // 1. Create or ensure appointment exists
      let targetAppointmentId = appointmentId;
      if (!targetAppointmentId) {
        const existingAppt = await tx.appointment.findFirst({
          where: { patientId, doctorId: req.user.id }
        });
        if (existingAppt) {
          targetAppointmentId = existingAppt.id;
        } else {
          const apptCreated = await tx.appointment.create({
            data: {
              patientId,
              doctorId: req.user.id,
              date: new Date().toISOString().split("T")[0],
              time: "09:00 AM",
              consultationType: "In-Person",
              therapy: "Clinical Consultation",
              status: consultationStatus === "Finalized" ? "Completed" : "Confirmed",
              notes: "Initiated during clinical workspace session"
            }
          });
          targetAppointmentId = apptCreated.id;
        }
      }

      // 2. Create Medical Record
      const rec = await tx.medicalRecord.create({
        data: {
          patientId,
          doctorId: req.user.id,
          appointmentId: targetAppointmentId || null,
          recordType: "Clinical Note",
          title: `Clinical Consultation: ${diagnosis || chiefComplaint || "General Examination"}`,
          description: notes || observations || "Clinical assessment note",
          chiefComplaint: chiefComplaint || null,
          observations: observations || null,
          diagnosis: diagnosis || null,
          treatmentPlan: treatmentPlan || null,
          followUpDate: followUpDate || null,
          status: consultationStatus,
          updatedBy: req.user.name,
          recordDate: new Date().toISOString().split("T")[0],
          attachments: attachments ? (typeof attachments === "string" ? attachments : JSON.stringify(attachments)) : null,
        },
        include: {
          patient: { select: { id: true, name: true, phone: true, email: true } },
          doctor: { select: { id: true, name: true, email: true } },
        }
      });

      // 3. Create Consultation Note
      const cNote = await tx.consultationNote.create({
        data: {
          appointmentId: targetAppointmentId!,
          patientId,
          doctorId: req.user.id,
          chiefComplaint: chiefComplaint || diagnosis || "Clinical consultation",
          clinicalObservations: observations || null,
          diagnosis: diagnosis || "General clinical review",
          treatmentPlan: treatmentPlan || "Continue routine management",
          followUpDate: followUpDate || null,
          doctorNotes: notes || null,
          status: consultationStatus,
          finalizedAt: consultationStatus === "Finalized" ? new Date() : null,
          createdBy: req.user.name,
          updatedBy: req.user.name,
        }
      });

      // 4. Update appointment status if finalized
      if (targetAppointmentId && consultationStatus === "Finalized") {
        await tx.appointment.update({
          where: { id: targetAppointmentId },
          data: {
            status: "Completed",
            completedAt: new Date(),
          }
        });
      }

      return [rec, cNote];
    });

    if (appointmentId && consultationStatus === "Finalized") {
      io.emit("appointmentUpdated", { id: appointmentId, status: "Completed" });
    }

    await logAuditEvent({
      userId: req.user.id,
      action: "CREATE_CONSULTATION",
      entity: "ConsultationNote",
      entityId: newConsultationNote.id,
      details: { patientId, appointmentId, diagnosis, status: consultationStatus },
      severity: "INFO",
      ...getClientMeta(req)
    });

    io.emit("medicalRecordCreated", newRecord);
    io.emit("consultationNoteCreated", newConsultationNote);

    res.status(201).json({
      ...newRecord,
      consultationNoteId: newConsultationNote.id
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Failed to record consultation:", errMsg);
    res.status(500).json({ error: "Failed to record consultation: " + errMsg });
  }
});

app.put("/api/consultations/:id", authenticateToken, requireVerifiedDoctor, async (req: any, res) => {
  try {
    const record = await prisma.medicalRecord.findUnique({
      where: { id: req.params.id }
    });
    if (!record) return res.status(404).json({ error: "Consultation record not found" });

    if (record.doctorId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Only the authoring doctor can edit this record." });
    }

    const {
      chiefComplaint,
      observations,
      diagnosis,
      treatmentPlan,
      followUpDate,
      status,
      notes,
      attachments,
    } = req.body;

    const [updated] = await prisma.$transaction([
      prisma.medicalRecord.update({
        where: { id: req.params.id },
        data: {
          ...(chiefComplaint !== undefined && { chiefComplaint }),
          ...(observations !== undefined && { observations }),
          ...(diagnosis !== undefined && { diagnosis }),
          ...(treatmentPlan !== undefined && { treatmentPlan }),
          ...(followUpDate !== undefined && { followUpDate }),
          ...(status !== undefined && { status }),
          ...(notes !== undefined && { description: notes }),
          ...(attachments !== undefined && {
            attachments: typeof attachments === "string" ? attachments : JSON.stringify(attachments)
          }),
          updatedBy: req.user.name,
        },
        include: {
          patient: { select: { id: true, name: true } },
          doctor: { select: { id: true, name: true } },
        }
      }),
      prisma.consultationNote.updateMany({
        where: {
          doctorId: req.user.id,
          patientId: record.patientId,
          ...(record.appointmentId ? { appointmentId: record.appointmentId } : {})
        },
        data: {
          ...(chiefComplaint !== undefined && { chiefComplaint }),
          ...(observations !== undefined && { clinicalObservations: observations }),
          ...(diagnosis !== undefined && { diagnosis }),
          ...(treatmentPlan !== undefined && { treatmentPlan }),
          ...(followUpDate !== undefined && { followUpDate }),
          ...(status !== undefined && { status, finalizedAt: status === "Finalized" ? new Date() : null }),
          ...(notes !== undefined && { doctorNotes: notes }),
          updatedBy: req.user.name,
        }
      })
    ]);

    await logAuditEvent({
      userId: req.user.id,
      action: "UPDATE_CONSULTATION",
      entity: "ConsultationNote",
      entityId: req.params.id,
      details: { status, diagnosis },
      severity: "INFO",
      ...getClientMeta(req)
    });

    res.json(updated);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Failed to update consultation:", errMsg);
    res.status(500).json({ error: "Failed to update consultation: " + errMsg });
  }
});

// 5. Prescription Management (Drafts, Finalization, Signing & Audit Trail)
app.post("/api/doctor/prescriptions", authenticateToken, requireVerifiedDoctor, async (req: any, res) => {
  try {
    const {
      patientId,
      patientName,
      appointmentId,
      date,
      medicines,
      followUpRecommendations,
      notes,
      isFinalized,
    } = req.body;

    if (!patientId || !patientName) {
      return res.status(400).json({ error: "Patient ID and Patient Name are required." });
    }
    if (!Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({ error: "At least one medication is required." });
    }

    const patientRec = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patientRec) {
      return res.status(404).json({ error: "Patient record not found." });
    }

    const finalized = Boolean(isFinalized);
    const initialAudit = [
      {
        action: finalized ? "Created and Signed" : "Created Draft",
        timestamp: new Date().toISOString(),
        user: req.user.name,
      }
    ];

    const newRx = await prisma.prescription.create({
      data: {
        patientId,
        doctorId: req.user.id,
        appointmentId: appointmentId || null,
        patient: patientName,
        doctor: req.user.name,
        date: date || new Date().toISOString().split("T")[0],
        medicines: JSON.stringify(medicines),
        followUpRecommendations: followUpRecommendations || null,
        notes: notes || null,
        isFinalized: finalized,
        signedAt: finalized ? new Date() : null,
        auditLog: JSON.stringify(initialAudit),
        status: finalized ? "Active" : "Draft",
      }
    });

    // 1. Notify doctor
    await createAndDispatchNotification({
      userId: req.user.id,
      title: finalized ? "Prescription Signed & Issued" : "Prescription Draft Saved",
      message: `${finalized ? "Official prescription" : "Draft"} created for ${patientName} on ${newRx.date}.`,
      type: "info",
      category: "prescription",
      link: "/doctor/dashboard?tab=prescriptions",
      idempotencyKey: `rx_doc_${newRx.id}`
    });

    // 2. Notify patient with in-app notification & transactional email
    if (patientRec.userId) {
      await createAndDispatchNotification({
        userId: patientRec.userId,
        recipientEmail: patientRec.email,
        recipientName: patientName,
        title: "New Prescription Issued",
        message: `Dr. ${req.user.name} has issued an official prescription for your clinical care.`,
        type: "info",
        category: "prescription",
        link: "/prescriptions",
        emailTemplate: "PRESCRIPTION_ISSUED",
        emailSubject: "CareConnect: New Prescription Available in Your Portal",
        emailHtml: buildCareConnectEmailTemplate({
          headline: "New Prescription Available",
          recipientName: patientName,
          bodyParagraphs: [
            `<strong>Dr. ${req.user.name}</strong> has issued a clinical prescription following your consultation.`,
            `<strong>Date of Issue:</strong> ${newRx.date}`,
            `Please log in to your secure CareConnect patient portal to view dosage, frequency, and instructions.`
          ],
          actionButtonText: "View Your Prescriptions",
          actionButtonUrl: "http://localhost:8080/prescriptions",
          noticeText: "For your medical privacy and HIPAA compliance, medication names, dosages, and diagnostic reasons are never sent via unencrypted email notifications."
        }),
        idempotencyKey: `rx_pt_${newRx.id}`
      });
    }

    await logAuditEvent({
      userId: req.user.id,
      action: finalized ? "ISSUE_PRESCRIPTION" : "DRAFT_PRESCRIPTION",
      entity: "Prescription",
      entityId: newRx.id,
      details: { patientId, patientName, medicineCount: medicines.length, isFinalized: finalized },
      severity: "INFO",
      ...getClientMeta(req)
    });

    res.status(201).json(newRx);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Failed to create prescription:", errMsg);
    res.status(500).json({ error: "Failed to create prescription: " + errMsg });
  }
});

app.put("/api/doctor/prescriptions/:id", authenticateToken, requireVerifiedDoctor, async (req: any, res) => {
  try {
    const rx = await prisma.prescription.findUnique({
      where: { id: req.params.id }
    });
    if (!rx) return res.status(404).json({ error: "Prescription not found" });

    if (rx.doctorId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Only the prescribing doctor can amend this prescription." });
    }

    const {
      medicines,
      followUpRecommendations,
      notes,
      isFinalized,
      amendmentReason,
    } = req.body;

    let audit: any[] = [];
    try {
      audit = rx.auditLog ? JSON.parse(rx.auditLog) : [];
    } catch {
      audit = [];
    }

    // If prescription was already finalized, require audit trail
    if (rx.isFinalized) {
      audit.push({
        action: `Amended: ${amendmentReason || "Clinical update to medication regimen"}`,
        timestamp: new Date().toISOString(),
        user: req.user.name,
      });
    } else if (isFinalized) {
      audit.push({
        action: "Finalized and Signed",
        timestamp: new Date().toISOString(),
        user: req.user.name,
      });
    }

    const willBeFinalized = isFinalized !== undefined ? Boolean(isFinalized) : rx.isFinalized;

    const updated = await prisma.prescription.update({
      where: { id: req.params.id },
      data: {
        ...(medicines && { medicines: typeof medicines === "string" ? medicines : JSON.stringify(medicines) }),
        ...(followUpRecommendations !== undefined && { followUpRecommendations }),
        ...(notes !== undefined && { notes }),
        ...(isFinalized !== undefined && {
          isFinalized: willBeFinalized,
          signedAt: willBeFinalized && !rx.signedAt ? new Date() : rx.signedAt,
          status: willBeFinalized ? "Active" : "Draft",
        }),
        auditLog: JSON.stringify(audit),
      }
    });

    await logAuditEvent({
      userId: req.user.id,
      action: willBeFinalized ? "SIGN_PRESCRIPTION" : "UPDATE_PRESCRIPTION",
      entity: "Prescription",
      entityId: req.params.id,
      details: { isFinalized: willBeFinalized, amendmentReason },
      severity: "INFO",
      ...getClientMeta(req)
    });

    res.json(updated);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Failed to update prescription:", errMsg);
    res.status(500).json({ error: "Failed to update prescription: " + errMsg });
  }
});

app.get("/api/doctor/prescriptions/:id", authenticateToken, async (req: any, res) => {
  try {
    const rx = await prisma.prescription.findUnique({
      where: { id: req.params.id },
      include: {
        doctorRel: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            doctorProfile: true,
          }
        }
      }
    });
    if (!rx) return res.status(404).json({ error: "Prescription not found" });

    let patientDetails = null;
    if (rx.patientId) {
      patientDetails = await prisma.patient.findUnique({
        where: { id: rx.patientId },
        select: {
          id: true,
          name: true,
          age: true,
          gender: true,
          phone: true,
          email: true,
          bloodGroup: true,
          allergies: true,
        }
      });
    }

    res.json({
      ...rx,
      patientDetails,
      doctorDetails: rx.doctorRel ? {
        name: rx.doctorRel.name,
        email: rx.doctorRel.email,
        phone: rx.doctorRel.phone,
        specialization: rx.doctorRel.doctorProfile?.specialization || "General Medicine",
        qualifications: rx.doctorRel.doctorProfile?.qualifications || "MBBS",
        hospitalAffiliation: rx.doctorRel.doctorProfile?.hospitalAffiliation || "CareConnect Clinic",
        medicalLicenseNumber: rx.doctorRel.doctorProfile?.medicalLicenseNumber || "MED-APPROVED",
        clinicAddress: rx.doctorRel.doctorProfile?.clinicAddress || "CareConnect Health Systems",
      } : null,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to fetch prescription document: " + errMsg });
  }
});

// 6. Doctor Profile Management
app.get("/api/doctor/profile", authenticateToken, requireRole(["doctor", "admin"]), async (req: any, res) => {
  try {
    const targetUserId = req.user.role === "admin" && req.query.doctorId ? (req.query.doctorId as string) : req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { doctorProfile: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      doctorProfile: user.doctorProfile,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to fetch doctor profile: " + errMsg });
  }
});

app.put("/api/doctor/profile", authenticateToken, requireVerifiedDoctor, async (req: any, res) => {
  try {
    const targetUserId = req.user.role === "admin" && req.body.doctorId ? req.body.doctorId : req.user.id;
    const {
      name,
      phone,
      photoUrl,
      bio,
      clinicAddress,
      consultationModes,
      consultationFee,
      specialization,
      qualifications,
      experienceYears,
      workingDays,
      startTime,
      endTime,
    } = req.body;

    if (name || phone !== undefined) {
      await prisma.user.update({
        where: { id: targetUserId },
        data: {
          ...(name && { name }),
          ...(phone !== undefined && { phone }),
        }
      });
    }

    const updatedProfile = await prisma.doctorProfile.update({
      where: { userId: targetUserId },
      data: {
        ...(photoUrl !== undefined && { photoUrl }),
        ...(bio !== undefined && { bio }),
        ...(clinicAddress !== undefined && { clinicAddress }),
        ...(consultationModes !== undefined && { consultationModes }),
        ...(consultationFee !== undefined && { consultationFee: parseFloat(consultationFee.toString()) }),
        ...(specialization !== undefined && { specialization }),
        ...(qualifications !== undefined && { qualifications }),
        ...(experienceYears !== undefined && { experienceYears: parseInt(experienceYears.toString(), 10) }),
        ...(workingDays !== undefined && { workingDays }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
      }
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { doctorProfile: true }
    });

    res.json({ success: true, user: updatedUser });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to update doctor profile: " + errMsg });
  }
});

// ==========================================
// 🛡️ ADMIN MANAGEMENT ENDPOINTS
// ==========================================

// Get platform-wide overview metrics with complete database statistics
app.get("/api/admin/metrics", authenticateToken, requireRole(["admin"]), async (req, res) => {
  try {
    const [
      totalUsers,
      patientUserCount,
      patientProfileCount,
      totalDoctors,
      approvedDoctors,
      pendingDoctors,
      rejectedDoctors,
      suspendedDoctors,
      suspendedUsers,
      totalAppointments,
      totalPrescriptions,
      // Appointment status distribution
      pendingAppts,
      confirmedAppts,
      completedAppts,
      cancelledAppts,
      rejectedAppts,
      rescheduleRequestedAppts,
      recentAuditLogs,
      recentUsers,
      pendingVerificationRequests,
      failedEmailLogs,
      criticalAuditLogs
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "patient" } }),
      prisma.patient.count(),
      prisma.doctorProfile.count(),
      prisma.doctorProfile.count({ where: { verificationStatus: "VERIFIED" } }),
      prisma.doctorProfile.count({ where: { verificationStatus: "PENDING" } }),
      prisma.doctorProfile.count({ where: { verificationStatus: "REJECTED" } }),
      prisma.user.count({ where: { role: "doctor", status: "Suspended" } }),
      prisma.user.count({ where: { status: "Suspended" } }),
      prisma.appointment.count(),
      prisma.prescription.count(),
      prisma.appointment.count({ where: { status: "Pending" } }),
      prisma.appointment.count({ where: { status: { in: ["Confirmed", "Scheduled"] } } }),
      prisma.appointment.count({ where: { status: "Completed" } }),
      prisma.appointment.count({ where: { status: "Cancelled" } }),
      prisma.appointment.count({ where: { status: "Rejected" } }),
      prisma.appointment.count({ where: { status: "Reschedule Requested" } }),
      prisma.auditLog.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true, email: true, role: true } } }
      }),
      prisma.user.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, email: true, role: true, status: true, createdAt: true }
      }),
      prisma.doctorVerificationRequest.count({ where: { status: "PENDING" } }),
      prisma.emailLog.findMany({
        where: { deliveryStatus: "FAILED" },
        take: 6,
        orderBy: { createdAt: "desc" }
      }),
      prisma.auditLog.findMany({
        where: { severity: { in: ["CRITICAL", "WARN"] } },
        take: 8,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true, email: true, role: true } } }
      })
    ]);

    const totalPatients = Math.max(patientUserCount, patientProfileCount);
    const rejectedOrSuspendedDoctors = rejectedDoctors + suspendedDoctors;

    res.json({
      totalUsers,
      totalPatients,
      totalDoctors,
      approvedDoctors,
      pendingDoctors,
      pendingVerificationRequests,
      rejectedDoctors,
      suspendedDoctors,
      rejectedOrSuspendedDoctors,
      suspendedUsers,
      totalAppointments,
      totalPrescriptions,
      appointmentStatusDistribution: {
        pending: pendingAppts,
        confirmed: confirmedAppts,
        completed: completedAppts,
        cancelled: cancelledAppts,
        rejected: rejectedAppts,
        rescheduleRequested: rescheduleRequestedAppts,
      },
      recentAuditLogs,
      recentUsers,
      operationalErrors: {
        failedEmails: failedEmailLogs,
        criticalSecurityEvents: criticalAuditLogs,
      },
      systemHealth: {
        status: "OPERATIONAL",
        database: "CONNECTED",
        serverUptimeSeconds: Math.floor(process.uptime()),
        memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        timestamp: new Date().toISOString(),
      }
    });
  } catch (err) {
    console.error("Failed to fetch admin metrics:", err);
    res.status(500).json({ error: "Failed to fetch admin metrics" });
  }
});

// List all doctors with their credential status
app.get("/api/admin/doctors", authenticateToken, requireRole(["admin"]), async (req, res) => {
  try {
    const doctors = await prisma.doctorProfile.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, status: true, createdAt: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch doctor credentials" });
  }
});

// Verify or Reject Doctor application
app.patch("/api/admin/doctors/:id/verify", authenticateToken, requireRole(["admin"]), async (req: any, res) => {
  const { verificationStatus, rejectionReason } = req.body;
  if (!["VERIFIED", "REJECTED", "PENDING"].includes(verificationStatus)) {
    return res.status(400).json({ error: "Invalid verification status." });
  }

  try {
    const updated = await prisma.doctorProfile.update({
      where: { id: req.params.id },
      data: {
        verificationStatus,
        rejectionReason: rejectionReason || null,
      },
      include: { user: true }
    });

    const targetReqStatus = verificationStatus === "VERIFIED" ? "APPROVED" : (verificationStatus === "REJECTED" ? "REJECTED" : "PENDING");

    // Sync with doctorVerificationRequests
    const existingReq = await prisma.doctorVerificationRequest.findFirst({
      where: { doctorProfileId: updated.id },
      orderBy: { submittedAt: "desc" }
    });

    if (existingReq) {
      await prisma.doctorVerificationRequest.update({
        where: { id: existingReq.id },
        data: {
          status: targetReqStatus,
          reviewerId: req.user.id,
          reviewedAt: new Date(),
          reviewNotes: rejectionReason || `Status updated to ${verificationStatus} by administration`
        }
      });
    } else {
      await prisma.doctorVerificationRequest.create({
        data: {
          doctorId: updated.userId,
          doctorProfileId: updated.id,
          licenseNumber: updated.medicalLicenseNumber,
          status: targetReqStatus,
          reviewerId: req.user.id,
          reviewedAt: new Date(),
          reviewNotes: rejectionReason || `Status updated to ${verificationStatus} by administration`
        }
      });
    }

    // Notify doctor
    const notif = await prisma.notification.create({
      data: {
        userId: updated.userId,
        title: verificationStatus === "VERIFIED" ? "🎉 Medical Credentials Approved!" : "⚠️ Credential Status Update",
        message: verificationStatus === "VERIFIED"
          ? `Dr. ${updated.user.name}, your medical credentials have been verified by the Chief Medical Officer. You now have full clinical access.`
          : `Dr. ${updated.user.name}, your credentials review status is now: ${verificationStatus}. ${rejectionReason ? `Reason: ${rejectionReason}` : ""}`,
        type: verificationStatus === "VERIFIED" ? "info" : "warning",
      }
    });

    await logAuditEvent({
      userId: req.user.id,
      action: verificationStatus === "VERIFIED" ? "APPROVE_DOCTOR" : "REJECT_DOCTOR",
      entity: "DoctorProfile",
      entityId: updated.id,
      details: { doctorId: updated.userId, verificationStatus, rejectionReason },
      severity: "INFO",
      ...getClientMeta(req)
    });

    io.emit("notificationCreated", notif);
    io.emit("doctorVerificationUpdated", {
      userId: updated.userId,
      verificationStatus,
      doctorName: updated.user.name
    });

    res.json({ success: true, doctorProfile: updated });
  } catch (err) {
    console.error("Failed to update doctor verification status:", err);
    res.status(500).json({ error: "Failed to update doctor verification status." });
  }
});

// List doctor verification requests with pagination, filter, search, and documents
app.get("/api/admin/verifications", authenticateToken, requireRole(["admin"]), async (req: any, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || "20", 10)));
    const skip = (page - 1) * limit;

    // Ensure all existing DoctorProfiles have a corresponding verification request
    const allDocProfiles = await prisma.doctorProfile.findMany({
      include: { verificationRequests: true, user: true }
    });
    for (const dp of allDocProfiles) {
      if (dp.verificationRequests.length === 0) {
        const defaultDocs = JSON.stringify([
          {
            id: `lic-${dp.id.substring(0, 8)}`,
            title: "Medical Council License Certificate",
            documentNumber: dp.medicalLicenseNumber,
            documentType: "Medical License",
            issuedBy: "State Medical Council / Board of Medicine",
            fileSize: "2.4 MB",
            fileUrl: `https://careconnect.health/credentials/${dp.medicalLicenseNumber}.pdf`,
            verified: dp.verificationStatus === "VERIFIED"
          },
          {
            id: `deg-${dp.id.substring(0, 8)}`,
            title: "Degree Certificate & Clinical Credentials",
            documentNumber: `DEG-${dp.qualifications.replace(/[^a-zA-Z0-9]/g, "") || "MBBS"}`,
            documentType: "Degree Certificate",
            issuedBy: "Accredited Medical University",
            fileSize: "1.8 MB",
            fileUrl: `https://careconnect.health/credentials/degree-${dp.id.substring(0, 8)}.pdf`,
            verified: dp.verificationStatus === "VERIFIED"
          },
          {
            id: `gov-${dp.id.substring(0, 8)}`,
            title: "Government Identification & Clinic Registry",
            documentNumber: `GOV-${dp.userId.substring(0, 8).toUpperCase()}`,
            documentType: "Government Identity",
            issuedBy: dp.hospitalAffiliation || "Ministry of Health",
            fileSize: "920 KB",
            fileUrl: `https://careconnect.health/credentials/gov-${dp.userId.substring(0, 8)}.pdf`,
            verified: true
          }
        ]);

        const initStatus = dp.verificationStatus === "VERIFIED" ? "APPROVED" : (dp.verificationStatus === "REJECTED" ? "REJECTED" : "PENDING");
        await prisma.doctorVerificationRequest.create({
          data: {
            doctorId: dp.userId,
            doctorProfileId: dp.id,
            licenseNumber: dp.medicalLicenseNumber,
            documentUrls: defaultDocs,
            status: initStatus,
            reviewNotes: dp.rejectionReason || (initStatus === "APPROVED" ? "Verified practitioner credential" : "Awaiting initial clinical review"),
            reviewedAt: initStatus !== "PENDING" ? new Date() : null,
          }
        });
      }
    }

    const where: any = {};
    if (req.query.status && req.query.status !== "ALL") {
      where.status = req.query.status;
    }
    if (req.query.search && req.query.search.trim()) {
      const q = req.query.search.trim();
      where.OR = [
        { licenseNumber: { contains: q } },
        { doctor: { name: { contains: q } } },
        { doctor: { email: { contains: q } } },
        { doctorProfile: { specialization: { contains: q } } },
      ];
    }

    const [total, requests] = await Promise.all([
      prisma.doctorVerificationRequest.count({ where }),
      prisma.doctorVerificationRequest.findMany({
        where,
        include: {
          doctor: {
            select: { id: true, name: true, email: true, phone: true, status: true, createdAt: true }
          },
          doctorProfile: true,
          reviewer: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { submittedAt: "desc" },
        skip,
        take: limit,
      })
    ]);

    res.json({
      data: requests,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      }
    });
  } catch (err) {
    console.error("Failed to fetch doctor verifications:", err);
    res.status(500).json({ error: "Failed to fetch verification requests" });
  }
});

// Get individual verification request details
app.get("/api/admin/verifications/:id", authenticateToken, requireRole(["admin"]), async (req: any, res) => {
  try {
    const item = await prisma.doctorVerificationRequest.findUnique({
      where: { id: req.params.id },
      include: {
        doctor: {
          select: { id: true, name: true, email: true, phone: true, status: true, createdAt: true }
        },
        doctorProfile: true,
        reviewer: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    if (!item) {
      return res.status(404).json({ error: "Verification request not found." });
    }
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: "Failed to load verification details." });
  }
});

// Review doctor verification (Approve, Reject with reason, Request Info, Suspend)
app.put("/api/admin/verifications/:id", authenticateToken, requireRole(["admin"]), async (req: any, res) => {
  const { status, reviewNotes } = req.body;
  if (!["APPROVED", "REJECTED", "INFO_REQUESTED", "SUSPENDED"].includes(status)) {
    return res.status(400).json({ error: "Invalid status. Must be APPROVED, REJECTED, INFO_REQUESTED, or SUSPENDED." });
  }

  if (["REJECTED", "INFO_REQUESTED", "SUSPENDED"].includes(status) && (!reviewNotes || !reviewNotes.trim())) {
    return res.status(400).json({ error: `An official explanation or reason is required when setting status to ${status}.` });
  }

  try {
    const existing = await prisma.doctorVerificationRequest.findUnique({
      where: { id: req.params.id },
      include: { doctor: true, doctorProfile: true }
    });

    if (!existing) {
      return res.status(404).json({ error: "Verification request not found." });
    }

    const updated = await prisma.doctorVerificationRequest.update({
      where: { id: req.params.id },
      data: {
        status,
        reviewNotes: reviewNotes || (status === "APPROVED" ? "Approved by Medical Administration" : null),
        reviewerId: req.user.id,
        reviewedAt: new Date(),
      },
      include: {
        doctor: { select: { id: true, name: true, email: true, phone: true, status: true } },
        doctorProfile: true,
        reviewer: { select: { id: true, name: true, email: true } }
      }
    });

    // Synchronize Doctor Profile verification status
    let targetDocProfileStatus = "PENDING";
    if (status === "APPROVED") targetDocProfileStatus = "VERIFIED";
    else if (status === "REJECTED" || status === "SUSPENDED") targetDocProfileStatus = "REJECTED";
    else if (status === "INFO_REQUESTED") targetDocProfileStatus = "PENDING";

    await prisma.doctorProfile.update({
      where: { id: existing.doctorProfileId },
      data: {
        verificationStatus: targetDocProfileStatus,
        rejectionReason: ["REJECTED", "SUSPENDED", "INFO_REQUESTED"].includes(status) ? reviewNotes : null
      }
    });

    // If SUSPENDED, suspend the user account; if APPROVED, ensure Active & emailVerified
    if (status === "SUSPENDED") {
      await prisma.user.update({
        where: { id: existing.doctorId },
        data: { status: "Suspended" }
      });
    } else if (status === "APPROVED") {
      await prisma.user.update({
        where: { id: existing.doctorId },
        data: { status: "Active", isEmailVerified: true }
      });
    }

    // Prepare notification content based on review action
    let notifTitle = "Medical Credentials Update";
    let notifMsg = `Your credentials review status is now: ${status}.`;
    let notifType: "info" | "warning" | "error" = "info";

    if (status === "APPROVED") {
      notifTitle = "🎉 Medical Credentials Approved!";
      notifMsg = `Congratulations Dr. ${existing.doctor.name}! Your medical credentials have been approved by the Medical Board. You now have full clinical access.`;
      notifType = "info";
    } else if (status === "REJECTED") {
      notifTitle = "⚠️ Credential Application Update";
      notifMsg = `Your medical credential application has been reviewed and rejected. Reason: ${reviewNotes}`;
      notifType = "warning";
    } else if (status === "INFO_REQUESTED") {
      notifTitle = "📋 Additional Credential Information Requested";
      notifMsg = `The Medical Administration requires additional information regarding your license/qualifications: ${reviewNotes}`;
      notifType = "warning";
    } else if (status === "SUSPENDED") {
      notifTitle = "🛑 Provider Account Suspended";
      notifMsg = `Your clinical account has been suspended by Administration. Reason: ${reviewNotes}`;
      notifType = "error";
    }

    // Dispatch audited transactional email and in-app notification
    try {
      await createAndDispatchNotification({
        userId: existing.doctorId,
        recipientEmail: existing.doctor.email,
        recipientName: `Dr. ${existing.doctor.name}`,
        title: notifTitle,
        message: notifMsg,
        type: notifType,
        category: "account",
        link: status === "APPROVED" ? "/doctor/dashboard" : "/doctor/pending",
        emailTemplate: "ACCOUNT_UPDATE",
        emailSubject: `CareConnect: ${notifTitle}`,
        emailHtml: buildCareConnectEmailTemplate({
          headline: notifTitle,
          recipientName: `Dr. ${existing.doctor.name}`,
          bodyParagraphs: [
            notifMsg,
            status === "INFO_REQUESTED"
              ? "Please sign in to your provider portal to review the requirements and upload requested documents."
              : status === "APPROVED"
              ? "Your clinical permissions, schedule management, e-prescriptions, and consultation features are active."
              : "If you have questions regarding this decision, you may contact hospital administration."
          ],
          actionButtonText: status === "APPROVED" ? "Open Doctor Dashboard" : "View Credential Status",
          actionButtonUrl: status === "APPROVED" ? "http://localhost:8080/doctor/dashboard" : "http://localhost:8080/doctor/pending",
          noticeText: "This official communication was generated by the CareConnect Hospital Medical Board."
        }),
        idempotencyKey: `doc_verif_${existing.id}_${status}_${Date.now()}`
      });
    } catch (notifErr) {
      console.error("[Notification Dispatch Warning]", notifErr);
    }

    // Audit log
    await logAuditEvent({
      userId: req.user.id,
      action: `VERIFY_DOCTOR_${status}`,
      entity: "DoctorVerificationRequest",
      entityId: updated.id,
      details: {
        doctorId: existing.doctorId,
        doctorProfileId: existing.doctorProfileId,
        status,
        reviewNotes: reviewNotes || null,
      },
      severity: status === "APPROVED" ? "INFO" : (status === "SUSPENDED" ? "CRITICAL" : "WARN"),
      ...getClientMeta(req)
    });

    io.emit("doctorVerificationUpdated", {
      userId: existing.doctorId,
      verificationStatus: targetDocProfileStatus,
      doctorName: existing.doctor.name,
      status
    });

    res.json({ success: true, verification: updated });
  } catch (err) {
    console.error("Failed to review verification:", err);
    res.status(500).json({ error: "Failed to update verification request." });
  }
});

// List all users with server-side pagination, search, role & status filtering (Zero password/token leakage)
app.get("/api/admin/users", authenticateToken, requireRole(["admin"]), async (req: any, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || "20", 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (req.query.role && req.query.role !== "all") {
      where.role = req.query.role;
    }
    if (req.query.status && req.query.status !== "all") {
      where.status = req.query.status;
    }
    if (req.query.search && req.query.search.trim()) {
      const q = req.query.search.trim();
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          isEmailVerified: true,
          createdAt: true,
          updatedAt: true,
          doctorProfile: {
            select: {
              id: true,
              specialization: true,
              qualifications: true,
              medicalLicenseNumber: true,
              verificationStatus: true,
              experienceYears: true,
              clinicAddress: true,
              consultationFee: true,
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      })
    ]);

    res.json({
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      }
    });
  } catch (err) {
    console.error("Failed to fetch users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Update user role (Strictly server protected with orphan admin guard)
app.patch("/api/admin/users/:id/role", authenticateToken, requireRole(["admin"]), async (req: any, res) => {
  const { role } = req.body;
  if (!["patient", "doctor", "admin"].includes(role)) {
    return res.status(400).json({ error: "Invalid role specified." });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: "User not found." });
    }

    // Guard: Prevent demoting the last active administrator
    if (existing.role === "admin" && role !== "admin") {
      const remainingAdmins = await prisma.user.count({
        where: { role: "admin", status: "Active", id: { not: existing.id } }
      });
      if (remainingAdmins === 0) {
        return res.status(400).json({
          error: "Action Denied: Cannot demote the last remaining active administrator."
        });
      }
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, name: true, email: true, role: true, status: true }
    });

    await logAuditEvent({
      userId: req.user.id,
      action: "CHANGE_USER_ROLE",
      entity: "User",
      entityId: updated.id,
      details: { targetUserId: updated.id, oldRole: existing.role, newRole: role },
      severity: "WARN",
      ...getClientMeta(req)
    });

    res.json({ success: true, user: updated });
  } catch (err) {
    console.error("Failed to update user role:", err);
    res.status(500).json({ error: "Failed to update user role" });
  }
});

// Toggle user status (Activate / Suspend with audit log and self-suspension guard)
app.patch("/api/admin/users/:id/status", authenticateToken, requireRole(["admin"]), async (req: any, res) => {
  const { status, reason } = req.body;
  if (!["Active", "Suspended"].includes(status)) {
    return res.status(400).json({ error: "Invalid status specified. Must be 'Active' or 'Suspended'." });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: "User not found." });
    }

    // Guard: Prevent administrator from suspending their own active session
    if (req.user.id === req.params.id && status === "Suspended") {
      return res.status(400).json({ error: "Security restriction: You cannot suspend your own active administrator account." });
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { status },
      select: { id: true, name: true, email: true, role: true, status: true }
    });

    await logAuditEvent({
      userId: req.user.id,
      action: status === "Suspended" ? "SUSPEND_USER" : "ACTIVATE_USER",
      entity: "User",
      entityId: updated.id,
      details: { targetUserId: updated.id, status, reason: reason || null },
      severity: status === "Suspended" ? "WARN" : "INFO",
      ...getClientMeta(req)
    });

    res.json({ success: true, user: updated });
  } catch (err) {
    console.error("Failed to update user status:", err);
    res.status(500).json({ error: "Failed to update user status" });
  }
});

// Alias endpoint for audit logs
app.get("/api/admin/audit-logs", authenticateToken, requireRole(["admin"]), async (req: any, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || "25", 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (req.query.action) where.action = req.query.action;
    if (req.query.entity) where.entity = req.query.entity;
    if (req.query.severity) where.severity = req.query.severity;
    if (req.query.userId) where.userId = req.query.userId;
    if (req.query.search) {
      where.OR = [
        { action: { contains: req.query.search } },
        { entity: { contains: req.query.search } },
        { details: { contains: req.query.search } },
        { ipAddress: { contains: req.query.search } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      })
    ]);

    res.json({
      data: logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1
      }
    });
  } catch (err) {
    console.error("[Admin AuditLogs Error]", err);
    res.status(500).json({ error: "Failed to fetch audit records." });
  }
});

// ==========================================
// 🛡️ AUDIT LOGS MANAGEMENT (ADMIN ONLY)
// ==========================================
app.get("/api/audit-logs", authenticateToken, requireRole(["admin"]), async (req: any, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || "25", 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (req.query.action) where.action = req.query.action;
    if (req.query.entity) where.entity = req.query.entity;
    if (req.query.severity) where.severity = req.query.severity;
    if (req.query.userId) where.userId = req.query.userId;
    if (req.query.search) {
      where.OR = [
        { action: { contains: req.query.search } },
        { entity: { contains: req.query.search } },
        { details: { contains: req.query.search } },
        { ipAddress: { contains: req.query.search } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      })
    ]);

    res.json({
      data: logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error("[AuditLogs Error]", err);
    res.status(500).json({ error: "Failed to fetch audit records." });
  }
});

// ==========================================
// 📁 PRIVATE STORAGE & SIGNED DOWNLOAD URLS
// ==========================================
app.post("/api/files/upload", authenticateToken, async (req: any, res) => {
  try {
    const { fileName, fileData, mimeType, description, patientId } = req.body;
    if (!fileName || !fileData) {
      return res.status(400).json({ error: "fileName and fileData (base64 encoded content) are required." });
    }

    let resolvedPatientId = patientId;
    if (req.user.role === "patient") {
      const pt = await prisma.patient.findFirst({
        where: {
          OR: [{ userId: req.user.id }, { email: req.user.email }, { name: req.user.name }]
        }
      });
      if (pt) resolvedPatientId = pt.id;
    } else if (req.user.role === "doctor" && patientId) {
      const allowed = await hasCareRelationship(req.user.id, patientId);
      if (!allowed && req.user.role !== "admin") {
        return res.status(403).json({ error: "Access denied. Cannot upload medical files for an unrelated patient." });
      }
    }

    let rawBase64 = fileData;
    if (rawBase64.includes(";base64,")) {
      rawBase64 = rawBase64.split(";base64,")[1];
    }
    const buffer = Buffer.from(rawBase64, "base64");
    if (buffer.length === 0) {
      return res.status(400).json({ error: "File content cannot be empty." });
    }

    const fileId = crypto.randomUUID();
    const safeExt = path.extname(fileName) || ".bin";
    const storedFileName = `${fileId}${safeExt}`;
    const filePath = path.join(PRIVATE_STORAGE_DIR, storedFileName);
    const metaPath = path.join(PRIVATE_STORAGE_DIR, `${fileId}.meta.json`);

    fs.writeFileSync(filePath, buffer);
    const metaData = {
      fileId,
      storedFileName,
      originalName: fileName,
      mimeType: mimeType || "application/octet-stream",
      sizeBytes: buffer.length,
      description: description || null,
      uploaderId: req.user.id,
      patientId: resolvedPatientId || null,
      createdAt: new Date().toISOString()
    };
    fs.writeFileSync(metaPath, JSON.stringify(metaData, null, 2));

    await logAuditEvent({
      userId: req.user.id,
      action: "UPLOAD_RECORD_FILE",
      entity: "MedicalRecord",
      entityId: fileId,
      details: { fileName, sizeBytes: buffer.length, mimeType, patientId: resolvedPatientId },
      severity: "INFO",
      ...getClientMeta(req)
    });

    const signedToken = generateFileSignedToken(fileId, req.user.id);
    const secureDownloadUrl = `/api/files/download?fileId=${fileId}&token=${signedToken}&userId=${req.user.id}`;

    res.status(201).json({
      success: true,
      fileId,
      fileName,
      mimeType: metaData.mimeType,
      sizeBytes: buffer.length,
      downloadUrl: secureDownloadUrl,
      createdAt: metaData.createdAt
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[FileUpload Error]", errMsg);
    res.status(500).json({ error: "Failed to upload file securely." });
  }
});

// Generate Short-lived signed download URL (15-min token)
app.get("/api/files/signed-url/:fileId", authenticateToken, async (req: any, res) => {
  try {
    const fileId = req.params.fileId;
    const metaPath = path.join(PRIVATE_STORAGE_DIR, `${fileId}.meta.json`);
    if (!fs.existsSync(metaPath)) {
      return res.status(404).json({ error: "File metadata not found." });
    }

    const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));

    // Least-privilege authorization check
    if (req.user.role === "patient") {
      const isOwner = meta.uploaderId === req.user.id;
      let isPatientRecord = false;
      if (meta.patientId) {
        const pt = await prisma.patient.findFirst({
          where: { id: meta.patientId, OR: [{ userId: req.user.id }, { email: req.user.email }] }
        });
        if (pt) isPatientRecord = true;
      }
      if (!isOwner && !isPatientRecord) {
        return res.status(403).json({ error: "Access denied. You can only access your own medical files." });
      }
    } else if (req.user.role === "doctor") {
      if (meta.uploaderId !== req.user.id && meta.patientId) {
        const allowed = await hasCareRelationship(req.user.id, meta.patientId);
        if (!allowed && req.user.role !== "admin") {
          return res.status(403).json({ error: "Access denied. No legitimate care relationship for this patient file." });
        }
      }
    }

    const token = generateFileSignedToken(fileId, req.user.id);
    await logAuditEvent({
      userId: req.user.id,
      action: "GENERATE_SIGNED_URL",
      entity: "MedicalRecord",
      entityId: fileId,
      details: { fileName: meta.originalName },
      severity: "INFO",
      ...getClientMeta(req)
    });

    res.json({
      success: true,
      fileId,
      expiresInSeconds: SIGNED_URL_EXPIRY_SECONDS,
      signedUrl: `/api/files/download?fileId=${fileId}&token=${token}&userId=${req.user.id}`,
    });
  } catch (err) {
    console.error("[SignedUrl Error]", err);
    res.status(500).json({ error: "Failed to generate signed download URL." });
  }
});

// Secure Download Endpoint (Supports Bearer token OR Short-lived Signed URL Token)
app.get("/api/files/download", async (req: any, res) => {
  try {
    const fileId = req.query.fileId as string;
    const token = req.query.token as string;
    const userId = req.query.userId as string;

    if (!fileId) {
      return res.status(400).json({ error: "fileId query parameter is required." });
    }

    const metaPath = path.join(PRIVATE_STORAGE_DIR, `${fileId}.meta.json`);
    if (!fs.existsSync(metaPath)) {
      return res.status(404).json({ error: "Requested file does not exist." });
    }
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    const filePath = path.join(PRIVATE_STORAGE_DIR, meta.storedFileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File binary not found on storage." });
    }

    let authenticatedUserId = userId;

    if (token && userId) {
      const isValid = verifyFileSignedToken(fileId, userId, token);
      if (!isValid) {
        return res.status(403).json({ error: "Invalid or expired download link." });
      }
    } else {
      const authHeader = req.headers["authorization"];
      const bearerToken = authHeader && authHeader.split(" ")[1];
      if (!bearerToken) {
        return res.status(401).json({ error: "Authentication token or signed download link required." });
      }
      const verified = verifyToken(bearerToken);
      if (!verified) {
        return res.status(403).json({ error: "Invalid or expired session token." });
      }
      authenticatedUserId = verified.id;

      if (verified.role === "patient") {
        const isOwner = meta.uploaderId === verified.id;
        let isPatientFile = false;
        if (meta.patientId) {
          const pt = await prisma.patient.findFirst({
            where: { id: meta.patientId, OR: [{ userId: verified.id }, { email: verified.email }] }
          });
          if (pt) isPatientFile = true;
        }
        if (!isOwner && !isPatientFile) {
          return res.status(403).json({ error: "Access denied." });
        }
      } else if (verified.role === "doctor" && meta.patientId && meta.uploaderId !== verified.id) {
        const allowed = await hasCareRelationship(verified.id, meta.patientId);
        if (!allowed && verified.role !== "admin") {
          return res.status(403).json({ error: "Access denied." });
        }
      }
    }

    await logAuditEvent({
      userId: authenticatedUserId || null,
      action: "DOWNLOAD_RECORD",
      entity: "MedicalRecord",
      entityId: fileId,
      details: { fileName: meta.originalName, sizeBytes: meta.sizeBytes },
      severity: "INFO",
      ...getClientMeta(req)
    });

    res.setHeader("Content-Type", meta.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(meta.originalName || "careconnect-file")}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error("[Download Error]", err);
    res.status(500).json({ error: "Failed to stream download." });
  }
});

// ==========================================
// 🩺 DOCTOR VERIFICATION REQUEST WORKFLOW
// ==========================================

// 1. Doctor submits verification request
app.post("/api/doctor/verification/submit", authenticateToken, requireRole(["doctor"]), async (req: any, res) => {
  try {
    const { licenseNumber, documentUrls, specialization, qualifications, experienceYears, hospitalAffiliation } = req.body;

    let profile = await prisma.doctorProfile.findUnique({
      where: { userId: req.user.id }
    });

    if (!profile) {
      profile = await prisma.doctorProfile.create({
        data: {
          userId: req.user.id,
          specialization: specialization || "General Medicine",
          qualifications: qualifications || "MBBS",
          experienceYears: experienceYears ? parseInt(experienceYears, 10) : 0,
          hospitalAffiliation: hospitalAffiliation || null,
          medicalLicenseNumber: licenseNumber || `MED-${Math.floor(10000 + Math.random() * 90000)}`,
          verificationStatus: "PENDING"
        }
      });
    } else {
      profile = await prisma.doctorProfile.update({
        where: { id: profile.id },
        data: {
          ...(licenseNumber && { medicalLicenseNumber: licenseNumber }),
          ...(specialization && { specialization }),
          ...(qualifications && { qualifications }),
          ...(experienceYears !== undefined && { experienceYears: parseInt(experienceYears, 10) }),
          ...(hospitalAffiliation && { hospitalAffiliation }),
          verificationStatus: "PENDING",
          rejectionReason: null
        }
      });
    }

    const docUrlsStr = documentUrls ? (typeof documentUrls === "string" ? documentUrls : JSON.stringify(documentUrls)) : null;

    const verificationRequest = await prisma.doctorVerificationRequest.create({
      data: {
        doctorId: req.user.id,
        doctorProfileId: profile.id,
        licenseNumber: licenseNumber || profile.medicalLicenseNumber,
        documentUrls: docUrlsStr,
        status: "PENDING"
      }
    });

    // Notify administrators
    const admins = await prisma.user.findMany({ where: { role: "admin" } });
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: "📋 Doctor Verification Application",
          message: `Dr. ${req.user.name} submitted credentials (License: ${verificationRequest.licenseNumber}) for administrative review.`,
          type: "info"
        }
      });
    }

    await logAuditEvent({
      userId: req.user.id,
      action: "SUBMIT_VERIFICATION",
      entity: "DoctorVerificationRequest",
      entityId: verificationRequest.id,
      details: { licenseNumber: verificationRequest.licenseNumber, specialization },
      severity: "INFO",
      ...getClientMeta(req)
    });

    io.emit("doctorVerificationSubmitted", {
      requestId: verificationRequest.id,
      doctorName: req.user.name,
      licenseNumber: verificationRequest.licenseNumber
    });

    res.status(201).json({
      success: true,
      request: verificationRequest,
      doctorProfile: profile
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[DoctorVerification Submit Error]", errMsg);
    res.status(500).json({ error: "Failed to submit verification request." });
  }
});



// ==========================================
// ⏰ DOCTOR AVAILABILITY RULES (DoctorAvailability Entity)
// ==========================================
app.get("/api/doctor/availability/rules", authenticateToken, async (req: any, res) => {
  try {
    let targetDoctorId = req.user.id;
    if (req.query.doctorId) targetDoctorId = req.query.doctorId as string;

    const rules = await prisma.doctorAvailability.findMany({
      where: { doctorId: targetDoctorId },
      orderBy: { dayOfWeek: "asc" }
    });
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch availability rules." });
  }
});

app.put("/api/doctor/availability/rules", authenticateToken, requireVerifiedDoctor, async (req: any, res) => {
  try {
    const { rules } = req.body;
    if (!Array.isArray(rules)) {
      return res.status(400).json({ error: "Rules array is required." });
    }

    const docProfile = await prisma.doctorProfile.findUnique({ where: { userId: req.user.id } });

    await prisma.$transaction(async (tx) => {
      await tx.doctorAvailability.deleteMany({
        where: { doctorId: req.user.id }
      });

      for (const rule of rules) {
        if (!rule.dayOfWeek || !rule.startTime || !rule.endTime) continue;
        await tx.doctorAvailability.create({
          data: {
            doctorId: req.user.id,
            doctorProfileId: docProfile?.id || null,
            dayOfWeek: rule.dayOfWeek,
            startTime: rule.startTime,
            endTime: rule.endTime,
            slotDurationMinutes: rule.slotDurationMinutes ? parseInt(rule.slotDurationMinutes, 10) : 30,
            isWorkingDay: rule.isWorkingDay !== undefined ? Boolean(rule.isWorkingDay) : true,
            breakStartTime: rule.breakStartTime || null,
            breakEndTime: rule.breakEndTime || null,
            effectiveStartDate: rule.effectiveStartDate || null,
            effectiveEndDate: rule.effectiveEndDate || null,
          }
        });
      }
    });

    await logAuditEvent({
      userId: req.user.id,
      action: "UPDATE_AVAILABILITY_RULES",
      entity: "DoctorAvailability",
      details: { rulesCount: rules.length },
      severity: "INFO",
      ...getClientMeta(req)
    });

    const updatedRules = await prisma.doctorAvailability.findMany({
      where: { doctorId: req.user.id }
    });
    res.json({ success: true, rules: updatedRules });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to update availability rules: " + errMsg });
  }
});

// ==========================================
// 📝 CLINICAL CONSULTATION NOTES QUERY
// ==========================================
app.get("/api/consultations", authenticateToken, async (req: any, res) => {
  try {
    const page = req.query.page ? Math.max(1, parseInt(req.query.page as string || "1", 10)) : null;
    const limit = req.query.limit ? Math.min(100, Math.max(1, parseInt(req.query.limit as string || "20", 10))) : null;

    let whereClause: any = {};
    if (req.user.role === "patient") {
      const associatedPatients = await prisma.patient.findMany({
        where: {
          OR: [{ userId: req.user.id }, { email: req.user.email }, { name: req.user.name }]
        },
        select: { id: true }
      });
      whereClause.patientId = { in: associatedPatients.map(p => p.id) };
    } else if (req.user.role === "doctor") {
      if (req.query.patientId) {
        const allowed = await hasCareRelationship(req.user.id, req.query.patientId);
        if (!allowed && req.user.role !== "admin") {
          return res.status(403).json({ error: "Access denied. Doctors can only view consultation notes for patients under their care." });
        }
        whereClause.patientId = req.query.patientId;
      } else {
        whereClause.doctorId = req.user.id;
      }
    }

    const total = await prisma.consultationNote.count({ where: whereClause });
    const notes = await prisma.consultationNote.findMany({
      where: whereClause,
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        doctor: { select: { id: true, name: true, email: true } },
        appointment: { select: { id: true, date: true, time: true, status: true, consultationType: true } }
      },
      orderBy: { createdAt: "desc" },
      ...(page && limit ? { skip: (page - 1) * limit, take: limit } : {})
    });

    if (page && limit) {
      return res.json({
        data: notes,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
      });
    }
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch consultation notes." });
  }
});

app.get("/api/consultations/:id", authenticateToken, async (req: any, res) => {
  try {
    const note = await prisma.consultationNote.findUnique({
      where: { id: req.params.id },
      include: {
        patient: true,
        doctor: { select: { id: true, name: true, email: true } },
        appointment: true
      }
    });
    if (!note) return res.status(404).json({ error: "Consultation note not found." });

    if (req.user.role === "patient") {
      const pt = await prisma.patient.findFirst({
        where: { id: note.patientId, OR: [{ userId: req.user.id }, { email: req.user.email }] }
      });
      if (!pt) return res.status(403).json({ error: "Access denied." });
    } else if (req.user.role === "doctor") {
      if (note.doctorId !== req.user.id) {
        const allowed = await hasCareRelationship(req.user.id, note.patientId);
        if (!allowed && req.user.role !== "admin") return res.status(403).json({ error: "Access denied." });
      }
    }

    res.json(note);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch consultation note details." });
  }
});

// Bootstrap initial roles and seed admin
async function bootstrapInitialRoles() {
  try {
    const doctors = await prisma.user.findMany({ where: { role: "doctor" } });
    for (const doc of doctors) {
      const existingProfile = await prisma.doctorProfile.findUnique({ where: { userId: doc.id } });
      if (!existingProfile) {
        await prisma.doctorProfile.create({
          data: {
            userId: doc.id,
            specialization: "General Medicine & Cardiology",
            qualifications: "MBBS, MD",
            experienceYears: 8,
            hospitalAffiliation: "CareConnect Central Medical",
            medicalLicenseNumber: `MED-${Math.floor(10000 + Math.random() * 90000)}`,
            verificationStatus: "VERIFIED",
            consultationFee: 500,
          }
        });
      }
    }

    const admin = await prisma.user.findFirst({ where: { role: "admin" } });
    if (!admin) {
      await prisma.user.create({
        data: {
          name: "CareConnect Administrator",
          email: "admin@careconnect.com",
          role: "admin",
          passwordHash: hashPassword("Admin@123"),
          isEmailVerified: true,
          status: "Active",
          phone: "+1 555-0100"
        }
      });
      console.log("[Bootstrap] Default Administrator seeded: admin@careconnect.com / Admin@123");
    }
  } catch (err) {
    console.error("Bootstrap error:", err);
  }
}

httpServer.listen(PORT, async () => {
  await bootstrapInitialRoles();
  console.log(`Server listening on port ${PORT}`);
});
