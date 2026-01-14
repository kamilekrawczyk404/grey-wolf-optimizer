import React, { Dispatch, SetStateAction } from "react";
import { hexToRgbConverter } from "../../utils/colorConverter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
    Settings2,
    MonitorPlay,
    Grid3X3,
    Palette,
    Circle,
    Crown,
    Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import {CanvasConfig} from "@/components/canvas/GwoCanvas";
import {Separator} from "@/components/ui/separator";

const rgbToHex = (color: { r: number; g: number; b: number }) => {
    const toHex = (c: number) => {
        const hex = c.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    };

    return "#" + toHex(color.r) + toHex(color.g) + toHex(color.b);
};

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

    const handleColorChange = (
        category: 'solution' | 'leader' | 'follower',
        hexColor: string
    ) => {
        const rgb = hexToRgbConverter(hexColor);

        updateConfig((prev) => {
            if (category === 'solution') {
                return { ...prev, colors: { ...prev.colors, solution: rgb } };
            }

            return {
                ...prev,
                colors: {
                    ...prev.colors,
                    agents: {
                        ...prev.colors.agents,
                        [category]: rgb
                    }
                }
            };
        });
    };

    return (
        <Card className="bg-neutral-900 border-neutral-800 h-fit">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Settings2 size={'1.25rem'} />
                    Canvas Configuration
                </CardTitle>
            </CardHeader>

            <CardContent className="flex sm:flex-row flex-col gap-4">
                <div className="space-y-3 flex-1">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                        <MonitorPlay className="text-blue-400" size={'1rem'}/> Animation Settings
                    </h4>

                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <Label className="text-xs text-neutral-400">Duration (ms)</Label>
                                <span className="text-xs text-neutral-300 font-mono">{config.animationDuration}ms</span>
                            </div>
                            <Slider
                                disabled={isRunning}
                                min={1}
                                max={1000}
                                step={10}
                                value={[config.animationDuration]}
                                onValueChange={(vals) =>
                                    updateConfig((prev) => ({...prev, animationDuration: vals[0]}))
                                }
                                className="[&_.bg-primary]:bg-blue-500"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs text-neutral-400">Visible Iterations</Label>
                            <Input
                                type="number"
                                disabled={isRunning}
                                min={1}
                                max={iterations}
                                value={config.visibleIterations}
                                onChange={(e) => updateConfig(prev => ({
                                    ...prev,
                                    visibleIterations: parseInt(e.target.value)
                                }))}
                                className="h-8 bg-neutral-950 border-neutral-800 text-xs"
                            />
                        </div>
                    </div>
                </div>

                <div className={'sm:block hidden'}>
                    <Separator orientation={'vertical'}/>
                </div>

                <div className={'sm:hidden block'}>
                    <Separator orientation={'horizontal'}/>
                </div>

                <div className="space-y-3 flex-1">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Palette className="text-purple-400" size={'1rem'}/> Visuals
                    </h4>

                    <div
                        className="grid grid-cols-[1fr_auto] gap-4 items-center p-2 rounded-md border border-neutral-800 bg-neutral-950/30">
                        <div className="space-y-1">
                            <Label className="text-xs text-white flex items-center gap-2">
                                <Circle className="h-3 w-3 text-green-400 fill-green-400"/>
                                Best Solution
                            </Label>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-neutral-500 uppercase">Size</span>
                                <Input
                                    type="number"
                                    disabled={isRunning}
                                    value={config.solutionSize}
                                    onChange={(e) => updateConfig(prev => ({
                                        ...prev,
                                        solutionSize: parseInt(e.target.value)
                                    }))}
                                    className="h-6 w-16 bg-neutral-900 border-neutral-800 text-[10px] px-1"
                                />
                            </div>
                        </div>
                        <ColorPicker
                            color={rgbToHex(config.colors.solution)}
                            onChange={(hex) => handleColorChange('solution', hex)}
                            disabled={isRunning}
                        />
                    </div>

                    <div
                        className="grid grid-cols-[1fr_auto] gap-4 items-center p-2 rounded-md border border-neutral-800 bg-neutral-950/30">
                        <div className="space-y-1">
                            <Label className="text-xs text-white flex items-center gap-2">
                                <Crown className="h-3 w-3 text-yellow-400 fill-yellow-400"/>
                                Leader Agents
                            </Label>
                            <p className="text-[10px] text-neutral-500">
                                Agents with isLeader: true
                            </p>
                        </div>
                        <ColorPicker
                            color={rgbToHex(config.colors.agents.leader)}
                            onChange={(hex) => handleColorChange('leader', hex)}
                            disabled={isRunning}
                        />
                    </div>

                    <div
                        className="grid grid-cols-[1fr_auto] gap-4 items-center p-2 rounded-md border border-neutral-800 bg-neutral-950/30">
                        <div className="space-y-1">
                            <Label className="text-xs text-white flex items-center gap-2">
                                <Users className="h-3 w-3 text-neutral-400"/>
                                Follower Agents
                            </Label>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-neutral-500 uppercase">Radius</span>
                                <Input
                                    type="number"
                                    disabled={isRunning}
                                    value={config.agentRadius}
                                    onChange={(e) => updateConfig(prev => ({
                                        ...prev,
                                        agentRadius: parseInt(e.target.value)
                                    }))}
                                    className="h-6 w-16 bg-neutral-900 border-neutral-800 text-[10px] px-1"
                                />
                            </div>
                        </div>
                        <ColorPicker
                            color={rgbToHex(config.colors.agents.follower)}
                            onChange={(hex) => handleColorChange('follower', hex)}
                            disabled={isRunning}
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Label className="text-xs text-neutral-400">Heatmap transparency</Label>
                            <span className="text-xs text-neutral-300 font-mono">{config.heatmapTransparency}</span>
                        </div>
                        <Slider
                            disabled={isRunning}
                            min={0}
                            max={1}
                            step={0.01}
                            value={[config.heatmapTransparency]}
                            onValueChange={(vals) =>
                                updateConfig((prev) => ({...prev, heatmapTransparency: vals[0]}))
                            }
                            className="[&_.bg-primary]:bg-blue-500"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

const ColorPicker = ({
                         color,
                         onChange,
                         disabled
                     }: {
    color: string,
    onChange: (val: string) => void,
    disabled: boolean
}) => {
    return (
        <div className="relative group">
            <div
                className={cn(
                    "w-8 h-8 rounded-full border border-neutral-700 shadow-sm cursor-pointer transition-transform hover:scale-105",
                    disabled && "opacity-50 cursor-not-allowed hover:scale-100"
                )}
                style={{backgroundColor: color}}
            >
                <input
                    type="color"
                    disabled={disabled}
                    value={color}
                    onChange={(e) => onChange(e.target.value)}
                    className="opacity-0 w-full h-full cursor-pointer absolute inset-0"
                />
            </div>
        </div>
    );
};

export default CanvasConfigConfigure;