import Html2canvas from 'html2canvas';
import JsPDF from 'jspdf';
import { cleanHtml, cloneElement } from './tools';
import { A4_PAPER_SIZE_ENUM } from '../constants';

const generatePDF = (canvas: HTMLCanvasElement, filename: string) => {
  // html页面生成的canvas在pdf中图片的宽高
  const contentWidth = canvas.width;
  const contentHeight = canvas.height;
  // 一页pdf显示html页面生成的canvas高度
  const pageHeight =
    (contentWidth / A4_PAPER_SIZE_ENUM.width) * A4_PAPER_SIZE_ENUM.height;
  // 未生成pdf的html页面高度
  let leftHeight = contentHeight;
  // 页面偏移
  let position = 0;
  const imgWidth = A4_PAPER_SIZE_ENUM.width;
  const imgHeight = (A4_PAPER_SIZE_ENUM.width / contentWidth) * contentHeight;
  const pageData = canvas.toDataURL('image/jpeg', 1.0);
  const PDF = new JsPDF('p', 'pt', 'a4');

  // 当内容未超过pdf一页显示的范围，无需分页
  if (leftHeight < pageHeight) {
    // addImage(pageData, 'JPEG', 左，上，宽度，高度)设置
    PDF.addImage(pageData, 'JPEG', 0, 0, imgWidth, imgHeight);
  } else {
    // 超过一页时，分页打印（每页高度841.89）
    while (leftHeight > 0) {
      PDF.addImage(pageData, 'JPEG', 0, position, imgWidth, imgHeight);
      leftHeight -= pageHeight;
      position -= A4_PAPER_SIZE_ENUM.height;
      if (leftHeight > 0) {
        PDF.addPage();
      }
    }
  }
  PDF.save(filename + '.pdf');
};

/**
 * 导出pdf
 * @param selector 导出pdf对应的元素
 * @param filename 导出后文件名称
 * @returns Promise
 */
export function exportAsPdf(selector: HTMLElement | string, filename: string) {
  const cloneEle = cloneElement(selector);
  if (!cloneEle) return Promise.reject();
  const { warp, cleanHtmlRecover } = cleanHtml(cloneEle);

  return new Promise<void>((resolve) => {
    Html2canvas(warp, {
      useCORS: true,
      scale: window.devicePixelRatio * 2, // 增加清晰度
    })
      .then((canvas) => generatePDF(canvas, filename))
      .finally(() => {
        cleanHtmlRecover();
        resolve();
      });
  });
}
