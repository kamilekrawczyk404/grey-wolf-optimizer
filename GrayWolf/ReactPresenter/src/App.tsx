import {ReactNode, useState} from "react";
import "./App.css";
//import Parameters from "./components/Tester/Parameters";
import { Toaster } from "sonner";
import Presenter from "./components/Presenter";
import {MultiAlgorithmConfigurationForm} from "@/components/Tester/MultiAlgorithmConfigurationForm";
import {MultiTabTestRunner} from "@/components/Tester/MultiTabTestRunner";

export type AnimationStatus = { isCompleted: boolean; isRunning: boolean };

export enum NavigationTab {
  Test = "test",
  Presenter = "presenter",
  Comparison = "comparison"
}

export const TAB_LABELS: Record<NavigationTab, {displayName: string}> = {
  [NavigationTab.Test]: {
    displayName: "Test",
  },
  [NavigationTab.Comparison]: {
    displayName: "Comparison",
  },
  [NavigationTab.Presenter]: {
    displayName: "Presenter",
  }
}

function App() {
  //stan zak�adek
  const [activeTab, setActiveTab] = useState<NavigationTab>(NavigationTab.Test);

  return (
    <div
      className={
        "relative bg-neutral-950 w-full min-h-screen flex flex-col items-center justify-start p-4"
      }
    >
      {/* Zak�adki */}
      <div className="flex gap-4 mb-4">
        {Object.entries(TAB_LABELS).map(([tab, values]) => (
            <button
                key={tab}
                className={`px-4 py-2 rounded ${
                    activeTab === tab
                        ? "bg-cyan-600 text-white"
                        : "bg-neutral-700 text-neutral-300"
                }`}
                onClick={() => setActiveTab(tab as NavigationTab)}
            >
              {values.displayName}
            </button>
        ))}
      </div>

      {Object.entries(TAB_LABELS).map(([tab, values]) => {
        if (tab === activeTab)
          switch (tab) {
            case NavigationTab.Test:
            case NavigationTab.Comparison:
              return <MultiTabTestRunner key={tab} activeNavigationTab={activeTab}/>

            case NavigationTab.Presenter:
              return <Presenter key={tab} />
          }
      })}

      {/* <TestResultsModal /> */}
      <Toaster position="bottom-right" theme="dark" richColors />
    </div>
  );
}

export default App;
