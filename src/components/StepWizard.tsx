import React from 'react';
import { ArrowLeft, ArrowRight } from "lucide-react";

// --- Refactor steps to include Start and Complete (unnumbered) ---
const steps = [
  { label: "File Upload", key: "start", numbered: false, icon: "start" },
  { label: "Document Ingestion", numbered: true },
  { label: "Information Extraction", numbered: true },
  { label: "Report Refinement", numbered: true }, // Combined Initial + Refinement
  { label: "Cause & Consequence Analysis", numbered: true }, // Combined steps 5+6
  { label: "Risk Evaluation", numbered: true },
  { label: "Hazard Identification", numbered: true },
  { label: "Protection Strategy Development", numbered: true },
  { label: "Risk Analysis", key: "complete", numbered: false, icon: "complete" },
];

interface StepWizardProps {
  currentStep: number; // 0-based index
  completedSteps: number;
  onStepChange: (step: number) => void;
  resetKey?: any; // Optional: force StepWizard to reset
}

export default function StepWizard({ currentStep, completedSteps, onStepChange, resetKey }: StepWizardProps) {
  // --- Add navigation state for custom arrows ---
  const [scrollIndex, setScrollIndex] = React.useState(0);

  // Reset pagination when resetKey changes
  React.useEffect(() => {
    setScrollIndex(0);
  }, [resetKey]);

  const visibleSteps = 4; // Show 4 steps at a time for navigation
  const maxIndex = Math.max(0, steps.length - visibleSteps);
  const startIdx = scrollIndex;
  const endIdx = Math.min(steps.length, scrollIndex + visibleSteps);
  const stepsToShow = steps.slice(startIdx, endIdx);

  // Helper function to calculate the correct step number
  const getStepNumber = (idx: number) => {
    // Count how many numbered steps come before this one
    let count = 0;
    for (let i = 0; i < idx; i++) {
      if (steps[i]?.numbered) {
        count++;
      }
    }
    // Return the 1-based number
    return count + 1;
  };

  return (
    <nav className={`w-full flex justify-center mb-6 overflow-x-hidden`}>
      <div className="flex items-center w-full max-w-4xl relative">
        {/* Left Arrow */}
        {scrollIndex > 0 && (
          <button
            aria-label="Previous steps"
            className="p-2 mr-2 absolute left-0 z-10 bg-white shadow rounded-full border"
            onClick={() => setScrollIndex(Math.max(0, scrollIndex - 1))}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <ol className={`flex flex-row gap-2 w-full justify-center overflow-hidden`}>
          {stepsToShow.map((step, idx) => {
            const realIdx = idx + startIdx;
            return (
              <li key={step.key || step.label} className="flex-1 min-w-[120px]">
                <button
                  type="button"
                  onClick={() => realIdx <= completedSteps && onStepChange(realIdx)}
                  disabled={realIdx > completedSteps}
                  className={`flex flex-col items-center text-xs font-medium px-2 py-1 rounded transition-colors w-full
                    ${realIdx === currentStep
                      ? "bg-blue-600 text-white shadow"
                      : realIdx < currentStep
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-400"}
                    ${realIdx <= completedSteps ? "cursor-pointer" : "cursor-not-allowed"}
                  `}
                >
                  {/* Show number only for numbered steps; show Start/Complete icon otherwise */}
                  {step.numbered ? (
                    <span className="mb-1">
                      {/* Calculate step number dynamically */}
                      {getStepNumber(realIdx)}
                    </span>
                  ) : (
                    <span className="mb-1 font-bold">{step.icon === "start" ? "Start" : step.icon === "complete" ? "Complete" : null}</span>
                  )}
                  <span>{step.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
        {/* Right Arrow */}
        {scrollIndex < maxIndex && (
          <button
            aria-label="Next steps"
            className="p-2 ml-2 absolute right-0 z-10 bg-white shadow rounded-full border"
            onClick={() => setScrollIndex(Math.min(maxIndex, scrollIndex + 1))}
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </nav>
  );
}
