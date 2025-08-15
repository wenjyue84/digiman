import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Link2, Copy, Clock, MapPin, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAccommodationLabels } from "@/hooks/useAccommodationLabels";
import type { Capsule } from "@shared/schema";

interface TokenGeneratorProps {
  onTokenCreated?: () => void;
}

export default function GuestTokenGenerator({ onTokenCreated }: TokenGeneratorProps) {
  const labels = useAccommodationLabels();
  const [selectedCapsule, setSelectedCapsule] = useState("auto-assign");
  const [guestName, setGuestName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [expectedCheckoutDate, setExpectedCheckoutDate] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [prefillGender, setPrefillGender] = useState<string>("");
  const [prefillNationality, setPrefillNationality] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [overrideGuide, setOverrideGuide] = useState(false);
  const [guideShowIntro, setGuideShowIntro] = useState<boolean | undefined>(undefined);
  const [guideShowAddress, setGuideShowAddress] = useState<boolean | undefined>(undefined);
  const [guideShowWifi, setGuideShowWifi] = useState<boolean | undefined>(undefined);
  const [guideShowCheckin, setGuideShowCheckin] = useState<boolean | undefined>(undefined);
  const [guideShowOther, setGuideShowOther] = useState<boolean | undefined>(undefined);
  const [guideShowFaq, setGuideShowFaq] = useState<boolean | undefined>(undefined);
  const [guideShowSelfCheckinMessage, setGuideShowSelfCheckinMessage] = useState<boolean | undefined>(undefined);
  const [guideShowHostelPhotos, setGuideShowHostelPhotos] = useState<boolean | undefined>(undefined);
  const [guideShowGoogleMaps, setGuideShowGoogleMaps] = useState<boolean | undefined>(undefined);
  const [guideShowCheckinVideo, setGuideShowCheckinVideo] = useState<boolean | undefined>(undefined);
  const [guideShowTimeAccess, setGuideShowTimeAccess] = useState<boolean | undefined>(undefined);
  const [generatedToken, setGeneratedToken] = useState<{
    token: string;
    link: string;
    capsuleNumber: string;
    guestName: string;
    expiresAt: string;
  } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: availableCapsules = [], isLoading: capsulesLoading } = useQuery<Capsule[]>({
    queryKey: ["/api/capsules/available"],
  });

  const createTokenMutation = useMutation({
    mutationFn: async (data: { 
      capsuleNumber?: string; 
      autoAssign?: boolean;
      guestName?: string;
      phoneNumber?: string;
      email?: string;
      expectedCheckoutDate?: string;
 
    }) => {
      const response = await apiRequest("POST", "/api/guest-tokens", data);
      return response.json();
    },
    onSuccess: async (data) => {
      setGeneratedToken(data);
      const url = new URL(data.link);
      if (checkInDate) url.searchParams.set("ci", checkInDate);
      if (prefillGender) url.searchParams.set("g", prefillGender);
      if (prefillNationality) url.searchParams.set("nat", prefillNationality);
      const finalLink = url.toString();
      try {
        await navigator.clipboard.writeText(finalLink);
        toast({
          title: "Check-in Link Created & Copied!",
          description: `Generated self-check-in link for capsule ${data.capsuleNumber}`,
        });
      } catch (error) {
        toast({
          title: "Check-in Link Created",
          description: `Generated self-check-in link for capsule ${data.capsuleNumber}. Manual copy needed.`,
        });
      }
      onTokenCreated?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create check-in link",
        variant: "destructive",
      });
    },
  });

  const instantCreateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/guest-tokens", {
        autoAssign: true,
      });
      return response.json();
    },
    onSuccess: async (data) => {
      try {
        await navigator.clipboard.writeText(data.link);
        toast({
          title: "Instant link copied",
          description: data.capsuleNumber
            ? `${labels.singular} ${data.capsuleNumber} link copied to clipboard`
            : `Link copied to clipboard. ${labels.singular} will be auto-assigned`,
        });
      } catch (error) {
        toast({
          title: "Instant link created",
          description: data.capsuleNumber
            ? `${labels.singular} ${data.capsuleNumber} link created. Copy manually if needed.`
            : `Link created. ${labels.singular} will be auto-assigned. Copy manually if needed.`,
        });
      }
      onTokenCreated?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create instant check-in link",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCapsule) {
      toast({
        title: "Validation Error",
        description: `Please select a ${labels.lowerSingular} assignment option`,
        variant: "destructive",
      });
      return;
    }
    // Name and phone are now optional - guest will fill them during self-check-in

    const isAutoAssign = selectedCapsule === "auto-assign";
    createTokenMutation.mutate({
      capsuleNumber: isAutoAssign ? undefined : selectedCapsule,
      autoAssign: isAutoAssign,
      guestName: guestName.trim() || undefined,
      phoneNumber: phoneNumber.trim() || undefined,
      email: email.trim() || undefined,
      checkInDate: checkInDate || undefined,
      expectedCheckoutDate: expectedCheckoutDate || undefined,
      // Optional per-token guide overrides
      guideOverrideEnabled: overrideGuide || undefined,
      guideShowIntro: overrideGuide ? guideShowIntro : undefined,
      guideShowAddress: overrideGuide ? guideShowAddress : undefined,
      guideShowWifi: overrideGuide ? guideShowWifi : undefined,
      guideShowCheckin: overrideGuide ? guideShowCheckin : undefined,
      guideShowOther: overrideGuide ? guideShowOther : undefined,
      guideShowFaq: overrideGuide ? guideShowFaq : undefined,
      guideShowSelfCheckinMessage: overrideGuide ? guideShowSelfCheckinMessage : undefined,
      guideShowHostelPhotos: overrideGuide ? guideShowHostelPhotos : undefined,
      guideShowGoogleMaps: overrideGuide ? guideShowGoogleMaps : undefined,
      guideShowCheckinVideo: overrideGuide ? guideShowCheckinVideo : undefined,
      guideShowTimeAccess: overrideGuide ? guideShowTimeAccess : undefined,
    });
  };

  const handleInstantCreate = () => {
    instantCreateMutation.mutate();
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Check-in link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button 
        variant="default" 
        size="sm" 
        onClick={handleInstantCreate}
        disabled={instantCreateMutation.isPending}
        className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
      >
        <Link2 className="h-4 w-4" />
        {instantCreateMutation.isPending ? "Creating..." : "Instant Create"}
      </Button>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Create Link
          </Button>
        </DialogTrigger>
        <DialogContent className="w-full max-w-sm sm:max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-600" />
            Create Guest Check-in Link
          </DialogTitle>
          <DialogDescription>
            Generate a link that guests can use to complete their own check-in process
          </DialogDescription>
        </DialogHeader>

        {!generatedToken ? (
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 pb-24">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="guestName">Guest Name (Optional - guest will fill during check-in)</Label>
                <Input
                  id="guestName"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Leave empty for guest to fill"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="phoneNumber">Phone Number (Optional - guest will fill during check-in)</Label>
                <Input
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Leave empty for guest to fill"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="guest@example.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="checkInDate">Planned Check-in Date (Optional)</Label>
                <Input
                  id="checkInDate"
                  type="date"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="expectedCheckout">Expected Checkout</Label>
                <Input
                  id="expectedCheckout"
                  type="date"
                  value={expectedCheckoutDate}
                  onChange={(e) => setExpectedCheckoutDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Optional Guest Prefill */}
            <div className="border rounded-md">
              <div className="px-3 py-2">
                <Label className="text-sm font-medium">Optional Guest Prefill</Label>
                <p className="text-xs text-gray-500 mt-1">These values will prefill the self check-in form (guest can still change them).</p>
              </div>
              <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="prefillGender">Gender (Optional)</Label>
                  <Select value={prefillGender || ""} onValueChange={setPrefillGender}>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="prefillNationality">Nationality (Optional)</Label>
                  <Input
                    id="prefillNationality"
                    value={prefillNationality}
                    onChange={(e) => setPrefillNationality(e.target.value)}
                    placeholder="e.g., Malaysian"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <Label htmlFor="capsule" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Select {labels.singular}
              </Label>
              <Select value={selectedCapsule} onValueChange={setSelectedCapsule}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder={`Choose ${labels.lowerSingular} assignment`} />
                </SelectTrigger>
                <SelectContent>
                  {capsulesLoading ? (
                    <SelectItem value="loading" disabled>Loading {labels.lowerPlural}...</SelectItem>
                  ) : availableCapsules.length === 0 ? (
                    <SelectItem value="no-capsules" disabled>No {labels.lowerPlural} available</SelectItem>
                  ) : (
                    <>
                      <SelectItem value="auto-assign">
                        <div className="flex items-center gap-2">
                          <span>🤖</span>
                          <span>Auto Assign (Based on Gender)</span>
                        </div>
                      </SelectItem>
                      {availableCapsules
                        .sort((a, b) => {
                          const aNum = parseInt(a.number.replace('C', ''));
                          const bNum = parseInt(b.number.replace('C', ''));
                          const aIsBottom = aNum % 2 === 0;
                          const bIsBottom = bNum % 2 === 0;
                          
                          if (aIsBottom && !bIsBottom) return -1;
                          if (!aIsBottom && bIsBottom) return 1;
                          return aNum - bNum;
                        })
                        .map((capsule) => {
                          const capsuleNum = parseInt(capsule.number.replace('C', ''));
                          const isBottom = capsuleNum % 2 === 0;
                          const position = isBottom ? "Bottom ⭐" : "Top";
                          
                          return (
                            <SelectItem key={capsule.number} value={capsule.number}>
                              {capsule.number} - {position} ({capsule.section})
                            </SelectItem>
                          );
                        })}
                    </>
                  )}
                </SelectContent>
              </Select>
              {selectedCapsule === "auto-assign" && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Auto Assignment:</span> The system will automatically assign the best available capsule based on the guest's gender preference:
                  </p>
                  <ul className="text-xs text-blue-600 mt-1 space-y-1">
                    <li>• Females: Back section, bottom bunks preferred</li>
                    <li>• Males: Front section, bottom bunks preferred</li>
                  </ul>
                </div>
              )}
            </div>


            {/* Advanced: Guest Guide Override */}
            <div className="border rounded-md">
              <button
                type="button"
                onClick={() => setShowAdvanced(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium hover:bg-gray-50"
                aria-expanded={showAdvanced}
              >
                <span>Advanced (Override Guest Guide Content)</span>
                <span className="text-xs text-gray-500">Optional</span>
              </button>
              {showAdvanced && (
                <div className="px-3 pb-3 space-y-3">
                  <div className="flex items-center gap-2 mt-1">
                    <input id="overrideGuide" type="checkbox" checked={overrideGuide} onChange={(e) => setOverrideGuide(e.target.checked)} />
                    <Label htmlFor="overrideGuide">Enable one-time override for this link</Label>
                  </div>
                  {overrideGuide && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <label className="flex items-center gap-2"><input type="checkbox" checked={!!guideShowIntro} onChange={(e)=> setGuideShowIntro(e.target.checked)} /> Show Introduction</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={!!guideShowAddress} onChange={(e)=> setGuideShowAddress(e.target.checked)} /> Show Address</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={!!guideShowWifi} onChange={(e)=> setGuideShowWifi(e.target.checked)} /> Show WiFi</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={!!guideShowCheckin} onChange={(e)=> setGuideShowCheckin(e.target.checked)} /> Show How to Check In</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={!!guideShowOther} onChange={(e)=> setGuideShowOther(e.target.checked)} /> Show Other Guidance</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={!!guideShowFaq} onChange={(e)=> setGuideShowFaq(e.target.checked)} /> Show FAQ</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={!!guideShowSelfCheckinMessage} onChange={(e)=> setGuideShowSelfCheckinMessage(e.target.checked)} /> Show Self-Check-in Message</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={!!guideShowHostelPhotos} onChange={(e)=> setGuideShowHostelPhotos(e.target.checked)} /> Show Hostel Photos</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={!!guideShowGoogleMaps} onChange={(e)=> setGuideShowGoogleMaps(e.target.checked)} /> Show Google Maps</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={!!guideShowCheckinVideo} onChange={(e)=> setGuideShowCheckinVideo(e.target.checked)} /> Show Check-in Video</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={!!guideShowTimeAccess} onChange={(e)=> setGuideShowTimeAccess(e.target.checked)} /> Show Time & Access</label>
                      <p className="sm:col-span-3 text-xs text-gray-500">If none selected, default Guest Guide settings will be used.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="sticky bottom-0 -mx-6 px-6 py-3 bg-gradient-to-t from-background via-background/95 to-transparent">
              <Button 
                type="submit" 
                className="w-full h-12 sm:h-10 text-sm sm:text-base bg-orange-600 hover:bg-orange-700"
                disabled={createTokenMutation.isPending || !selectedCapsule}
                isLoading={createTokenMutation.isPending}
              >
                Generate Check-in Link
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  {generatedToken.capsuleNumber || "Auto Assign 🤖"}
                </Badge>
                <span className="text-sm text-green-700">Check-in link created!</span>
              </div>
              {!generatedToken.capsuleNumber && (
                <div className="text-xs text-blue-600 mt-1 font-medium">
                  {labels.singular} will be auto-assigned based on guest's gender
                </div>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium">Guest Check-in Link:</Label>
              <div className="flex gap-2 mt-1">
              {(() => {
                const url = new URL(generatedToken.link);
                if (checkInDate) url.searchParams.set("ci", checkInDate);
                if (prefillGender) url.searchParams.set("g", prefillGender);
                if (prefillNationality) url.searchParams.set("nat", prefillNationality);
                const finalLink = url.toString();
                return (
                  <Input
                    value={finalLink}
                    readOnly
                    className="flex-1 text-xs"
                  />
                );
              })()}
                <Button
                  size="sm"
                  variant="outline"
                onClick={() => {
                  const url = new URL(generatedToken.link);
                  if (checkInDate) url.searchParams.set("ci", checkInDate);
                  if (prefillGender) url.searchParams.set("g", prefillGender);
                  if (prefillNationality) url.searchParams.set("nat", prefillNationality);
                  copyToClipboard(url.toString());
                }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Share this link with the guest. They can use it to complete their check-in information before arrival.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setGeneratedToken(null);
                  setSelectedCapsule("auto-assign");
                  setGuestName("");
                  setPhoneNumber("");
                  setEmail("");
                  setExpectedCheckoutDate("");
                  setCheckInDate("");
                  setPrefillGender("");
                  setPrefillNationality("");
                }}
                className="flex-1"
              >
                Create Another
              </Button>
              <Button
                onClick={() => setIsDialogOpen(false)}
                className="flex-1"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </div>
  );
}