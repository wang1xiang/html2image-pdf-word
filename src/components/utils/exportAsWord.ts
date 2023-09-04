import Html2canvas from 'html2canvas';
import { asBlob } from 'html-docx-js-typescript';
import { saveAs } from 'file-saver';
import { A4_PAPER_SIZE_ENUM } from '../constants';

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
// eslint-disable-next-line
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
  // handleLevelStyle(cloneEle);
  await handleMind(ele, cloneEle);

  handleUlStyle(cloneEle, uiLevel);

  handleAttachStyle(cloneEle);
  handleIframeStyle(cloneEle);

  const cssText = await handleCss();
  const cssString = cssText
    .join('')
    // 过滤UI原来的样式
    .replace(/li:before/g, 'xxx_li:before')
    .replace(/\.ul/g, '.xxx_ul')
    .replace(/\.li/g, '.xxx_li')
    .replace(/\.ol/g, '.xxx_ol')
    .replace(/\.ProseMirror ul/g, '.xxx_ul')
    .replace(/\.ProseMirror ol/g, '.xxx_ol')
    .replace(/\.ProseMirror li/g, '.xxx_li');
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
/**
 * 导出word
 * @param selector 导出word对应的元素
 * @param filename 导出后文件名称
 * @returns Promise
 */
export function exportAsDocx(selector: HTMLElement | string, filename: string) {
  const ele =
    typeof selector === 'string'
      ? (document.querySelector(selector) as HTMLElement)
      : selector;
  if (!ele) return Promise.reject();

  // eslint-disable-next-line no-async-promise-executor
  return new Promise<void>(async (resolve) => {
    const cloneEle = ele.cloneNode(true) as HTMLElement;
    const htmlString = await handleStyle(ele, cloneEle);
    const margins = { top: 1440 };

    asBlob(htmlString, { margins }).then((data) => {
      saveAs(data as Blob, filename + '.docx');
      resolve();
    });
  });
}
