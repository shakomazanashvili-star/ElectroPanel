import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface GeneratePdfOptions {
  fileName?: string;
  projectName?: string;
  onProgress?: (progress: number, stage: string) => void;
}

/**
 * Captures a DOM container element and renders it into a multi-page A4 PDF document.
 */
export async function generatePdfFromElement(
  element: HTMLElement,
  options: GeneratePdfOptions = {}
): Promise<void> {
  const { fileName = 'ElectroPanel_Project_Report.pdf', onProgress } = options;

  onProgress?.(10, 'Preparing document canvas...');

  // 1. Render high-resolution canvas with html2canvas
  const canvas = await html2canvas(element, {
    scale: 2, // 2x scale for sharp text and crisp schematics
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 1024,
  });

  onProgress?.(50, 'Building PDF pages...');

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  // First page
  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
  heightLeft -= pageHeight;

  // Additional pages if content overflows A4 height
  let pageNumber = 1;
  while (heightLeft > 0) {
    onProgress?.(
      Math.min(85, 50 + pageNumber * 10),
      `Processing page ${pageNumber + 1}...`
    );
    position = -(pageHeight * pageNumber);
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;
    pageNumber++;
  }

  onProgress?.(95, 'Finalizing download...');
  pdf.save(fileName);
  onProgress?.(100, 'Done');
}
