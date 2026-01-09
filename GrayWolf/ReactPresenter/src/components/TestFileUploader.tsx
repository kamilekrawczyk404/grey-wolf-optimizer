import React, { ChangeEvent, useEffect, useRef, useState } from "react";
import SecondaryHeader from "./headers/SecondaryHeader";
import { layoutColors } from "../colors";
import {isExperimentRecord, ExperimentRecord} from "../types/types";
import useFileUploader from "../hooks/fileUploader";
import {CardTitle} from "@/components/ui/card";
import {InfoBanner} from "@/components/ui/info-banner";
import {Separator} from "@/components/ui/separator";

type TestFileUploaderProps = {
  onSingleFileLoaded: (tests: ExperimentRecord[], isLast: boolean) => any;
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

            onSingleFileLoaded(parsedFile, ++i === files.length);
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
            "text-red-700 px-2 bg-red-500/15 w-fit mx-auto rounded-md mt-2"
          }
        >
          Cannot parse selected file to test format.
        </p>
      )}
      <div
        className={`text-xs text-muted-foreground`}
      >
        <InfoBanner className={'py-2 px-4 text-nowrap w-fit'} title={'Accepted format'}>
          <span>application/json</span>
        </InfoBanner>
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
