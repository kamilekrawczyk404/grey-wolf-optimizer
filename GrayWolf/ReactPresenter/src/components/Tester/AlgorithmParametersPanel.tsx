import React from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlgorithmParameterInfo, AlgorithmParameters } from "@/types/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AlgorithmParametersPanelProps {
  parameters: AlgorithmParameterInfo[];
  values: AlgorithmParameters;
  onChange: (values: AlgorithmParameters) => void;
  disabled?: boolean;
}

export function AlgorithmParametersPanel({
  parameters,
  values,
  onChange,
  disabled = false,
}: AlgorithmParametersPanelProps) {
  if (parameters.length === 0) {
    return null; // Nie pokazuj nic jeśli algorytm nie ma parametrów
  }

  const handleValueChange = (paramName: string, newValue: number) => {
    onChange({
      ...values,
      [paramName]: newValue,
    });
  };

  return (
    <Card className="bg-neutral-900 border-neutral-800">
      <CardHeader>
        <CardTitle className="text-neutral-100">Algorithm Parameters</CardTitle>
        <CardDescription className="text-neutral-400">
          Customize algorithm-specific parameters
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {parameters.map((param) => {
          const currentValue = values[param.name] ?? param.defaultValue;

          return (
            <div key={param.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={param.name} className="text-neutral-300">
                  {param.description}
                </Label>
                <Input
                  id={`${param.name}-input`}
                  type="number"
                  value={currentValue}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val >= param.min && val <= param.max) {
                      handleValueChange(param.name, val);
                    }
                  }}
                  step={param.step}
                  min={param.min}
                  max={param.max}
                  disabled={disabled}
                  className="w-20 h-8 bg-neutral-800 border-neutral-700 text-white text-sm"
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-neutral-500 font-mono min-w-[40px] text-right">
                  {param.min}
                </span>
                <Slider
                  id={param.name}
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  value={[currentValue]}
                  onValueChange={(vals) =>
                    handleValueChange(param.name, vals[0])
                  }
                  disabled={disabled}
                  className="flex-1"
                />
                <span className="text-xs text-neutral-500 font-mono min-w-[40px]">
                  {param.max}
                </span>
              </div>

              <p className="text-xs text-neutral-500 italic">
                Default: {param.defaultValue}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
