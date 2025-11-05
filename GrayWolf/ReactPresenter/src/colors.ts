type ColorType = {
  light?: string;
  primary: string;
  dark?: string;
};

type Colors = {
  cyan: {
    text: ColorType;
    border: ColorType;
    background: ColorType;
  };
  neutral: {
    text: ColorType;
    border: ColorType;
    background: ColorType;
  };
};

export const layoutColors: Colors = {
  cyan: {
    text: {
      light: "text-cyan-500",
      primary: "text-cyan-600",
      dark: "text-cyan-700",
    },
    border: {
      light: "border-cyan-600 hover:border-cyan-400",
      primary: "border-cyan-700 hover:border-cyan-500",
      dark: "border-cyan-900 hover:border-cyan-700",
    },
    background: {
      light: "bg-cyan-800",
      primary: "bg-cyan-900",
      dark: "bg-cyan-950",
    },
  },
  neutral: {
    text: {
      light: "text-neutral-300",
      primary: "text-neutral-400",
      dark: "text-neutral-500",
    },
    border: {
      light: "border-neutral-600",
      primary: "border-neutral-700",
      dark: "border-neutral-900",
    },
    background: {
      light: "bg-neutral-800",
      primary: "bg-neutral-900",
      dark: "bg-neutral-950",
    },
  },
};
