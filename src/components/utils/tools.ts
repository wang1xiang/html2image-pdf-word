/**
 * 生成水印
 * @returns base64
 */
export function createWatermarkBase64(watermark: string) {
  const defaultObj = {
    text: watermark,
    angle: 25,
    color: 'rgba(0,0,0,.08)',
    fontSize: '14px',
    top: 30,
  };

  // 角度转成负数
  defaultObj.angle = -Math.abs(defaultObj.angle);

  // 创建画布
  const canvas = document.createElement('canvas');
  // 设置画布的长、宽
  canvas.width = 160;
  canvas.height = 120;

  const context = canvas.getContext('2d') as CanvasRenderingContext2D;
  // 旋转角度（以弧度计）
  context.rotate((defaultObj.angle * Math.PI) / 180);
  context.font = `200 ${defaultObj.fontSize} 微软雅黑`;
  // 设置填充绘画的颜色、渐变或者模式
  context.fillStyle = defaultObj.color;
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillText(defaultObj.text, 0, canvas.height);
  return canvas.toDataURL('image/png');
}
