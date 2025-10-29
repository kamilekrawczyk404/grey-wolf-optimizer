import { useCallback, useState } from "react";

const useFileUploader = () => {
  const [files, setFiles] = useState<File[] | null>(null);

  const uploadFile = useCallback((file: File) => {
    setFiles((prev) => (prev?.length ? [...prev, file] : [file]));
  }, []);

  const clearList = useCallback(() => {
    setFiles(null);
  }, []);

  return { files, clearList, uploadFile };
};

export default useFileUploader;
