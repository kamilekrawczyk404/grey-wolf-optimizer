import React, { ChangeEvent, useEffect, useRef, useState } from "react";
import SecondaryHeader from "./headers/SecondaryHeader";
import { layoutColors } from "../colors";
import { isOptimizationTestArray, OptimizationTest } from "../types/types";
import useFileUploader from "../hooks/fileUploader";

const getSolutionPointFromTestDesc = (description: string): number[] =>  {
  console.log(description);
  const regex = /w punkcie \[([^\]]+)\]/;
  const match = description.match(regex);

  if (match && match[1]) {
    console.log(":D -> ", match[1].toString().split(","))
    return match[1].toString().split(",").map(e => parseFloat(e)).slice(0,2);
  } else {
    // return default value
    return [0,0];
  }
}

type TestsNotFoundProps = {
  onSingleFileLoaded: (tests: OptimizationTest[], isLast: boolean) => any;
};

const TestsNotFound = ({ onSingleFileLoaded }: TestsNotFoundProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { files, uploadFile, clearList } = useFileUploader();
  const [isInvalidType, setIsInvalidType] = useState<boolean>(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const userFiles = e.target.files;

    if (!userFiles) return;

    for (let i = 0; i < userFiles.length; i++) {
      uploadFile(userFiles[i]);
    }
  };

  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    const parseTestsFile = async () => {
      clearList();
      setIsInvalidType(false);

      try {
        if (files) {
          let i = 0;

          for await (const file of files) {
            const text = await file.text();
            const parsedFile = JSON.parse(text);

            if (!isOptimizationTestArray(parsedFile)) {
              setIsInvalidType(true);
              break;
            }

            // find solution inside description
            const updatedFile = (parsedFile as OptimizationTest[]).map(f => ({
              ...f,
              properties: {
                ...f.properties,
                solution: getSolutionPointFromTestDesc(f.properties.benchmarkFunction)
              }
            }));

            onSingleFileLoaded(updatedFile, ++i === files.length);
          }
        }
      } catch (error) {
        setIsInvalidType(true);
        console.error(`Error: ${error}`);
      }
    };

    parseTestsFile();
  }, [files, onSingleFileLoaded]);

  return (
    <div
      className={"relative w-full h-full content-center text-center min-h-64"}
    >
      <SecondaryHeader accent>Tests not found!</SecondaryHeader>
      <p>
        Open your desired file by{" "}
        <button
          onClick={openFileSelector}
          className={`hover:underline ${layoutColors.cyan.text.light}`}
        >
          clicking here
        </button>
        .
      </p>
      {isInvalidType && (
        <p
          className={
            "text-red-700 px-2 bg-red-500/15 w-fit mx-auto rounded-md mt-2"
          }
        >
          Cannot parse selected file to test format.
        </p>
      )}
      <span
        className={`absolute bottom-1 left-1/2 -translate-x-1/2 text-xs ${layoutColors.neutral.text.dark}`}
      >
        Accepted format:{" "}
        <span
          className={`inline-block border-[1px] px-1 h-5 rounded-md ${layoutColors.neutral.text.primary} ${layoutColors.cyan.border.dark}`}
        >
          application/json
        </span>
      </span>

      <input
        ref={fileInputRef}
        onChange={handleFileChange}
        type={"file"}
        accept={"application/json"}
        multiple
        className={"hidden"}
      />
    </div>
  );
};

export default TestsNotFound;
