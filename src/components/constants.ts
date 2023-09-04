import { ButtonType } from './types';
import { exportAsImg } from './utils/exportAsImage';
import { exportAsPdf } from './utils/exportAsPdf';
import { exportAsDocx } from './utils/exportAsWord';

/** 导出按钮 */
export const exportButtons: ButtonType[] = [
  {
    key: 'image',
    label: '图片',
    action: exportAsImg,
  },
  {
    key: 'pdf',
    label: 'Pdf',
    action: exportAsPdf,
  },
  {
    key: 'docx',
    label: 'Word',
    action: exportAsDocx,
  },
];

/** a4纸的尺寸 */
export enum A4_PAPER_SIZE_ENUM {
  'width' = 595.28,
  'height' = 841.89,
}
