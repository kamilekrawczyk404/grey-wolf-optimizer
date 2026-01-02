import React, {
  ComponentProps,
  Dispatch,
  ReactNode,
  SetStateAction,
  useRef,
} from "react";
import { CanvasConfig, Wolf } from "./GwoCanvas";
import { hexToRgbConverter } from "../../utils/colorConverter";
import SectionContainer from "../SectionContainer";
import { layoutColors } from "../../colors";
import Slider from "../form/Slider";
import NumberInput from "../form/NumberInput";
import WolfColorSelector from "../form/WolfColorSelector";
import SolutionColorInput from "../form/SolutionColorInput";

type CanvasConfigConfigureProps = {
  config: CanvasConfig;
  updateConfig: Dispatch<SetStateAction<CanvasConfig>>;
  isRunning: boolean;
  iterations: number;
};
const CanvasConfigConfigure = ({
  iterations,
  config,
  updateConfig,
  isRunning,
}: CanvasConfigConfigureProps) => {
  return (
    <div>
      <SectionContainer header={"Canvas configuration panel"}>
        <div className={"grid lg:grid-cols-3 grid-cols-1 gap-2"}>
          <Section title={"Animation"}>
            <Slider
              disabled={isRunning}
              id={"animation-duration"}
              title={"Duration"}
              min={1}
              max={1000}
              step={1}
              value={config.animationDuration}
              onChange={(e) =>
                updateConfig((prev) => ({
                  ...prev,
                  animationDuration: parseFloat(e.target.value),
                }))
              }
            />
            <NumberInput
              disabled={isRunning}
              id={"animation-visible-iterations"}
              title={"Visible iterations"}
              min={1}
              max={iterations}
              value={config.visibleIterations}
              onChange={(e) =>
                updateConfig((prev) => ({
                  ...prev,
                  visibleIterations: parseInt(e.target.value),
                }))
              }
            />
          </Section>
          <Section title={"Grid"}>
            <NumberInput
              disabled={isRunning}
              id={"grid-lines"}
              title={"Lines"}
              value={config.gridLines}
              onChange={(e) =>
                updateConfig((prev) => ({
                  ...prev,
                  gridLines: parseInt(e.target.value),
                }))
              }
            />
          </Section>
          <Section title={"Solution"}>
            <NumberInput
              disabled={isRunning}
              id={"solution-size"}
              title={"Size"}
              value={config.solutionSize}
              onChange={(e) =>
                updateConfig((prev) => ({
                  ...prev,
                  solutionSize: parseInt(e.target.value),
                }))
              }
            />
            <div className={"w-full flex flex-col gap-1"}>
              <span
                className={`text-xs uppercase font-[500] ${layoutColors.neutral.text.dark}`}
              >
                Color
              </span>
              <SolutionColorInput
                disabled={isRunning}
                colorValue={config.colors.solution}
                onChange={(rgbColor) =>
                  updateConfig((prev) => ({
                    ...prev,
                    colors: { ...prev.colors, solution: rgbColor },
                  }))
                }
              />
            </div>
          </Section>
        </div>
        <Section title={"Wolfs"} className={"lg:!flex-row"}>
          <div className={"basis-1/3 w-full items-start"}>
            <NumberInput
              disabled={isRunning}
              id={"wolf-size"}
              title={"Size"}
              value={config.wolfRadius}
              onChange={(e) =>
                updateConfig((prev) => ({
                  ...prev,
                  wolfRadius: parseInt(e.target.value),
                }))
              }
            />
          </div>
          <div className={"basis-2/3 flex flex-col w-full gap-1"}>
            <span
              className={`text-xs inline-block uppercase font-[500] ${layoutColors.neutral.text.dark}`}
            >
              Colors
            </span>
            <div className={"grid lg:grid-cols-4 grid-cols-2 gap-2"}>
              {Object.keys(config.colors.wolfs).map((wolfType) => (
                <WolfColorSelector
                  disabled={isRunning}
                  key={wolfType}
                  wolfType={wolfType as Wolf}
                  colorValue={config.colors.wolfs[wolfType as Wolf]}
                  onColorChange={(rgbColor) =>
                    updateConfig((prev) => ({
                      ...prev,
                      colors: {
                        ...prev.colors,
                        wolfs: { ...prev.colors.wolfs, [wolfType]: rgbColor },
                      },
                    }))
                  }
                />
              ))}
            </div>
          </div>
        </Section>
      </SectionContainer>
    </div>
  );
};

const Section = ({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={`p-2 w-full space-y-1 rounded-md  ${layoutColors.neutral.background.light}`}
  >
    <p className={`mb-1 ${layoutColors.neutral.text.primary}`}>{title}</p>
    <div className={`flex flex-col gap-2 items-center ${className}`}>
      {children}
    </div>
  </div>
);

export default CanvasConfigConfigure;
