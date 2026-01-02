import React from "react";
import { HeaderProps } from "../../types/types";
import { layoutColors } from "../../colors";

const SecondaryHeader = ({
  children,
  accent = false,
  ...props
}: HeaderProps) => (
  <h1
    {...props}
    className={`text-lg ${accent ? `${layoutColors.cyan.text.light}` : ""}`}
  >
    {children}
  </h1>
);

export default SecondaryHeader;
