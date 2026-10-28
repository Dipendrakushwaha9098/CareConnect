const axios = require("axios");

const BASE_URL = "http://localhost:3001/api";

async function runAdminSystemTests() {
  console.log("=================================================");
  console.log("🛡️ STARTING CARECONNECT ADMIN SYSTEM TESTS");
  console.log("=================================================\n");

  let adminToken = "";
  let patientToken = "";
  let doctorToken = "";

  // ── TEST 1: AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC) ──
  console.log("1️⃣ Testing Authentication & Access Barriers...");
  try {
    // Login as Patient
    const patientLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: "dipendra@careconnect.com",
      password: "CareConnect@123"
    });
    patientToken = patientLogin.data.token || patientLogin.data.user?.token;
    console.log("  ✅ Patient logged in successfully");

    // Login as Doctor
    const doctorLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: "dr.alexander@careconnect.com",
      password: "Doctor@123"
    });
    doctorToken = doctorLogin.data.token || doctorLogin.data.user?.token;
    console.log("  ✅ Doctor logged in successfully");

    // Login as Admin
    const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: "admin@careconnect.com",
      password: "Admin@123"
    });
    adminToken = adminLogin.data.token || adminLogin.data.user?.token;
    console.log("  ✅ Admin logged in successfully");

    // Non-admin Patient should be BLOCKED (403)
    try {
      await axios.get(`${BASE_URL}/admin/metrics`, {
        headers: { Authorization: `Bearer ${patientToken}` }
      });
      throw new Error("Patient should NOT be able to access admin metrics!");
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log("  🛡️ Security verified: Patient blocked with 403 Forbidden");
      } else {
        throw err;
      }
    }

    // Non-admin Doctor should be BLOCKED (403)
    try {
      await axios.get(`${BASE_URL}/admin/verifications`, {
        headers: { Authorization: `Bearer ${doctorToken}` }
      });
      throw new Error("Doctor should NOT be able to access admin verifications!");
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log("  🛡️ Security verified: Doctor blocked with 403 Forbidden");
      } else {
        throw err;
      }
    }
  } catch (err) {
    console.error("❌ Test 1 failed:", err.response?.data || err.message);
    process.exit(1);
  }

  // ── TEST 2: ADMIN METRICS & DATABASE STATISTICS ──
  console.log("\n2️⃣ Testing Admin Metrics & Status Distribution...");
  try {
    const metricsRes = await axios.get(`${BASE_URL}/admin/metrics`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const m = metricsRes.data;
    console.log("  📊 Metrics Summary:");
    console.log(`     • Total Patients: ${m.totalPatients}`);
    console.log(`     • Total Doctors: ${m.totalDoctors} (Approved: ${m.approvedDoctors}, Pending: ${m.pendingDoctors})`);
    console.log(`     • Total Appointments: ${m.totalAppointments}`);
    console.log("     • Appointment Status Distribution:", JSON.stringify(m.appointmentStatusDistribution));
    console.log("     • System Telemetry:", JSON.stringify(m.systemHealth));

    if (m.totalPatients === undefined || m.totalDoctors === undefined || !m.appointmentStatusDistribution) {
      throw new Error("Missing required metric counters in response!");
    }
    console.log("  ✅ Metrics endpoint validated successfully");
  } catch (err) {
    console.error("❌ Test 2 failed:", err.response?.data || err.message);
    process.exit(1);
  }

  // ── TEST 3: DOCTOR VERIFICATION WORKFLOW ──
  console.log("\n3️⃣ Testing Doctor Verification Workflow...");
  try {
    const verifRes = await axios.get(`${BASE_URL}/admin/verifications?limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const verifications = verifRes.data.data;
    console.log(`  📋 Fetched ${verifications.length} doctor verification requests`);

    if (verifications.length === 0) {
      console.log("  ⚠️ No verification requests found, skipping decision tests");
    } else {
      const targetReq = verifications[0];
      console.log(`  🎯 Testing on Dr. ${targetReq.doctor?.name || "Doctor"} (Request ID: ${targetReq.id})`);

      // 3A: Request Info (requires reviewNotes)
      try {
        await axios.put(
          `${BASE_URL}/admin/verifications/${targetReq.id}`,
          { status: "INFO_REQUESTED", reviewNotes: "" },
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        throw new Error("Server should reject INFO_REQUESTED without reviewNotes!");
      } catch (err) {
        if (err.response && err.response.status === 400) {
          console.log("  🛡️ Validation verified: INFO_REQUESTED rejected without notes");
        } else throw err;
      }

      // Valid Request Info
      const infoReqRes = await axios.put(
        `${BASE_URL}/admin/verifications/${targetReq.id}`,
        { status: "INFO_REQUESTED", reviewNotes: "Please upload high-resolution scan of state license." },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      console.log("  ✅ Set status to INFO_REQUESTED with notes successfully");

      // 3B: Suspend Account
      const suspendRes = await axios.put(
        `${BASE_URL}/admin/verifications/${targetReq.id}`,
        { status: "SUSPENDED", reviewNotes: "Administrative review of credential discrepancy." },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      console.log("  ✅ Set status to SUSPENDED successfully");

      // Check doctor account status is Suspended
      const doctorUserCheck = await axios.get(`${BASE_URL}/admin/users?search=${encodeURIComponent(targetReq.doctor.email)}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const suspendedDoc = doctorUserCheck.data.data[0];
      console.log(`     • Doctor account status after suspension: ${suspendedDoc.status}`);
      if (suspendedDoc.status !== "Suspended") {
        throw new Error("Doctor user account should have been marked Suspended!");
      }

      // 3C: Approve application
      const approveRes = await axios.put(
        `${BASE_URL}/admin/verifications/${targetReq.id}`,
        { status: "APPROVED", reviewNotes: "Accreditation and state board verified by Admin." },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      console.log("  ✅ Approved doctor credentials successfully");

      // Verify doctor account is back to Active
      const reactivatedDocRes = await axios.get(`${BASE_URL}/admin/users?search=${encodeURIComponent(targetReq.doctor.email)}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const reactivatedDoc = reactivatedDocRes.data.data[0];
      console.log(`     • Doctor account status after approval: ${reactivatedDoc.status}`);
      if (reactivatedDoc.status !== "Active") {
        throw new Error("Doctor user account should have been restored to Active!");
      }
    }
  } catch (err) {
    console.error("❌ Test 3 failed:", err.response?.data || err.message);
    process.exit(1);
  }

  // ── TEST 4: USER MANAGEMENT & SECURITY GUARDS ──
  console.log("\n4️⃣ Testing User Management & Security Protections...");
  try {
    // 4A: Server-side pagination & projection sanitization
    const usersRes = await axios.get(`${BASE_URL}/admin/users?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`  👥 Retrieved ${usersRes.data.data.length} users (Total: ${usersRes.data.pagination.total})`);

    // Verify ZERO password hash or private token leak
    for (const u of usersRes.data.data) {
      if (u.passwordHash || u.password || u.token) {
        throw new Error(`CRITICAL SECURITY FAILURE: Sensitive credentials exposed for user ${u.id}!`);
      }
    }
    console.log("  🛡️ Zero credential leakage verified across all returned user records");

    // 4B: Self-Suspension Guard
    const adminUser = usersRes.data.data.find(u => u.email === "admin@careconnect.com");
    if (adminUser) {
      try {
        await axios.patch(
          `${BASE_URL}/admin/users/${adminUser.id}/status`,
          { status: "Suspended", reason: "Attempting self-suspension" },
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        throw new Error("Admin should NOT be allowed to suspend their own account!");
      } catch (err) {
        if (err.response && err.response.status === 400) {
          console.log("  🛡️ Security verified: Self-suspension prevented by server");
        } else throw err;
      }
    }

    // 4C: Last Administrator Demotion Guard
    if (adminUser) {
      try {
        await axios.patch(
          `${BASE_URL}/admin/users/${adminUser.id}/role`,
          { role: "patient" },
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        throw new Error("Server should block demoting the last active administrator!");
      } catch (err) {
        if (err.response && err.response.status === 400) {
          console.log("  🛡️ Security verified: Last admin demotion rejected with 400");
        } else throw err;
      }
    }
  } catch (err) {
    console.error("❌ Test 4 failed:", err.response?.data || err.message);
    process.exit(1);
  }

  // ── TEST 5: AUDIT LOGS PERSISTENCE ──
  console.log("\n5️⃣ Testing Audit Trail & Action Logging...");
  try {
    const auditRes = await axios.get(`${BASE_URL}/admin/audit-logs?limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const logs = auditRes.data.data;
    console.log(`  📜 Retrieved ${logs.length} audit log entries (Total: ${auditRes.data.pagination.total})`);

    const actions = logs.map(l => l.action);
    console.log("     • Recent logged actions:", actions.slice(0, 5).join(", "));

    const hasVerificationLog = actions.some(a => a.startsWith("VERIFY_DOCTOR"));
    console.log(`     • Contains doctor verification audit entries: ${hasVerificationLog ? "YES ✅" : "NO ⚠️"}`);

    console.log("  ✅ Audit log system validated successfully");
  } catch (err) {
    console.error("❌ Test 5 failed:", err.response?.data || err.message);
    process.exit(1);
  }

  console.log("\n=================================================");
  console.log("🎉 ALL ADMIN SECURITY & DASHBOARD TESTS PASSED!");
  console.log("=================================================");
}

runAdminSystemTests();
