import React, { useEffect, useState } from "react";
import ItemsCarousel from "./ItemsCarousel";
import { OptimizationTest } from "../types/types";
import { layoutColors } from "../colors";
import SectionContainer from "./SectionContainer";

type TestsPreviewProps = {
    tests: OptimizationTest[];
    onTestChange?: (test: OptimizationTest) => void;
    isRunning?: boolean;
};
const TestsPreview = ({
  tests,
  onTestChange,
  isRunning,
}: TestsPreviewProps) => {
  const testTitles = tests.map((t) => t.description);

  const [selectedTestIndex, setSelectedTestIndex] = useState<number>(0);

  const selectedTest = tests[selectedTestIndex];

  const { history, ...restProperties } = {
    ...selectedTest.properties,
  };

  useEffect(() => {
    if (onTestChange) {
        onTestChange(tests[selectedTestIndex]);
    }
  }, [selectedTestIndex, onTestChange, tests]);

  return (
    <div className={"flex flex-col w-full h-full space-y-2 justify-between"}>
      <ItemsCarousel
        className={`relative items-end h-12 border-[1px] divide-x divide-neutral-700 rounded-lg ${layoutColors.neutral.border.primary}`}
        items={testTitles}
        onIndexChange={(index) => {
          if (isRunning) return;
          setSelectedTestIndex(index);
        }}
        renderItem={(item, index) => (
          <div
            className={`px-2 h-12 items-center min-w-32 max-w-48 border-b-2 cursor-pointer transition-all text-nowrap text-ellipsis overflow-hidden place-content-center ${
              index === selectedTestIndex
                ? `${layoutColors.neutral.text.light} ${layoutColors.neutral.background.light} ${layoutColors.cyan.border.light}`
                : `${layoutColors.neutral.text.dark}`
            }`}
            title={item}
          >
            {item}
          </div>
        )}
      />
      <SectionContainer header={"Optimization parameters"}>
        <div className={"flex flex-wrap gap-2"}>
          {Object.entries(restProperties).map(([property, value]) => (
            <Parameter
              key={property}
              title={property}
              value={
                ["solution", "bestSolution"].includes(property)
                  ? (value as number[]).map((n) =>( Math.round(n * 10000) / 10000).toString()).join(", ")
                  : property === 'benchmarkFunction'
                        ? (value as string).substring(0, (value as string).indexOf(' '))
                        : (value as number)
              }
            />
          ))}
        </div>
      </SectionContainer>
    </div>
  );
};

const Parameter = ({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) => {
  return (
    <div
      className={`flex flex-col gap-1 rounded-md p-2 transition-all ${layoutColors.neutral.background.light}`}
    >
      <span
        className={`text-xs font-[400] uppercase ${layoutColors.neutral.text.primary}`}
      >
        {title.split("").map((l) => (l === l.toUpperCase() ? ` ${l}` : l))}
      </span>
      <span className={`font-semibold text-md ${layoutColors.cyan.text.light}`}>
        {value}
      </span>
    </div>
  );
};

export default TestsPreview;
