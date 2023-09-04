import Html2canvas from 'html2canvas';
import { createWatermarkBase64 } from './tools';
import { PADDING } from '../constants';

const handleTitle = (ele: HTMLElement, filename: string) => {
  // 文档标题
  const title = document.createElement('div');
  title.setAttribute('class', 'q-title');
  title.setAttribute(ele.firstElementChild?.attributes[2]?.name || 'data-', '');
  title.style.fontSize = '32px';
  title.style.fontWeight = '700';
  title.innerText = filename;
  ele.firstElementChild?.remove();
  ele.prepend(title);
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
// 删除cursor
const removeCursor = (cloneEle: HTMLElement) =>
  cloneEle
    .querySelectorAll('.ProseMirror-yjs-cursor')
    .forEach((cursor) => cursor.parentElement?.removeChild(cursor));
function cleanHtml(ele: HTMLElement, filename: string) {
  const selectElements = ele.querySelectorAll('select');
  selectElements.forEach((sel) => (sel.style.display = 'none'));
  handleTitle(ele, filename);
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
  removeCursor(warp);
  return {
    warp,
    cleanHtmlRecover: () => {
      warp.remove();
    },
  };
}
/** 克隆节点 */
const cloneElement = (selector: HTMLElement | string) => {
  const ele =
    typeof selector === 'string'
      ? (document.querySelector(selector) as HTMLElement)
      : selector;
  if (!ele) return;

  const cloneEle = ele.cloneNode(true) as HTMLElement;
  const { width, height } = ele.getBoundingClientRect();
  cloneEle.style.width = `${width}px`;
  cloneEle.style.height = `${height}px`;
  cloneEle.style.padding = `${PADDING}px`;
  cloneEle.style.border = 'none';
  cloneEle.style.boxShadow = 'none';
  return cloneEle;
};
/** 去除点赞和评论 */
const cleanLikesAndComment = (
  ele: HTMLElement,
  clearElementClass = ['editor-comment', 'editor-likes'],
  textNode?: HTMLElement
) => {
  clearElementClass.forEach((className) => {
    const likesOrCommentDOM = ele.querySelector(`.${className}`);
    const { height } = document
      .querySelector(`.${className}`)
      ?.getBoundingClientRect() || {
      height: 0,
    };
    ele.style.height = parseFloat(ele.style.height) - height + 'px';
    likesOrCommentDOM?.parentElement?.removeChild(likesOrCommentDOM);
  });
  if (textNode) {
    const commentDOM = ele.querySelector(`.editor-comment`) as HTMLElement;
    commentDOM.style.marginTop = '0'; // 20
    commentDOM.style.padding = '0';
    commentDOM.prepend(textNode);
    ele.style.height = parseFloat(ele.style.height) - (28 + 96 + 20) + 'px';
  }
};
/**
 * 导出图片
 * @param selector 导出图片对应的元素
 * @param filename 导出后文件名称
 * @param needWatermark 是否需要水印
 * @returns Promise
 */
export function exportAsImg(
  selector: HTMLElement | string,
  filename: string,
  needWatermark: undefined | boolean
) {
  const cloneEle = cloneElement(selector);
  if (!cloneEle) return Promise.reject();
  // 水印
  if (needWatermark) {
    const base64 = createWatermarkBase64('水印');
    cloneEle.style.backgroundImage = `url('${base64}')`;
  }
  cleanLikesAndComment(cloneEle);

  const { warp, cleanHtmlRecover } = cleanHtml(cloneEle, filename);

  return new Promise<void>((resolve) => {
    Html2canvas(warp, {
      useCORS: true,
      scale: window.devicePixelRatio * 2, // 增加清晰度
    })
      .then((canvas) => {
        const a = document.createElement('a');
        const event = new MouseEvent('click');
        a.download = filename;
        a.href = canvas.toDataURL('image/jpg');
        a.dispatchEvent(event);
      })
      .finally(() => {
        cleanHtmlRecover();
        resolve();
      });
  });
}
