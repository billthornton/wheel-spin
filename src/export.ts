import domtoimage, { ConvertFunction } from 'dom-to-image-more';

const downloadString = (dataURL: string, filename: string) => {
  const element = document.createElement('a');
  element.setAttribute('href', dataURL);
  element.setAttribute('download', filename);
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

const getSafeSVG = () => {
  // TODO: Need to somehow zoom in before capturing - should this be done in an invisible copy?
  const svgText = document.querySelector('.wheel-wrapper')?.outerHTML || '';
  const svgTextWithAttribute = svgText
    .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
    .replaceAll('<br>', '<br></br>');

  const svgFileText = `<?xml version="1.0" encoding="UTF-8"?>${svgTextWithAttribute}`;

  return svgFileText;
};

export const downloadAsSvg = () => {
  const svgFileText = getSafeSVG();
  const dataURL = `data:image/svg;base64,${btoa(svgFileText)}`;

  downloadString(dataURL, 'wheel.svg');
};

const convertAndDownload =
  (conversionFn: ConvertFunction, filename: string) =>
  (transparent = false) =>
  async () => {
    const wheelContainer = document.querySelector('.wheel-wrapper');
    if (!wheelContainer) return;

    const backgroundColor = transparent ? 'transparent' : 'white';
    const dataURL = await conversionFn(wheelContainer, { bgcolor: backgroundColor, scale: 2 });
    downloadString(dataURL, filename);
  };

export const downloadAsPng = convertAndDownload(domtoimage.toPng, 'wheel.png');
// Below is very slow, but has accurate text rendering - maybe make optional?
export const downloadAsSvgSlow = convertAndDownload(domtoimage.toSvg, 'wheel.svg');
