import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  UserPlus,
  LogOut,
  Sparkles,
  Settings,
  Bot,
  Building,
  Users,
  BookOpen,
  CheckCircle,
  MessageSquare,
  Calendar,
  BarChart,
  Wrench,
  Shield,
  HelpCircle,
  Code
} from "lucide-react";
import { useLocation } from "wouter";
import { startTour } from "@/components/OnboardingWizard";


interface TutorialStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  category: "overview" | "features" | "ai-assistant" | "management" | "tips" | "development";
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 1,
    title: "Welcome to PelangiManager",
    description: "Your comprehensive capsule hotel management system",
    icon: <Home className="h-8 w-8 text-blue-600" />,
    category: "overview",
    content: (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">What is PelangiManager?</h3>
          <p className="text-gray-700 leading-relaxed">
            PelangiManager is a complete solution for managing capsule hotels, hostels, and accommodation facilities.
            It streamlines your operations from guest check-in to checkout, cleaning management, and guest communications.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-gray-900">Easy Management</h4>
              <p className="text-sm text-gray-600 mt-1">Manage all aspects of your accommodation in one place</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-gray-900">AI-Powered</h4>
              <p className="text-sm text-gray-600 mt-1">Built-in chatbot to assist guests automatically</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-gray-900">Real-Time Updates</h4>
              <p className="text-sm text-gray-600 mt-1">See availability and status changes instantly</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-gray-900">Mobile Friendly</h4>
              <p className="text-sm text-gray-600 mt-1">Access from any device, anywhere</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    title: "Dashboard Overview",
    description: "Your command center for operations",
    icon: <Home className="h-8 w-8 text-purple-600" />,
    category: "features",
    content: (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border border-purple-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Dashboard Features</h3>
          <p className="text-gray-700 leading-relaxed">
            The Dashboard is your home base, showing you everything important at a glance. It displays occupancy status,
            upcoming checkouts, maintenance alerts, and quick actions.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 bg-white border-l-4 border-blue-500 rounded-lg shadow-sm">
            <BarChart className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-gray-900">Occupancy Overview</h4>
              <p className="text-sm text-gray-600 mt-1">See how many capsules are occupied, available, or need cleaning</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-white border-l-4 border-orange-500 rounded-lg shadow-sm">
            <Calendar className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-gray-900">Today's Checkouts</h4>
              <p className="text-sm text-gray-600 mt-1">Quick view of guests checking out today with alerts for overdue checkouts</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-white border-l-4 border-red-500 rounded-lg shadow-sm">
            <Wrench className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-gray-900">Maintenance Alerts</h4>
              <p className="text-sm text-gray-600 mt-1">Track capsules with reported problems or pending maintenance</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    title: "Guest Check-In",
    description: "Streamline the arrival process",
    icon: <UserPlus className="h-8 w-8 text-green-600" />,
    category: "features",
    content: (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Check-In Process</h3>
          <p className="text-gray-700 leading-relaxed">
            The check-in process is designed to be quick and efficient. Add guest information, assign a capsule,
            and send them a personalized guide - all in just a few clicks.
          </p>
        </div>

        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 text-sm font-bold">1</span>
            Enter Guest Details
          </h4>
          <p className="text-sm text-gray-600 ml-8">Name, contact information, and check-in/checkout dates</p>
        </div>

        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 text-sm font-bold">2</span>
            Select Available Capsule
          </h4>
          <p className="text-sm text-gray-600 ml-8">View and choose from available capsules with real-time status</p>
        </div>

        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 text-sm font-bold">3</span>
            Send Guest Guide
          </h4>
          <p className="text-sm text-gray-600 ml-8">Automatically generate and send WiFi details, check-in instructions, and facility info</p>
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 flex items-start gap-2">
            <HelpCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span><strong>Pro Tip:</strong> Enable self-check-in tokens to let guests check themselves in without staff assistance!</span>
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 4,
    title: "Guest Check-Out",
    description: "Efficient departure management",
    icon: <LogOut className="h-8 w-8 text-orange-600" />,
    category: "features",
    content: (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-6 rounded-lg border border-orange-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Check-Out System</h3>
          <p className="text-gray-700 leading-relaxed">
            Process checkouts quickly and mark capsules for cleaning. The system automatically tracks which
            capsules need attention and updates availability in real-time.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100">
                <CheckCircle className="h-4 w-4 text-orange-600" />
              </div>
              <h4 className="font-semibold text-gray-900">Quick Checkout</h4>
            </div>
            <p className="text-sm text-gray-600 ml-11">Select guest, confirm checkout, and mark cleaning status</p>
          </div>

          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100">
                <Sparkles className="h-4 w-4 text-orange-600" />
              </div>
              <h4 className="font-semibold text-gray-900">Cleaning Status</h4>
            </div>
            <p className="text-sm text-gray-600 ml-11">Track which capsules are clean, dirty, or in progress</p>
          </div>

          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100">
                <Calendar className="h-4 w-4 text-orange-600" />
              </div>
              <h4 className="font-semibold text-gray-900">Auto-availability</h4>
            </div>
            <p className="text-sm text-gray-600 ml-11">Once cleaned, capsules automatically become available for new bookings</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 5,
    title: "Cleaning Management",
    description: "Keep your facility spotless",
    icon: <Sparkles className="h-8 w-8 text-cyan-600" />,
    category: "features",
    content: (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-6 rounded-lg border border-cyan-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Cleaning Workflow</h3>
          <p className="text-gray-700 leading-relaxed">
            The Cleaning page helps your housekeeping team prioritize tasks and track progress.
            See which capsules need cleaning, mark them as in-progress, and confirm completion.
          </p>
        </div>

        <div className="space-y-3">
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <Badge variant="destructive">Dirty</Badge>
              <span className="text-sm font-medium text-gray-700">Needs Cleaning</span>
            </div>
            <p className="text-sm text-gray-600">Capsules marked as needing cleaning after checkout</p>
          </div>

          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <Badge className="bg-yellow-500">In Progress</Badge>
              <span className="text-sm font-medium text-gray-700">Currently Cleaning</span>
            </div>
            <p className="text-sm text-gray-600">Staff is actively cleaning this capsule</p>
          </div>

          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <Badge className="bg-green-500">Clean</Badge>
              <span className="text-sm font-medium text-gray-700">Ready for Guests</span>
            </div>
            <p className="text-sm text-gray-600">Cleaned and available for new check-ins</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 6,
    title: "AI Chatbot Assistant",
    description: "Automated guest communication",
    icon: <Bot className="h-8 w-8 text-indigo-600" />,
    category: "ai-assistant",
    content: (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-lg border border-indigo-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Rainbow AI Chatbot</h3>
          <p className="text-gray-700 leading-relaxed">
            Your 24/7 AI assistant that handles guest inquiries, provides information about facilities,
            and can even help with bookings - all through WhatsApp or web chat.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <MessageSquare className="h-6 w-6 text-indigo-600 mb-3" />
            <h4 className="font-semibold text-gray-900 mb-2">Smart Responses</h4>
            <p className="text-sm text-gray-600">Understands multiple languages and responds naturally to guest questions</p>
          </div>

          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <BookOpen className="h-6 w-6 text-indigo-600 mb-3" />
            <h4 className="font-semibold text-gray-900 mb-2">Knowledge Base</h4>
            <p className="text-sm text-gray-600">Access to facility info, WiFi passwords, check-in procedures, and local tips</p>
          </div>

          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <Building className="h-6 w-6 text-indigo-600 mb-3" />
            <h4 className="font-semibold text-gray-900 mb-2">Availability Checks</h4>
            <p className="text-sm text-gray-600">Real-time capsule availability and booking assistance</p>
          </div>

          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <Shield className="h-6 w-6 text-indigo-600 mb-3" />
            <h4 className="font-semibold text-gray-900 mb-2">Intent Detection</h4>
            <p className="text-sm text-gray-600">Automatically detects what guests need and routes to the right information</p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <p className="text-sm text-indigo-800 flex items-start gap-2">
            <HelpCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span><strong>Access Chatbot Settings:</strong> Go to Settings → Chatbot tab to configure responses, knowledge base, and WhatsApp integration</span>
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 7,
    title: "Training the Chatbot",
    description: "Customize AI responses to fit your needs",
    icon: <BookOpen className="h-8 w-8 text-purple-600" />,
    category: "ai-assistant",
    content: (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 p-6 rounded-lg border border-purple-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Knowledge Base Training</h3>
          <p className="text-gray-700 leading-relaxed">
            Train your chatbot by adding questions and answers specific to your facility.
            The more you train it, the better it becomes at helping your guests.
          </p>
        </div>

        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-sm font-bold">1</span>
            Add Common Questions
          </h4>
          <p className="text-sm text-gray-600 ml-8 mb-2">Create Q&A pairs for frequently asked questions:</p>
          <ul className="text-sm text-gray-600 ml-8 space-y-1">
            <li>• "What's the WiFi password?" → "Network: MyHostel, Password: abc123"</li>
            <li>• "Where can I find breakfast?" → "Breakfast is served at the cafe downstairs 7-10am"</li>
            <li>• "What time is checkout?" → "Checkout is at 11:00 AM"</li>
          </ul>
        </div>

        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-sm font-bold">2</span>
            Add Facility Information
          </h4>
          <p className="text-sm text-gray-600 ml-8">Include details about amenities, rules, and local attractions</p>
        </div>

        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-sm font-bold">3</span>
            Test Responses
          </h4>
          <p className="text-sm text-gray-600 ml-8">Use the chatbot testing interface to verify responses are accurate</p>
        </div>

        <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-sm text-purple-800 flex items-start gap-2">
            <HelpCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span><strong>Pro Tip:</strong> The AI learns from the structure of your answers. Use clear, concise responses for best results!</span>
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 8,
    title: "Settings & Configuration",
    description: "Customize your system",
    icon: <Settings className="h-8 w-8 text-blue-600" />,
    category: "management",
    content: (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-lg border border-blue-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">System Settings</h3>
          <p className="text-gray-700 leading-relaxed">
            Customize every aspect of your system from the Settings page. Manage capsules, users,
            guest guides, maintenance issues, and more.
          </p>
        </div>

        <div className="space-y-3">
          <div className="p-4 bg-white border-l-4 border-blue-500 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Settings className="h-5 w-5 text-blue-600" />
              <h4 className="font-semibold text-gray-900">General Settings</h4>
            </div>
            <p className="text-sm text-gray-600">Configure accommodation type, system preferences, and default values</p>
          </div>

          <div className="p-4 bg-white border-l-4 border-purple-500 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Building className="h-5 w-5 text-purple-600" />
              <h4 className="font-semibold text-gray-900">Capsule Management</h4>
            </div>
            <p className="text-sm text-gray-600">Add, edit, or remove capsules and manage their status</p>
          </div>

          <div className="p-4 bg-white border-l-4 border-orange-500 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Wrench className="h-5 w-5 text-orange-600" />
              <h4 className="font-semibold text-gray-900">Maintenance Tracking</h4>
            </div>
            <p className="text-sm text-gray-600">Report and track capsule problems and maintenance schedules</p>
          </div>

          <div className="p-4 bg-white border-l-4 border-green-500 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-5 w-5 text-green-600" />
              <h4 className="font-semibold text-gray-900">User Management</h4>
            </div>
            <p className="text-sm text-gray-600">Create staff accounts and manage access permissions</p>
          </div>

          <div className="p-4 bg-white border-l-4 border-indigo-500 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              <h4 className="font-semibold text-gray-900">Guest Guide</h4>
            </div>
            <p className="text-sm text-gray-600">Customize the welcome guide sent to guests after check-in</p>
          </div>

          <div className="p-4 bg-white border-l-4 border-cyan-500 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Bot className="h-5 w-5 text-cyan-600" />
              <h4 className="font-semibold text-gray-900">Chatbot Configuration</h4>
            </div>
            <p className="text-sm text-gray-600">Train AI responses and configure WhatsApp integration</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 9,
    title: "Tips & Best Practices",
    description: "Get the most out of PelangiManager",
    icon: <Sparkles className="h-8 w-8 text-yellow-600" />,
    category: "tips",
    content: (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-lg border border-yellow-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Optimization Tips</h3>
          <p className="text-gray-700 leading-relaxed">
            Here are some tips to help you run your accommodation more efficiently with PelangiManager.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-5 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Check Dashboard Daily</h4>
                <p className="text-sm text-gray-600">Start each day by reviewing the dashboard for alerts, checkout schedules, and occupancy status</p>
              </div>
            </div>
          </div>

          <div className="p-5 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 flex-shrink-0">
                <Bot className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Train Your Chatbot Regularly</h4>
                <p className="text-sm text-gray-600">Add new Q&A pairs whenever guests ask questions the bot can't answer yet</p>
              </div>
            </div>
          </div>

          <div className="p-5 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 flex-shrink-0">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Update Cleaning Status Promptly</h4>
                <p className="text-sm text-gray-600">Keep cleaning status current to ensure accurate availability and prevent double bookings</p>
              </div>
            </div>
          </div>

          <div className="p-5 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 flex-shrink-0">
                <Calendar className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Use Guest Tokens for Self Check-In</h4>
                <p className="text-sm text-gray-600">Enable self-check-in tokens to reduce workload during busy periods</p>
              </div>
            </div>
          </div>

          <div className="p-5 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 flex-shrink-0">
                <Wrench className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Report Maintenance Issues Immediately</h4>
                <p className="text-sm text-gray-600">Log problems as soon as they're discovered to prevent guest complaints and track repair history</p>
              </div>
            </div>
          </div>

          <div className="p-5 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 flex-shrink-0">
                <BookOpen className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Customize Guest Guides</h4>
                <p className="text-sm text-gray-600">Add photos, local tips, and emergency contacts to make guides more helpful</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 10,
    title: "You're Ready!",
    description: "Start managing your accommodation with confidence",
    icon: <CheckCircle className="h-8 w-8 text-green-600" />,
    category: "tips",
    content: (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Congratulations!</h3>
          <p className="text-gray-700 leading-relaxed">
            You've completed the PelangiManager tutorial. You now know how to use all the major features
            of the system. Remember, you can always come back to this guide anytime you need a refresher.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 bg-white border border-gray-200 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Home className="h-5 w-5 text-blue-600" />
              Quick Access
            </h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Dashboard - Overview of operations</li>
              <li>• Check-In - Add new guests</li>
              <li>• Check-Out - Process departures</li>
              <li>• Cleaning - Manage housekeeping</li>
            </ul>
          </div>

          <div className="p-5 bg-white border border-gray-200 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Settings className="h-5 w-5 text-purple-600" />
              Configuration
            </h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Settings - System configuration</li>
              <li>• Capsules - Manage rooms</li>
              <li>• Users - Staff accounts</li>
              <li>• Chatbot - AI assistant setup</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 p-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg text-white">
          <h4 className="font-bold text-lg mb-2">Need Help?</h4>
          <p className="text-blue-50 text-sm mb-4">
            If you have questions or run into issues, you can always return to this help guide
            by clicking the Help button next to Settings in the navigation menu.
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="bg-white text-blue-600 hover:bg-blue-50"
              onClick={() => window.location.href = '/settings'}
            >
              Go to Settings
            </Button>
            <Button
              variant="secondary"
              className="bg-blue-400 text-white hover:bg-blue-300"
              onClick={() => window.location.href = '/dashboard'}
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 11,
    title: "Developer Guide",
    description: "Technical documentation for developers",
    icon: <Code className="h-8 w-8 text-slate-600" />,
    category: "development",
    content: (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-6 rounded-lg border border-slate-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Developer Resources</h3>
          <p className="text-gray-700 leading-relaxed">
            Welcome to the developer section. Here you'll find information about the technical stack,
            project structure, and how to extend the application's functionality.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 bg-white border border-gray-200 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Code className="h-5 w-5 text-blue-600" />
              Tech Stack
            </h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• <strong>Frontend:</strong> React 18, TypeScript, TailwindCSS</li>
              <li>• <strong>UI Components:</strong> shadcn/ui (Radix UI)</li>
              <li>• <strong>State Management:</strong> TanStack Query</li>
              <li>• <strong>Backend:</strong> Node.js (Express)</li>
              <li>• <strong>Database:</strong> PostgreSQL / SQLite (Dev)</li>
            </ul>
          </div>

          <div className="p-5 bg-white border border-gray-200 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Wrench className="h-5 w-5 text-purple-600" />
              Key Commands
            </h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• <code>npm run dev</code> - Start development server</li>
              <li>• <code>npm run build</code> - Build for production</li>
              <li>• <code>npm run lint</code> - Run code linter</li>
              <li>• <code>npm test</code> - Run test suite</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Project Structure</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-600">
            <div><code>/client</code> - Frontend application code</div>
            <div><code>/server</code> - Backend API and logic</div>
            <div><code>/shared</code> - Shared types and utilities</div>
            <div><code>/migrations</code> - Database migrations</div>
          </div>
        </div>
      </div>
    ),
  },
];

export default function HelpPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [, setLocation] = useLocation();

  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;
  const step = tutorialSteps[currentStep];

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleStepClick = (stepId: number) => {
    setCurrentStep(stepId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "overview": return "bg-blue-100 text-blue-700";
      case "features": return "bg-purple-100 text-purple-700";
      case "ai-assistant": return "bg-indigo-100 text-indigo-700";
      case "management": return "bg-green-100 text-green-700";
      case "tips": return "bg-yellow-100 text-yellow-700";
      case "development": return "bg-slate-100 text-slate-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation('/settings')}
            className="mb-4"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Button>

          <div className="flex items-center gap-4 mb-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
              <HelpCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Interactive Help Guide</h1>
              <p className="text-gray-600">Learn how to use PelangiManager effectively</p>
            </div>
            <Button
              onClick={startTour}
              className="ml-auto bg-gradient-to-r from-orange-400 to-pink-500 hover:from-orange-500 hover:to-pink-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Start Guided Tour
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>Step {currentStep + 1} of {tutorialSteps.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        {/* Main Content Card */}
        <Card className="mb-6 shadow-xl border-2">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                {step.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle className="text-2xl">{step.title}</CardTitle>
                  <Badge className={getCategoryColor(step.category)}>
                    {step.category.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                </div>
                <CardDescription className="text-base">{step.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {step.content}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mb-8">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex gap-2">
            {tutorialSteps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => handleStepClick(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${idx === currentStep
                  ? 'bg-indigo-600 w-8'
                  : idx < currentStep
                    ? 'bg-indigo-400'
                    : 'bg-gray-300'
                  }`}
                aria-label={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          <Button
            onClick={handleNext}
            disabled={currentStep === tutorialSteps.length - 1}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Navigation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Jump</CardTitle>
            <CardDescription>Jump to any section directly</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {tutorialSteps.map((s, idx) => (
                <Button
                  key={s.id}
                  variant={idx === currentStep ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleStepClick(idx)}
                  className="justify-start text-xs h-auto py-2"
                >
                  <span className="mr-1">{idx + 1}.</span>
                  <span className="truncate">{s.title}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
