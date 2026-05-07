import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BroadcastEvent, Gallery } from '../types';
import { format } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';

export const exportPDF = async (
  event: BroadcastEvent, 
  includeCosts: boolean, 
  onlyCosts: boolean,
  role: 'admin' | 'production' | 'operator',
  coverImageUrl?: string
) => {
  console.log("exportPDF called for", event.title);
  const doc = new jsPDF();
  
  let headerImageBase64: string | null = null;
  if (coverImageUrl) {
    try {
      const res = await fetch(coverImageUrl);
      const blob = await res.blob();
      headerImageBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error('Failed to load cover image', e);
    }
  }

  let montserratLoaded = false;
  try {
    const [regRes, boldRes] = await Promise.all([
      fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/Montserrat-Regular.ttf'),
      fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/Montserrat-Bold.ttf')
    ]);
    if (regRes.ok && boldRes.ok) {
        const [regBlob, boldBlob] = await Promise.all([regRes.blob(), boldRes.blob()]);
        
        const toBase64 = (blob: Blob) => new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(blob);
        });

        const [regB64, boldB64] = await Promise.all([toBase64(regBlob), toBase64(boldBlob)]);
        doc.addFileToVFS('Montserrat-Regular.ttf', regB64);
        doc.addFileToVFS('Montserrat-Bold.ttf', boldB64);
        doc.addFont('Montserrat-Regular.ttf', 'Montserrat', 'normal');
        doc.addFont('Montserrat-Bold.ttf', 'Montserrat', 'bold');
        montserratLoaded = true;
    }
  } catch (e) {
    console.error('Failed to load Montserrat font', e);
  }

  const FONT_FAMILY = montserratLoaded ? 'Montserrat' : 'helvetica';
  
  const formatDate = (isoString?: string, tz?: string) => {
    if (!isoString) return 'N/A';
    try {
      if (tz) {
         return format(fromZonedTime(isoString, tz), 'dd/MM/yyyy HH:mm') + ` (${tz})`;
      }
      return format(new Date(isoString), 'dd/MM/yyyy HH:mm');
    } catch (e) {
      return new Date(isoString).toLocaleString();
    }
  };

  // Color Palette
  const PRIMARY: [number, number, number] = [15, 23, 42]; // slate-900 
  const ACCENT: [number, number, number] = [37, 99, 235]; // blue-600
  const GRAY_LIGHT: [number, number, number] = [241, 245, 249]; // slate-100
  const GRAY_DARK: [number, number, number] = [100, 116, 139]; // slate-500
  const WHITE: [number, number, number] = [255, 255, 255];

  const pageWidth = doc.internal.pageSize.width;
  
  let isFirstPageCall = true;

  const addHeaderPage = () => {
    let currentY = 0;
    
    if (headerImageBase64) {
      try {
        const props = doc.getImageProperties(headerImageBase64);
        const imgHeight = (props.height * pageWidth) / props.width;
        
        let formatStr = 'PNG';
        const match = headerImageBase64.match(/^data:image\/(png|jpeg|jpg|webp);/);
        if (match) {
          formatStr = match[1].toUpperCase();
          if (formatStr === 'JPG') formatStr = 'JPEG';
        }
        
        doc.addImage(headerImageBase64, formatStr, 0, 0, pageWidth, imgHeight);
        currentY = imgHeight;
      } catch (e) {
        console.error('Failed to add image to PDF', e);
        // Fallback banner
        doc.setFillColor(...PRIMARY);
        doc.rect(0, 0, pageWidth, 28, 'F');
        doc.setTextColor(...WHITE);
        doc.setFont(FONT_FAMILY, "bold");
        doc.setFontSize(16);
        doc.text("BROADCAST WORKORDER", 14, 18);
        doc.setFontSize(9);
        doc.setFont(FONT_FAMILY, "normal");
        doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy')}`, pageWidth - 14, 18, { align: 'right' });
        currentY = 28;
      }
    } else {
      // Top banner
      doc.setFillColor(...PRIMARY);
      doc.rect(0, 0, pageWidth, 28, 'F');
      
      doc.setTextColor(...WHITE);
      doc.setFont(FONT_FAMILY, "bold");
      doc.setFontSize(16);
      doc.text("BROADCAST WORKORDER", 14, 18);
      
      doc.setFontSize(9);
      doc.setFont(FONT_FAMILY, "normal");
      doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy')}`, pageWidth - 14, 18, { align: 'right' });
      currentY = 28;
    }
    
    doc.setTextColor(0, 0, 0); // Reset text color
    return currentY + 12; // Return starting Y for content (+ spacing)
  };

  const addSectionTitle = (title: string, yPos: number): number => {
    if (yPos > 260) {
      doc.addPage();
      yPos = addHeaderPage();
    }
    
    doc.setFont(FONT_FAMILY, "bold");
    doc.setFontSize(12);
    doc.setTextColor(...ACCENT);
    doc.text(title.toUpperCase(), 14, yPos);
    
    // Underline
    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(0.5);
    doc.line(14, yPos + 2, pageWidth - 14, yPos + 2);
    
    doc.setTextColor(0, 0, 0); // Reset text color
    return yPos + 10;
  };

  let y = addHeaderPage();

  // --- BIG TITLE ---
  doc.setFontSize(24);
  doc.setFont(FONT_FAMILY, "bold");
  doc.setTextColor(...PRIMARY);
  const splitTitle = doc.splitTextToSize(event.title || 'Untitled Event', pageWidth - 28);
  doc.text(splitTitle, 14, y);
  y += (splitTitle.length * 10) + 5;

  if (!onlyCosts) {
    // --- GENERAL INFO (Using autoTable for nice alignment) ---
    y = addSectionTitle('Event Information', y);
    
    autoTable(doc, {
      startY: y,
      theme: 'plain',
      styles: { font: FONT_FAMILY, fontSize: 10, cellPadding: 2, textColor: [50, 50, 50] },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 35, textColor: GRAY_DARK },
        1: { cellWidth: 55 },
        2: { fontStyle: 'bold', cellWidth: 35, textColor: GRAY_DARK },
        3: { cellWidth: 55 },
      },
      body: [
        ['Type', event.type || 'N/A', 'Status', event.status || 'N/A'],
        ['Competition', event.competition || 'N/A', 'Sport', event.sport || 'N/A'],
        ['Teams', `${event.teamA || 'N/A'} vs ${event.teamB || 'N/A'}`, 'Venue', `${event.venue || 'N/A'} ${event.city ? `(${event.city})` : ''}`],
        ['Start Time', formatDate(event.startDate, event.venueTimezone), 'End Time', formatDate(event.endDate, event.venueTimezone)],
      ],
    });
    
    y = (doc as any).lastAutoTable.finalY + 8;

    if (event.contacts || event.description) {
        if (event.contacts) {
            doc.setFont(FONT_FAMILY, "bold");
            doc.setFontSize(9);
            doc.setTextColor(...GRAY_DARK);
            doc.text("Contacts", 14, y);
            doc.setFont(FONT_FAMILY, "normal");
            doc.setTextColor(0, 0, 0);
            const splitContacts = doc.splitTextToSize(event.contacts, pageWidth - 28);
            doc.text(splitContacts, 14, y + 5);
            y += (splitContacts.length * 4) + 8;
        }
        if (event.description) {
            doc.setFont(FONT_FAMILY, "bold");
            doc.setFontSize(9);
            doc.setTextColor(...GRAY_DARK);
            doc.text("Description & Notes", 14, y);
            doc.setFont(FONT_FAMILY, "normal");
            doc.setTextColor(0, 0, 0);
            const splitDesc = doc.splitTextToSize(event.description, pageWidth - 28);
            doc.text(splitDesc, 14, y + 5);
            y += (splitDesc.length * 4) + 12;
        }
    } else {
        y += 4;
    }

    // --- SESSIONS ---
    if (event.sessions && event.sessions.length > 0) {
      y = addSectionTitle('Event Sessions / Matches', y);
      
      const sessionsBody = event.sessions.map((s: any) => [
        String(s.title || 'Session'),
        s.teamA && s.teamB ? `${s.teamA} vs ${s.teamB}` : 'N/A',
        formatDate(s.startDate, event.venueTimezone),
        formatDate(s.endDate, event.venueTimezone)
      ]);
      
      autoTable(doc, {
        startY: y,
        head: [['Title', 'Teams', 'Start', 'End']],
        body: sessionsBody,
        theme: 'striped',
        styles: { font: FONT_FAMILY },
        headStyles: { fillColor: GRAY_DARK, textColor: WHITE, fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: GRAY_LIGHT },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    // --- GALLERIES ---
    if (event.galleries && event.galleries.length > 0) {
      y = addSectionTitle('Galleries & Configuration', y);
      
      event.galleries.forEach((gallery: Gallery, idx: number) => {
        if (y > 240) { doc.addPage(); y = addHeaderPage(); y = addSectionTitle('Galleries & Configuration (Cont.)', y) }
        
        doc.setFillColor(...GRAY_LIGHT);
        doc.rect(14, y, pageWidth - 28, 8, 'F');
        doc.setFont(FONT_FAMILY, "bold");
        doc.setFontSize(10);
        doc.setTextColor(...PRIMARY);
        doc.text(`Gallery ${idx + 1}: ${gallery.name || 'Unnamed'}`, 16, y + 6);
        y += 12;

        const gBody = [
            ['Resolution', gallery.resolution ? gallery.resolution.join(', ') : 'N/A', 'Video Matrix', gallery.videoMatrix || 'N/A'],
            ['Main Config', `Tracking: ${gallery.mainConfig?.trackingType || 'N/A'}, Cams: ${gallery.mainConfig?.cameras || 0}, PGMs: ${gallery.mainConfig?.pgms || 0}, Outs: ${gallery.mainConfig?.outputs || 0}`, '', ''],
        ];

        if (gallery.hasBackup && gallery.backupConfig) {
            gBody.push(['Backup Config', `Tracking: ${gallery.backupConfig.trackingType}, Cams: ${gallery.backupConfig.cameras}, PGMs: ${gallery.backupConfig.pgms}, Outs: ${gallery.backupConfig.outputs}`, '', '']);
        }
        if (gallery.virtualAssets && gallery.virtualAssets.length > 0) {
            gBody.push(['Virtual Assets', gallery.virtualAssets.join(', '), '', '']);
        }

        autoTable(doc, {
            startY: y,
            theme: 'plain',
            styles: { font: FONT_FAMILY, fontSize: 9, cellPadding: 1.5, textColor: [50, 50, 50] },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 35, textColor: GRAY_DARK },
                1: { cellWidth: 55 },
                2: { fontStyle: 'bold', cellWidth: 25, textColor: GRAY_DARK },
                3: { cellWidth: 55 },
            },
            body: gBody,
        });

        y = (doc as any).lastAutoTable.finalY + 8;

        if (gallery.layoutPreview) {
          try {
              const props = doc.getImageProperties(gallery.layoutPreview);
              const previewWidth = (pageWidth - 28) * 0.70; // 70% of width to make it smaller
              const imgHeight = (props.height * previewWidth) / props.width;
              if (y + imgHeight > 280) { 
                doc.addPage(); y = addHeaderPage(); 
                y = addSectionTitle(`Gallery ${idx + 1}: Hardware & Asset Preview`, y);
              } else {
                 y += 2;
                 doc.setFont(FONT_FAMILY, "bold");
                 doc.setFontSize(9);
                 doc.setTextColor(...GRAY_DARK);
                 doc.text("Hardware & Asset Preview", 14, y);
                 y += 4;
              }
              let formatStr = 'PNG';
              const match = gallery.layoutPreview.match(/^data:image\/(png|jpeg|jpg|webp);/);
              if (match) {
                formatStr = match[1].toUpperCase();
                if (formatStr === 'JPG') formatStr = 'JPEG';
              }
              doc.addImage(gallery.layoutPreview, formatStr, 14, y, previewWidth, imgHeight);
              y += imgHeight + 8;
          } catch(e) {
             console.error("Failed to add gallery preview", e);
          }
        }
      });
    }

    // --- SIGNALS AND TRANSPORT ---
    if (event.signalsTransport) {
      y = addSectionTitle('Signals & Transport', y);
      const st = event.signalsTransport;
      
      autoTable(doc, {
        startY: y,
        theme: 'plain',
        styles: { font: FONT_FAMILY, fontSize: 9, cellPadding: 1.5, textColor: [50, 50, 50] },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 35, textColor: GRAY_DARK },
          1: { cellWidth: 55 },
          2: { fontStyle: 'bold', cellWidth: 35, textColor: GRAY_DARK },
          3: { cellWidth: 55 },
        },
        body: [
          ['Inputs / Outputs', `${st.inputsCount || 0} In / ${st.outputsCount || 0} Out`, 'Signal Type', st.signalType || 'N/A'],
          ['Color Profile', st.colorProfile || 'N/A', 'Video Standard', st.videoStandard || 'N/A'],
          ['Audio Config', st.audioConfig || 'N/A', '', ''],
          ['Main Transport', (st.transportTypesMain || []).join(', '), 'Backup Transport', (st.transportTypesBck || []).join(', ')],
        ],
      });
      y = (doc as any).lastAutoTable.finalY + 6;

      if (st.transportDetails && st.transportDetails.length > 0) {
         const transportBody = st.transportDetails.map(td => [
           String(td.type || ''),
           String(td.primaryInfo || ''),
           String(td.secondaryInfo || ''),
           String(td.notes || '')
         ]);
         
         autoTable(doc, {
           startY: y,
           head: [['Type', 'Primary', 'Secondary', 'Notes']],
           body: transportBody,
           theme: 'striped',
           styles: { font: FONT_FAMILY },
           headStyles: { fillColor: GRAY_DARK, textColor: WHITE, fontSize: 9, fontStyle: 'bold' },
           bodyStyles: { fontSize: 8 },
           alternateRowStyles: { fillColor: GRAY_LIGHT },
         });
         y = (doc as any).lastAutoTable.finalY + 10;
      } else {
         y += 4;
      }
    }

    // --- SCHEDULE ---
    y = addSectionTitle('Running Order / Schedule', y);

    if (event.schedule && event.schedule.length > 0) {
      const scheduleBody = event.schedule.map(s => [
        String(s.date || ''),
        String(s.time || ''),
        String(s.activity || ''),
        String(s.notes || '')
      ]);
      
      autoTable(doc, {
        startY: y,
        head: [['Date', 'Time', 'Activity', 'Notes']],
        body: scheduleBody,
        theme: 'striped',
        styles: { font: FONT_FAMILY },
        headStyles: { fillColor: PRIMARY, textColor: WHITE, fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: GRAY_LIGHT },
        columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 15 }
        }
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    } else {
      doc.setFontSize(9);
      doc.setTextColor(...GRAY_DARK);
      doc.text("No schedule available.", 14, y);
      y += 10;
    }
  }

  // Cost Table
  if (includeCosts && role === 'admin') {
    y = addSectionTitle('Production Costs', y);

    if (event.costs && event.costs.length > 0) {
      const costsBody = event.costs.map(c => [
        String(c.description || 'N/A'),
        `€ ${c.amount ? c.amount.toLocaleString('it-IT', {minimumFractionDigits: 2}) : '0,00'}`
      ]);

      const total = event.costs.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
      
      // Add total row at the end
      costsBody.push([
        'TOTAL ESTIMATED COST',
        `€ ${total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Description', 'Amount']],
        body: costsBody,
        theme: 'striped',
        styles: { font: FONT_FAMILY },
        headStyles: { fillColor: [16, 185, 129], textColor: WHITE, fontSize: 9, fontStyle: 'bold' }, // emerald-500
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: GRAY_LIGHT },
        willDrawCell: function(data) {
          // Highlight total row
          if (data.row.index === costsBody.length - 1) {
            doc.setFillColor(209, 250, 229); // emerald-100
            doc.setTextColor(6, 78, 59); // emerald-900
            doc.setFont(FONT_FAMILY, "bold");
          }
        },
      });
      
    } else {
        doc.setFontSize(9);
        doc.setTextColor(...GRAY_DARK);
        doc.text("No costs available.", 14, y);
    }
  }

  // Footer on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...GRAY_DARK);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, doc.internal.pageSize.height - 10, { align: 'right' });
    doc.text(`CONFIDENTIAL - FOR INTERNAL USE ONLY`, 14, doc.internal.pageSize.height - 10);
  }

  let suffix = '_WO';
  if (onlyCosts) {
    suffix = '_cost';
  } else if (!includeCosts) {
    suffix = '_prod';
  }

  doc.save(`${(event.title || 'Workorder').replace(/\s+/g, '_')}${suffix}.pdf`);
};
