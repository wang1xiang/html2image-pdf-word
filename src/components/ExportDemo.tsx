import { Button } from 'antd';
import { exportButtons } from './constants';
import classNames from 'classnames/bind';
import styles from './exportDemo.module.scss';
import { ButtonType } from './types';
const cx = classNames.bind(styles);

const PrimaryButton = (param: ButtonType) => {
  const { key, label } = param;
  return (
    <Button type="primary" key={key} style={{ marginRight: 4 }}>
      导出{label}
    </Button>
  );
};
const ExportButton = exportButtons.map((btn) => PrimaryButton(btn));
console.log(ExportButton);
const ExportDemo = () => {
  return <div className={cx('title')}>{ExportButton}</div>;
};

export default ExportDemo;
