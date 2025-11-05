import React, { useRef } from "react";
import { layoutColors } from "../../colors";
import { hexToRgbConverter } from "../../utils/colorConverter";

const SolutionColorInput = ({
  disabled,
  colorValue,
  onChange,
}: {
  colorValue: string;
  onChange: (rgbValue: string) => any;
  disabled: boolean;
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div
      className={`flex items-center px-2 h-8 border-[2px] transition-all rounded-md ${
        disabled ? "saturate-0" : ""
      } ${layoutColors.neutral.background.primary} ${
        layoutColors.cyan.border.primary
      }`}
      onClick={() => inputRef?.current?.click()}
    >
      <div
        style={{ backgroundColor: colorValue }}
        className={"relative w-4 aspect-square"}
      >
        <div
          className={`absolute w-[5px] aspect-square ${layoutColors.neutral.background.primary}`}
        />
        <div
          className={`absolute end-0 w-[5px] aspect-square ${layoutColors.neutral.background.primary}`}
        />
        <div
          className={`absolute bottom-0 start-0 w-[5px] aspect-square ${layoutColors.neutral.background.primary}`}
        />
        <div
          className={`absolute bottom-0 end-0 w-[5px] aspect-square ${layoutColors.neutral.background.primary}`}
        />
      </div>
      <input
        disabled={disabled}
        ref={inputRef}
        type={"color"}
        value={colorValue}
        onChange={(e) => onChange(hexToRgbConverter(e.target.value))}
        className={"invisible h-0 w-0"}
      />
    </div>
  );
};

export default SolutionColorInput;
