import React, { ComponentProps } from "react";

const RangeInput = ({
  disabled,
  min,
  max,
  step,
  id,
  value,
  onChange,
  ...props
}: ComponentProps<"input"> & { value: number; max: number }) => {
  return (
    <div className={"relative w-full"}>
      <input
        {...props}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        type={"range"}
        id={id}
        value={value}
        onChange={onChange}
        className={
          "h-2 w-full cursor-pointer appearance-none bg-transparent rounded-md disabled:saturate-0"
        }
      />
      <div
        style={{
          width: `${(value / (max || 1)) * 100}%`,
        }}
        className={`absolute top-1/2 h-1 rounded-md left-0 bg-cyan-500 ${
          disabled ? "saturate-0" : ""
        }`}
      />
    </div>
  );
};

export default RangeInput;
