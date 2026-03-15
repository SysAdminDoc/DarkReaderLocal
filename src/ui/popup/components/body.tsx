import {m} from 'malevic';
import {withForms} from 'malevic/forms';
import {withState, useState} from 'malevic/state';

import type {ExtensionData, ExtensionActions, Theme} from '../../../definitions';
import {AutomationMode} from '../../../utils/automation';
import {getLocalMessage} from '../../../utils/locales';
import {isMatchMediaChangeEventListenerBuggy, isMobile} from '../../../utils/platform';
import {getURLHostOrProtocol, isURLInList} from '../../../utils/url';
import {CheckBox, MultiSwitch, Shortcut, TextBox, TextList, TimeRangePicker, Toggle, UpDown} from '../../controls';
import {compose, openExtensionPage} from '../../utils';
import NewBody from '../body';

import {toggleExtension} from './header';
import Loader from './loader';
import {getSiteToggleData} from './site-toggle';

import {ThemeEngine} from '../../../generators/theme-engines';

declare const __THUNDERBIRD__: boolean;

interface BodyProps {
    data: ExtensionData;
    actions: ExtensionActions;
}

interface BodyState {
    siteListOpen: boolean;
    automationOpen: boolean;
    fontOpen: boolean;
}

const engineNames: Array<[ThemeEngine, string]> = [
    [ThemeEngine.dynamicTheme, getLocalMessage('engine_dynamic')],
    [ThemeEngine.cssFilter, getLocalMessage('engine_filter')],
    [ThemeEngine.svgFilter, getLocalMessage('engine_filter_plus')],
    [ThemeEngine.staticTheme, getLocalMessage('engine_static')],
];

function Body(props: BodyProps & {fonts: string[]} & {installation: {date: number; version: string}}) {
    const {state, setState} = useState<BodyState>({
        siteListOpen: false,
        automationOpen: false,
        fontOpen: false,
    });

    if (!props.data.isReady) {
        return (
            <body>
                <Loader complete={false} />
            </body>
        );
    }

    if (isMobile || props.data.settings.previewNewDesign) {
        return <NewBody {...props} fonts={props.fonts} />;
    }

    const {data, actions} = props;
    const tab = data.activeTab;
    const locationSettings = data.settings.location;

    // Per-site vs global theme
    const custom = data.settings.customThemes.find(({url}) => isURLInList(tab.url, url));
    const theme = custom ? custom.theme : data.settings.theme;
    const isPerSite = Boolean(custom);

    function setTheme(config: Partial<Theme>) {
        if (custom) {
            custom.theme = {...custom.theme, ...config};
            actions.changeSettings({customThemes: data.settings.customThemes});
        } else {
            actions.setTheme(config);
        }
    }

    function togglePerSite() {
        if (isPerSite) {
            const filtered = data.settings.customThemes.filter(({url}) => !isURLInList(tab.url, url));
            actions.changeSettings({customThemes: filtered});
        } else {
            const host = getURLHostOrProtocol(tab.url);
            const extended = data.settings.customThemes.concat({
                url: [host],
                theme: {...data.settings.theme},
            });
            actions.changeSettings({customThemes: extended});
        }
    }

    // Site toggle
    const {urlText, onSiteToggleClick, toggleHasEffect, isSiteEnabled} = getSiteToggleData(props);

    // Automation
    function changeAutomationMode(mode: AutomationMode) {
        actions.changeSettings({automation: {...data.settings.automation, mode, enabled: Boolean(mode)}});
    }

    function getLocationString(location: number | null) {
        if (location == null) {
            return '';
        }
        return `${location}\u00b0`;
    }

    function locationChanged(inputElement: HTMLInputElement, newValue: string, type: 'latitude' | 'longitude') {
        const ranges = {latitude: {min: -90, max: 90}, longitude: {min: -180, max: 180}};
        if (newValue.trim() === '') {
            inputElement.value = '';
            actions.changeSettings({location: {...locationSettings, [type]: null}});
            return;
        }
        const {min, max} = ranges[type];
        let num = Number(newValue.replace(',', '.').replace('\u00b0', ''));
        if (isNaN(num)) {
            num = 0;
        } else if (num > max) {
            num = max;
        } else if (num < min) {
            num = min;
        }
        inputElement.value = getLocationString(num);
        actions.changeSettings({location: {...locationSettings, [type]: num}});
    }

    const isSystemAutomation = data.settings.automation.mode === AutomationMode.SYSTEM;
    const isTimeAutomation = data.settings.automation.mode === AutomationMode.TIME;
    const isLocationAutomation = data.settings.automation.mode === AutomationMode.LOCATION;

    const siteListValues = data.settings.enabledByDefault
        ? data.settings.disabledFor
        : data.settings.enabledFor;

    function isSiteUrlValid(value: string) {
        return /^([^\.\s]+?\.?)+$/.test(value);
    }

    function onSiteListChange(values: string[]) {
        const siteList = values.filter(isSiteUrlValid);
        const changes = data.settings.enabledByDefault
            ? {disabledFor: siteList}
            : {enabledFor: siteList};
        actions.changeSettings(changes);
    }

    const currentEngineName = engineNames.find(([code]) => code === theme.engine)![1];

    return (
        <body class={{'ext-disabled': !data.isEnabled}}>
            <Loader complete />

            {/* ── Header ── */}
            <div class="rd-header">
                <img class="rd-header__icon" src="../../icons/dr_128.png" alt="" />
                <span class="rd-header__title">DarkReaderLocal</span>
                <span
                    class={{'rd-header__power': true, 'rd-header__power--on': data.isEnabled}}
                    onclick={() => toggleExtension(props, !data.isEnabled)}
                >
                    {data.isEnabled ? getLocalMessage('on') : getLocalMessage('off')}
                </span>
                <span class="rd-header__gear" onclick={() => openExtensionPage('options')} title="Settings" />
            </div>

            {/* ── Site status row ── */}
            <div class="rd-site">
                <span
                    class={{'rd-site__left': true, 'rd-site__left--clickable': toggleHasEffect && !__THUNDERBIRD__}}
                    onclick={toggleHasEffect && !__THUNDERBIRD__ ? onSiteToggleClick : undefined}
                >
                    <span class={{'rd-site__dot': true, 'rd-site__dot--on': isSiteEnabled}} />
                    <span class="rd-site__url">{urlText}</span>
                    <span class={{'rd-site__status': true, 'rd-site__status--active': isSiteEnabled}}>
                        {tab.isInDarkList ? 'Dark List'
                            : tab.isDarkThemeDetected ? 'Native Dark'
                                : isSiteEnabled ? 'Active' : 'Paused'}
                    </span>
                </span>
                <span
                    class="rd-site__fix-btn"
                    onclick={() => openExtensionPage('devtools')}
                    title="Edit CSS fixes for this site"
                >
                    Fix
                </span>
            </div>

            {/* ── Scrollable content ── */}
            <div class="rd-scroll">

                {/* ── Display section ── */}
                <div class="rd-section">
                    <div class="rd-section__head">
                        <span class="rd-section__title">Display</span>
                        <span
                            class={{'rd-scope-badge': true, 'rd-scope-badge--site': isPerSite}}
                            onclick={togglePerSite}
                            title={isPerSite ? 'Per-site settings active — click to use global' : 'Using global settings — click to customize for this site'}
                        >
                            {isPerSite ? 'Per-site' : 'Global'}
                        </span>
                    </div>
                    <div class="rd-section__body">
                        <div class="rd-mode-row">
                            <span
                                class={{'rd-mode-btn': true, 'rd-mode-btn--active': theme.mode === 1}}
                                onclick={() => setTheme({mode: 1})}
                            >
                                Dark
                            </span>
                            <span
                                class={{'rd-mode-btn': true, 'rd-mode-btn--active': theme.mode === 0}}
                                onclick={() => setTheme({mode: 0})}
                            >
                                Light
                            </span>
                        </div>
                        <UpDown
                            value={theme.brightness}
                            min={50}
                            max={150}
                            step={5}
                            default={100}
                            name={getLocalMessage('brightness')}
                            onChange={(v) => setTheme({brightness: v})}
                        />
                        <UpDown
                            value={theme.contrast}
                            min={50}
                            max={150}
                            step={5}
                            default={100}
                            name={getLocalMessage('contrast')}
                            onChange={(v) => setTheme({contrast: v})}
                        />
                        <UpDown
                            value={theme.sepia}
                            min={0}
                            max={100}
                            step={5}
                            default={0}
                            name={getLocalMessage('sepia')}
                            onChange={(v) => setTheme({sepia: v})}
                        />
                        <UpDown
                            value={theme.grayscale}
                            min={0}
                            max={100}
                            step={5}
                            default={0}
                            name={getLocalMessage('grayscale')}
                            onChange={(v) => setTheme({grayscale: v})}
                        />
                    </div>
                </div>

                {/* ── Engine section ── */}
                <div class="rd-section">
                    <div class="rd-section__head">
                        <span class="rd-section__title">Engine</span>
                    </div>
                    <div class="rd-section__body">
                        <MultiSwitch
                            value={currentEngineName}
                            options={engineNames.map(([, name]) => name)}
                            onChange={(value) => {
                                const found = engineNames.find(([, name]) => name === value);
                                if (found) setTheme({engine: found[0]});
                            }}
                        />
                        {theme.engine === ThemeEngine.staticTheme ? (
                            <span
                                class="rd-css-edit-btn"
                                onclick={() => openExtensionPage('stylesheet-editor')}
                            >
                                Edit CSS
                            </span>
                        ) : null}
                    </div>
                </div>

                {/* ── Font & Text section (collapsible) ── */}
                <div class={{'rd-section': true, 'rd-section--open': state.fontOpen}}>
                    <div
                        class="rd-section__head rd-section__head--toggle"
                        onclick={() => setState({fontOpen: !state.fontOpen})}
                    >
                        <span class="rd-section__title">Font &amp; Text</span>
                        <span class="rd-section__chevron">{state.fontOpen ? '\u25b2' : '\u25bc'}</span>
                    </div>
                    {state.fontOpen ? (
                        <div class="rd-section__body">
                            <div class="rd-font-row">
                                <CheckBox
                                    checked={theme.useFont}
                                    onchange={(e: {target: HTMLInputElement}) => setTheme({useFont: e.target.checked})}
                                />
                                <select
                                    class="rd-font-select"
                                    title={getLocalMessage('select_font')}
                                    onchange={(e: {target: HTMLSelectElement}) => setTheme({fontFamily: e.target.value, useFont: true})}
                                >
                                    {props.fonts.map((font) => (
                                        <option
                                            value={font}
                                            selected={theme.fontFamily === font}
                                        >
                                            {font}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <label class="rd-label">Use custom font</label>
                            <UpDown
                                value={theme.textStroke}
                                min={0}
                                max={1}
                                step={0.1}
                                default={0}
                                name={getLocalMessage('text_stroke')}
                                onChange={(v) => setTheme({textStroke: v})}
                            />
                        </div>
                    ) : null}
                </div>

                {/* ── Site List section (collapsible) ── */}
                {!__THUNDERBIRD__ ? (
                    <div class={{'rd-section': true, 'rd-section--open': state.siteListOpen}}>
                        <div
                            class="rd-section__head rd-section__head--toggle"
                            onclick={() => setState({siteListOpen: !state.siteListOpen})}
                        >
                            <span class="rd-section__title">{getLocalMessage('site_list')}</span>
                            <span class="rd-section__chevron">{state.siteListOpen ? '\u25b2' : '\u25bc'}</span>
                        </div>
                        {state.siteListOpen ? (
                            <div class="rd-section__body">
                                <Toggle
                                    checked={!data.settings.enabledByDefault}
                                    labelOn={getLocalMessage('invert_listed_only')}
                                    labelOff={getLocalMessage('not_invert_listed')}
                                    onChange={(value) => actions.changeSettings({enabledByDefault: !value})}
                                />
                                <TextList
                                    placeholder="google.com/maps"
                                    values={siteListValues}
                                    isFocused={state.siteListOpen}
                                    onChange={onSiteListChange}
                                />
                                <Shortcut
                                    commandName="addSite"
                                    shortcuts={data.shortcuts}
                                    textTemplate={(hotkey) => (hotkey
                                        ? `${getLocalMessage('add_site_to_list')}: ${hotkey}`
                                        : getLocalMessage('setup_add_site_hotkey')
                                    )}
                                    onSetShortcut={(shortcut) => actions.setShortcut('addSite', shortcut)}
                                />
                            </div>
                        ) : null}
                    </div>
                ) : null}

                {/* ── Automation section (collapsible) ── */}
                <div class={{'rd-section': true, 'rd-section--open': state.automationOpen}}>
                    <div
                        class="rd-section__head rd-section__head--toggle"
                        onclick={() => setState({automationOpen: !state.automationOpen})}
                    >
                        <span class="rd-section__title">{getLocalMessage('automation')}</span>
                        {data.settings.automation.enabled ? (
                            <span class="rd-badge">On</span>
                        ) : null}
                        <span class="rd-section__chevron">{state.automationOpen ? '\u25b2' : '\u25bc'}</span>
                    </div>
                    {state.automationOpen ? (
                        <div class="rd-section__body">
                            {/* Time-based */}
                            <div class="rd-auto-row">
                                <CheckBox
                                    checked={isTimeAutomation}
                                    onchange={(e: {target: HTMLInputElement}) => changeAutomationMode(e.target.checked ? AutomationMode.TIME : AutomationMode.NONE)}
                                />
                                <span class="rd-auto-label">Time schedule</span>
                            </div>
                            {isTimeAutomation ? (
                                <div class="rd-auto-detail">
                                    <TimeRangePicker
                                        startTime={data.settings.time.activation}
                                        endTime={data.settings.time.deactivation}
                                        onChange={([start, end]) => actions.changeSettings({time: {activation: start, deactivation: end}})}
                                    />
                                    <span class="rd-auto-desc">{getLocalMessage('set_active_hours')}</span>
                                </div>
                            ) : null}

                            {/* Location-based */}
                            <div class="rd-auto-row">
                                <CheckBox
                                    checked={isLocationAutomation}
                                    onchange={(e: {target: HTMLInputElement}) => changeAutomationMode(e.target.checked ? AutomationMode.LOCATION : AutomationMode.NONE)}
                                />
                                <span class="rd-auto-label">Sunrise/sunset</span>
                            </div>
                            {isLocationAutomation ? (
                                <div class="rd-auto-detail">
                                    <div class="rd-location-row">
                                        <TextBox
                                            class="rd-location-input"
                                            placeholder={getLocalMessage('latitude')}
                                            onchange={(e: {target: HTMLInputElement}) => locationChanged(e.target, e.target.value, 'latitude')}
                                            oncreate={(node: HTMLInputElement) => { node.value = getLocationString(locationSettings.latitude); }}
                                            onkeypress={(e: KeyboardEvent) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                        />
                                        <TextBox
                                            class="rd-location-input"
                                            placeholder={getLocalMessage('longitude')}
                                            onchange={(e: {target: HTMLInputElement}) => locationChanged(e.target, e.target.value, 'longitude')}
                                            oncreate={(node: HTMLInputElement) => { node.value = getLocationString(locationSettings.longitude); }}
                                            onkeypress={(e: KeyboardEvent) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                        />
                                    </div>
                                    <span class="rd-auto-desc">{getLocalMessage('set_location')}</span>
                                </div>
                            ) : null}

                            {/* System dark mode */}
                            <div class="rd-auto-row">
                                <CheckBox
                                    checked={isSystemAutomation}
                                    onchange={(e: {target: HTMLInputElement}) => changeAutomationMode(e.target.checked ? AutomationMode.SYSTEM : AutomationMode.NONE)}
                                />
                                <span class="rd-auto-label">{getLocalMessage('system_dark_mode')}</span>
                            </div>
                            {isMatchMediaChangeEventListenerBuggy ? (
                                <p class="rd-auto-warning">{getLocalMessage('system_dark_mode_chromium_warning')}</p>
                            ) : null}

                            {/* Extension toggle shortcut */}
                            <div class="rd-shortcut-row">
                                <Shortcut
                                    commandName="toggle"
                                    shortcuts={data.shortcuts}
                                    textTemplate={(hotkey) => (hotkey
                                        ? hotkey
                                        : getLocalMessage('click_to_set_shortcut')
                                    )}
                                    onSetShortcut={(shortcut) => actions.setShortcut('toggle', shortcut)}
                                />
                                <span class="rd-shortcut-label">{getLocalMessage('extension_toggle_shortcut')}</span>
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* ── All Settings button ── */}
                <div class="rd-footer">
                    <span class="rd-settings-btn" onclick={() => openExtensionPage('options')}>
                        All Settings
                    </span>
                    <span class="rd-config-source">Rules: Bundled + Remote Cache</span>
                </div>

            </div>
        </body>
    );
}

export default compose(Body, withState, withForms);
