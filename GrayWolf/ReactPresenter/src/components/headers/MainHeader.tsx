import React from "react";
import { HeaderProps } from "../../types/types";

const MainHeader = ({ children, accent = false, ...props }: HeaderProps) => (
  <h1
    {...props}
    className={`text-2xl font-light ${accent ? "text-orange-500" : ""}`}
  >
    {children}
  </h1>
);

export default MainHeader;
