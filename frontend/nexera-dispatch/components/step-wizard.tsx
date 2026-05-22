'use client';

interface StepWizardProps {
  steps: string[];
  currentStep: number;
  children: React.ReactNode;
}

export function StepWizard({ steps, currentStep, children }: StepWizardProps) {
  return (
    <div className="space-y-8">
      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {steps.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border ${
              i < currentStep
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : i === currentStep
                ? 'border-indigo-400 text-indigo-400'
                : 'border-border text-muted-foreground'
            }`}>
              {i < currentStep ? '✓' : i + 1}
            </div>
            <span className={`text-xs ${i === currentStep ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              {label}
            </span>
            {i < steps.length - 1 && <div className="w-8 h-px bg-border mx-1" />}
          </div>
        ))}
      </div>
      {children}
    </div>
  );
}
