
import * as pdfjsLib from 'pdfjs-dist';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
 * @param elementId The ID of the HTML element to convert to PDF.
 * @param fileName The desired name for the downloaded PDF file.
 */
export const generatePdfFromHtmlContent = async (elementId: string, fileName: string): Promise<void> => {
  const input = document.getElementById(elementId);
  if (!input) {
    console.error(`Element with id ${elementId} not found.`);
    throw new Error(`Element with id ${elementId} not found.`);
  }

  // Store original styles
  const originalStyles = {
    transform: input.style.transform,
    transformOrigin: input.style.transformOrigin,
    width: input.style.width,
  };
  
  // Temporarily adjust styles for better canvas rendering if needed
  // For A4 size (210mm width), calculate pixel width for html2canvas
  // Assuming 96 DPI, 1 inch = 25.4mm. So, 210mm / 25.4mm/inch * 96dpi = 793.7 pixels
  // This helps html2canvas render at a resolution closer to PDF.
  const pdfPixelWidth = (PDF_STYLES.margin * 2 < 210) ? (210 - PDF_STYLES.margin * 2) / 25.4 * 96 : 793;
  input.style.width = `${pdfPixelWidth}px`; // Or use a fixed width that works well e.g. '800px'
  // html2canvas might have issues with CSS transforms, so reset them temporarily
  input.style.transform = 'none';
  input.style.transformOrigin = 'unset';


  try {
    const canvas = await html2canvas(input, {
      scale: 2, // Increase scale for better resolution
      useCORS: true, // If you have external images
      logging: false,
    });

    // Restore original styles after canvas capture
    input.style.transform = originalStyles.transform;
    input.style.transformOrigin = originalStyles.transformOrigin;
    input.style.width = originalStyles.width;

    const imgData = canvas.toDataURL('image/png');
    
    // A4 dimensions in mm: 210 x 297
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // Calculate the aspect ratio
    const ratio = imgWidth / imgHeight;
    
    // Usable width and height within margins
    const usableWidth = pdfWidth - 2 * PDF_STYLES.margin;
    const usableHeight = pdfHeight - 2 * PDF_STYLES.margin;

    let newImgWidth = usableWidth;
    let newImgHeight = newImgWidth / ratio;

    if (newImgHeight > usableHeight) {
        newImgHeight = usableHeight;
        newImgWidth = newImgHeight * ratio;
    }
    
    // Center the image on the page
    const xOffset = (pdfWidth - newImgWidth) / 2;
    const yOffset = PDF_STYLES.margin;


    pdf.addImage(imgData, 'PNG', xOffset, yOffset, newImgWidth, newImgHeight);
    pdf.save(`${fileName}.pdf`);

  } catch (error) {
    console.error("Error generating PDF:", error);
    // Restore original styles in case of error too
    input.style.transform = originalStyles.transform;
    input.style.transformOrigin = originalStyles.transformOrigin;
    input.style.width = originalStyles.width;
    throw error; // Re-throw to be caught by caller
  }
};


export const generatePdfFromText = (header: string, body: string, fileName: string): void => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const { fontFamily, fontSize, lineHeight, margin } = PDF_STYLES;
  pdf.setFont(fontFamily);
  pdf.setFontSize(fontSize);
  
  const pageWidth = pdf.internal.pageSize.getWidth();
  const usableWidth = pageWidth - 2 * margin;
  let currentY = margin;

  const addWrappedText = (text: string, isHeader: boolean) => {
    const lines = pdf.splitTextToSize(text, usableWidth);
    if (isHeader) {
      pdf.setFont(fontFamily, 'bold');
    } else {
      pdf.setFont(fontFamily, 'normal');
    }

    lines.forEach((line: string) => {
      if (currentY + (fontSize * lineHeight / 2.83465) > pdf.internal.pageSize.getHeight() - margin) { // approx conversion pt to mm
        pdf.addPage();
        currentY = margin;
      }
      pdf.text(line, margin, currentY);
      currentY += fontSize * lineHeight / 2.83465 * 0.5; // Adjust spacing based on pt to mm and lineheight
    });
    if (isHeader) currentY += (fontSize * lineHeight / 2.83465 * 0.5) * 0.5; // Extra space after header
  };

  if (header.trim()) {
    addWrappedText(header, true);
  }
  if (body.trim()) {
    addWrappedText(body, false);
  }

  pdf.save(`${fileName}.pdf`);
};
