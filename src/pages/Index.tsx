import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { GraduationCap, MessageSquare, BarChart3, Shield } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserAndRedirect();
  }, []);

  const checkUserAndRedirect = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      // Check if user is admin
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .single();

      if (data) {
        navigate("/admin");
      } else {
        navigate("/student");
      }
    } else {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center space-y-8">
            <div className="flex justify-center">
              <div className="p-4 bg-gradient-primary rounded-3xl shadow-soft">
                <GraduationCap className="h-16 w-16 text-primary-foreground" />
              </div>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
              Student Feedback Portal
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Share your experiences, help improve college events and club activities with AI-powered sentiment analysis
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8">
                Get Started
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="text-lg px-8">
                Admin Login
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-4 p-6 rounded-2xl bg-background shadow-card transition-transform hover:scale-105">
              <div className="flex justify-center">
                <div className="p-3 bg-gradient-primary rounded-xl">
                  <MessageSquare className="h-8 w-8 text-primary-foreground" />
                </div>
              </div>
              <h3 className="text-xl font-semibold">Easy Feedback Submission</h3>
              <p className="text-muted-foreground">
                Submit feedback for any college event or club activity with ratings and detailed comments
              </p>
            </div>

            <div className="text-center space-y-4 p-6 rounded-2xl bg-background shadow-card transition-transform hover:scale-105">
              <div className="flex justify-center">
                <div className="p-3 bg-gradient-secondary rounded-xl">
                  <BarChart3 className="h-8 w-8 text-secondary-foreground" />
                </div>
              </div>
              <h3 className="text-xl font-semibold">AI Sentiment Analysis</h3>
              <p className="text-muted-foreground">
                Automatic sentiment detection categorizes feedback as Positive, Negative, or Neutral
              </p>
            </div>

            <div className="text-center space-y-4 p-6 rounded-2xl bg-background shadow-card transition-transform hover:scale-105">
              <div className="flex justify-center">
                <div className="p-3 bg-accent rounded-xl">
                  <Shield className="h-8 w-8 text-accent-foreground" />
                </div>
              </div>
              <h3 className="text-xl font-semibold">Admin Analytics</h3>
              <p className="text-muted-foreground">
                Comprehensive dashboard with charts, word clouds, and detailed feedback reports
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to share your feedback?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join our community and help make college events better for everyone
          </p>
          <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-12">
            Sign Up Now
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
