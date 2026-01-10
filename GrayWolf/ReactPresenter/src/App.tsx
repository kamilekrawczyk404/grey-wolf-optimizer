import "./App.css";
import { Toaster } from "sonner";
import Presenter from "./components/Presenter";
import {MultiTabTestRunner} from "@/components/Tester/MultiTabTestRunner";
import {NavigationTab, useNavigationStore} from "@/stores/navigation-store";
import {cn} from "@/lib/utils";
import {useTestStore} from "@/stores/test-store";

export type AnimationStatus = { isCompleted: boolean; isRunning: boolean };

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
  const { activeTab } = useTestStore()
  const  { activeNavigationTab, setNavigationTab } = useNavigationStore()

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
                className={cn(
                    'px-4 py-2 rounded',
                    activeNavigationTab === tab  ? "bg-cyan-600 text-white"
                        : "bg-neutral-700 text-neutral-300"
                )}
                onClick={() => setNavigationTab(tab as NavigationTab)}
            >
              {values.displayName}
            </button>
        ))}
      </div>

      {Object.entries(TAB_LABELS).map(([tab, values]) => {
        if (tab === activeNavigationTab)
          switch (tab) {
            case NavigationTab.Test:
            case NavigationTab.Comparison:
              return <MultiTabTestRunner key={tab}/>

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
