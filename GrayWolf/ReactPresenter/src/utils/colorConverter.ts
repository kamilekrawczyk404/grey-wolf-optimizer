export const hexToRgbConverter = (hexValue: string): {r: number, g: number, b: number} => {
  const r = parseInt(hexValue.slice(1, 3), 16),
    g = parseInt(hexValue.slice(3, 5), 16),
    b = parseInt(hexValue.slice(5, 7), 16);

  return { r, g, b }
};

export const addAlphaToRgb = (rgbValue: string, alpha = 1) => {
  let sliced: string;

  if (rgbValue.includes("rgba")) {
    sliced = rgbValue.substring(
      rgbValue.indexOf("(") + 1,
      rgbValue.lastIndexOf(","),
    );
  } else {
    sliced = rgbValue.substring(rgbValue.indexOf("(") + 1, rgbValue.length - 1);
  }

  return `rgba(${sliced}, ${alpha})`;
};
