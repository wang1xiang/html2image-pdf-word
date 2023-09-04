import { ButtonProps } from 'antd';

export type ButtonType = {
  key: 'image' | 'pdf' | 'docx';
  label: string;
  action: (
    selector: string | HTMLElement,
    filename: string,
    needWatermark?: boolean | undefined
  ) => Promise<void>;
} & ButtonProps;
