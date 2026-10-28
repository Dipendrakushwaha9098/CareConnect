const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const API_BASE = "http://localhost:3001/api";

async function loginUser(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Login failed for ${email}: ${data.error}`);
  return {
    token: data.user.token,
    user: data.user
  };
}

async function runNotificationSystemTests() {
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("🧪 STARTING COMPREHENSIVE CARECONNECT NOTIFICATION SYSTEM TESTS");
  console.log("══════════════════════════════════════════════════════════════════\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Authenticate users
    console.log("1. Authenticating test users...");
    const patientSession = await loginUser("dipendra@careconnect.com", "CareConnect@123");
    const doctorSession = await loginUser("dr.alexander@careconnect.com", "Doctor@123");
    const adminSession = await loginUser("admin@careconnect.com", "Admin@123");

    assert(patientSession.token && patientSession.user.role === "patient", "Patient authenticated");
    assert(doctorSession.token && doctorSession.user.role === "doctor", "Doctor authenticated");
    assert(adminSession.token && adminSession.user.role === "admin", "Admin authenticated");

    const patientHeaders = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${patientSession.token}`
    };
    const doctorHeaders = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${doctorSession.token}`
    };

    // 2. Test Patient submits Appointment Request
    console.log("\n2. Testing Appointment Request Notifications (Patient & Doctor)...");
    const randomOffset = 25 + Math.floor(Math.random() * 50);
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + randomOffset);
    // Ensure it's a weekday (Mon-Fri)
    if (testDate.getDay() === 0) testDate.setDate(testDate.getDate() + 1);
    if (testDate.getDay() === 6) testDate.setDate(testDate.getDate() + 2);
    const dateStr = testDate.toISOString().split("T")[0];


    const apptRes = await fetch(`${API_BASE}/appointments`, {
      method: "POST",
      headers: patientHeaders,
      body: JSON.stringify({
        doctorId: doctorSession.user.id,
        appointmentDate: dateStr,
        startTime: "03:30 PM",
        endTime: "04:00 PM",
        consultationType: "In-Person",
        reasonForVisit: "Routine annual cardiology checkup"
      })
    });
    const apptData = await apptRes.json();
    if (!apptRes.ok) console.log("appt error:", apptRes.status, apptData);
    assert(apptRes.ok && apptData.id, `Appointment created with ID: ${apptData.id}`);



    // Check Patient received notification
    const ptNotifsRes = await fetch(`${API_BASE}/notifications?category=appointment`, { headers: patientHeaders });
    const ptNotifs = await ptNotifsRes.json();
    const ptList = Array.isArray(ptNotifs) ? ptNotifs : ptNotifs.data;
    const ptApptNotif = ptList.find(n => n.title.includes("Appointment Request Submitted") && n.link === "/appointments");
    assert(Boolean(ptApptNotif), "Patient received in-app notification with link to /appointments");

    // Check Doctor received notification
    const docNotifsRes = await fetch(`${API_BASE}/notifications?category=appointment`, { headers: doctorHeaders });
    const docNotifs = await docNotifsRes.json();
    const docList = Array.isArray(docNotifs) ? docNotifs : docNotifs.data;
    const docApptNotif = docList.find(n => n.title.includes("New Appointment Request") && n.link.includes("tab=requests"));
    assert(Boolean(docApptNotif), "Doctor received in-app notification linking to tab=requests");

    // Check EmailLog created for appointment request
    const apptEmailLogs = await prisma.emailLog.findMany({
      where: { idempotencyKey: { in: [`appt_req_pt_${apptData.id}`, `appt_req_doc_${apptData.id}`] } }
    });
    assert(apptEmailLogs.length >= 1, `Transactional EmailLog records created (count: ${apptEmailLogs.length})`);
    assert(apptEmailLogs.every(log => ["SENT", "FAILED"].includes(log.deliveryStatus)), "Email delivery attempt accurately tracked with delivery status");

    // 3. Test Doctor confirms Appointment
    console.log("\n3. Testing Appointment Confirmation Notifications...");
    const confirmRes = await fetch(`${API_BASE}/appointments/${apptData.id}`, {
      method: "PUT",
      headers: doctorHeaders,
      body: JSON.stringify({ status: "Confirmed" })
    });
    const confirmData = await confirmRes.json();
    assert(confirmRes.ok && confirmData.status === "Confirmed", "Doctor confirmed appointment");

    // Check Patient received Confirmation notification
    const ptConfirmNotifs = await fetch(`${API_BASE}/notifications?category=appointment`, { headers: patientHeaders });
    const ptConfirmData = await ptConfirmNotifs.json();
    const ptConfirmList = Array.isArray(ptConfirmData) ? ptConfirmData : ptConfirmData.data;
    const confirmNotif = ptConfirmList.find(n => n.title === "Appointment Confirmed");
    assert(Boolean(confirmNotif), "Patient received 'Appointment Confirmed' in-app notification");

    // Check email log for confirmation
    const confirmEmailLog = await prisma.emailLog.findFirst({
      where: { idempotencyKey: `appt_conf_pt_${apptData.id}` }
    });
    assert(Boolean(confirmEmailLog), "Confirmation transactional email recorded in EmailLog with idempotency key");

    // 4. Test Prescription Issuance (with strict medical privacy verification)
    console.log("\n4. Testing Prescription Issuance & Healthcare Privacy Protection...");
    // Find patient record
    const patientRecord = await prisma.patient.findFirst({ where: { userId: patientSession.user.id } });
    assert(Boolean(patientRecord), "Found Patient record in database");

    const rxRes = await fetch(`${API_BASE}/doctor/prescriptions`, {
      method: "POST",
      headers: doctorHeaders,
      body: JSON.stringify({
        patientId: patientRecord.id,
        patientName: patientRecord.name,
        appointmentId: apptData.id,
        medicines: [
          { name: "Lisinopril", dosage: "10mg", frequency: "Once daily", duration: "30 days" }
        ],
        notes: "Monitor blood pressure morning and evening."
      })
    });
    const rxData = await rxRes.json();
    assert(rxRes.ok && rxData.id, `Prescription issued with ID: ${rxData.id}`);

    // Check Patient received prescription in-app notification
    const ptRxNotifs = await fetch(`${API_BASE}/notifications?category=prescription`, { headers: patientHeaders });
    const ptRxData = await ptRxNotifs.json();
    const ptRxList = Array.isArray(ptRxData) ? ptRxData : ptRxData.data;
    const rxNotif = ptRxList.find(n => n.title.includes("Prescription Issued") && n.link === "/prescriptions");
    assert(Boolean(rxNotif), "Patient received in-app prescription notification with link to /prescriptions");

    // Verify EmailLog privacy compliance (must NOT contain specific medications or sensitive diagnosis)
    const rxEmailLog = await prisma.emailLog.findFirst({
      where: { idempotencyKey: `rx_pt_${rxData.id}` }
    });
    assert(Boolean(rxEmailLog), "Prescription issued email recorded in EmailLog");
    if (rxEmailLog) {
      const emailContent = rxEmailLog.metadata || "";
      const containsMedicationInPlaintext = emailContent.includes("Lisinopril");
      assert(!containsMedicationInPlaintext, "Healthcare Privacy: Prescription email does NOT contain sensitive medication details in unencrypted log/body");
    }

    // 5. Test Appointment Reschedule
    console.log("\n5. Testing Appointment Reschedule Notifications...");
    const reschedDate = new Date();
    reschedDate.setDate(reschedDate.getDate() + 20);
    if (reschedDate.getDay() === 0) reschedDate.setDate(reschedDate.getDate() + 1);
    if (reschedDate.getDay() === 6) reschedDate.setDate(reschedDate.getDate() + 2);
    const reschedDateStr = reschedDate.toISOString().split("T")[0];


    const reschedRes = await fetch(`${API_BASE}/appointments/${apptData.id}`, {
      method: "PUT",
      headers: doctorHeaders,
      body: JSON.stringify({
        date: reschedDateStr,
        time: "02:00 PM"
      })
    });
    const reschedData = await reschedRes.json();
    assert(reschedRes.ok && reschedData.date === reschedDateStr, "Appointment rescheduled to new date/time");

    // Check Patient received reschedule notification
    const ptReschedNotifs = await fetch(`${API_BASE}/notifications?category=appointment`, { headers: patientHeaders });
    const ptReschedData = await ptReschedNotifs.json();
    const ptReschedList = Array.isArray(ptReschedData) ? ptReschedData : ptReschedData.data;
    const reschedNotif = ptReschedList.find(n => n.title.includes("Appointment Rescheduled"));
    assert(Boolean(reschedNotif), "Patient received 'Appointment Rescheduled' notification");

    // 6. Test Appointment Cancellation
    console.log("\n6. Testing Appointment Cancellation Notifications...");
    const cancelRes = await fetch(`${API_BASE}/appointments/${apptData.id}`, {
      method: "PUT",
      headers: patientHeaders,
      body: JSON.stringify({
        status: "Cancelled",
        cancellationReason: "Schedule conflict with personal travel"
      })
    });
    const cancelData = await cancelRes.json();
    assert(cancelRes.ok && cancelData.status === "Cancelled", "Appointment marked as Cancelled");

    // Check Doctor received cancellation alert
    const docCancelNotifs = await fetch(`${API_BASE}/notifications?category=appointment`, { headers: doctorHeaders });
    const docCancelData = await docCancelNotifs.json();
    const docCancelList = Array.isArray(docCancelData) ? docCancelData : docCancelData.data;
    const cancelDocNotif = docCancelList.find(n => n.title === "Appointment Cancelled by Patient");
    assert(Boolean(cancelDocNotif), "Doctor received 'Appointment Cancelled by Patient' in-app notification");

    // 7. Test Strict Recipient Isolation & Access Control
    console.log("\n7. Testing Strict Recipient Isolation (Security Verification)...");
    // Doctor attempts to mark Patient's notification as read
    assert(Boolean(ptApptNotif), "Patient notification ID available for security test");
    const illegalPatchRes = await fetch(`${API_BASE}/notifications/${ptApptNotif.id}/read`, {
      method: "PATCH",
      headers: doctorHeaders
    });
    assert(illegalPatchRes.status === 403, "Security: Doctor cannot modify Patient's notification (HTTP 403 Forbidden)");

    // Doctor attempts to delete Patient's notification
    const illegalDeleteRes = await fetch(`${API_BASE}/notifications/${ptApptNotif.id}`, {
      method: "DELETE",
      headers: doctorHeaders
    });
    assert(illegalDeleteRes.status === 403, "Security: Doctor cannot delete Patient's notification (HTTP 403 Forbidden)");

    // Patient cannot see Doctor's notifications
    const patientFeedRes = await fetch(`${API_BASE}/notifications?category=all`, { headers: patientHeaders });
    const patientFeed = await patientFeedRes.json();
    const patientItems = Array.isArray(patientFeed) ? patientFeed : patientFeed.data;
    const containsDoctorNotif = patientItems.some(n => n.id === docApptNotif.id);
    assert(!containsDoctorNotif, "Security: Patient feed strictly isolates records and does NOT leak Doctor's notifications");

    // 8. Test Mark as Read & Mark All as Read
    console.log("\n8. Testing Read / Unread / Mark All Functionality...");
    const markReadRes = await fetch(`${API_BASE}/notifications/${ptApptNotif.id}/read`, {
      method: "PATCH",
      headers: patientHeaders
    });
    const markedRead = await markReadRes.json();
    assert(markedRead.read === true, "Notification successfully marked as read");

    const markUnreadRes = await fetch(`${API_BASE}/notifications/${ptApptNotif.id}/unread`, {
      method: "PATCH",
      headers: patientHeaders
    });
    const markedUnread = await markUnreadRes.json();
    assert(markedUnread.read === false, "Notification successfully marked as unread");

    const markAllRes = await fetch(`${API_BASE}/notifications/mark-all-read`, {
      method: "POST",
      headers: patientHeaders
    });
    assert(markAllRes.ok, "POST /api/notifications/mark-all-read succeeded");

    // 9. Test 24-Hour Upcoming Reminders Trigger
    console.log("\n9. Testing Upcoming 24-Hour Reminders Trigger...");
    const reminderRes = await fetch(`${API_BASE}/notifications/reminders/send-upcoming`, {
      method: "POST",
      headers: doctorHeaders
    });
    const reminderData = await reminderRes.json();
    assert(reminderRes.ok && reminderData.success === true, `24-Hour reminders triggered successfully (${reminderData.message})`);

    // 10. Summary
    console.log("\n══════════════════════════════════════════════════════════════════");
    console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("══════════════════════════════════════════════════════════════════\n");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution threw unhandled exception:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runNotificationSystemTests();
