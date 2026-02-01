import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { loadAgentProfile } from './agentProfile';

interface ExportOptions {
  clientName: string;
  reportType: 'Seller' | 'Buyer';
  snapshotTimestamp?: string;
}

const IMPORTANT_NOTICE = `Important Notice: This report is an informational decision-support tool. It is not an appraisal, valuation, guarantee, or prediction of outcome. Actual results depend on market conditions, competing properties or offers, and buyer/seller decisions outside the scope of this analysis.`;

export async function exportReportToPdf(
  elementId: string,
  options: ExportOptions
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Export element not found');
  }

  const agentProfile = loadAgentProfile();
  const clientDisplay = options.clientName?.trim() || 'Client';
  const timestamp = options.snapshotTimestamp 
    ? new Date(options.snapshotTimestamp).toLocaleString()
    : new Date().toLocaleString();

  // Add PDF export class for stable styling
  element.classList.add('pdf-export');
  
  // Wait for styles to apply
  await new Promise(resolve => setTimeout(resolve, 100));

  // Get the computed width of the element
  const elementWidth = element.offsetWidth;

  // Capture the element as canvas with optimized settings for file size
  const canvas = await html2canvas(element, {
    scale: 2, // Reduced from 3 for smaller file size while maintaining readability
    useCORS: true,
    logging: false,
    backgroundColor: '#FFFFFF',
    windowWidth: elementWidth,
    onclone: (clonedDoc) => {
      const clonedElement = clonedDoc.getElementById(elementId);
      if (clonedElement) {
        clonedElement.style.width = '794px';
        clonedElement.style.maxWidth = '794px';
        clonedElement.style.margin = '0 auto';
        clonedElement.style.padding = '24px';
        clonedElement.style.background = '#ffffff';
      }
    }
  });

  // Remove PDF export class
  element.classList.remove('pdf-export');

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12.7; // ~0.5 inch margin
  const contentWidth = pageWidth - margin * 2;
  
  // Calculate header height
  const headerStartY = margin;
  let currentY = headerStartY;

  // PDF Header
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 30, 30);
  pdf.text(`${options.reportType} Report`, margin, currentY + 5);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Market snapshot as of: ${timestamp}`, pageWidth - margin, currentY + 5, { align: 'right' });
  
  currentY += 12;

  // Prepared for/by lines
  pdf.setFontSize(10);
  pdf.setTextColor(60, 60, 60);
  
  // Prepared for with bold client name
  pdf.setFont('helvetica', 'normal');
  pdf.text('Prepared for: ', margin, currentY);
  const preparedForWidth = pdf.getTextWidth('Prepared for: ');
  pdf.setFont('helvetica', 'bold');
  pdf.text(clientDisplay, margin + preparedForWidth, currentY);
  currentY += 5;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Prepared by: ${agentProfile.agent_name}, ${agentProfile.brokerage_name}`, margin, currentY);
  currentY += 5;
  
  // Contact line
  let contactLine = `Contact: ${agentProfile.phone} • ${agentProfile.email}`;
  if (agentProfile.website) {
    contactLine += ` • ${agentProfile.website}`;
  }
  pdf.text(contactLine, margin, currentY);
  currentY += 5;
  
  // License line (if present)
  if (agentProfile.license) {
    pdf.text(`License: ${agentProfile.license}`, margin, currentY);
    currentY += 5;
  }
  
  // Add separator line
  currentY += 3;
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;

  const headerHeight = currentY - headerStartY;
  const footerHeight = 20;
  const availableHeight = pageHeight - headerHeight - footerHeight - margin;

  // Scale image to fit content width
  const imgWidth = contentWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // Calculate total pages needed
  const totalPages = Math.ceil(imgHeight / availableHeight);

  // Add image content with multi-page support using JPEG compression
  const pixelsPerMm = canvas.width / imgWidth;
  let sourceY = 0;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    if (pageNum > 1) {
      pdf.addPage();
      currentY = margin + 5;
    }

    const sliceHeight = Math.min(availableHeight, imgHeight - (pageNum - 1) * availableHeight);
    const sliceHeightPx = sliceHeight * pixelsPerMm;

    // Create a slice of the canvas
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = Math.ceil(sliceHeightPx);
    const ctx = sliceCanvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(
        canvas,
        0, sourceY,
        canvas.width, Math.ceil(sliceHeightPx),
        0, 0,
        canvas.width, Math.ceil(sliceHeightPx)
      );

      // Use JPEG with compression for smaller file size
      const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.75);
      pdf.addImage(sliceData, 'JPEG', margin, currentY, imgWidth, sliceHeight, undefined, 'FAST');
    }

    sourceY += sliceHeightPx;

    // Add footer to each page
    const footerY = pageHeight - margin;
    
    // Page number
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, footerY - 10, { align: 'center' });
    
    // Disclaimer (smaller text)
    pdf.setFontSize(6);
    pdf.setTextColor(130, 130, 130);
    const disclaimerLines = pdf.splitTextToSize(IMPORTANT_NOTICE, contentWidth);
    pdf.text(disclaimerLines, margin, footerY - 4);
  }

  // Generate filename
  const date = new Date().toISOString().split('T')[0];
  const sanitizedName = clientDisplay.replace(/[^a-zA-Z0-9]/g, '-');
  const filename = `${options.reportType}-Report-${sanitizedName}-${date}.pdf`;
  
  pdf.save(filename);
}
