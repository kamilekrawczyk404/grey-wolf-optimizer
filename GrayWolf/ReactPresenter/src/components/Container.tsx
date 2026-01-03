import React, { ComponentProps } from "react";

const Container = ({
  children,
  className = "",
  ...props
}: ComponentProps<"div">) => {
  return (
    <div className={`bg-neutral-900 p-4 rounded-lg ${className}`} {...props}>
      {children}
    </div>
  );
};

export default Container;
