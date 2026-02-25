import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

export default function LoadingScreen() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-hostel-background flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t.validatingLink}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
