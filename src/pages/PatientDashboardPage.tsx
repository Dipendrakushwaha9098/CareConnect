import { useAuth } from "@/context/AuthContext";
import { Calendar, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchAppointments, fetchPatients, fetchPrescriptions } from "@/lib/api";
import { formatTime12Hour } from "@/lib/utils";
import { useMemo } from "react";

export default function PatientDashboardPage() {
  const { user } = useAuth();
  
  const { data: allAppointments = [], isLoading: isLoadingAppts } = useQuery<any[]>({
    queryKey: ["appointments"],
    queryFn: fetchAppointments,
  });

  const { data: patients = [], isLoading: isLoadingPatients } = useQuery<any[]>({
    queryKey: ["patients"],
    queryFn: fetchPatients,
  });

  const { data: prescriptions = [], isLoading: isLoadingRx } = useQuery<any[]>({
    queryKey: ["prescriptions"],
    queryFn: fetchPrescriptions,
  });

  const currentPatient = useMemo(() => {
    if (!user) return null;
    return patients.find(p => p.name === user.name || p.userId === user.id) || null;
  }, [patients, user]);

  const myAppointments = useMemo(() => {
    if (!user) return [];
    if (currentPatient) {
      return allAppointments.filter(
        a => a.patientId === currentPatient.id || a.patient === currentPatient.name
      );
    }
    return allAppointments.filter(a => a.patient === user.name || a.patientId === user.id);
  }, [allAppointments, user, currentPatient]);

  const pendingRequests = myAppointments.filter(a => a.status === "Pending");
  const myPrescriptions = useMemo(() => {
    if (!user) return [];
    return prescriptions.filter(p => p.patient === user.name || (currentPatient && p.patient === currentPatient.name));
  }, [prescriptions, user, currentPatient]);

  const upcomingCount = myAppointments.filter(a => a.status === "Scheduled" || a.status === "Ongoing").length;
  const requestCount = pendingRequests.length;
  const pastCount = myAppointments.filter(a => a.status === "Completed").length;
  const prescriptionsCount = myPrescriptions.length;

  const isLoading = isLoadingAppts || isLoadingPatients || isLoadingRx;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-xl border border-gray-100 shadow-sm gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Patient Portal</h1>
          <p className="text-gray-500">Welcome back, {user?.name || "Patient"}</p>
        </div>
        <Link to="/appointments">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
            Book Appointment
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-gray-500 text-sm">Upcoming Appointments</div>
            <div className="text-xl font-bold text-gray-900">{isLoading ? "..." : upcomingCount}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-gray-500 text-sm">Pending Requests</div>
            <div className="text-xl font-bold text-gray-900">{isLoading ? "..." : requestCount}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-gray-500 text-sm">Past Visits</div>
            <div className="text-xl font-bold text-gray-900">{isLoading ? "..." : pastCount}</div>
          </div>
        </div>

        <Link to="/prescriptions" className="block">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer h-full">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="text-gray-500 text-sm">Prescriptions</div>
              <div className="text-xl font-bold text-gray-900">{isLoading ? "..." : prescriptionsCount}</div>
            </div>
          </div>
        </Link>
      </div>
      
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mt-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Pending Appointment Requests</h2>
        {requestCount > 0 ? (
          <div className="space-y-3">
            {pendingRequests.map((appt) => (
              <div key={appt.id} className="p-4 rounded-xl border border-blue-100 bg-blue-50 shadow-sm flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">{appt.therapy}</span>
                  <span className="text-xs uppercase tracking-[0.18em] text-blue-700 font-bold">{appt.status}</span>
                </div>
                <p className="text-sm text-slate-600">{appt.date} · {formatTime12Hour(appt.time)}</p>
                <p className="text-sm text-slate-500">Submitted request will appear here after booking.</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No pending requests yet. Your latest booking request will show up here once submitted.</p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mt-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h2>
        {myAppointments.length > 0 ? (
          <div className="space-y-3">
             {myAppointments.slice(0, 3).map((appt) => (
                <div key={appt.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center text-sm">
                   <div>
                     <span className="font-semibold text-gray-800">{appt.therapy}</span>
                     <p className="text-xs text-gray-500">{appt.date} at {formatTime12Hour(appt.time)}</p>
                   </div>
                   <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{appt.status}</span>
                </div>
             ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No recent activity found. Book your first appointment today!</p>
        )}
      </div>
    </div>
  );
}
