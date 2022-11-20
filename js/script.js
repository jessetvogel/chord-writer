var jspdf;
function generatePDF(input) {
    const pdf = new jspdf.jsPDF({
        format: 'a4',
        orientation: 'portrait',
        unit: 'pt',
        putOnlyUsedFonts: true
    });
    pdf.setFont(Settings.fontFamily);
    pdf.setFontSize(Settings.fontSize);
    pdf.setTextColor(Settings.textColor);
    const xMin = Settings.margin[3];
    const xMax = pdf.internal.pageSize.getWidth() - Settings.margin[1];
    const yMin = Settings.margin[0];
    const yMax = pdf.internal.pageSize.getHeight() - Settings.margin[2];
    const lineHeight = Settings.baselineStretch * Settings.fontSize;
    let x = xMin;
    let y = yMin;
    let emptyLine = true;
    const writeNewline = function () {
        x = xMin;
        y += emptyLine ? lineHeight : 2 * lineHeight;
        if (y > yMax) {
            pdf.addPage();
            y = yMin;
        }
        emptyLine = true;
    };
    const writeText = function (text) {
        const width = pdf.getTextWidth(text);
        if (Settings.wordWrap && x + width > xMax)
            writeNewline();
        pdf.text(text, x, y);
        x += width;
        emptyLine = false;
    };
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
var CodeFlask;
let flask = null;
function main() {
    flask = new CodeFlask('#editor-input', { language: 'markdown' });
    restoreInput();
    window.onbeforeunload = function () {
        storeInput();
        storeSettings();
    };
    restoreSettings();
    initSettings();
    onKeyDown(document.body, (event) => {
        if (event.key == 'Enter' && event.metaKey) {
            event.preventDefault();
            compilePDF();
            return;
        }
        if (event.key == 's' && event.metaKey) {
            event.preventDefault();
            downloadPDF();
            return;
        }
        if (event.key == ',' && event.metaKey) {
            event.preventDefault();
            showSettings();
            return;
        }
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
    const iframe = $('preview-iframe');
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
    }
    else {
        fetch('examples/Hallelujah.txt')
            .then((response) => response.text())
            .then((data) => flask.updateCode(data));
    }
}
var Parser;
(function (Parser_1) {
    const SEPARATORS = ['[', ']', '(', ')', '*', '**', '***', '_', '__', '___', '#', '##', '###'];
    class Lexer {
        constructor(input) {
            this.input = input;
            this.index = 0;
            this.buffer = '';
            this.token = { type: null, data: null };
        }
        getToken() {
            while (true) {
                if (this.index >= this.input.length) {
                    if (this.buffer.length == 0)
                        return { type: 'end', data: null };
                    if (this.tokenize(this.buffer)) {
                        const token = this.makeToken();
                        this.buffer = '';
                        return token;
                    }
                    throw `unknown token ${this.buffer}`;
                }
                const c = this.input[this.index++];
                this.buffer += c;
                if (this.tokenize(this.buffer))
                    continue;
                if (this.token.type == null)
                    continue;
                const token = this.makeToken();
                this.buffer = c;
                this.tokenize(this.buffer);
                return token;
            }
        }
        makeToken() {
            if (this.token.type == null)
                throw `failed to create token from ${this.buffer}`;
            const token = this.token;
            this.token = { type: null, data: null };
            return token;
        }
        tokenize(str) {
            let type;
            if (SEPARATORS.includes(str))
                type = 'separator';
            else if (str == '\n')
                type = 'newline';
            else if (/^[^\S\r\n]+$/.test(str))
                type = 'whitespace';
            else if (/^[^\W_]+'*$/.test(str))
                type = 'text';
            else if (str.length == 1)
                type = 'text';
            else
                return false;
            this.token.type = type;
            this.token.data = str;
            return true;
        }
    }
    class Parser {
        constructor(input) {
            this.lexer = new Lexer(input);
            this.currentToken = null;
        }
        nextToken() {
            this.currentToken = this.lexer.getToken();
        }
        found(type = null, data = null) {
            if (this.currentToken == null)
                this.nextToken();
            if (type == null)
                return true;
            if (this.currentToken.type == type && (data == null || this.currentToken.data == data))
                return true;
            return false;
        }
        consume(type = null, data = null) {
            if (this.found(type, data)) {
                const token = this.currentToken;
                ;
                this.currentToken = null;
                return token;
            }
            else {
                throw `expected ${data} but found ${this.currentToken.data}`;
            }
        }
        parse() {
            const data = [];
            while (!this.found('end')) {
                if (this.found('text')) {
                    data.push(this.parseText());
                    continue;
                }
                if (this.found('whitespace')) {
                    data.push({ type: 'text', data: this.consume().data });
                    continue;
                }
                if (this.found('newline')) {
                    data.push({ type: 'newline', data: this.consume().data });
                    continue;
                }
                if (this.found('separator', '*') ||
                    this.found('separator', '**') ||
                    this.found('separator', '***') ||
                    this.found('separator', '_') ||
                    this.found('separator', '__') ||
                    this.found('separator', '___')) {
                    data.push(this.parseMarked());
                    continue;
                }
                if (this.found('separator', '#') ||
                    this.found('separator', '##') ||
                    this.found('separator', '###')) {
                    data.push(this.parseHeader());
                    continue;
                }
                if (this.found('separator', '[')) {
                    data.push(this.parseLink());
                    continue;
                }
                data.push({ type: 'text', data: this.consume().data });
            }
            return data;
        }
        parseLink() {
            let data = '';
            this.consume('separator', '[');
            while (this.found('text') || this.found('whitespace'))
                data += this.consume().data;
            this.consume('separator', ']');
            return { type: 'link', data: data };
        }
        parseMarked() {
            const prefix = this.consume('separator').data;
            let data = '';
            while (this.found('text') || this.found('whitespace'))
                data += this.consume().data;
            this.consume('separator', prefix);
            if (prefix == '*' || prefix == '__')
                return { type: 'bold', data: data };
            if (prefix == '**' || prefix == '_')
                return { type: 'italic', data: data };
            if (prefix == '***' || prefix == '___')
                return { type: 'bolditalic', data: data };
            throw `unknown prefix ${prefix}`;
        }
        parseText() {
            return {
                type: 'text',
                data: this.consume('text').data
            };
        }
        parseHeader() {
            this.consume('separator');
            let data = '';
            while (this.found('whitespace'))
                this.consume();
            while (this.found('text') || this.found('whitespace'))
                data += this.consume().data;
            return { type: 'header', data: data };
        }
    }
    Parser_1.Parser = Parser;
})(Parser || (Parser = {}));
const Settings = {
    fontSize: 12,
    baselineStretch: 1,
    textColor: '#000000',
    chordColor: '#0095e0',
    margin: [84.2, 59.5, 84.2, 59.5],
    fontFamily: 'Courier',
    wordWrap: true
};
const FONTS = [];
function initSettings() {
    const pdf = new jspdf.jsPDF();
    for (const family in pdf.getFontList())
        FONTS.push(family);
    const settingsList = $('settings-list');
    settingsList.append(createSetting('fontFamily', 'font', 'Font family'));
    settingsList.append(createSetting('fontSize', 'number', 'Font size (pt)'));
    settingsList.append(createSetting('baselineStretch', 'number', 'Baseline stretch'));
    settingsList.append(createSetting('textColor', 'color', 'Text color'));
    settingsList.append(createSetting('chordColor', 'color', 'Chord color'));
    settingsList.append(createSetting('wordWrap', 'boolean', 'Word wrap'));
}
function showSettings(show = true) {
    const settings = $('settings');
    if (show) {
        settings.style.display = 'flex';
    }
    else {
        settings.style.display = 'none';
    }
}
function createSetting(name, type, label) {
    let input = null;
    switch (type) {
        case 'number': {
            input = create('input', {
                'type': 'text',
                'value': Settings[name].toString(),
                '@input': function () {
                    const x = parseFloat(this.value);
                    if (x == x)
                        Settings[name] = x;
                }
            });
            break;
        }
        case 'color': {
            input = create('input', {
                'type': 'color',
                'value': Settings[name],
                '@change': function () {
                    Settings[name] = this.value;
                }
            });
            break;
        }
        case 'boolean': {
            const p = {
                'type': 'checkbox',
                '@input': function () {
                    Settings[name] = this.checked;
                }
            };
            if (Settings[name])
                p['checked'] = true;
            input = create('input', p);
            break;
        }
        case 'font': {
            input = create('select', {
                '@change': function () {
                    Settings[name] = this.value;
                }
            }, FONTS.map((family) => {
                const selected = (Settings[name] == family);
                return create('option', selected ? { value: family, selected: true } : { value: family }, family);
            }));
            break;
        }
    }
    return create('div', {}, [
        create('span', {}, label),
        create('span', {}, [input])
    ]);
}
function storeSettings() {
    setCookie('settings', encodeURIComponent(JSON.stringify(Settings)), 365);
}
function restoreSettings() {
    const cookie = getCookie('settings');
    if (cookie !== null) {
        const settings = JSON.parse(decodeURIComponent(cookie));
        for (const key in Settings) {
            if (!(key in settings))
                return;
        }
        Object.assign(Settings, settings);
    }
}
function $(id) {
    return document.getElementById(id);
}
function $$(selector) {
    return Array.from(document.querySelectorAll(selector));
}
function create(tag, properties, content) {
    const elem = document.createElement(tag);
    if (properties !== undefined) {
        for (const key in properties) {
            if (key.startsWith('@'))
                elem.addEventListener(key.substring(1), properties[key]);
            else
                elem.setAttribute(key, properties[key]);
        }
    }
    if (content !== undefined) {
        if (typeof (content) === 'string')
            elem.innerHTML = content;
        if (content instanceof HTMLElement)
            elem.append(content);
        if (Array.isArray(content))
            for (const child of content)
                elem.append(child);
    }
    return elem;
}
function clear(elem) {
    elem.innerHTML = '';
}
function onClick(elem, f) {
    elem.addEventListener('click', f);
}
function onMouseDown(elem, f) {
    elem.addEventListener('mousedown', f);
}
function onMouseUp(elem, f) {
    elem.addEventListener('mouseup', f);
}
function onMouseMove(elem, f) {
    elem.addEventListener('mousemove', f);
}
function onWheel(elem, f) {
    elem.addEventListener('wheel', f);
}
function onContextMenu(elem, f) {
    elem.addEventListener('contextmenu', f);
}
function onChange(elem, f) {
    elem.addEventListener('change', f);
}
function onInput(elem, f) {
    elem.addEventListener('input', f);
}
function onRightClick(elem, f) {
    elem.addEventListener('contextmenu', f);
}
function onKeyPress(elem, f) {
    elem.addEventListener('keypress', f);
}
function onKeyDown(elem, f) {
    elem.addEventListener('keydown', f);
}
function onKeyUp(elem, f) {
    elem.addEventListener('keyup', f);
}
function onDrop(elem, f) {
    elem.addEventListener('drop', f);
}
function onDragOver(elem, f) {
    elem.addEventListener('dragover', f);
}
function addClass(elem, c) {
    elem.classList.add(c);
}
function removeClass(elem, c) {
    elem.classList.remove(c);
}
function hasClass(elem, c) {
    return elem.classList.contains(c);
}
function toggleClass(elem, c) {
    hasClass(elem, c) ? removeClass(elem, c) : addClass(elem, c);
}
function setHTML(elem, html) {
    elem.innerHTML = html;
}
function setText(elem, text) {
    elem.innerText = text;
}
function requestGET(url) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () { resolve(this.responseText); };
        xhr.onerror = reject;
        xhr.open('GET', url);
        xhr.send();
    });
}
function requestPOST(url, data) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () { resolve(this.responseText); };
        xhr.onerror = reject;
        xhr.open('POST', url);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(data);
    });
}
function requestHEAD(url) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () { resolve(this.status == 200); };
        xhr.onerror = reject;
        xhr.open('HEAD', url);
        xhr.send();
    });
}
function cssVariable(name) {
    return getComputedStyle(document.body).getPropertyValue(name);
}
function setCookie(name, value, days) {
    var expires = '';
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = '; expires=' + date.toUTCString();
    }
    document.cookie = name + '=' + (value || '') + expires + '; path=/';
}
function getCookie(name) {
    var nameEQ = name + '=';
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ')
            c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0)
            return c.substring(nameEQ.length, c.length);
    }
    return null;
}
function eraseCookie(name) {
    document.cookie = name + '=; path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}
//# sourceMappingURL=script.js.map