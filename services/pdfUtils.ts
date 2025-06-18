
import * as pdfjsLib from 'pdfjs-dist';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas'; // Kept for generatePdfFromHtmlContent if ever needed elsewhere
import { PDF_STYLES } from '../constants';

/**
 * Extracts text content from a PDF file.
 * @param file The PDF file object.
 * @returns A promise that resolves with the extracted text.
 */
export const extractTextFromPdf = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    fullText += textContent.items.map(item => ('str' in item ? item.str : '')).join(' ') + '\n';
  }
  return fullText;
};

/**
 * Generates a PDF from an HTML element and initiates download.
 * Note: This function is preserved but not used for the primary cover letter download to ensure plain text output.
 * @param elementId The ID of the HTML element to convert to PDF.
 * @param fileName The desired name for the downloaded PDF file.
 */
export const generatePdfFromHtmlContent = async (elementId: string, fileName: string): Promise<void> => {
  const input = document.getElementById(elementId);
  if (!input) {
    console.error(`Element with id ${elementId} not found.`);
    throw new Error(`Element with id ${elementId} not found.`);
  }

  const originalStyles = {
    transform: input.style.transform,
    transformOrigin: input.style.transformOrigin,
    width: input.style.width,
  };
  
  const pdfPixelWidth = (PDF_STYLES.margin * 2 < 210) ? (210 - PDF_STYLES.margin * 2) / 25.4 * 96 : 793;
  input.style.width = `${pdfPixelWidth}px`;
  input.style.transform = 'none';
  input.style.transformOrigin = 'unset';

  try {
    const canvas = await html2canvas(input, {
      scale: 2, 
      useCORS: true,
      logging: false,
    });

    input.style.transform = originalStyles.transform;
    input.style.transformOrigin = originalStyles.transformOrigin;
    input.style.width = originalStyles.width;

    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = imgWidth / imgHeight;
    
    const usableWidth = pdfWidth - 2 * PDF_STYLES.margin;
    const usableHeight = pdfHeight - 2 * PDF_STYLES.margin;

    let newImgWidth = usableWidth;
    let newImgHeight = newImgWidth / ratio;

    if (newImgHeight > usableHeight) {
        newImgHeight = usableHeight;
        newImgWidth = newImgHeight * ratio;
    }
    
    const xOffset = (pdfWidth - newImgWidth) / 2;
    const yOffset = PDF_STYLES.margin;

    pdf.addImage(imgData, 'PNG', xOffset, yOffset, newImgWidth, newImgHeight);
    pdf.save(`${fileName}.pdf`);

  } catch (error) {
    console.error("Error generating PDF from HTML:", error);
    input.style.transform = originalStyles.transform;
    input.style.transformOrigin = originalStyles.transformOrigin;
    input.style.width = originalStyles.width;
    throw error;
  }
};

/**
 * Generates a PDF from a plain text string and initiates download.
 * @param fullContent The complete text content for the PDF.
 * @param fileName The desired name for the downloaded PDF file.
 */
export const generatePdfFromText = (fullContent: string, fileName: string): void => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const { fontFamily, fontSize, lineHeight, margin } = PDF_STYLES;
  pdf.setFont(fontFamily); // Default: Helvetica
  pdf.setFontSize(fontSize); // Default: 11
  
  const pageWidth = pdf.internal.pageSize.getWidth();
  const usableWidth = pageWidth - 2 * margin; // Default margin: 20mm
  let currentY = margin;

  // Convert pt to mm for line height calculation: 1pt = 0.352778mm
  // However, jsPDF's lineHeight is a multiplier of font size.
  // The 'y' offset for text is from the baseline.
  // A simple way to advance Y is by font size * line height factor.
  const advanceY = fontSize * lineHeight * 0.352778; // Approx mm for one line. Let's use points directly and jsPDF handles it.
                                                   // jsPDF line height is factor of font size.
                                                   // default pdf.getLineHeightFactor() is 1.15

  const lines = pdf.splitTextToSize(fullContent, usableWidth);

  pdf.setFont(fontFamily, 'normal'); // Ensure normal style for the entire content

  lines.forEach((line: string) => {
    if (currentY + advanceY > pdf.internal.pageSize.getHeight() - margin) {
      pdf.addPage();
      currentY = margin;
    }
    pdf.text(line, margin, currentY);
    currentY += (fontSize * lineHeight) / (72 / 25.4); // Fontsize is in points, convert to mm for Y advance
                                                       // 72 points per inch, 25.4 mm per inch
  });

  pdf.save(`${fileName}.pdf`);
};
