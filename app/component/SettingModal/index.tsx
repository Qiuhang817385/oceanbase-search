import React, { ReactNode, useState } from 'react'
import { Col, Modal, Row, Select, Slider, Collapse, Space } from 'antd'
import Code from '@leafygreen-ui/code'

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
  sqlTexts?: {
    vectorSearch?: string
    hybridSearch?: string
    fullTextSearch?: string
    tokenize?: string
  }
  tokenizeArray?: string[]
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
  sqlTexts,
  tokenizeArray,
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
          width: '750px',
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
          <Space direction="vertical" style={{ width: '100%' }}>
            <span>混合搜索权重: {hybridRadio}</span>
            <Slider
              style={{ width: '70%' }}
              max={1}
              min={0}
              step={0.1}
              onChange={(v) => setHybridRadio(v)}
              value={hybridRadio}
            />
          </Space>
        </Col>
        <Col span={24}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <span>选择查询表: {selectedTable}</span>
            <Select
              style={{ width: '70%' }}
              value={selectedTable}
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
                {
                  label: 'chinese_movies_rewritten',
                  value: 'chinese_movies_rewritten',
                },
              ]}
              onChange={(value) => setSelectedTable(value)}
            />
          </Space>
        </Col>
        {sqlTexts && (
          <Col span={24} style={{ marginTop: 16 }}>
            <Collapse
              items={[
                {
                  key: 'vector-search',
                  label: '向量搜索 SQL',
                  children: sqlTexts.vectorSearch ? (
                    <div style={{ marginTop: 8 }}>
                      <Code language="sql" showLineNumbers>
                        {sqlTexts.vectorSearch}
                      </Code>
                    </div>
                  ) : (
                    <span style={{ color: '#999' }}>暂无 SQL</span>
                  ),
                },
                {
                  key: 'hybrid-search',
                  label: '混合搜索 SQL',
                  children: sqlTexts.hybridSearch ? (
                    <div style={{ marginTop: 8 }}>
                      <Code language="sql" showLineNumbers>
                        {sqlTexts.hybridSearch}
                      </Code>
                    </div>
                  ) : (
                    <span style={{ color: '#999' }}>暂无 SQL</span>
                  ),
                },
                {
                  key: 'full-text-search',
                  label: '全文搜索 SQL',
                  children: sqlTexts.fullTextSearch ? (
                    <div style={{ marginTop: 8 }}>
                      <Code language="sql" showLineNumbers>
                        {sqlTexts.fullTextSearch}
                      </Code>
                    </div>
                  ) : (
                    <span style={{ color: '#999' }}>暂无 SQL</span>
                  ),
                },
                {
                  key: 'tokenize',
                  label: '分词 SQL',
                  children: sqlTexts.tokenize ? (
                    <div style={{ marginTop: 8 }}>
                      <Code language="sql" showLineNumbers>
                        {sqlTexts.tokenize}
                      </Code>
                      <span>分词结果: {tokenizeArray?.join(' ')}</span>
                    </div>
                  ) : (
                    <span style={{ color: '#999' }}>暂无 SQL</span>
                  ),
                },
              ]}
            />
          </Col>
        )}
      </Row>
    </Modal>
  )
}

export default SettingModal
