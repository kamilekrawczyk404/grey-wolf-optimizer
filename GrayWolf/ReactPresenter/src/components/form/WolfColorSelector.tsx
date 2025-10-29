import { Wolf } from "../canvas/GwoCanvas";
import React, { useRef } from "react";
import { layoutColors } from "../../colors";
import { hexToRgbConverter } from "../../utils/colorConverter";

const WolfColorSelector = ({
  disabled,
  wolfType,
  colorValue,
  onColorChange,
}: {
  disabled: boolean;
  wolfType: Wolf;
  colorValue: string;
  onColorChange: (rgbColor: string) => any;
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div
      className={`relative cursor-pointer flex border-[2px] items-center justify-between rounded-md px-2 h-8 transition-all ${
        disabled ? "saturate-0" : ""
      } ${layoutColors.cyan.border.primary} ${
        layoutColors.neutral.background.primary
      }`}
      onClick={() => inputRef?.current?.click()}
    >
      <p className={`text-xs font-[500] ${layoutColors.cyan.text.primary}`}>
        {wolfType.charAt(0).toUpperCase() + wolfType.slice(1)}
      </p>
      <div
        style={{ backgroundColor: colorValue }}
        className={`w-4 rounded-full border-[1px] aspect-square ${layoutColors.neutral.border.light}`}
      />
      <input
        disabled={disabled}
        ref={inputRef}
        className={
          "invisible absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        }
        type={"color"}
        value={colorValue}
        onChange={(e) => onColorChange(hexToRgbConverter(e.target.value))}
      />
    </div>
  );
};

export default WolfColorSelector;
