import { Upload, App } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { useTranslation } from 'react-i18next';

const { Dragger } = Upload;

interface FileUploaderProps {
  selectedFile: File | null;
  onFileSelect: (file: File) => void;
}

export default function FileUploader({ selectedFile, onFileSelect }: FileUploaderProps) {
  const { t } = useTranslation('upload');
  const keyPath = "fileUploader";
  const { message } = App.useApp();

  const props: UploadProps = {
    name: "file",
    multiple: false,
    showUploadList: false,
    beforeUpload: (file) => {
      const isJson = file.type === "application/json" || file.name.endsWith(".json");
      const isCsv = file.type === "text/csv" || file.name.endsWith(".csv");

      if (!isJson && !isCsv) {
        message.error(t(`${keyPath}.error_file_type`));
        return Upload.LIST_IGNORE;
      }

      onFileSelect(file);
      message.success(t(`${keyPath}.success_file_select`));
      return Upload.LIST_IGNORE;
    },
  };

  return (
    <>
      <Dragger {...props}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">
          {t(`${keyPath}.text_drag_prompt`)}
        </p>
        <p className="ant-upload-hint">
          {t(`${keyPath}.text_hint`)}
        </p>
      </Dragger>
      {selectedFile && (
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <p style={{ color: "#52c41a" }}>
            {t(`${keyPath}.text_selected_file`)}: {selectedFile.name}
          </p>
        </div>
      )}
    </>
  );
}