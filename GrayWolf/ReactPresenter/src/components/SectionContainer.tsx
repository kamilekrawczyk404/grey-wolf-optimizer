import React, { ComponentProps } from "react";
import { layoutColors } from "../colors";

const SectionContainer = ({
  header,
  children,
  ...props
}: ComponentProps<"div"> & { header: string }) => {
  return (
    <div
      {...props}
      className={`space-y-2 border-[1px] p-2 rounded-lg ${layoutColors.neutral.border.primary}`}
    >
      <h2 className={`text-xl font-[500] ${layoutColors.neutral.text.light}`}>
        {header}
      </h2>
      {children}
    </div>
  );
};

export default SectionContainer;
