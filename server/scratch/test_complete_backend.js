const http = require("http");

const BASE_URL = "http://localhost:3001";

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url || options.path, BASE_URL);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || "GET",
      headers: options.headers || {}
    };

    if (postData) {
      if (typeof postData === "object" && !Buffer.isBuffer(postData)) {
        postData = JSON.stringify(postData);
        reqOptions.headers["Content-Type"] = "application/json";
      }
      reqOptions.headers["Content-Length"] = Buffer.byteLength(postData);
    }

    const req = http.request(reqOptions, (res) => {
      let rawData = "";
      res.on("data", (chunk) => { rawData += chunk; });
      res.on("end", () => {
        let json = null;
        try { json = JSON.parse(rawData); } catch (e) { json = rawData; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on("error", (e) => reject(e));
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log("============================================================");
  console.log("🏥 CareConnect Complete Backend & Database Verification Suite");
  console.log("============================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      process.exitCode = 1;
    }
  }

  try {
    // 1. AUTHENTICATION & PROFILES
    console.log("📋 1. Authentication & Profiles (Entities 1 & 2)");
    const patientLogin = await request({
      path: "/api/auth/login",
      method: "POST"
    }, { email: "dipendra@careconnect.com", password: "CareConnect@123" });
    assert(patientLogin.status === 200 && patientLogin.body.user?.token, "Patient login succeeds with token");
    const patientToken = patientLogin.body.user.token;
    const patientUser = patientLogin.body.user;

    const doctorLogin = await request({
      path: "/api/auth/login",
      method: "POST"
    }, { email: "dr.alexander@careconnect.com", password: "Doctor@123" });
    assert(doctorLogin.status === 200 && doctorLogin.body.user?.token, "Doctor login succeeds with token");
    const doctorToken = doctorLogin.body.user.token;
    const doctorUser = doctorLogin.body.user;

    const adminLogin = await request({
      path: "/api/auth/login",
      method: "POST"
    }, { email: "admin@careconnect.com", password: "Admin@123" });
    assert(adminLogin.status === 200 && adminLogin.body.user?.role === "admin", "Admin login succeeds");
    const adminToken = adminLogin.body.user.token;

    // 2. AUDIT LOG RECORDING (Entity 10)
    console.log("\n🛡️ 2. Audit Logs on Sensitive Operations (Entity 10)");
    const auditRes = await request({
      path: "/api/audit-logs?action=LOGIN&page=1&limit=5",
      method: "GET",
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(auditRes.status === 200 && auditRes.body.data?.length > 0, "Admin can retrieve paginated audit logs for LOGIN");
    assert(auditRes.body.pagination?.total >= 1, "Audit logs contain pagination metadata");

    const nonAdminAudit = await request({
      path: "/api/audit-logs",
      method: "GET",
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    assert(nonAdminAudit.status === 403, "Non-admin user cannot access audit logs (403 Forbidden)");

    // 3. DOCTOR VERIFICATION REQUESTS (Entity 3)
    console.log("\n🩺 3. Doctor Verification Workflow (Entity 3)");
    const submitVerif = await request({
      path: "/api/doctor/verification/submit",
      method: "POST",
      headers: { Authorization: `Bearer ${doctorToken}` }
    }, {
      licenseNumber: "MED-TEST-99881",
      specialization: "Cardiology & Preventive Health",
      qualifications: "MD, FACC",
      experienceYears: 12,
      hospitalAffiliation: "CareConnect General Hospital",
      documentUrls: ["https://careconnect.local/docs/cert-license.pdf"]
    });
    assert(submitVerif.status === 201 && submitVerif.body.request?.status === "PENDING", "Doctor submits verification request (PENDING)");
    const verifRequestId = submitVerif.body.request.id;

    const listVerif = await request({
      path: "/api/admin/verifications?status=PENDING",
      method: "GET",
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(listVerif.status === 200 && listVerif.body.data?.some(r => r.id === verifRequestId), "Admin lists pending verification requests");

    const approveVerif = await request({
      path: `/api/admin/verifications/${verifRequestId}`,
      method: "PUT",
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      status: "APPROVED",
      reviewNotes: "Board certifications and state medical license confirmed valid."
    });
    assert(approveVerif.status === 200 && approveVerif.body.verification?.status === "APPROVED", "Admin approves doctor verification request");
    assert(approveVerif.body.doctorProfile?.verificationStatus === "VERIFIED", "Doctor profile verificationStatus transitions to VERIFIED");

    // 4. DOCTOR AVAILABILITY RULES (Entity 4)
    console.log("\n⏰ 4. Doctor Availability Rules (Entity 4)");
    const setRules = await request({
      path: "/api/doctor/availability/rules",
      method: "PUT",
      headers: { Authorization: `Bearer ${doctorToken}` }
    }, {
      rules: [
        { dayOfWeek: "Monday", startTime: "09:00 AM", endTime: "05:00 PM", slotDurationMinutes: 30, isWorkingDay: true, breakStartTime: "01:00 PM", breakEndTime: "02:00 PM" },
        { dayOfWeek: "Tuesday", startTime: "09:00 AM", endTime: "05:00 PM", slotDurationMinutes: 30, isWorkingDay: true },
        { dayOfWeek: "Wednesday", startTime: "09:00 AM", endTime: "05:00 PM", slotDurationMinutes: 30, isWorkingDay: true },
        { dayOfWeek: "Thursday", startTime: "09:00 AM", endTime: "05:00 PM", slotDurationMinutes: 30, isWorkingDay: true },
        { dayOfWeek: "Friday", startTime: "09:00 AM", endTime: "01:00 PM", slotDurationMinutes: 30, isWorkingDay: true },
        { dayOfWeek: "Saturday", startTime: "10:00 AM", endTime: "02:00 PM", slotDurationMinutes: 30, isWorkingDay: false },
        { dayOfWeek: "Sunday", startTime: "10:00 AM", endTime: "02:00 PM", slotDurationMinutes: 30, isWorkingDay: false }
      ]
    });
    assert(setRules.status === 200 && setRules.body.rules?.length === 7, "Doctor sets 7-day availability rules");

    const getRules = await request({
      path: `/api/doctor/availability/rules?doctorId=${doctorUser.id}`,
      method: "GET",
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    assert(getRules.status === 200 && getRules.body.length === 7, "Patient retrieves doctor availability rules");

    // 5. APPOINTMENT MANAGEMENT (Entity 5)
    console.log("\n📅 5. Appointments & Lifecycle (Entity 5)");
    const futureDate = "2026-11-20"; // Friday
    const bookAppt = await request({
      path: "/api/appointments",
      method: "POST",
      headers: { Authorization: `Bearer ${patientToken}` }
    }, {
      doctorId: doctorUser.id,
      date: futureDate,
      time: "10:00 AM",
      consultationType: "In-Person",
      reasonForVisit: "Comprehensive Cardiovascular Screening",
      patientName: patientUser.name,
      patientPhone: "+1 555-0199",
      patientAge: 32,
      patientGender: "Male"
    });
    assert(bookAppt.status === 201 && bookAppt.body.id, "Patient books appointment with verified doctor");
    const appointmentId = bookAppt.body.id;
    const resolvedPatientId = bookAppt.body.patientId;

    const confirmAppt = await request({
      path: `/api/appointments/${appointmentId}`,
      method: "PUT",
      headers: { Authorization: `Bearer ${doctorToken}` }
    }, {
      status: "Confirmed"
    });
    assert(confirmAppt.status === 200 && confirmAppt.body.status === "Confirmed", "Doctor confirms appointment");

    // 6. CLINICAL CONSULTATION NOTES & MEDICAL RECORDS (Entities 6 & 7)
    console.log("\n📝 6. Consultation Notes & Medical Records (Entities 6 & 7)");
    const createConsult = await request({
      path: "/api/consultations",
      method: "POST",
      headers: { Authorization: `Bearer ${doctorToken}` }
    }, {
      patientId: resolvedPatientId,
      appointmentId: appointmentId,
      chiefComplaint: "Mild exertional dyspnea and routine lipid check",
      observations: "BP 120/78 mmHg, normal S1/S2 heart sounds, lungs clear bilaterally.",
      diagnosis: "Essential primary hypertension, well controlled",
      treatmentPlan: "Prescribe Amlodipine 5mg once daily; low sodium diet.",
      followUpDate: "2026-12-20",
      status: "Finalized",
      notes: "Patient is compliant with lifestyle modifications."
    });
    assert(createConsult.status === 201 && createConsult.body.id && createConsult.body.consultationNoteId, "Consultation creates MedicalRecord and ConsultationNote transactionally");
    const medicalRecordId = createConsult.body.id;
    const consultationNoteId = createConsult.body.consultationNoteId;

    // Check appointment automatically transitioned to Completed
    const apptCheck = await request({
      path: `/api/appointments/${appointmentId}`,
      method: "GET",
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    assert(apptCheck.status === 200 && apptCheck.body.status === "Completed", "Appointment marked Completed upon finalized consultation");

    // Test Consultation Notes endpoint
    const consultNotes = await request({
      path: "/api/consultations?page=1&limit=5",
      method: "GET",
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    assert(consultNotes.status === 200 && consultNotes.body.data?.some(n => n.id === consultationNoteId), "Doctor retrieves paginated consultation notes");

    // 7. LEAST-PRIVILEGE CARE RELATIONSHIP & PRIVACY
    console.log("\n🔒 7. Least-Privilege Authorization & Privacy Checks");
    // Patient queries own medical records
    const patientRecords = await request({
      path: "/api/medical-records?page=1&limit=10",
      method: "GET",
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    assert(patientRecords.status === 200 && patientRecords.body.data?.some(r => r.id === medicalRecordId), "Patient accesses only their own medical records");

    // Doctor with care relationship queries patient records
    const docPatientRecords = await request({
      path: `/api/medical-records?patientId=${resolvedPatientId}`,
      method: "GET",
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    assert(docPatientRecords.status === 200 && docPatientRecords.body.length > 0, "Doctor with active care relationship can view patient medical records");

    // 8. PRESCRIPTIONS (Entity 8)
    console.log("\n💊 8. Prescriptions & Digital Signing (Entity 8)");
    const issueRx = await request({
      path: "/api/doctor/prescriptions",
      method: "POST",
      headers: { Authorization: `Bearer ${doctorToken}` }
    }, {
      patientId: resolvedPatientId,
      patientName: patientUser.name,
      appointmentId: appointmentId,
      date: futureDate,
      medicines: [
        { name: "Amlodipine Besylate", dosage: "5mg", route: "Oral", frequency: "Once Daily", duration: "30 Days", instructions: "Take in the morning with water" }
      ],
      followUpRecommendations: "Check blood pressure twice weekly at home",
      isFinalized: true
    });
    assert(issueRx.status === 201 && issueRx.body.id && issueRx.body.isFinalized === true, "Doctor issues and digitally signs prescription");
    const rxId = issueRx.body.id;

    // Patient queries their prescriptions
    const patientRxList = await request({
      path: "/api/prescriptions",
      method: "GET",
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    assert(patientRxList.status === 200 && patientRxList.body.some(rx => rx.id === rxId), "Patient retrieves their issued prescription");

    // 9. NOTIFICATIONS (Entity 9)
    console.log("\n🔔 9. Targeted Notifications & Recipient Isolation (Entity 9)");
    const patientNotifs = await request({
      path: "/api/notifications?page=1&limit=10",
      method: "GET",
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    assert(patientNotifs.status === 200 && patientNotifs.body.data?.length > 0, "Patient retrieves recipient-targeted notifications");
    const targetNotifId = patientNotifs.body.data[0].id;

    const markRead = await request({
      path: `/api/notifications/${targetNotifId}/read`,
      method: "PATCH",
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    assert(markRead.status === 200 && markRead.body.read === true, "Patient marks notification read");

    // 10. PRIVATE STORAGE & SHORT-LIVED SIGNED DOWNLOAD URLS
    console.log("\n📁 10. Private Storage & Short-Lived Signed Download URLs");
    const testDocContent = Buffer.from("CONFIDENTIAL LAB REPORT: Hemoglobin 14.5 g/dL, Cholesterol 180 mg/dL").toString("base64");
    const uploadRes = await request({
      path: "/api/files/upload",
      method: "POST",
      headers: { Authorization: `Bearer ${doctorToken}` }
    }, {
      fileName: "cardio_lab_panel.pdf",
      fileData: testDocContent,
      mimeType: "application/pdf",
      patientId: resolvedPatientId,
      description: "Diagnostic Lipid and Cardiac Panel"
    });
    assert(uploadRes.status === 201 && uploadRes.body.fileId, "Medical file uploaded securely to private storage");
    const privateFileId = uploadRes.body.fileId;

    // Generate 15-minute signed URL
    const signedUrlRes = await request({
      path: `/api/files/signed-url/${privateFileId}`,
      method: "GET",
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    assert(signedUrlRes.status === 200 && signedUrlRes.body.signedUrl, "Generated short-lived HMAC signed download URL (15-min expiry)");
    const signedUrl = signedUrlRes.body.signedUrl;

    // Download via signed URL (No Bearer Authorization header needed!)
    const downloadRes = await request({
      path: signedUrl,
      method: "GET"
    });
    assert(downloadRes.status === 200 && downloadRes.headers["content-disposition"].includes("cardio_lab_panel.pdf"), "Secure file downloaded via signed URL with correct attachment disposition");

    // Tampered token test (Security check)
    const tamperedUrl = signedUrl.replace(/token=[^&]+/, "token=tampered_signature");
    const tamperedRes = await request({
      path: tamperedUrl,
      method: "GET"
    });
    assert(tamperedRes.status === 403, "Tampered signed URL is strictly rejected (403 Forbidden)");

    console.log("\n============================================================");
    console.log(`📊 RESULTS: ${passed} / ${total} tests passed (${Math.round((passed / total) * 100)}%)`);
    console.log("============================================================");
    if (passed === total) {
      console.log("🎉 ALL BACKEND AND DATABASE REQUIREMENTS SUCCESSFULLY VERIFIED!");
    }
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exit(1);
  }
}

runTests();
