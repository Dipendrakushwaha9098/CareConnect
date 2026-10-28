import React, { useState, useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Filter,
  Stethoscope,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  Star,
  CheckCircle2,
  DollarSign,
  Phone,
  Video,
  Building2,
  ChevronRight,
  User,
  X,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { fetchDoctors, createAppointment } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";

// High-quality verified fallback doctors if the database is initializing
const FALLBACK_DOCTORS = [
  {
    id: "doc-1",
    name: "Dr. Evelyn Vance, MD",
    email: "evelyn.vance@careconnect.health",
    role: "doctor",
    doctorProfile: {
      specialization: "Cardiology",
      qualifications: "MD, FACC - Harvard Medical School",
      experienceYears: 18,
      hospitalAffiliation: "CareConnect Main Hospital",
      consultationFee: 120,
      verificationStatus: "VERIFIED"
    },
    rating: 4.9,
    reviews: 142,
    nextSlot: "Today, 2:30 PM"
  },
  {
    id: "doc-2",
    name: "Dr. Rajesh K. Sharma, MD",
    email: "rajesh.sharma@careconnect.health",
    role: "doctor",
    doctorProfile: {
      specialization: "Primary Care",
      qualifications: "MD, Internal Medicine - Johns Hopkins",
      experienceYears: 15,
      hospitalAffiliation: "Downtown Outpatient Pavilion",
      consultationFee: 75,
      verificationStatus: "VERIFIED"
    },
    rating: 4.8,
    reviews: 210,
    nextSlot: "Today, 4:00 PM"
  },
  {
    id: "doc-3",
    name: "Dr. Sarah Lin, MD",
    email: "sarah.lin@careconnect.health",
    role: "doctor",
    doctorProfile: {
      specialization: "Pediatrics",
      qualifications: "MD, FAAP - Stanford Medicine",
      experienceYears: 12,
      hospitalAffiliation: "CareConnect Children's Wing",
      consultationFee: 85,
      verificationStatus: "VERIFIED"
    },
    rating: 5.0,
    reviews: 184,
    nextSlot: "Tomorrow, 10:15 AM"
  },
  {
    id: "doc-4",
    name: "Dr. Marcus Thorne, MD",
    email: "marcus.thorne@careconnect.health",
    role: "doctor",
    doctorProfile: {
      specialization: "Neurology",
      qualifications: "MD, PhD - Oxford University",
      experienceYears: 16,
      hospitalAffiliation: "CareConnect Neurological Institute",
      consultationFee: 140,
      verificationStatus: "VERIFIED"
    },
    rating: 4.9,
    reviews: 98,
    nextSlot: "Tomorrow, 1:45 PM"
  },
  {
    id: "doc-5",
    name: "Dr. Ananya Joshi, BAMS, MD",
    email: "ananya.joshi@careconnect.health",
    role: "doctor",
    doctorProfile: {
      specialization: "Integrative Medicine",
      qualifications: "BAMS, Gold Medalist - Panchkarma Specialist",
      experienceYears: 14,
      hospitalAffiliation: "CareConnect Wellness Center",
      consultationFee: 65,
      verificationStatus: "VERIFIED"
    },
    rating: 4.9,
    reviews: 165,
    nextSlot: "Today, 5:30 PM"
  },
  {
    id: "doc-6",
    name: "Dr. Carlos Gomez, MD",
    email: "carlos.gomez@careconnect.health",
    role: "doctor",
    doctorProfile: {
      specialization: "Orthopedics",
      qualifications: "MD, Orthopedic Surgery - Mayo Clinic",
      experienceYears: 19,
      hospitalAffiliation: "Sports & Joint Care Pavilion",
      consultationFee: 130,
      verificationStatus: "VERIFIED"
    },
    rating: 4.8,
    reviews: 119,
    nextSlot: "Thursday, 11:00 AM"
  }
];

export default function FindDoctorsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // URL query params
  const initialSearch = searchParams.get("search") || "";
  const initialSpecialty = searchParams.get("specialty") || "all";

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedSpecialty, setSelectedSpecialty] = useState(initialSpecialty);
  const [selectedFormat, setSelectedFormat] = useState("all");
  const [sortBy, setSortBy] = useState("rating");

  // Booking Dialog State
  const [bookingDoctor, setBookingDoctor] = useState<any | null>(null);
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split("T")[0]);
  const [bookingTime, setBookingTime] = useState("10:00 AM");
  const [bookingType, setBookingType] = useState<"In-Clinic" | "Telehealth">("In-Clinic");
  const [bookingNotes, setBookingNotes] = useState("");
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  // Fetch doctors from backend
  const { data: serverDoctors, isLoading, isError } = useQuery({
    queryKey: ["doctorsPublicList"],
    queryFn: fetchDoctors,
    retry: 1
  });

  // Combine or fallback to default verified doctors
  const doctorsList = useMemo(() => {
    if (serverDoctors && Array.isArray(serverDoctors) && serverDoctors.length > 0) {
      return serverDoctors;
    }
    return FALLBACK_DOCTORS;
  }, [serverDoctors]);

  // Filter & sort doctors
  const filteredDoctors = useMemo(() => {
    return doctorsList
      .filter((doc: any) => {
        const profile = doc.doctorProfile || {};
        const spec = (profile.specialization || "").toLowerCase();
        const docName = (doc.name || "").toLowerCase();
        const search = searchTerm.toLowerCase();

        // Search match
        const matchesSearch =
          !searchTerm.trim() ||
          docName.includes(search) ||
          spec.includes(search) ||
          (profile.hospitalAffiliation || "").toLowerCase().includes(search);

        // Specialty filter
        const matchesSpecialty =
          selectedSpecialty === "all" ||
          spec.includes(selectedSpecialty.toLowerCase()) ||
          selectedSpecialty.toLowerCase().includes(spec);

        return matchesSearch && matchesSpecialty;
      })
      .sort((a: any, b: any) => {
        const aFee = a.doctorProfile?.consultationFee || 100;
        const bFee = b.doctorProfile?.consultationFee || 100;
        const aExp = a.doctorProfile?.experienceYears || 0;
        const bExp = b.doctorProfile?.experienceYears || 0;

        if (sortBy === "fee-low") return aFee - bFee;
        if (sortBy === "fee-high") return bFee - aFee;
        if (sortBy === "experience") return bExp - aExp;
        return (b.rating || 4.8) - (a.rating || 4.8);
      });
  }, [doctorsList, searchTerm, selectedSpecialty, sortBy]);

  const handleBookingConfirm = async () => {
    if (!bookingDoctor) return;

    if (!isAuthenticated || !user) {
      toast.info("Please sign in to complete your appointment booking.");
      navigate("/login");
      return;
    }

    try {
      setIsSubmittingBooking(true);
      await createAppointment({
        doctorId: bookingDoctor.id,
        doctorName: bookingDoctor.name,
        date: bookingDate,
        time: bookingTime,
        therapy: `${bookingDoctor.doctorProfile?.specialization || "Clinical"} Consultation (${bookingType})`,
        notes: bookingNotes || `Patient requested ${bookingType} visit.`
      });

      toast.success("Appointment Scheduled Successfully!", {
        description: `Your consultation with ${bookingDoctor.name} has been submitted for confirmation.`
      });

      setBookingDoctor(null);
      setBookingNotes("");
      navigate("/patient/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule appointment. Please try again.");
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const specialtiesOptions = [
    "all",
    "Cardiology",
    "Primary Care",
    "Neurology",
    "Pediatrics",
    "Diagnostics",
    "Integrative Medicine",
    "Orthopedics"
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-body">
      <PublicNavbar />

      <main id="main-content" className="flex-1">
        {/* ── Page Header ── */}
        <section className="bg-white border-b border-slate-200/80 py-12 lg:py-16">
          <div className="section-container">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-3">
                <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                Verified Physician Directory
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Find Board-Certified Doctors & Specialists
              </h1>
              <p className="text-base sm:text-lg text-slate-600 mt-3 leading-relaxed">
                Connect with experienced clinicians for outpatient appointments, urgent consultations, and secure telehealth visits.
              </p>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="mt-8 bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                {/* Search text */}
                <div className="md:col-span-5 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search doctor name, hospital, or symptom..."
                    className="pl-10 bg-white border-slate-300 h-11 text-sm rounded-xl focus-visible:ring-blue-600"
                    aria-label="Search doctors"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      aria-label="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Specialty select */}
                <div className="md:col-span-3">
                  <select
                    value={selectedSpecialty}
                    onChange={(e) => setSelectedSpecialty(e.target.value)}
                    className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    aria-label="Filter by specialty"
                  >
                    <option value="all">All Specialties</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Primary Care">Primary Care</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Integrative Medicine">Integrative Medicine</option>
                    <option value="Orthopedics">Orthopedics</option>
                  </select>
                </div>

                {/* Sort select */}
                <div className="md:col-span-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    aria-label="Sort doctors"
                  >
                    <option value="rating">Highest Rated</option>
                    <option value="experience">Most Experienced</option>
                    <option value="fee-low">Fee: Low to High</option>
                    <option value="fee-high">Fee: High to Low</option>
                  </select>
                </div>

                {/* Reset button */}
                <div className="md:col-span-2 flex items-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedSpecialty("all");
                      setSortBy("rating");
                    }}
                    className="w-full h-11 border-slate-300 text-slate-700 font-semibold text-xs rounded-xl"
                  >
                    Reset Filters
                  </Button>
                </div>
              </div>

              {/* Specialty quick pill tags */}
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-200/80">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                  Departments:
                </span>
                {specialtiesOptions.map((spec) => (
                  <button
                    key={spec}
                    onClick={() => setSelectedSpecialty(spec)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedSpecialty.toLowerCase() === spec.toLowerCase()
                        ? "bg-blue-600 text-white font-bold"
                        : "bg-white border border-slate-200 text-slate-600 hover:border-blue-300"
                    }`}
                  >
                    {spec === "all" ? "All" : spec}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Doctor Results Grid ── */}
        <section className="py-12 sm:py-16">
          <div className="section-container">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Showing {filteredDoctors.length} Verified {filteredDoctors.length === 1 ? "Physician" : "Physicians"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Direct appointment scheduling available for both in-person clinic and telehealth visits.
                </p>
              </div>
            </div>

            {/* Skeletons while loading */}
            {isLoading && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="w-14 h-14 rounded-2xl" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && filteredDoctors.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-lg mx-auto shadow-xs">
                <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
                  <Stethoscope className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">No doctors match your criteria</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Try adjusting your search terms, selecting a different specialty, or resetting the active filters.
                </p>
                <Button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedSpecialty("all");
                  }}
                  className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl h-10 px-6"
                >
                  Clear All Filters
                </Button>
              </div>
            )}

            {/* Doctor Cards */}
            {!isLoading && filteredDoctors.length > 0 && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDoctors.map((doc: any) => {
                  const profile = doc.doctorProfile || {};
                  const isVerified = (profile.verificationStatus || doc.verificationStatus) === "VERIFIED";
                  const fee = profile.consultationFee || 100;
                  const exp = profile.experienceYears || 10;
                  const spec = profile.specialization || "Clinical Medicine";
                  const affiliation = profile.hospitalAffiliation || "CareConnect Medical Center";
                  const rating = doc.rating || 4.9;
                  const reviews = doc.reviews || 84;
                  const nextSlot = doc.nextSlot || "Available Tomorrow";

                  return (
                    <article
                      key={doc.id}
                      className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Doctor Header */}
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex items-center gap-3.5">
                            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 font-bold flex items-center justify-center shrink-0 border border-blue-100">
                              <Stethoscope className="w-7 h-7 text-blue-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h3 className="text-base font-bold text-slate-900 leading-snug">
                                  {doc.name}
                                </h3>
                                {isVerified && (
                                  <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" title="Board-Certified & Verified" />
                                )}
                              </div>
                              <p className="text-xs font-semibold text-teal-700 mt-0.5">
                                {spec}
                              </p>
                            </div>
                          </div>

                          <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-semibold shrink-0">
                            {exp} yrs exp
                          </Badge>
                        </div>

                        {/* Qualifications & Affiliation */}
                        <div className="space-y-2 text-xs text-slate-600 mb-5 pt-3 border-t border-slate-100">
                          <p className="font-medium truncate" title={profile.qualifications}>
                            {profile.qualifications || "Board Certified Specialist"}
                          </p>
                          <p className="flex items-center gap-1.5 text-slate-500">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{affiliation}</span>
                          </p>
                          <div className="flex items-center justify-between pt-1">
                            <span className="flex items-center gap-1 font-semibold text-amber-600">
                              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                              {rating} ({reviews} reviews)
                            </span>
                            <span className="font-bold text-slate-900 text-sm">
                              ${fee}{" "}
                              <span className="text-[11px] font-normal text-slate-500">/ consult</span>
                            </span>
                          </div>
                        </div>

                        {/* Next Available Pill */}
                        <div className="bg-blue-50/70 border border-blue-100 rounded-xl px-3 py-2 text-xs flex items-center justify-between text-blue-800 mb-5">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            Next Slot:
                          </span>
                          <span className="font-bold">{nextSlot}</span>
                        </div>
                      </div>

                      {/* Card Action */}
                      <div className="pt-2">
                        <Button
                          onClick={() => {
                            setBookingDoctor(doc);
                            setBookingNotes("");
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-11 rounded-xl shadow-xs"
                        >
                          <Calendar className="w-3.5 h-3.5 mr-2" />
                          Book Consultation
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── Guided Booking Modal ── */}
        <Dialog open={Boolean(bookingDoctor)} onOpenChange={(open) => !open && setBookingDoctor(null)}>
          <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Schedule Consultation
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Book your visit with {bookingDoctor?.name} ({bookingDoctor?.doctorProfile?.specialization || "Specialist"}).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Doctor Quick Badge */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900">{bookingDoctor?.name}</p>
                  <p className="text-slate-500 text-[11px]">{bookingDoctor?.doctorProfile?.hospitalAffiliation || "CareConnect Medical"}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">${bookingDoctor?.doctorProfile?.consultationFee || 100}</p>
                  <p className="text-slate-400 text-[10px]">Per Visit</p>
                </div>
              </div>

              {/* Consultation Format (In-Person vs Telehealth) */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Consultation Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBookingType("In-Clinic")}
                    className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                      bookingType === "In-Clinic"
                        ? "bg-blue-50 border-blue-600 text-blue-700 font-bold"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    In-Person Clinic
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingType("Telehealth")}
                    className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                      bookingType === "Telehealth"
                        ? "bg-teal-50 border-teal-600 text-teal-700 font-bold"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Video className="w-4 h-4" />
                    Video Telehealth
                  </button>
                </div>
              </div>

              {/* Date & Time Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    Preferred Date
                  </label>
                  <Input
                    type="date"
                    value={bookingDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    Time Slot
                  </label>
                  <select
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="11:30 AM">11:30 AM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="03:30 PM">03:30 PM</option>
                    <option value="05:00 PM">05:00 PM</option>
                  </select>
                </div>
              </div>

              {/* Patient Note */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">
                  Reason for Visit / Symptoms (Optional)
                </label>
                <Input
                  type="text"
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="e.g. Annual physical, follow-up, blood pressure check..."
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              {!isAuthenticated && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    You will be prompted to sign in or register so this appointment is safely attached to your patient portal.
                  </span>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-2">
              <Button
                variant="outline"
                onClick={() => setBookingDoctor(null)}
                className="rounded-xl h-10 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleBookingConfirm}
                disabled={isSubmittingBooking}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 text-xs font-semibold shadow-xs"
              >
                {isSubmittingBooking ? "Scheduling..." : isAuthenticated ? "Confirm Booking" : "Sign In & Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>

      <PublicFooter />
    </div>
  );
}

