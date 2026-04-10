import { useAuth } from "@/context/AuthContext";
import { Calendar, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchAppointments } from "@/lib/api";
import { useMemo } from "react";

export default function PatientDashboardPage() {
  const { user } = useAuth();
  
  const { data: allAppointments = [], isLoading } = useQuery<any[]>({
    queryKey: ["appointments"],
    queryFn: fetchAppointments,
  });

  // Since backend doesn't filter, we filter frontend for patient role
  const myAppointments = useMemo(() => {
    if (!user) return [];
    // The backend uses a 'Patient' model which is linked to a user.
    // For simplicity, we assume `appt.patient` string matching the name or ID 
    // depending on the API but assuming it links by patient context. 
    // We filter by checking if patient identifier matches our name or we match userId.
    return allAppointments.filter(a => a.patient === user.name || a.patientId === user.id);
  }, [allAppointments, user]);

  const upcomingCount = myAppointments.filter(a => a.status === "Scheduled" || a.status === "Ongoing").length;
  const pastCount = myAppointments.filter(a => a.status === "Completed").length;

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
          <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-gray-500 text-sm">Past Visits</div>
            <div className="text-xl font-bold text-gray-900">{isLoading ? "..." : pastCount}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-gray-500 text-sm">Prescriptions</div>
            <div className="text-xl font-bold text-gray-900">1</div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mt-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h2>
        {myAppointments.length > 0 ? (
          <div className="space-y-3">
             {myAppointments.slice(0, 3).map((appt) => (
                <div key={appt.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center text-sm">
                   <div>
                     <span className="font-semibold text-gray-800">{appt.therapy}</span>
                     <p className="text-xs text-gray-500">{appt.date} at {appt.time}</p>
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
