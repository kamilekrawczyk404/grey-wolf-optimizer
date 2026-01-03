import React, { ComponentProps } from "react";
import { layoutColors } from "../../colors";

const NumberInput = ({
  disabled,
  title,
  id,
  value,
  onChange,
  className = "",
  ...props
}: ComponentProps<"input">) => {
  return (
    <div className={`relative w-full flex flex-col gap-1 ${className}`}>
      <label
        htmlFor={id}
        className={`text-xs font-[500] ${layoutColors.neutral.text.dark}`}
      >
        {title?.toUpperCase()}
      </label>
      <input
        disabled={disabled}
        type={"number"}
        id={id}
        className={`focus:outline-none focus:border-cyan-700 rounded-md px-2 h-8 border-[2px] disabled:saturate-0 transition-all ${layoutColors.neutral.background.primary} ${layoutColors.cyan.border.primary} ${layoutColors.cyan.text.primary}`}
        value={value}
        onChange={onChange}
        {...props}
      />
    </div>
  );
};

export default NumberInput;
