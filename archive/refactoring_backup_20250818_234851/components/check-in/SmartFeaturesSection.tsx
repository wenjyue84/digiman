import { useAccommodationLabels } from "@/hooks/useAccommodationLabels";

export default function SmartFeaturesSection() {
  const labels = useAccommodationLabels();

  return (
    <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
      <h4 className="text-sm font-medium text-blue-800 mb-2">✨ Smart Features:</h4>
      <ul className="text-xs text-blue-700 space-y-1">
        <li>• Auto-incrementing guest names (Guest1, Guest2...)</li>
        <li>• Gender-based {labels.lowerSingular} assignment (Front for males, Back for females)</li>
        <li>• Quick payment presets: RM45, RM48, RM650 (Monthly)</li>
        <li>• Admin form: Only name, capsule & payment required</li>
      </ul>
    </div>
  );
}