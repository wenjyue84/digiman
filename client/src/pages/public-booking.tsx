import { useState } from "react";
import { DayPicker } from "react-day-picker";
import type { DateRange } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, Users, CheckCircle, Loader2, MapPin, MessageCircle, ChevronRight, ChevronLeft, Globe } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";

// ─── Inline translations ──────────────────────────────────────────────────────

type Lang = "en" | "ms" | "zh";

const T: Record<Lang, {
  title: string; subtitle: string; step1: string; step2: string; step3: string;
  checkIn: string; checkOut: string; guests: string; checkAvail: string;
  bedsAvail: string; bedsFull: string; pricePerNight: string; totalPrice: string;
  nights: string; perGuest: string; next: string; back: string; confirm: string;
  name: string; email: string; phone: string; nationality: string; requests: string;
  requestsPlaceholder: string; payAtArrival: string; cancelPolicy: string;
  cancelPolicyText: string; bookingConfirmed: string; confirmationNum: string;
  selfCheckinBtn: string; whatsappCancel: string; payNotice: string;
  guestCount: string; reviewTitle: string; duration: string; total: string;
  processing: string; selectDates: string; namePlaceholder: string;
  emailPlaceholder: string; phonePlaceholder: string; nationalityPlaceholder: string;
}> = {
  en: {
    title: "Book Your Stay",
    subtitle: "Pelangi Capsule Hostel, Johor Bahru",
    step1: "Dates & Guests",
    step2: "Your Details",
    step3: "Confirm",
    checkIn: "Check-in",
    checkOut: "Check-out",
    guests: "Guests",
    checkAvail: "Check Availability",
    bedsAvail: "beds available",
    bedsFull: "No beds available for these dates. Please try different dates.",
    pricePerNight: "per night",
    totalPrice: "Total",
    nights: "nights",
    perGuest: "per guest",
    next: "Next",
    back: "Back",
    confirm: "Confirm Booking",
    name: "Full Name",
    email: "Email Address",
    phone: "WhatsApp Number",
    nationality: "Nationality",
    requests: "Special Requests",
    requestsPlaceholder: "Allergies, arrival time, any special needs...",
    payAtArrival: "Payment at Arrival",
    cancelPolicy: "Cancellation Policy",
    cancelPolicyText: "To cancel, message us on WhatsApp. No online cancellation.",
    bookingConfirmed: "Booking Confirmed!",
    confirmationNum: "Confirmation Number",
    selfCheckinBtn: "Complete Self Check-in",
    whatsappCancel: "Cancel via WhatsApp",
    payNotice: "Payment is due at arrival. We accept cash and online transfers.",
    guestCount: "Number of guests",
    reviewTitle: "Review Your Booking",
    duration: "Duration",
    total: "Total",
    processing: "Processing...",
    selectDates: "Select your check-in and check-out dates",
    namePlaceholder: "As shown on passport/IC",
    emailPlaceholder: "you@example.com",
    phonePlaceholder: "+60 12-345 6789",
    nationalityPlaceholder: "e.g. Malaysian, Singaporean",
  },
  ms: {
    title: "Tempah Penginapan Anda",
    subtitle: "Pelangi Capsule Hostel, Johor Bahru",
    step1: "Tarikh & Tetamu",
    step2: "Maklumat Anda",
    step3: "Sahkan",
    checkIn: "Daftar Masuk",
    checkOut: "Daftar Keluar",
    guests: "Tetamu",
    checkAvail: "Semak Ketersediaan",
    bedsAvail: "katil tersedia",
    bedsFull: "Tiada katil tersedia untuk tarikh ini. Cuba tarikh lain.",
    pricePerNight: "semalaman",
    totalPrice: "Jumlah",
    nights: "malam",
    perGuest: "setiap tetamu",
    next: "Seterusnya",
    back: "Kembali",
    confirm: "Sahkan Tempahan",
    name: "Nama Penuh",
    email: "Alamat E-mel",
    phone: "Nombor WhatsApp",
    nationality: "Kewarganegaraan",
    requests: "Permintaan Khas",
    requestsPlaceholder: "Alahan, waktu ketibaan, keperluan khas...",
    payAtArrival: "Bayaran Semasa Tiba",
    cancelPolicy: "Polisi Pembatalan",
    cancelPolicyText: "Untuk membatalkan, mesej kami melalui WhatsApp.",
    bookingConfirmed: "Tempahan Disahkan!",
    confirmationNum: "Nombor Pengesahan",
    selfCheckinBtn: "Lengkapkan Daftar Masuk Sendiri",
    whatsappCancel: "Batalkan via WhatsApp",
    payNotice: "Bayaran perlu dijelaskan semasa tiba.",
    guestCount: "Bilangan tetamu",
    reviewTitle: "Semak Tempahan Anda",
    duration: "Tempoh",
    total: "Jumlah",
    processing: "Memproses...",
    selectDates: "Pilih tarikh daftar masuk dan keluar anda",
    namePlaceholder: "Seperti dalam pasport/IC",
    emailPlaceholder: "anda@contoh.com",
    phonePlaceholder: "+60 12-345 6789",
    nationalityPlaceholder: "cth. Malaysia, Singapura",
  },
  zh: {
    title: "预订住宿",
    subtitle: "Pelangi Capsule Hostel，新山",
    step1: "日期和人数",
    step2: "您的信息",
    step3: "确认",
    checkIn: "入住",
    checkOut: "退房",
    guests: "客人",
    checkAvail: "查看空房",
    bedsAvail: "个床位可用",
    bedsFull: "所选日期无空位，请尝试其他日期。",
    pricePerNight: "每晚",
    totalPrice: "总计",
    nights: "晚",
    perGuest: "每位客人",
    next: "下一步",
    back: "返回",
    confirm: "确认预订",
    name: "全名",
    email: "电子邮件",
    phone: "WhatsApp号码",
    nationality: "国籍",
    requests: "特殊要求",
    requestsPlaceholder: "过敏、到达时间、特殊需求...",
    payAtArrival: "到店付款",
    cancelPolicy: "取消政策",
    cancelPolicyText: "如需取消，请通过WhatsApp联系我们。",
    bookingConfirmed: "预订已确认！",
    confirmationNum: "预订号码",
    selfCheckinBtn: "完成自助入住",
    whatsappCancel: "通过WhatsApp取消",
    payNotice: "到店时付款，接受现金和网上转账。",
    guestCount: "客人人数",
    reviewTitle: "确认您的预订",
    duration: "时长",
    total: "总计",
    processing: "处理中...",
    selectDates: "请选择入住和退房日期",
    namePlaceholder: "与护照/身份证一致",
    emailPlaceholder: "您的邮箱",
    phonePlaceholder: "+60 12-345 6789",
    nationalityPlaceholder: "例如：马来西亚、新加坡",
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface AvailabilityResult {
  available: boolean;
  availableCount: number;
  nights: number;
  pricePerNight: number;
  totalPrice: number;
  currency: string;
}

interface BookingResult {
  confirmationNumber: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  nights: number;
  totalAmount: string;
  currency: string;
  checkInLink: string | null;
  status: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HOSTEL_WA = "601154290183"; // update if needed
const MAX_GUESTS = 10;
const NATIONALITIES = [
  "Malaysian", "Singaporean", "Indonesian", "Thai", "Filipino",
  "Vietnamese", "Chinese", "Indian", "Korean", "Japanese",
  "British", "American", "Australian", "Other",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function PublicBooking() {
  const { toast } = useToast();
  const [lang, setLang] = useState<Lang>("en");
  const t = T[lang];

  // Step state
  const [step, setStep] = useState<1 | 2 | 3 | "success">(1);

  // Step 1 state
  const [range, setRange] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState(1);
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [checking, setChecking] = useState(false);

  // Step 2 state
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestNationality, setGuestNationality] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");

  // Step 3 / result
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BookingResult | null>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const nights = range?.from && range?.to
    ? differenceInCalendarDays(range.to, range.from)
    : 0;

  const fmtDate = (d: Date) => format(d, "yyyy-MM-dd");

  async function checkAvailability() {
    if (!range?.from || !range?.to) {
      toast({ title: "Select dates first", variant: "destructive" });
      return;
    }
    setChecking(true);
    setAvailability(null);
    try {
      const params = new URLSearchParams({
        checkIn: fmtDate(range.from),
        checkOut: fmtDate(range.to),
        guests: String(guests),
      });
      const resp = await fetch(`/api/public/availability?${params}`);
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || "Failed to check availability");
      setAvailability(json.data);
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setChecking(false);
    }
  }

  async function submitBooking() {
    if (!range?.from || !range?.to) return;
    setSubmitting(true);
    try {
      const resp = await fetch("/api/public/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName,
          guestEmail,
          guestPhone,
          guestNationality,
          numberOfGuests: guests,
          checkInDate: fmtDate(range.from),
          checkOutDate: fmtDate(range.to),
          specialRequests: specialRequests || undefined,
        }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || "Booking failed");
      setResult(json.data);
      setStep("success");
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Step validation ────────────────────────────────────────────────────────

  const canGoToStep2 = availability?.available && nights > 0;
  const canSubmit = guestName.trim().length >= 2 && guestEmail.includes("@") && guestPhone.length >= 7 && guestNationality;

  // ── Render helpers ─────────────────────────────────────────────────────────

  function PriceSummary() {
    if (!availability || !range?.from || !range?.to) return null;
    return (
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">RM {availability.pricePerNight} × {nights} {t.nights} × {guests} {t.guests}</span>
          <span className="font-medium">RM {availability.totalPrice.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-base border-t pt-2">
          <span>{t.total}</span>
          <span className="text-purple-700">RM {availability.totalPrice.toFixed(2)}</span>
        </div>
        <p className="text-xs text-muted-foreground">{t.payAtArrival}</p>
      </div>
    );
  }

  function StepIndicator() {
    const steps = [t.step1, t.step2, t.step3];
    const current = step === "success" ? 3 : (step as number);
    return (
      <div className="flex items-center gap-2 mb-6">
        {steps.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              i + 1 < current ? "bg-green-500 text-white" : i + 1 === current ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-500"
            }`}>
              {i + 1 < current ? "✓" : i + 1}
            </div>
            <span className={`text-sm hidden sm:inline ${i + 1 === current ? "font-semibold text-purple-700" : "text-muted-foreground"}`}>{label}</span>
            {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300 mx-1" />}
          </div>
        ))}
      </div>
    );
  }

  // ── Success screen ─────────────────────────────────────────────────────────

  if (step === "success" && result) {
    const waMsg = encodeURIComponent(`Hi, I need to cancel booking ${result.confirmationNumber}`);
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{t.bookingConfirmed}</h2>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">{t.confirmationNum}</p>
              <p className="text-2xl font-mono font-bold text-purple-700">{result.confirmationNumber}</p>
            </div>
            <div className="text-sm text-left space-y-2 bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between"><span className="text-muted-foreground">{t.checkIn}</span><span className="font-medium">{result.checkInDate}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t.checkOut}</span><span className="font-medium">{result.checkOutDate}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t.guests}</span><span className="font-medium">{result.numberOfGuests}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t.total}</span><span className="font-bold text-green-700">RM {result.totalAmount}</span></div>
            </div>
            <p className="text-sm text-muted-foreground">{t.payNotice}</p>
            {result.checkInLink && (
              <a href={result.checkInLink} className="block">
                <Button className="w-full bg-purple-600 hover:bg-purple-700">{t.selfCheckinBtn}</Button>
              </a>
            )}
            <a href={`https://wa.me/${HOSTEL_WA}?text=${waMsg}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="w-full gap-2">
                <MessageCircle className="w-4 h-4" />
                {t.whatsappCancel}
              </Button>
            </a>
            <div className="text-xs text-muted-foreground border-t pt-3">
              <p className="font-medium">{t.cancelPolicy}</p>
              <p>{t.cancelPolicyText}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main layout ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-purple-700">{t.title}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />{t.subtitle}
            </p>
          </div>
          {/* Language switcher */}
          <div className="flex items-center gap-1">
            <Globe className="w-4 h-4 text-muted-foreground" />
            {(["en", "ms", "zh"] as Lang[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2 py-1 text-xs rounded font-medium transition-colors ${lang === l ? "bg-purple-100 text-purple-700" : "text-muted-foreground hover:text-purple-600"}`}
              >
                {l === "en" ? "EN" : l === "ms" ? "MS" : "中文"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <StepIndicator />

        {/* ── Step 1: Dates & Guests ── */}
        {step === 1 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays className="w-5 h-5 text-purple-600" />
                  {t.selectDates}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <DayPicker
                    mode="range"
                    selected={range}
                    onSelect={(r) => { setRange(r); setAvailability(null); }}
                    disabled={{ before: new Date() }}
                    numberOfMonths={1}
                    showOutsideDays={false}
                    className="rdp-booking"
                  />
                </div>
                {range?.from && range?.to && (
                  <div className="mt-3 flex gap-3 text-sm">
                    <div className="flex-1 bg-purple-50 rounded p-2 text-center">
                      <p className="text-xs text-muted-foreground">{t.checkIn}</p>
                      <p className="font-semibold">{format(range.from, "d MMM yyyy")}</p>
                    </div>
                    <div className="flex-1 bg-purple-50 rounded p-2 text-center">
                      <p className="text-xs text-muted-foreground">{t.checkOut}</p>
                      <p className="font-semibold">{format(range.to, "d MMM yyyy")}</p>
                    </div>
                    <div className="flex-1 bg-purple-50 rounded p-2 text-center">
                      <p className="text-xs text-muted-foreground">{t.nights}</p>
                      <p className="font-semibold">{nights}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <Label className="flex items-center gap-2 mb-2 text-sm font-medium">
                  <Users className="w-4 h-4 text-purple-600" />
                  {t.guestCount}
                </Label>
                <Select value={String(guests)} onValueChange={v => { setGuests(parseInt(v)); setAvailability(null); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: MAX_GUESTS }, (_, i) => i + 1).map(n => (
                      <SelectItem key={n} value={String(n)}>{n} {n === 1 ? "guest" : "guests"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Button
              onClick={checkAvailability}
              disabled={!range?.from || !range?.to || checking}
              className="w-full bg-purple-600 hover:bg-purple-700 gap-2"
            >
              {checking ? <><Loader2 className="w-4 h-4 animate-spin" />{t.processing}</> : t.checkAvail}
            </Button>

            {availability && (
              <div className={`rounded-lg p-4 border ${availability.available ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                {availability.available ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-800">{availability.availableCount} {t.bedsAvail}</span>
                      <Badge variant="outline" className="text-green-700 border-green-300">RM {availability.pricePerNight} {t.pricePerNight}</Badge>
                    </div>
                    <PriceSummary />
                    <Button onClick={() => setStep(2)} className="w-full gap-2 bg-purple-600 hover:bg-purple-700">
                      {t.next} <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-red-700 text-sm">{t.bedsFull}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Guest Info ── */}
        {step === 2 && (
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">{t.step2}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="name">{t.name} *</Label>
                  <Input id="name" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder={t.namePlaceholder} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email">{t.email} *</Label>
                  <Input id="email" type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder={t.emailPlaceholder} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone">{t.phone} *</Label>
                  <Input id="phone" type="tel" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder={t.phonePlaceholder} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="nationality">{t.nationality} *</Label>
                  <Select value={guestNationality} onValueChange={setGuestNationality}>
                    <SelectTrigger id="nationality">
                      <SelectValue placeholder={t.nationalityPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {NATIONALITIES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="requests">{t.requests}</Label>
                  <Textarea id="requests" value={specialRequests} onChange={e => setSpecialRequests(e.target.value)} placeholder={t.requestsPlaceholder} rows={3} />
                </div>
              </CardContent>
            </Card>

            <PriceSummary />

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> {t.back}
              </Button>
              <Button onClick={() => setStep(3)} disabled={!canSubmit} className="flex-1 gap-2 bg-purple-600 hover:bg-purple-700">
                {t.next} <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Review & Confirm ── */}
        {step === 3 && range?.from && range?.to && (
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">{t.reviewTitle}</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><p className="text-muted-foreground">{t.checkIn}</p><p className="font-semibold">{format(range.from, "d MMM yyyy")}</p></div>
                  <div><p className="text-muted-foreground">{t.checkOut}</p><p className="font-semibold">{format(range.to, "d MMM yyyy")}</p></div>
                  <div><p className="text-muted-foreground">{t.duration}</p><p className="font-semibold">{nights} {t.nights}</p></div>
                  <div><p className="text-muted-foreground">{t.guests}</p><p className="font-semibold">{guests}</p></div>
                </div>
                <hr />
                <div className="grid grid-cols-2 gap-2">
                  <div><p className="text-muted-foreground">{t.name}</p><p className="font-semibold">{guestName}</p></div>
                  <div><p className="text-muted-foreground">{t.email}</p><p className="font-semibold break-all">{guestEmail}</p></div>
                  <div><p className="text-muted-foreground">{t.phone}</p><p className="font-semibold">{guestPhone}</p></div>
                  <div><p className="text-muted-foreground">{t.nationality}</p><p className="font-semibold">{guestNationality}</p></div>
                </div>
                {specialRequests && (
                  <div><p className="text-muted-foreground">{t.requests}</p><p className="italic">{specialRequests}</p></div>
                )}
              </CardContent>
            </Card>

            <PriceSummary />

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <p className="font-medium">{t.cancelPolicy}</p>
              <p className="text-xs mt-1">{t.cancelPolicyText}</p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> {t.back}
              </Button>
              <Button onClick={submitBooking} disabled={submitting} className="flex-1 gap-2 bg-purple-600 hover:bg-purple-700">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />{t.processing}</> : t.confirm}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
