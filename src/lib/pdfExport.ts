import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ExportOptions {
  clientName: string;
  reportType: 'Seller' | 'Buyer';
}

export async function exportReportToPdf(
  elementId: string,
  options: ExportOptions
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Export element not found');
  }

  // Capture the element as a high-quality canvas
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#FFFBF5', // Match background color
  });

  const imgData = canvas.toDataURL('image/png');
  const imgWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
  const pdf = new jsPDF('p', 'mm', 'a4');
  const margin = 12.7; // ~0.5 inch margin
  const contentWidth = imgWidth - margin * 2;
  const scaledImgHeight = (canvas.height * contentWidth) / canvas.width;
  
  // Add "Prepared for" header
  const clientDisplay = options.clientName?.trim() || 'Client';
  pdf.setFontSize(12);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Prepared for: ${clientDisplay}`, margin, margin + 5);
  
  const headerHeight = 15;
  let heightLeft = scaledImgHeight;
  let position = margin + headerHeight;
  
  // Add image, handling multi-page if needed
  const maxContentHeight = pageHeight - margin * 2 - headerHeight;
  
  if (scaledImgHeight <= maxContentHeight) {
    // Single page
    pdf.addImage(imgData, 'PNG', margin, position, contentWidth, scaledImgHeight);
  } else {
    // Multi-page
    let sourceY = 0;
    const sourceWidth = canvas.width;
    const pixelsPerMm = canvas.width / contentWidth;
    
    while (heightLeft > 0) {
      const sliceHeight = Math.min(heightLeft, pageHeight - margin * 2 - (position === margin + headerHeight ? headerHeight : 0));
      const sliceHeightPx = sliceHeight * pixelsPerMm;
      
      // Create a slice of the canvas
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = sourceWidth;
      sliceCanvas.height = sliceHeightPx;
      const ctx = sliceCanvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(
          canvas,
          0, sourceY,
          sourceWidth, sliceHeightPx,
          0, 0,
          sourceWidth, sliceHeightPx
        );
        
        const sliceData = sliceCanvas.toDataURL('image/png');
        pdf.addImage(sliceData, 'PNG', margin, position, contentWidth, sliceHeight);
      }
      
      heightLeft -= sliceHeight;
      sourceY += sliceHeightPx;
      
      if (heightLeft > 0) {
        pdf.addPage();
        position = margin;
      }
    }
  }

  // Generate filename
  const date = new Date().toISOString().split('T')[0];
  const sanitizedName = clientDisplay.replace(/[^a-zA-Z0-9]/g, '-');
  const filename = `${options.reportType}-Report-${sanitizedName}-${date}.pdf`;
  
  pdf.save(filename);
}
