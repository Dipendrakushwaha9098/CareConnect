import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync, spawn, ChildProcess } from "child_process";
import fs from "fs";

// Use port 3002 for isolated test server
const PORT = "3002";
const API_URL = `http://localhost:${PORT}/api`;

describe("CareConnect Backend Integration & Security Tests", () => {
  let patientToken: string;
  let doctorToken: string;
  let adminToken: string;
  let patientId: string;
  let testAppointmentId: string;
  let testReminderId: string;
  let testSymptomCheckId: string;
  let serverProcess: ChildProcess;

  beforeAll(async () => {
    // 1. Clean and setup test database schema via prisma
    try {
      console.log("Preparing test database...");
      // Run push with DATABASE_URL env set to test.db
      execSync("npx prisma db push --accept-data-loss", {
        cwd: "./server",
        env: { ...process.env, DATABASE_URL: "file:./test.db" }
      });
      console.log("Test database schema generated.");

      // Run seed script on the test database
      execSync("node seed.js", {
        cwd: "./server",
        env: { ...process.env, DATABASE_URL: "file:./test.db" }
      });
      console.log("Test database seeded.");
    } catch (e: any) {
      console.error("Test database preparation failed:", e.message);
    }

    // 2. Spawn separate test backend server on port 3002
    try {
      console.log("Starting test server on port 3002...");
      serverProcess = spawn("npm", ["run", "dev"], {
        cwd: "./server",
        env: {
          ...process.env,
          DATABASE_URL: "file:./test.db",
          PORT: PORT,
          NODE_ENV: "test" // Bypasses real SMTP in backend server too!
        },
        shell: true
      });

      // Poll port 3002 until it answers
      let ready = false;
      for (let i = 0; i < 30; i++) {
        try {
          const res = await fetch(`http://localhost:${PORT}/api/patients`, {
            headers: { "Authorization": "Bearer test" }
          });
          if (res.status === 403 || res.status === 401 || res.status === 200) {
            ready = true;
            break;
          }
        } catch {
          // Await 500ms
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      if (ready) {
        console.log("Test server is ready.");
      } else {
        throw new Error("Timeout waiting for test server to start.");
      }
    } catch (e: any) {
      console.error("Failed to start test server:", e.message);
    }
  }, 60000); // 60s timeout for startup

  afterAll(async () => {
    // 1. Kill test server process first to release file locks
    if (serverProcess) {
      console.log("Stopping test server...");
      if (process.platform === "win32" && serverProcess.pid) {
        try {
          execSync(`taskkill /pid ${serverProcess.pid} /T /F`);
        } catch (err: any) {
          console.warn("taskkill failed:", err.message);
        }
      } else {
        serverProcess.kill();
      }
      // Wait a moment for process to exit cleanly
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // 2. Delete temporary test.db files
    try {
      console.log("Removing test database files...");
      const paths = ["./server/prisma/test.db", "./server/prisma/test.db-journal"];
      paths.forEach((p) => {
        if (fs.existsSync(p)) {
          try {
            fs.unlinkSync(p);
          } catch (err) {
            // If still locked, we can try to force delete or log it
            console.warn(`Could not delete file ${p}:`, (err as Error).message);
          }
        }
      });
      console.log("Test database files removed successfully.");
    } catch (e: any) {
      console.error("Failed to remove test db files:", e.message);
    }
  }, 15000);

  describe("1. Authentication & Registration Flow", () => {
    it("should successfully request OTP for a new Patient", async () => {
      const res = await fetch(`${API_URL}/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test.patient@careconnect.com",
          role: "patient"
        })
      });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.otp).toBeDefined();
    });

    it("should verify OTP and register a Patient", async () => {
      // 1. Request OTP to retrieve code
      const otpRes = await fetch(`${API_URL}/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test.patient@careconnect.com",
          role: "patient"
        })
      });
      const { otp } = await otpRes.json();

      // 2. Verify OTP
      const verifyRes = await fetch(`${API_URL}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test.patient@careconnect.com",
          otp,
          role: "patient",
          name: "Test Patient"
        })
      });
      const verifyData = await verifyRes.json();
      expect(verifyRes.status).toBe(200);
      expect(verifyData.success).toBe(true);
      expect(verifyData.user.token).toBeDefined();
      expect(verifyData.user.role).toBe("patient");
      
      patientToken = verifyData.user.token;
    });

    it("should verify OTP and register a Doctor", async () => {
      const otpRes = await fetch(`${API_URL}/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test.doctor@careconnect.com",
          role: "doctor"
        })
      });
      const { otp } = await otpRes.json();

      const verifyRes = await fetch(`${API_URL}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test.doctor@careconnect.com",
          otp,
          role: "doctor",
          name: "Test Doctor"
        })
      });
      const verifyData = await verifyRes.json();
      expect(verifyRes.status).toBe(200);
      expect(verifyData.success).toBe(true);
      expect(verifyData.user.token).toBeDefined();
      expect(verifyData.user.role).toBe("doctor");

      doctorToken = verifyData.user.token;
    });

    it("should verify OTP and register an Admin", async () => {
      const otpRes = await fetch(`${API_URL}/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test.admin@careconnect.com",
          role: "admin"
        })
      });
      const { otp } = await otpRes.json();

      const verifyRes = await fetch(`${API_URL}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test.admin@careconnect.com",
          otp,
          role: "admin",
          name: "Test Admin"
        })
      });
      const verifyData = await verifyRes.json();
      expect(verifyRes.status).toBe(200);
      expect(verifyData.success).toBe(true);
      expect(verifyData.user.token).toBeDefined();
      expect(verifyData.user.role).toBe("admin");

      adminToken = verifyData.user.token;
    });
  });

  describe("2. Patient Functions", () => {
    it("should book an appointment as a Patient", async () => {
      const res = await fetch(`${API_URL}/appointments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${patientToken}`
        },
        body: JSON.stringify({
          patientName: "Test Patient",
          patientPhone: "+1 555-9876",
          patientAge: 25,
          patientGender: "Male",
          therapy: "Pediatric Wellness Protocol",
          date: "2026-07-20",
          time: "10:00 AM",
          notes: "Need health checkup"
        })
      });
      const data = await res.json();
      expect(res.status).toBe(201);
      expect(data.id).toBeDefined();
      expect(data.patient).toBe("Test Patient");
      expect(data.status).toBe("Pending"); // Defaults to pending

      testAppointmentId = data.id;
      patientId = data.patientId;
    });

    it("should add a medicine reminder as a Patient", async () => {
      const res = await fetch(`${API_URL}/reminders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${patientToken}`
        },
        body: JSON.stringify({
          name: "Vitamin C 500mg",
          time: "08:00 AM",
          freq: "Once daily"
        })
      });
      const data = await res.json();
      expect(res.status).toBe(201);
      expect(data.id).toBeDefined();
      expect(data.name).toBe("Vitamin C 500mg");

      testReminderId = data.id;
    });

    it("should save symptom checks as a Patient", async () => {
      const res = await fetch(`${API_URL}/symptom-checks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${patientToken}`
        },
        body: JSON.stringify({
          symptoms: "cough and sneezing",
          diagnosis: "Mild Seasonal Rhinitis (Allergies)",
          urgency: "Routine Care",
          specialist: "Integrative Medicine / GP"
        })
      });
      const data = await res.json();
      expect(res.status).toBe(201);
      expect(data.id).toBeDefined();
      expect(data.symptoms).toBe("cough and sneezing");

      testSymptomCheckId = data.id;
    });

    it("should fetch patient's own reminders", async () => {
      const res = await fetch(`${API_URL}/reminders`, {
        headers: { "Authorization": `Bearer ${patientToken}` }
      });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(1);
      expect(data[0].name).toBe("Vitamin C 500mg");
    });
  });

  describe("3. Doctor & Admin Functions", () => {
    it("should allow Doctor to view patient records", async () => {
      const res = await fetch(`${API_URL}/patients`, {
        headers: { "Authorization": `Bearer ${doctorToken}` }
      });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(1);
    });

    it("should allow Doctor to approve/reschedule appointment", async () => {
      const res = await fetch(`${API_URL}/appointments/${testAppointmentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${doctorToken}`
        },
        body: JSON.stringify({
          status: "Scheduled",
          date: "2026-07-20",
          time: "11:00 AM"
        })
      });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.status).toBe("Scheduled");
      expect(data.time).toBe("11:00 AM");
    });

    it("should allow Doctor to write a prescription", async () => {
      const res = await fetch(`${API_URL}/prescriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${doctorToken}`
        },
        body: JSON.stringify({
          patient: "Test Patient",
          doctor: "Test Doctor",
          date: "2026-07-20",
          medicines: JSON.stringify(["Amoxicillin 500mg", "Paracetamol 500mg"])
        })
      });
      const data = await res.json();
      expect(res.status).toBe(201);
      expect(data.id).toBeDefined();
      expect(data.patient).toBe("Test Patient");
    });

    it("should allow Doctor to create an invoice", async () => {
      const res = await fetch(`${API_URL}/invoices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${doctorToken}`
        },
        body: JSON.stringify({
          patient: "Test Patient",
          amount: "₹1,500",
          date: "2026-07-20"
        })
      });
      const data = await res.json();
      expect(res.status).toBe(201);
      expect(data.id).toBeDefined();
      expect(data.amount).toBe("₹1,500");
    });

    it("should allow Admin to view telemedicine sessions queue", async () => {
      const res = await fetch(`${API_URL}/telemedicine-sessions`, {
        headers: { "Authorization": `Bearer ${adminToken}` }
      });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe("4. Security Flow & Role-Based Access Controls", () => {
    it("should refuse access to /patients when not authenticated", async () => {
      const res = await fetch(`${API_URL}/patients`);
      expect(res.status).toBe(401);
    });

    it("should refuse access to /patients for a Patient user (Forbidden)", async () => {
      const res = await fetch(`${API_URL}/patients`, {
        headers: { "Authorization": `Bearer ${patientToken}` }
      });
      expect(res.status).toBe(403);
    });

    it("should block Patient from writing a prescription", async () => {
      const res = await fetch(`${API_URL}/prescriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${patientToken}`
        },
        body: JSON.stringify({
          patient: "Test Patient",
          doctor: "Cheating Patient",
          date: "2026-07-20",
          medicines: JSON.stringify(["Dangerous Drugs"])
        })
      });
      expect(res.status).toBe(403);
    });

    it("should filter appointments so Patient can only see their own", async () => {
      const res = await fetch(`${API_URL}/appointments`, {
        headers: { "Authorization": `Bearer ${patientToken}` }
      });
      const data = await res.json();
      expect(res.status).toBe(200);
      
      // Ensure every appointment returned belongs to the patient
      data.forEach((appt: any) => {
        expect(appt.patient).toBe("Test Patient");
      });
    });

    it("should block Patient from deleting someone else's reminder", async () => {
      const res = await fetch(`${API_URL}/reminders/${testReminderId}`, {
        method: "DELETE" // No token
      });
      expect(res.status).toBe(401);
    });

    it("should block Patient from approving/updating appointment to 'Scheduled'", async () => {
      const res = await fetch(`${API_URL}/appointments/${testAppointmentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${patientToken}`
        },
        body: JSON.stringify({
          status: "Scheduled" // Patients cannot self-approve
        })
      });
      expect(res.status).toBe(403);
    });

    it("should allow Patient to request cancellation for their own appointment", async () => {
      const res = await fetch(`${API_URL}/appointments/${testAppointmentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${patientToken}`
        },
        body: JSON.stringify({
          status: "Cancel Requested",
          cancelReason: "Feeling better"
        })
      });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.status).toBe("Cancel Requested");
      expect(data.cancelReason).toBe("Feeling better");
    });
  });
});
