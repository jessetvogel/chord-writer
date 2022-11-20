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
    // Find available fonts
    const pdf = new jspdf.jsPDF();
    for (const family in pdf.getFontList())
        FONTS.push(family);

    // Create settings list
    const settingsList = $('settings-list');
    settingsList.append(createSetting('fontFamily', 'font', 'Font family'));
    settingsList.append(createSetting('fontSize', 'number', 'Font size (pt)'));
    settingsList.append(createSetting('baselineStretch', 'number', 'Baseline stretch'));
    settingsList.append(createSetting('textColor', 'color', 'Text color'));
    settingsList.append(createSetting('chordColor', 'color', 'Chord color'));
    settingsList.append(createSetting('wordWrap', 'boolean', 'Word wrap'));
}

function showSettings(show: boolean = true) {
    const settings = $('settings');
    if (show) {
        settings.style.display = 'flex';
    } else {
        settings.style.display = 'none';
    }
}

function createSetting(name: string, type: 'number' | 'color' | 'font' | 'boolean', label: string): HTMLElement {
    let input: HTMLElement = null;
    switch (type) {
        case 'number': {
            input = create('input', {
                'type': 'text',
                'value': Settings[name].toString(),
                '@input': function () {
                    const x = parseFloat(this.value);
                    if (x == x)
                        Settings[name] = x; // Check for NaN's
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
            }) as HTMLInputElement;
            break;
        }
        case 'boolean': {
            const p: { [key: string]: any } = {
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
        // Make sure all settings are present!
        for (const key in Settings) {
            if (!(key in settings))
                return;
        }
        Object.assign(Settings, settings);
    }
}
