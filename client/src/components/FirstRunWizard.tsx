import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_BUSINESS_CONFIG } from "@shared/business-config";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { startTour } from "./OnboardingWizard";

// localStorage is only used as a fast-path cache to avoid a network round-trip
// on every page load. The authoritative source of truth is the Neon database.
const COMPLETED_KEY = "firstRunWizardCompleted";
const STEP_KEY = "firstRunWizardStep";

interface FirstRunWizardProps {
  isAuthenticated: boolean;
}

const TOTAL_STEPS = 4;

const stepTitles = [
  "Welcome! Let's set up your property",
  "Add your accommodation units",
  "Connect WhatsApp (Rainbow AI)",
  "You're all set!",
];

export default function FirstRunWizard({ isAuthenticated }: FirstRunWizardProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [propertyName, setPropertyName] = useState("");
  const [accommodationType, setAccommodationType] = useState("capsule");
  const [saving, setSaving] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check the DB (authoritative) — only fires when authenticated.
  // localStorage is checked first as a fast-path to avoid a flash of the wizard.
  const { data: setupStatus, isSuccess: setupStatusLoaded } = useQuery<{ completed: boolean }>({
    queryKey: ["/api/settings/setup-status"],
    enabled: isAuthenticated && localStorage.getItem(COMPLETED_KEY) !== "true",
    staleTime: Infinity, // once completed it never changes back
  });

  useEffect(() => {
    if (!isAuthenticated) return;

    // Fast path: localStorage already says done → skip network call entirely
    if (localStorage.getItem(COMPLETED_KEY) === "true") return;

    // Wait for DB check to finish
    if (!setupStatusLoaded) return;

    if (setupStatus?.completed) {
      // DB says done — update localStorage cache so future loads skip the network call
      localStorage.setItem(COMPLETED_KEY, "true");
      return;
    }

    // DB says not done → show wizard
    const savedStep = parseInt(localStorage.getItem(STEP_KEY) || "1", 10);
    setStep(isNaN(savedStep) ? 1 : savedStep);
    setOpen(true);
  }, [isAuthenticated, setupStatusLoaded, setupStatus]);

  const complete = () => {
    // Write to Neon DB so the flag persists across browsers / devices
    apiRequest("POST", "/api/settings/setup-complete").catch(() => {
      // Non-fatal: localStorage will still suppress re-showing on this browser
    });
    // Invalidate the query so any other components see the updated state
    queryClient.invalidateQueries({ queryKey: ["/api/settings/setup-status"] });

    localStorage.setItem(COMPLETED_KEY, "true");
    localStorage.removeItem(STEP_KEY);
    setOpen(false);
  };

  const goToStep = (n: number) => {
    localStorage.setItem(STEP_KEY, String(n));
    setStep(n);
  };

  const handleStep1Save = async () => {
    if (!propertyName.trim() && !accommodationType) {
      goToStep(2);
      return;
    }
    setSaving(true);
    try {
      await apiRequest("PATCH", "/api/settings", {
        ...(propertyName.trim() ? { appTitle: propertyName.trim() } : {}),
        accommodationType,
      });
      toast({ title: "Property details saved!" });
    } catch {
      toast({ title: "Could not save", description: "You can update this in Settings anytime.", variant: "destructive" });
    } finally {
      setSaving(false);
      goToStep(2);
    }
  };

  const handleNavigateTo = (path: string) => {
    complete();
    setLocation(path);
  };

  const handleTakeTour = () => {
    complete();
    startTour();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) complete(); }}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">
              Step {step} of {TOTAL_STEPS}
            </Badge>
          </div>
          <DialogTitle className="text-lg">{stepTitles[step - 1]}</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex gap-1 mb-4">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${i < step ? "bg-indigo-500" : "bg-gray-200"
                }`}
            />
          ))}
        </div>

        {/* Step 1: Property details */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Let's get the basics in place. You can change any of these in Settings later.
            </p>
            <div className="space-y-2">
              <Label htmlFor="wizard-property-name">Property name</Label>
              <Input
                id="wizard-property-name"
                placeholder={`e.g. ${DEFAULT_BUSINESS_CONFIG.name}`}
                value={propertyName}
                onChange={(e) => setPropertyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Accommodation type</Label>
              <Select value={accommodationType} onValueChange={setAccommodationType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="capsule">Capsule (capsule hotel)</SelectItem>
                  <SelectItem value="room">Room (guesthouse / B&B)</SelectItem>
                  <SelectItem value="bed">Bed (hostel dormitory)</SelectItem>
                  <SelectItem value="unit">Unit (serviced apartment)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 2: Add units */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Units are the individual rooms, capsules, or beds guests can book. Adding at least
              one unit lets you start checking guests in.
            </p>
            <div className="bg-indigo-50 rounded-lg p-4 text-sm text-indigo-800">
              Head to <strong>Settings → Units</strong> to add your first unit. It takes about
              2 minutes.
            </div>
            <Button
              className="w-full"
              onClick={() => handleNavigateTo("/settings?tab=units")}
            >
              Open Units Settings →
            </Button>
          </div>
        )}

        {/* Step 3: Connect WhatsApp */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Rainbow AI is your WhatsApp concierge — it handles guest inquiries, bookings,
              and escalations automatically in English, Malay, and Chinese.
            </p>
            <div className="bg-amber-50 rounded-lg p-4 text-sm text-amber-800">
              Rainbow AI runs on a separate server (port 3002). Open its dashboard to scan
              the QR code and connect your WhatsApp number.
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                const RAINBOW_URL = import.meta.env.VITE_RAINBOW_URL || "http://localhost:3002";
                window.open(`${RAINBOW_URL}/#dashboard`, "_blank");
              }}
            >
              Open Rainbow AI Dashboard ↗
            </Button>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Your property is configured and ready to go. You can continue setting up at any
              time from the Settings page.
            </p>
            <div className="bg-emerald-50 rounded-lg p-4 text-sm text-emerald-800">
              ✅ Take a quick tour to discover all the features available in the dashboard.
            </div>
            <Button className="w-full" onClick={handleTakeTour}>
              Take a Tour
            </Button>
          </div>
        )}

        <DialogFooter className="flex-row justify-between mt-4">
          <Button variant="ghost" size="sm" onClick={complete} className="text-gray-500">
            {step === TOTAL_STEPS ? "Close" : "Skip setup"}
          </Button>
          <div className="flex gap-2">
            {step > 1 && step < TOTAL_STEPS && (
              <Button variant="outline" size="sm" onClick={() => goToStep(step - 1)}>
                Back
              </Button>
            )}
            {step === 1 && (
              <Button size="sm" onClick={handleStep1Save} disabled={saving}>
                {saving ? "Saving…" : "Save & Continue"}
              </Button>
            )}
            {step > 1 && step < TOTAL_STEPS && (
              <Button size="sm" onClick={() => goToStep(step + 1)}>
                Next →
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
