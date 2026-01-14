import React, { ChangeEvent, useEffect, useRef, useState } from "react";
import {isExperimentRecord, ExperimentRecord, UserLocalFile, BenchmarkFunctions} from "../types/types";
import useFileUploader from "../hooks/fileUploader";
import {CardTitle} from "@/components/ui/card";

type TestFileUploaderProps = {
  onSingleFileLoaded: (tests: UserLocalFile, isLast: boolean) => any;
};

const TestFileUploader = ({ onSingleFileLoaded }: TestFileUploaderProps) => {
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

            if (!isExperimentRecord(parsedFile)) {
              setIsInvalidType(true);
              break;
            }

            // Format benchmark function name

            const functionName = parsedFile.properties.benchmarkFunction;
            const formattedFunctionName = functionName.indexOf(" ") === -1
                    ? functionName as BenchmarkFunctions
                    : functionName.substring(0, functionName.indexOf(' ')) as BenchmarkFunctions;

            if (!Object.keys(BenchmarkFunctions).includes(formattedFunctionName)) {
              setIsInvalidType(true);
              break;
            }

            const formattedFile: UserLocalFile = {
              ...parsedFile,
              properties: {
                ...parsedFile.properties,
                benchmarkFunction: formattedFunctionName
              }
            }

            // Extract algorithm name
            onSingleFileLoaded(formattedFile, ++i === files.length);
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
      className={"relative w-full h-full min-h-64 flex flex-col gap-4 justify-center"}
    >
      <CardTitle>
        Open your desired file by{" "}
        <button
          onClick={openFileSelector}
          className={`hover:underline text-blue-400`}
        >
          clicking here
        </button>
        .
      </CardTitle>
      {isInvalidType && (
        <p
          className={
            "text-red-700 px-2 py-1 bg-red-700/10 border border-red-700/30 w-fit mx-auto rounded-md text-xs"
          }
        >
          Cannot parse selected file to test format.
        </p>
      )}
      <div
        className={`text-xs text-muted-foreground border rounded-md px-2 py-1 bg-blue-900/10 border-blue-900/30 mx-auto`}
      >
        Accepted format: <span className={'text-blue-400/70'}>application/json</span>
      </div>

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

export default TestFileUploader;
