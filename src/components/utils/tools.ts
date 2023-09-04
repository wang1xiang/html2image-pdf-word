/**
 * 生成水印
 * @returns base64
 */
export const createWatermarkBase64 = (watermark: string) => {
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
};

/** 克隆节点 */
export const cloneElement = (selector: HTMLElement | string) => {
  const ele =
    typeof selector === 'string'
      ? (document.querySelector(selector) as HTMLElement)
      : selector;
  if (!ele) return;

  const cloneEle = ele.cloneNode(true) as HTMLElement;
  const { width, height } = ele.getBoundingClientRect();
  cloneEle.style.width = `${width}px`;
  cloneEle.style.height = `${height}px`;
  cloneEle.style.border = 'none';
  cloneEle.style.boxShadow = 'none';
  return cloneEle;
};
// 处理文字中换行的背景色
const handleMarkTag = (ele: HTMLElement) => {
  const markElements = ele.querySelectorAll('mark');
  for (const sel of markElements) {
    const { height } = sel.getBoundingClientRect();
    let parentElement = sel.parentElement;
    while (parentElement?.tagName !== 'P') {
      parentElement = parentElement?.parentElement as HTMLElement;
    }
    const { height: parentHeight } = (
      parentElement as unknown as HTMLElement
    ).getBoundingClientRect();
    // mark的高度没有超过p标签的一半时 则没有换行
    if (height < parentHeight / 2) continue;
    // 超过一半时说明换行了 将<mark>测试文案</mark>替换为<mark>测</mark><mark>试</mark><mark>文</mark><mark>案</mark>
    const innerText = sel.innerText;
    const outHtml = sel.outerHTML;
    let newHtml = '';
    innerText.split('')?.forEach((text) => {
      newHtml += outHtml.replace(innerText, text);
    });
    sel.outerHTML = newHtml;
  }
};

/** 对克隆DOM做一些处理 */
export const cleanHtml = (ele: HTMLElement) => {
  const selectElements = ele.querySelectorAll('select');
  selectElements.forEach((sel) => (sel.style.display = 'none'));
  handleMarkTag(ele);

  const warp = document.createElement('div');
  // 图片、pdf导出背景色不是白色
  warp.style.position = 'absolute';
  warp.style.top = '0';
  warp.style.left = '0';
  warp.style.background = '#fff';
  warp.style.zIndex = '-1';
  warp.append(ele);
  document.body.append(warp);
  return {
    warp,
    cleanHtmlRecover: () => {
      warp.remove();
    },
  };
};
