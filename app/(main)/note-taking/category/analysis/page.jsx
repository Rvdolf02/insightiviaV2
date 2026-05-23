import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import Analysis from "../../_components/analysis";

export default function AnalysisPage() {
  return (
    // We wrap the client component in Suspense here to handle useSearchParams()
    <Suspense 
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <Analysis />
    </Suspense>
  );
}