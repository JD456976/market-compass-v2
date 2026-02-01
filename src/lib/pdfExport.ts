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

  // Add is-exporting class to body for CSS overrides
  document.body.classList.add('is-exporting');
  element.classList.add('pdf-export');
  
  // Wait for styles to apply
  await new Promise(resolve => setTimeout(resolve, 150));

  // Get all pdf-section elements
  const sections = element.querySelectorAll('.pdf-section');
  
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12.7; // ~0.5 inch margin
  const contentWidth = pageWidth - margin * 2;
  
  // Calculate header height for page 1
  const headerHeight = 45; // Approximate height for header block
  const footerHeight = 18;
  const availableHeightPage1 = pageHeight - margin - headerHeight - footerHeight;
  const availableHeightOther = pageHeight - margin - footerHeight - 5;

  // Render all sections to canvas
  const sectionCanvases: HTMLCanvasElement[] = [];
  
  for (const section of Array.from(sections)) {
    const canvas = await html2canvas(section as HTMLElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#FFFFFF',
      windowWidth: 794,
    });
    sectionCanvases.push(canvas);
  }

  // Remove export classes
  document.body.classList.remove('is-exporting');
  element.classList.remove('pdf-export');

  // Add header to page 1
  let currentY = margin;
  let currentPage = 1;
  const pageContents: { page: number; y: number }[] = [];

  // PDF Header on page 1
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
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('Prepared for: ', margin, currentY);
  const preparedForWidth = pdf.getTextWidth('Prepared for: ');
  pdf.setFont('helvetica', 'bold');
  pdf.text(clientDisplay, margin + preparedForWidth, currentY);
  currentY += 5;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Prepared by: ${agentProfile.agent_name}, ${agentProfile.brokerage_name}`, margin, currentY);
  currentY += 5;
  
  let contactLine = `Contact: ${agentProfile.phone} • ${agentProfile.email}`;
  if (agentProfile.website) {
    contactLine += ` • ${agentProfile.website}`;
  }
  pdf.text(contactLine, margin, currentY);
  currentY += 5;
  
  if (agentProfile.license) {
    pdf.text(`License: ${agentProfile.license}`, margin, currentY);
    currentY += 5;
  }
  
  // Add separator line
  currentY += 3;
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;

  // Track pages for numbering
  let totalPages = 1;

  // Add each section, checking page space
  for (let i = 0; i < sectionCanvases.length; i++) {
    const canvas = sectionCanvases[i];
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    const availableHeight = currentPage === 1 ? availableHeightPage1 - (currentY - margin - headerHeight) : availableHeightOther - (currentY - margin);
    
    // Check if section fits on current page
    if (imgHeight > availableHeight && currentY > margin + (currentPage === 1 ? headerHeight : 5)) {
      // Add new page
      currentPage++;
      totalPages++;
      pdf.addPage();
      currentY = margin + 5;
    }
    
    // Add section image using JPEG compression
    const imgData = canvas.toDataURL('image/jpeg', 0.75);
    pdf.addImage(imgData, 'JPEG', margin, currentY, imgWidth, imgHeight, undefined, 'FAST');
    currentY += imgHeight + 4; // 4mm gap between sections
  }

  // Add footers to all pages
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    pdf.setPage(pageNum);
    const footerY = pageHeight - margin;
    
    // Page number
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, footerY - 10, { align: 'center' });
    
    // Disclaimer
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
