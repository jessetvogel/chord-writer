var jspdf: any;

function generatePDF(input) {
    // Create new PDF document
    const pdf = new jspdf.jsPDF({
        format: 'a4',
        orientation: 'portrait',
        unit: 'pt',
        putOnlyUsedFonts: true
    });

    // Options
    pdf.setFont(Settings.fontFamily);
    pdf.setFontSize(Settings.fontSize);
    pdf.setTextColor(Settings.textColor);

    // Constants
    const xMin = Settings.margin[3];
    const xMax = pdf.internal.pageSize.getWidth() - Settings.margin[1];
    const yMin = Settings.margin[0];
    const yMax = pdf.internal.pageSize.getHeight() - Settings.margin[2];
    const lineHeight = Settings.baselineStretch * Settings.fontSize;

    let x = xMin;
    let y = yMin; // + Settings.lineHeight; // ?
    let emptyLine = true;

    // Helper functions
    const writeNewline = function () {
        x = xMin;
        y += emptyLine ? lineHeight : 2 * lineHeight;
        if (y > yMax) {
            pdf.addPage();
            y = yMin;
        }
        emptyLine = true;
    }
    const writeText = function (text: string) {
        const width = pdf.getTextWidth(text);
        if (Settings.wordWrap && x + width > xMax)
            writeNewline();
        pdf.text(text, x, y);
        x += width;
        emptyLine = false;
    }

    // Parse input
    const parser = new Parser.Parser(input);
    for (const expr of parser.parse()) {
        switch (expr.type) {
            case 'text': {
                writeText(expr.data);
                break;
            }

            case 'link': {
                pdf.setTextColor(Settings.chordColor);
                pdf.text(expr.data, x, y - lineHeight);
                pdf.setTextColor(Settings.textColor);
                break;
            }

            case 'newline': {
                writeNewline();
                break;
            }

            case 'header': {
                pdf.setFont(Settings.fontFamily, 'bold');
                writeText(expr.data);
                pdf.setFont(Settings.fontFamily, 'normal');
                break;
            }

            case 'bold': {
                pdf.setFont(Settings.fontFamily, 'bold');
                writeText(expr.data);
                pdf.setFont(Settings.fontFamily, 'normal');
                break;
            }

            case 'italic': {
                pdf.setFont(Settings.fontFamily, 'italic');
                writeText(expr.data);
                pdf.setFont(Settings.fontFamily, 'normal');
                break;
            }

            case 'bolditalic': {
                pdf.setFont(Settings.fontFamily, 'bolditalic');
                writeText(expr.data);
                pdf.setFont(Settings.fontFamily, 'normal');
                break;
            }
        }
    }

    return pdf;
}
