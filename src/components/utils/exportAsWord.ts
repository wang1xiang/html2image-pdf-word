import Html2canvas from 'html2canvas';
import JsPDF from 'jspdf';
import { asBlob } from 'html-docx-js-typescript';
import { saveAs } from 'file-saver';
import { createWatermarkBase64 } from './tools';

/** padding */
const PADDING = 90;
/** a4纸的尺寸 */
enum A4_PAPER_SIZE_ENUM {
  'width' = 595.28,
  'height' = 841.89,
}

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
// 克隆节点
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
const createCommentText = () => {
  const text = document.createElement('h2');
  text.innerText = '引用原文评论：';
  text.style.marginTop = '40px';
  text.style.borderBottom = '1px solid #F5F5F5';
  return text;
};
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
export function exportAsPdf(
  selector: HTMLElement | string,
  filename: string,
  needComment: undefined | boolean
) {
  const cloneEle = cloneElement(selector);
  if (!cloneEle) return Promise.reject();
  if (!needComment) cleanLikesAndComment(cloneEle);
  // 添加引用原文评论：
  if (needComment) {
    const textNode = createCommentText();
    cleanLikesAndComment(cloneEle, ['editor-likes'], textNode);
  }
  const { warp, cleanHtmlRecover } = cleanHtml(cloneEle, filename);

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

// 图片处理
const handleImage = (ele: HTMLElement, cloneEle: HTMLElement) => {
  const imgClass =
    '.ProseMirror img:not(.ProseMirror-separator):not(.resizer-img):not(.image-err)[src]';
  const a4Width = A4_PAPER_SIZE_ENUM.width - 140; // word 默认A4纸宽度 - 页边距
  const imgs = ele.querySelectorAll(imgClass);
  const cloneImgs = cloneEle.querySelectorAll(imgClass);

  cloneEle.querySelectorAll('.ProseMirror img').forEach((item) => {
    if (
      !['ProseMirror-separator', 'image-err', 'resizer-img'].includes(
        item.className
      )
    )
      return;
    item.parentElement?.removeChild(item);
  });

  imgs.forEach((img, index: number) => {
    if (!cloneImgs[index]) return;
    if (img.clientWidth >= a4Width) {
      cloneImgs[index].setAttribute('width', a4Width.toString());
      const a4ImgHeight = (a4Width / img.clientWidth) * img.clientHeight;
      cloneImgs[index].setAttribute('height', a4ImgHeight.toString());
    } else {
      cloneImgs[index].setAttribute('width', img.clientWidth.toString());
      cloneImgs[index].setAttribute('height', img.clientHeight.toString());
    }
  });
};
// word中图片下面会出现一个白框
const removeWhiteBox = (cloneEle: HTMLElement) => {
  const separators: NodeListOf<Element> = cloneEle.querySelectorAll(
    '.ProseMirror-separator'
  );
  separators.forEach((separator) =>
    separator.parentElement?.removeChild(separator)
  );
};
// 表格虚线 向右偏移10px左右
const handleTableStyle = (cloneEle: HTMLElement) => {
  cloneEle.querySelectorAll('table').forEach((table) => {
    table.style.borderCollapse = table.style.borderCollapse || 'collapse';
    table.border = table.border || '1';
    table.style.marginLeft = '10px';
  });
};
// 标题高度和字体失效 需要设置lineHeight和fontWeight
const handleLevelStyle = (cloneEle: HTMLElement) => {
  Array.from({ length: 6 }).forEach((_, index) =>
    (
      cloneEle.querySelectorAll(`h${index + 1}`) as unknown as HTMLElement[]
    ).forEach((h) => {
      h.innerText = (h.children[0] as HTMLElement).innerText;
      h.style.fontSize = '';
    })
  );
};
// 处理脑图 脑图导出word有问题 直接通过html2canvas将脑图转换为图片 导出图片即可
const handleMind = async (ele: HTMLElement, cloneEle: HTMLElement) => {
  const mindDOM = ele.querySelectorAll(
    `.mind-snapshot`
  ) as unknown as HTMLElement[];
  const promise = [...mindDOM].map((mind) =>
    Html2canvas(mind.firstChild as HTMLElement)
  );
  const result = await Promise.allSettled(promise);
  const copyMindDOM = cloneEle.querySelectorAll(
    `.ProseMirror-mind-node-wrapper`
  ) as unknown as HTMLElement[];
  result.forEach((item, index) => {
    const { status, value } = item as any;
    if (status === 'fulfilled') {
      const img = document.createElement('img');
      img.src = value.toDataURL('image/jpg');
      const parent = copyMindDOM[index].parentElement as HTMLElement;
      copyMindDOM[index].insertAdjacentElement('beforebegin', img);
      parent.removeChild(copyMindDOM[index]);
    }
  });
};
// 列表处理
const handleUlStyle = (cloneEle: HTMLElement, uiLevel: number) => {
  const changeTask2P = (
    div: HTMLElement | Element,
    parent?: HTMLElement | Element
  ) => {
    const p = document.createElement('p');
    p.innerHTML = div.innerHTML;
    parent
      ? parent.insertAdjacentElement('afterend', p)
      : div.insertAdjacentElement('afterend', p);
    return p;
  };
  const changeDiv2Ul = (
    div: HTMLElement | Element,
    uiLevel: number,
    parent?: HTMLElement | Element
  ) => {
    const kind = div.getAttribute('data-list-kind');
    let liOrp: HTMLParagraphElement | HTMLLIElement | null = null;
    // 根据checkbox或列表生成不同的标签
    if (kind === 'task') {
      liOrp = changeTask2P(div, parent);
    } else {
      const ul =
        kind === 'ordered'
          ? document.createElement('ol')
          : document.createElement('ul');
      liOrp = document.createElement('li');
      !parent && (ul.style.margin = '0');
      liOrp.innerHTML = div.innerHTML;
      ul.appendChild(liOrp);
      // 将ul添加到后面
      parent
        ? parent.insertAdjacentElement('beforebegin', ul)
        : div.insertAdjacentElement('beforebegin', ul);
    }
    div.parentElement?.removeChild(div);

    liOrp.querySelectorAll('.list-marker').forEach((marker) => {
      if (kind === 'task') {
        const span = document.createElement('span');
        span.innerHTML = `<span style="color:#333333; font-family:'Wingdings 2'; font-size:11pt"></span>`;
        marker.insertAdjacentElement('beforebegin', span);
      }
      marker.parentElement?.removeChild(marker);
    });
    liOrp.querySelectorAll('.list-content').forEach((content) => {
      const span = document.createElement('span');
      span.innerHTML =
        (content.firstChild as HTMLElement)?.innerHTML || '<li></li>';
      liOrp &&
        (liOrp.style.textAlign = (
          content.firstChild as HTMLElement
        )?.style?.textAlign);
      content.insertAdjacentElement('beforebegin', span);

      const innerFlatList = content.querySelectorAll(
        `.prosemirror-flat-list[data-list-level="${uiLevel}"]`
      );
      if (innerFlatList.length) {
        uiLevel++;
        innerFlatList.forEach((div) => changeDiv2Ul(div, uiLevel, content));
      }
      content.parentElement?.removeChild(content);
    });
  };
  const flatList = cloneEle.querySelectorAll(
    `.prosemirror-flat-list[data-list-level="${uiLevel}"]`
  );
  uiLevel++;
  flatList.forEach((div) => changeDiv2Ul(div, uiLevel));
};
// 处理附件 直接改为链接跳转到对应的段落
const handleAttachStyle = (cloneEle: HTMLElement) => {
  cloneEle.querySelectorAll('.attachment-node-wrap').forEach((attach) => {
    const title = `请至One文档查看附件《${attach.getAttribute('name')}》`;
    const anchorId = attach.parentElement?.getAttribute('data-id');
    const a = document.createElement('a');
    a.target = '_blank';
    a.href = `${location.href}&anchor=${anchorId}`;
    a.innerHTML = `<span>${title}</span>`;

    attach.insertAdjacentElement('beforebegin', a);
    attach.parentElement?.removeChild(attach);
  });
};
// 处理附件 直接改为链接跳转到对应的段落
const handleIframeStyle = (cloneEle: HTMLElement) => {
  cloneEle.querySelectorAll('.iframe-container').forEach((iframe) => {
    const anchorId = iframe?.getAttribute('data-id');
    const a = document.createElement('a');
    a.target = '_blank';
    a.href = `${location.href}&anchor=${anchorId}`;
    a.innerHTML = '<span>请至One文档查看多维表</span>';

    iframe.insertAdjacentElement('beforebegin', a);
    iframe.parentElement?.removeChild(iframe);
  });
};
// 获取远程css资源 转为text文本
const handleCssStream = async (result: Response) => {
  if (!result.body) return '';
  const reader = result.body.getReader();
  const stream = await new ReadableStream({
    start(controller) {
      // The following function handles each data chunk
      function push() {
        // "done" is a Boolean and value a "Uint8Array"
        reader.read().then(({ done, value }) => {
          // If there is no more data to read
          if (done) {
            controller.close();
            return;
          }
          // Get the data and send it to the browser via the controller
          controller.enqueue(value);
          // Check chunks by logging to the console
          push();
        });
      }
      push();
    },
  });
  const text = await new Response(stream, {
    headers: { 'Content-Type': 'text/html' },
  }).text();
  return text;
};
/**
 * 处理css
 * 线上环境 <link rel="stylesheet" type="text/css" href="/css/365.f542e1fc.css">
 * 本地环境 <style type="text/css">
 */
const handleCss = async () => {
  const styles = document.head.querySelectorAll('style');
  const links = document.head.querySelectorAll('link[type="text/css"]');
  const remoteCSSPromise = [...links].map((link) => fetch((link as any).href));
  const remoteCSSResult = await Promise.allSettled(remoteCSSPromise);

  const remoteCSSStreamPromise = remoteCSSResult.map((item) => {
    const { status, value } = item as any;
    if (status === 'fulfilled') return handleCssStream(value);
  });
  const remoteCSSStreamResult = await Promise.allSettled(
    remoteCSSStreamPromise
  );
  console.log('remoteCSSStreamResult', remoteCSSStreamResult);
  const cssText = remoteCSSStreamResult.map((item) => {
    const { status, value } = item as any;
    if (status === 'fulfilled') return value;
  });
  styles.forEach((css) => cssText.push(css.innerHTML));
  return cssText;
};
const handleStyle = async (ele: HTMLElement, cloneEle: HTMLElement) => {
  const uiLevel = 1;
  handleImage(ele, cloneEle);
  removeWhiteBox(cloneEle);
  handleTableStyle(cloneEle);
  handleLevelStyle(cloneEle);
  removeCursor(cloneEle);
  await handleMind(ele, cloneEle);

  handleUlStyle(cloneEle, uiLevel);

  handleAttachStyle(cloneEle);
  handleIframeStyle(cloneEle);

  const cssText = await handleCss();
  console.log(cssText, 'cssText');
  const cssString = cssText
    .join('')
    // 过滤UI原来的样式
    .replace(/li:before/g, 'xxx_li:before')
    .replace(/\.ul/g, '.xxx_ul')
    .replace(/\.li/g, '.xxx_li')
    .replace(/\.ol/g, '.xxx_ol')
    // .replace(/\.ProseMirror \> ul/g, '.xxx_ul')
    // .replace(/\.ProseMirror \> ol/g, '.xxx_ol')
    // .replace(/\.ProseMirror \> li/g, '.xxx_li')
    .replace(/\.ProseMirror ul/g, '.xxx_ul')
    .replace(/\.ProseMirror ol/g, '.xxx_ol')
    .replace(/\.ProseMirror li/g, '.xxx_li');
  console.log(cssString, 'cssString');
  const innerHtml = cloneEle.innerHTML
    // strong在word中不生效问题
    .replace(/<strong>/g, '<b>')
    .replace(/<\/strong>/g, '</b>')
    // 背景色不生效问题
    .replace(/<mark/g, '<span')
    .replace(/<\/mark>/g, '</span>')
    // 将上面生成的多个ul/ol组成一个
    .replace(/<\/ol><ol.*?>/g, '')
    .replace(/<\/ul><ul.*?>/g, '');
  // 最终生成的html字符串
  const htmlString = `<!DOCTYPE html>
      <html lang="en">
      <head>
      <style type="text/css">${cssString}</style> 
      </head>
      <body>
      <div id="q-editor">
      ${innerHtml}
      </div>
      </body>
      </html>`;
  return htmlString;
};
export function exportAsDocx(selector: HTMLElement | string, filename: string) {
  const ele =
    typeof selector === 'string'
      ? (document.querySelector(selector) as HTMLElement)
      : selector;
  if (!ele) return Promise.reject();

  // eslint-disable-next-line no-async-promise-executor
  return new Promise<void>(async (resolve) => {
    const cloneEle = ele.cloneNode(true) as HTMLElement;
    cleanLikesAndComment(cloneEle);
    handleTitle(cloneEle, filename);
    const htmlString = await handleStyle(ele, cloneEle);
    const margins = { top: 1440 };

    asBlob(htmlString, { margins }).then((data) => {
      saveAs(data as Blob, filename + '.docx');
      resolve();
    });
  });
}
