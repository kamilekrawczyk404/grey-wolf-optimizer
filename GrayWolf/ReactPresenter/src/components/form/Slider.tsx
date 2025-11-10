import React, { ComponentProps } from "react";
import { layoutColors } from "../../colors";
import RangeInput from "./RangeInput";

const Slider = ({
  disabled,
  title,
  id,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  className = "",
}: ComponentProps<"input"> & { value: number; min: number; max: number }) => {
  return (
    <div className={`w-full flex flex-col gap-1 ${className}`}>
      <div className={"flex justify-between"}>
        <label
          htmlFor={id}
          className={`text-xs font-[500] ${layoutColors.neutral.text.dark}`}
        >
          {title?.toUpperCase()}
        </label>
        <span className={`font-mono text-xs`}>
          {value}ms
        </span>
      </div>
      <RangeInput
        step={step}
        disabled={disabled}
        onChange={onChange}
        min={min}
        max={max}
        value={value}
      />

      <div
        className={`flex justify-between items-center ${layoutColors.neutral.text.dark}`}
      >
        <span className={"text-xs"}>{min}</span>
        <span className={"text-xs"}>{max}</span>
      </div>
    </div>
  );
};

export default Slider;
