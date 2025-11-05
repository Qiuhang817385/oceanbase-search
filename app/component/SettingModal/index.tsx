import React, { ReactNode, useState } from 'react'
import { Col, Modal, Row, Select, Slider } from 'antd'

type SettingModalProps = {
  open: boolean
  setOpen: (open: boolean) => void
  onSuccess?: (params: { hybridRadio: number; selectedTable: string }) => void
  title?: ReactNode
  children?: ReactNode
  okText?: string
  cancelText?: string
  closable?: boolean
  maskClosable?: boolean
  width?: number | string
}

const SettingModal: React.FC<SettingModalProps> = ({
  open,
  setOpen,
  onSuccess,
  title = '设置',
  okText = '确定',
  cancelText = '取消',
  closable = true,
  maskClosable = true,
  width = 420,
}) => {
  const [hybridRadio, setHybridRadio] = useState(0.7)
  const [selectedTable, setSelectedTable] = useState('movies')

  const handleOk = async () => {
    if (onSuccess) {
      await onSuccess({
        hybridRadio,
        selectedTable,
      })
    }
    setOpen(false)
  }

  const handleCancel = () => {
    setOpen(false)
  }

  return (
    <Modal
      open={open}
      onOk={handleOk}
      styles={{
        content: {
          width: '450px',
        },
      }}
      onCancel={handleCancel}
      title={title}
      okText={okText}
      cancelText={cancelText}
      closable={closable}
      maskClosable={maskClosable}
      width={width}
      destroyOnClose
    >
      <Row>
        <Col span={24}>
          <span>混合搜索权重: {hybridRadio}</span>
          <Slider
            max={1}
            min={0}
            step={0.1}
            onChange={(v) => setHybridRadio(v)}
            value={hybridRadio}
          />
        </Col>
        <Col span={24}>
          <Select
            placeholder="选择查询表"
            options={[
              {
                label: 'movies',
                value: 'movies',
              },
              {
                label: 'chinese_movies',
                value: 'chinese_movies',
              },
            ]}
            onChange={(value) => setSelectedTable(value)}
          />
        </Col>
      </Row>
    </Modal>
  )
}

export default SettingModal
