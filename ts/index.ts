var CodeFlask: any;

let flask: any = null;

function main() {
    // CodeFlask
    flask = new CodeFlask('#editor-input', { language: 'markdown' });
    restoreInput();
    window.onbeforeunload = function () {
        storeInput();
        storeSettings();
    }

    // Settings
    restoreSettings();
    initSettings();

    // Keyboard shortcuts
    onKeyDown(document.body, (event) => {
        // Compile (⌘ + Enter)
        if (event.key == 'Enter' && event.metaKey) {
            event.preventDefault();
            compilePDF();
            return;
        }

        // Download (⌘ + S)
        if (event.key == 's' && event.metaKey) {
            event.preventDefault();
            downloadPDF();
            return;
        }

        // Settings (⌘ + ,)
        if (event.key == ',' && event.metaKey) {
            event.preventDefault();
            showSettings();
            return;
        }

        // Hide settings (Escape)
        if (event.key == 'Escape') {
            event.preventDefault();
            showSettings(false);
            return;
        }
    });
}

window.onload = main;

function compilePDF() {
    const input = $('editor-input').innerText;
    const pdf = generatePDF(input);
    const iframe = $('preview-iframe') as HTMLIFrameElement;
    iframe.src = pdf.output('datauristring');
}

function downloadPDF() {
    const input = $('editor-input').innerText;
    const pdf = generatePDF(input);
    pdf.output('dataurlnewwindow');
}

function storeInput() {
    const input = flask.getCode();
    setCookie('input', encodeURIComponent(input), 365);
}

function restoreInput() {
    const input = getCookie('input');
    if (input !== null) {
        flask.updateCode(decodeURIComponent(input));
    } else {
        fetch('examples/Hallelujah.txt')
            .then((response) => response.text())
            .then((data) => flask.updateCode(data));
    }
}
