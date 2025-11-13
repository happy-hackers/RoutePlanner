import { Alert } from "antd";
import { useTranslation } from 'react-i18next';

export default function UploadInstructions() {
  const { t } = useTranslation('upload'); 
  const keyPath = "autoFillControls"; 

  return (
    <Alert
      message={t(`${keyPath}.upload_instructions_title`)}
      description={
        <div>
          <p>{t(`${keyPath}.upload_instructions_desc1`)}</p>
          <p style={{ marginTop: 8, marginBottom: 0 }}>
            <strong>{t(`${keyPath}.upload_instructions_date_label`)}:</strong> {t(`${keyPath}.upload_instructions_date_format_text1`)} <strong>YYYY-MM-DD</strong> {t(`${keyPath}.upload_instructions_date_format_text2`)} (e.g., 2025-01-20). {t(`${keyPath}.upload_instructions_date_rejection`)}
          </p>
        </div>
      }
      type="info"
      showIcon
      style={{ marginBottom: 16 }}
    />
  );
}