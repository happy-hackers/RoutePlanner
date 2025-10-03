import { Button, Modal } from "antd"

interface Props {
  isOpen: boolean
  description: string
  actionText: string
  cancelText: string
  onConfirm: () => void
  onCancel: () => void
}

const ActionConfirmModal = ({ isOpen, description, onConfirm, onCancel, actionText, cancelText }: Props) => {

  return (
    <Modal
      open={isOpen}
      footer={null}
      onCancel={onCancel}
    >
      <div style={{ margin: 10, justifyContent: "center", alignItems: "center", display: "flex", flexDirection: "column", height: 150 }}>
        <div>{description}</div>
        <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-around", marginTop: 50, width: "100%" }}>
          <Button color="primary" variant="solid" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button color="primary" variant="solid" onClick={onConfirm}>
            {actionText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default ActionConfirmModal
