import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import StudentDashboard from "./pages/StudentDashboard";
import StudentHome from "./pages/StudentHome";
import EventExplore from "./pages/EventExplore";
import EventDetails from "./pages/EventDetails";
import StudentProfile from "./pages/StudentProfile";
import FeedbackSubmit from "./pages/FeedbackSubmit";
import AdminDashboard from "./pages/AdminDashboard";
import EventManagement from "./pages/EventManagement";
import RoleManagement from "./pages/RoleManagement";
import NotFound from "./pages/NotFound";
import AdminEventCalendar from "./pages/AdminEventCalendar";
import AdminResources from "./pages/AdminResources";
import AdminVolunteers from "./pages/AdminVolunteers";
import AdminRegistrations from "./pages/AdminRegistrations";
import AdminAttendance from "./pages/AdminAttendance";
import AdminFeedbackAnalytics from "./pages/AdminFeedbackAnalytics";
import LiveEventMonitoring from "./pages/LiveEventMonitoring";
import AdminMediaReview from "./pages/AdminMediaReview";
import HighlightsWall from "./pages/HighlightsWall";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/student" element={<StudentHome />} />
              <Route path="/student/explore" element={<EventExplore />} />
              <Route path="/student/event/:id" element={<EventDetails />} />
              <Route path="/student/profile" element={<StudentProfile />} />
              <Route path="/student/feedback/:eventId" element={<FeedbackSubmit />} />
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/calendar" element={<AdminEventCalendar />} />
              <Route path="/admin/events" element={<EventManagement />} />
              <Route path="/admin/resources" element={<AdminResources />} />
              <Route path="/admin/volunteers" element={<AdminVolunteers />} />
              <Route path="/admin/registrations" element={<AdminRegistrations />} />
              <Route path="/admin/attendance" element={<AdminAttendance />} />
              <Route path="/admin/feedback" element={<AdminFeedbackAnalytics />} />
              <Route path="/admin/live-monitoring" element={<LiveEventMonitoring />} />
              <Route path="/admin/media-review" element={<AdminMediaReview />} />
              <Route path="/highlights" element={<HighlightsWall />} />
              <Route path="/admin/analytics" element={<AdminDashboard />} />
              <Route path="/admin/roles" element={<RoleManagement />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
